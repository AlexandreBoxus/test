/*
 * Connecteur Firebase (Firestore + Authentication).
 * Actif uniquement si WA.FIREBASE_CONFIG est renseigné (voir firebase-config.js).
 * Il alimente l'état en mémoire de WA.Store à partir de Firestore, en temps réel,
 * et exécute les écritures. Les règles de sécurité sont dans firestore.rules.
 */
(function (WA) {
  const R = { enabled: false, profile: null, orphan: null };
  let fb = null;
  let db = null;
  let auth = null;
  let ctx = null; // { state, emit }
  let currentUid; // undefined = état de connexion pas encore connu
  let authPromise = Promise.resolve();
  const subs = {};

  const SDK = ['vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js'];

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Chargement impossible : ${src}`));
      document.head.appendChild(s);
    });

  const docs = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  const withoutId = (obj) => {
    const { id, ...rest } = obj;
    return JSON.parse(JSON.stringify(rest)); // retire les valeurs undefined refusées par Firestore
  };

  /** Abonnement temps réel ; la promesse se résout au premier instantané reçu. */
  const watch = (name, ref, apply) =>
    new Promise((resolve) => {
      if (subs[name]) subs[name]();
      let first = true;
      subs[name] = ref.onSnapshot(
        (snap) => {
          apply(snap);
          if (first) {
            first = false;
            resolve();
          } else ctx.emit();
        },
        (err) => {
          console.error(`Firestore (${name})`, err);
          if (first) {
            first = false;
            resolve();
          }
        }
      );
    });
  const unwatch = (name) => {
    if (subs[name]) {
      subs[name]();
      delete subs[name];
    }
  };

  const STAFF_SUBS = ['messages', 'subscribers', 'newsletters', 'users', 'audit', 'stats', 'settings'];

  const watchContent = (staff) => {
    const col = (name) => (staff ? db.collection(name) : db.collection(name).where('status', '==', 'published'));
    return Promise.all([
      watch('associations', col('associations'), (s) => (ctx.state.associations = docs(s))),
      watch('events', col('events'), (s) => (ctx.state.events = docs(s))),
    ]);
  };

  const watchStaff = () => {
    const st = ctx.state;
    const defaults = WA.buildSeed();
    return Promise.all([
      watch('messages', db.collection('messages'), (s) => (st.messages = docs(s))),
      watch('subscribers', db.collection('subscribers'), (s) => (st.subscribers = docs(s))),
      watch('newsletters', db.collection('newsletters'), (s) => (st.newsletters = docs(s))),
      watch('users', db.collection('admins'), (s) => (st.users = docs(s))),
      watch('audit', db.collection('audit').orderBy('at', 'desc').limit(200), (s) => (st.audit = docs(s))),
      watch('stats', db.collection('stats').doc('global'), (d) => (st.stats = { ...defaults.stats, ...(d.exists ? d.data() : {}) })),
      watch('settings', db.collection('config').doc('settings'), (d) => (st.settings = { ...defaults.settings, ...(d.exists ? d.data() : {}) })),
    ]);
  };

  /** Applique un changement de connexion (idempotent pour un même utilisateur). */
  const handleAuth = (user) => {
    const uid = user ? user.uid : null;
    if (uid === currentUid) return authPromise; // déjà traité ou en cours
    currentUid = uid;
    authPromise = applyAuth(user, uid);
    return authPromise;
  };
  const applyAuth = async (user, uid) => {
    R.profile = null;
    R.orphan = null;
    STAFF_SUBS.forEach(unwatch);
    const empty = WA.buildSeed();
    Object.assign(ctx.state, { messages: [], subscribers: [], newsletters: [], users: [], audit: [], stats: empty.stats, settings: empty.settings });

    if (user) {
      let snap = null;
      try {
        snap = await db.collection('admins').doc(uid).get();
      } catch (e) {
        console.error(e);
      }
      if (snap && snap.exists) {
        R.profile = { ...snap.data(), id: uid, username: snap.data().email || user.email };
        await Promise.all([watchContent(true), watchStaff()]);
        db.collection('admins').doc(uid).update({ lastLogin: Date.now() }).catch(() => {});
        WA.Store.purgeExpiredMessages();
        WA.Newsletter && WA.Newsletter.autoSend();
      } else {
        // Compte Firebase valide mais sans droits : on garde l'UID pour l'afficher (mise en place du 1er admin).
        R.orphan = { uid, email: user.email };
        await watchContent(false);
      }
    } else {
      await watchContent(false);
    }
    ctx.emit();
  };

  R.init = async (context) => {
    ctx = context;
    for (const src of SDK) await loadScript(src);
    fb = window.firebase;
    fb.initializeApp(WA.FIREBASE_CONFIG);
    db = fb.firestore();
    auth = fb.auth();
    if (WA.FIREBASE_EMULATOR) {
      auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
      db.useEmulator('127.0.0.1', 8085);
    }
    // Appli hors connexion : garde une copie locale des données consultées.
    try {
      await db.enablePersistence({ synchronizeTabs: true });
    } catch (e) {
      console.info('Cache hors connexion indisponible', e.code || e);
    }
    R.enabled = true;
    // Contenus du site (textes, villages, thématiques…) : lisibles par tous.
    await watch('site', db.collection('config').doc('site'), (d) => WA.Store.setSiteFromServer(d.exists ? d.data() : null));
    await new Promise((resolve) => {
      let first = true;
      auth.onAuthStateChanged(async (user) => {
        await handleAuth(user);
        if (first) {
          first = false;
          resolve();
        }
      });
    });
  };

  /* ---------------- Écritures ---------------- */
  R.put = (col, obj) => db.collection(col).doc(obj.id).set(withoutId(obj));
  R.merge = (col, id, patch) => db.collection(col).doc(id).set(JSON.parse(JSON.stringify(patch)), { merge: true });
  R.del = (col, id) => db.collection(col).doc(id).delete();
  R.batch = async (ops) => {
    for (let i = 0; i < ops.length; i += 400) {
      const b = db.batch();
      ops.slice(i, i + 400).forEach(([kind, col, obj]) => {
        const ref = db.collection(col).doc(kind === 'del' ? obj : obj.id);
        kind === 'del' ? b.delete(ref) : b.set(ref, withoutId(obj));
      });
      await b.commit();
    }
  };

  /** Statistiques anonymes : compteurs incrémentés côté serveur. */
  R.track = (field, key) => {
    const inc = fb.firestore.FieldValue.increment(1);
    const data = key === undefined ? { [field]: inc } : { [field]: { [String(key).slice(0, 60)]: inc } };
    return db.collection('stats').doc('global').set(data, { merge: true });
  };

  /* ---------------- Authentification ---------------- */
  R.login = async (email, password) => {
    const cred = await auth.signInWithEmailAndPassword(String(email).trim(), password);
    await handleAuth(cred.user);
    return R.profile;
  };
  R.logout = async () => {
    await auth.signOut();
    await handleAuth(null);
  };
  R.changePassword = (password) => auth.currentUser.updatePassword(password);
  R.resetPassword = (email) => auth.sendPasswordResetEmail(String(email).trim());

  /** Crée un compte sans déconnecter l'administrateur courant (instance Firebase secondaire). */
  R.createUser = async ({ email, password, name, role }) => {
    let secondary = fb.apps.find((a) => a.name === 'creation-comptes');
    if (!secondary) {
      secondary = fb.initializeApp(WA.FIREBASE_CONFIG, 'creation-comptes');
      if (WA.FIREBASE_EMULATOR) secondary.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
    }
    const cred = await secondary.auth().createUserWithEmailAndPassword(String(email).trim(), password);
    await secondary.auth().signOut();
    const profile = { email: String(email).trim().toLowerCase(), name: name || '', role, createdAt: Date.now(), lastLogin: null };
    await db.collection('admins').doc(cred.user.uid).set(profile);
    return { ...profile, id: cred.user.uid, username: profile.email };
  };

  /** Message d'erreur lisible pour les codes Firebase courants. */
  R.errorMessage = (err) => {
    const code = (err && err.code) || '';
    const map = {
      'auth/invalid-credential': 'Identifiants incorrects.',
      'auth/wrong-password': 'Identifiants incorrects.',
      'auth/user-not-found': 'Identifiants incorrects.',
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse e-mail.',
      'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
      'auth/requires-recent-login': 'Par sécurité, déconnectez-vous puis reconnectez-vous avant de changer le mot de passe.',
      'auth/network-request-failed': 'Connexion au serveur impossible. Vérifiez votre connexion Internet.',
      'permission-denied': "Action refusée : vous n'avez pas les droits nécessaires.",
      unavailable: 'Serveur momentanément injoignable. Réessayez.',
    };
    return map[code] || `Erreur : ${(err && err.message) || err}`;
  };

  WA.Remote = R;
})(window.WA);
