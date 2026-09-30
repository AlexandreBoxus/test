/*
 * Couche de données.
 * Deux modes :
 *  - « local » (démonstration) : données dans le localStorage du navigateur ;
 *  - « firebase » : données partagées dans Firestore (voir remote.js et firebase-config.js).
 * Les écrans lisent un état en mémoire (lectures synchrones) ; en mode Firebase, cet état est
 * tenu à jour en temps réel et chaque modification est aussi envoyée au serveur.
 */
(function (WA) {
  const { U, CONFIG } = WA;
  let state = null;
  const listeners = new Set();
  const pending = new Set();

  const Store = { mode: 'local' };
  const remote = () => (Store.mode === 'firebase' ? WA.Remote : null);

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lecture du stockage impossible', e);
    }
    return null;
  }

  function persist() {
    if (remote()) return true;
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error(e);
      WA.UI && WA.UI.toast("L'espace de stockage du navigateur est plein : réduisez la taille des images.", 'error');
      return false;
    }
  }

  /** Suit une écriture distante ; les erreurs sont signalées à l'utilisateur. */
  function sync(promise) {
    if (!promise) return;
    const p = Promise.resolve(promise);
    pending.add(p);
    p.catch((err) => {
      console.error(err);
      WA.UI && WA.UI.toast(WA.Remote.errorMessage(err), 'error');
    }).finally(() => pending.delete(p));
  }
  /** Attend la fin des écritures en cours ; rejette si l'une a échoué. */
  Store.flush = async () => {
    const results = await Promise.allSettled([...pending]);
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) throw failed.reason;
  };
  const put = (col, obj) => remote() && sync(remote().put(col, obj));
  const del = (col, id) => remote() && sync(remote().del(col, id));

  Store.init = async () => {
    if (WA.FIREBASE_CONFIG && WA.FIREBASE_CONFIG.apiKey) {
      const seed = WA.buildSeed();
      state = { ...seed, associations: [], events: [], users: [] };
      Store.mode = 'firebase';
      await WA.Remote.init({ state, emit });
      return state;
    }
    state = load();
    if (!state || state.version !== 1) {
      state = WA.buildSeed();
      persist();
    }
    Store.purgeExpiredMessages();
    return state;
  };

  Store.reset = () => {
    if (remote()) throw new Error('Réinitialisation indisponible en mode base partagée.');
    state = WA.buildSeed();
    persist();
    Store.logout();
    emit();
  };

  /** Mode Firebase : charge les associations et événements de départ dans la base. */
  Store.importSeed = async () => {
    const seed = WA.buildSeed();
    const events = seed.events.filter((e) => e.status === 'published'); // sans l'exemple « en attente » de la démonstration
    await remote().batch([...seed.associations.map((a) => ['set', 'associations', a]), ...events.map((e) => ['set', 'events', e])]);
    commit('data.seed', `${seed.associations.length} associations`);
  };

  Store.exportJson = () => {
    const { users, ...rest } = state;
    const safeUsers = (users || []).map(({ passwordHash, salt, ...u }) => u);
    return JSON.stringify({ ...rest, users: safeUsers }, null, 2);
  };
  Store.importJson = async (json) => {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.associations) || !Array.isArray(data.events)) throw new Error('Fichier invalide');
    if (remote()) {
      await remote().batch([...data.associations.map((a) => ['set', 'associations', a]), ...data.events.map((e) => ['set', 'events', e])]);
      commit('data.import', `${data.associations.length} associations`);
      return;
    }
    state = { ...WA.buildSeed(), ...data, users: state.users, version: 1 };
    persist();
    emit();
  };

  Store.onChange = (fn) => listeners.add(fn);
  function emit() {
    listeners.forEach((fn) => fn());
  }
  function commit(auditAction, auditLabel) {
    const user = Store.currentUser();
    if (auditAction && (!remote() || user)) {
      const entry = { id: U.uid('log'), at: Date.now(), action: auditAction, label: auditLabel || '', user: user ? user.username : 'public' };
      state.audit.unshift(entry);
      state.audit = state.audit.slice(0, 200);
      put('audit', entry);
    }
    const ok = persist();
    emit();
    return ok;
  }

  /* ---------------- Associations ---------------- */
  Store.associations = (status = 'published') =>
    state.associations
      .filter((a) => status === 'all' || a.status === status)
      .sort((a, b) => U.sortName(a.name).localeCompare(U.sortName(b.name), 'fr'));

  Store.association = (id) => state.associations.find((a) => a.id === id);

  Store.saveAssociation = (data, { asAdmin = false } = {}) => {
    const now = Date.now();
    if (data.id && Store.association(data.id)) {
      const existing = Store.association(data.id);
      if (asAdmin) {
        Object.assign(existing, data, { updatedAt: now, status: existing.status === 'pending' ? 'pending' : existing.status });
        put('associations', existing);
        commit('association.update', existing.name);
        return existing;
      }
      // Proposition de modification : soumise à validation, la fiche publiée reste inchangée.
      const revision = { ...existing, ...data, id: U.uid('rev'), revisionOf: existing.id, status: 'pending', createdAt: now, updatedAt: now };
      state.associations.push(revision);
      put('associations', revision);
      commit('association.revision', existing.name);
      return revision;
    }
    // En base partagée, le public ne voit pas les fiches en attente : suffixe aléatoire pour éviter toute collision.
    const base = U.slugify(data.name);
    let id = remote() && !asAdmin ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
    while (Store.association(id)) id = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    const record = { ...data, id, status: asAdmin ? 'published' : 'pending', createdAt: now, updatedAt: now };
    state.associations.push(record);
    put('associations', record);
    commit('association.create', record.name);
    return record;
  };

  Store.approveAssociation = (id) => {
    const a = Store.association(id);
    if (!a) return;
    if (a.revisionOf) {
      const target = Store.association(a.revisionOf);
      if (target) {
        const { id: _i, revisionOf: _r, createdAt: _c, status: _s, ...changes } = a;
        Object.assign(target, changes, { updatedAt: Date.now() });
        put('associations', target);
      }
      state.associations = state.associations.filter((x) => x.id !== id);
      del('associations', id);
      commit('association.revision.approve', a.name);
      return;
    }
    a.status = 'published';
    a.updatedAt = Date.now();
    put('associations', a);
    commit('association.approve', a.name);
  };

  Store.rejectAssociation = (id) => {
    const a = Store.association(id);
    if (!a) return;
    state.associations = state.associations.filter((x) => x.id !== id);
    del('associations', id);
    commit('association.reject', a.name);
  };

  Store.deleteAssociation = (id) => {
    const a = Store.association(id);
    if (!a) return;
    state.associations.filter((x) => x.revisionOf === id).forEach((x) => del('associations', x.id));
    state.events.filter((e) => e.associationId === id).forEach((e) => del('events', e.id));
    del('associations', id);
    state.associations = state.associations.filter((x) => x.id !== id && x.revisionOf !== id);
    state.events = state.events.filter((e) => e.associationId !== id);
    commit('association.delete', a.name);
  };

  /* ---------------- Événements ---------------- */
  Store.events = (status = 'published') => state.events.filter((e) => status === 'all' || e.status === status);
  Store.event = (id) => state.events.find((e) => e.id === id);

  Store.saveEvent = (data, { asAdmin = false } = {}) => {
    const now = Date.now();
    const existing = data.id && Store.event(data.id);
    if (existing) {
      Object.assign(existing, data, { updatedAt: now });
      put('events', existing);
      commit('event.update', existing.title);
      return existing;
    }
    const record = { ...data, id: U.uid('ev'), status: asAdmin ? 'published' : 'pending', createdAt: now, updatedAt: now };
    state.events.push(record);
    put('events', record);
    commit('event.create', record.title);
    return record;
  };

  Store.setEventStatus = (id, status) => {
    const e = Store.event(id);
    if (!e) return;
    e.status = status;
    e.updatedAt = Date.now();
    put('events', e);
    commit(`event.${status === 'published' ? 'approve' : status}`, e.title);
  };

  Store.deleteEvent = (id) => {
    const e = Store.event(id);
    if (!e) return;
    state.events = state.events.filter((x) => x.id !== id);
    del('events', id);
    commit('event.delete', e.title);
  };

  /** Occurrences publiées entre deux dates, triées chronologiquement. */
  Store.occurrences = (fromIso, toIso, events = Store.events()) =>
    events
      .flatMap((e) => U.expandOccurrences(e, fromIso, toIso))
      .filter((o) => o.occDate <= toIso)
      .sort((a, b) => (a.occDate + (a.startTime || '')).localeCompare(b.occDate + (b.startTime || '')));

  /* ---------------- Messages (formulaires de contact) ---------------- */
  Store.messages = () => state.messages.slice().sort((a, b) => b.createdAt - a.createdAt);
  Store.addMessage = (msg) => {
    const record = { ...msg, id: U.uid('msg'), createdAt: Date.now(), status: 'transmis' };
    state.messages.push(record);
    put('messages', record);
    commit();
    return record;
  };
  Store.deleteMessage = (id) => {
    state.messages = state.messages.filter((m) => m.id !== id);
    del('messages', id);
    commit('message.delete', id);
  };
  Store.purgeExpiredMessages = () => {
    const limit = Date.now() - CONFIG.messageRetentionMonths * 30 * 86400000;
    const expired = state.messages.filter((m) => m.createdAt < limit);
    if (!expired.length) return;
    expired.forEach((m) => del('messages', m.id));
    state.messages = state.messages.filter((m) => m.createdAt >= limit);
    persist();
  };

  /* ---------------- Newsletter ---------------- */
  // Identifiant = empreinte de l'e-mail : permet la désinscription sans exposer la liste.
  const subscriberId = (email) => `sub-${U.sha256(email).slice(0, 32)}`;
  Store.subscribers = () => state.subscribers.slice().sort((a, b) => b.createdAt - a.createdAt);
  /** Résout true si inscrit, false si déjà inscrit. */
  Store.subscribe = async (email, villages = []) => {
    const e = String(email).trim().toLowerCase();
    const record = { id: subscriberId(e), email: e, villages, createdAt: Date.now(), consent: true };
    if (remote()) {
      try {
        await remote().put('subscribers', record);
        return true;
      } catch (err) {
        if (err && err.code === 'permission-denied') return false; // document existant : déjà inscrit
        throw err;
      }
    }
    if (state.subscribers.some((s) => s.email === e)) return false;
    state.subscribers.push(record);
    commit();
    return true;
  };
  /** Résout true/false en mode local ; null en mode base partagée (existence inconnue du public). */
  Store.unsubscribe = async (email) => {
    const e = String(email).trim().toLowerCase();
    const before = state.subscribers.length;
    state.subscribers = state.subscribers.filter((s) => s.email !== e);
    if (remote()) {
      const existing = Store.subscribers().find((s) => s.email === e);
      await remote().del('subscribers', existing ? existing.id : subscriberId(e));
      commit();
      return null;
    }
    commit();
    return before !== state.subscribers.length;
  };
  Store.newsletters = () => state.newsletters.slice().sort((a, b) => b.sentAt - a.sentAt);
  Store.recordNewsletter = (nl) => {
    const record = { ...nl, id: U.uid('nl'), sentAt: Date.now() };
    state.newsletters.push(record);
    state.settings.lastNewsletterAt = Date.now();
    put('newsletters', record);
    remote() && sync(remote().merge('config', 'settings', { lastNewsletterAt: state.settings.lastNewsletterAt }));
    commit('newsletter.send', nl.subject);
  };

  /* ---------------- Paramètres ---------------- */
  Store.settings = () => state.settings;
  Store.updateSettings = (patch) => {
    Object.assign(state.settings, patch);
    remote() && sync(remote().merge('config', 'settings', patch));
    commit('settings.update', Object.keys(patch).join(', '));
  };

  /* ---------------- Statistiques d'usage (anonymes) ---------------- */
  const bump = (obj, key, n = 1) => {
    obj[key] = (obj[key] || 0) + n;
  };
  const statKey = (s) => U.norm(s).replace(/[^a-z0-9 -]/g, '').slice(0, 40);
  Store.track = (kind, key) => {
    const s = state.stats;
    const ops = [];
    if (kind === 'page') {
      bump(s.pageViews, key);
      bump(s.daily, U.today());
      ops.push(['pageViews', key], ['daily', U.today()]);
    } else if (kind === 'association') {
      bump(s.assocViews, key);
      ops.push(['assocViews', key]);
    } else if (kind === 'event') {
      bump(s.eventViews, key);
      ops.push(['eventViews', key]);
    } else if (kind === 'search' && key && key.trim().length > 2) {
      bump(s.searches, statKey(key));
      ops.push(['searches', statKey(key)]);
    } else if (kind === 'share' || kind === 'export') {
      const field = kind === 'share' ? 'shares' : 'exports';
      s[field] = (s[field] || 0) + 1;
      ops.push([field]);
    }
    if (remote()) ops.forEach(([field, k]) => remote().track(field, k).catch((e) => console.warn('Statistiques', e)));
    else persist();
  };
  Store.stats = () => state.stats;
  Store.audit = () => state.audit;

  /* ---------------- Utilisateurs & session ---------------- */
  Store.users = () => state.users;
  Store.user = (id) => state.users.find((u) => u.id === id);

  /** Résout l'utilisateur connecté, ou null si les identifiants sont refusés. */
  Store.login = async (username, password) => {
    if (remote()) {
      const profile = await remote().login(username, password); // lève une erreur si refusé
      if (profile) commit('auth.login', profile.username);
      return profile;
    }
    const user = state.users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (!user || user.passwordHash !== U.hashPassword(password, user.salt)) return null;
    user.lastLogin = Date.now();
    sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify({ userId: user.id, exp: Date.now() + CONFIG.sessionMinutes * 60000 }));
    commit('auth.login', user.username);
    return user;
  };
  Store.logout = async () => {
    if (remote()) return remote().logout();
    sessionStorage.removeItem(CONFIG.sessionKey);
  };
  Store.currentUser = () => {
    if (remote()) return remote().profile;
    try {
      const s = JSON.parse(sessionStorage.getItem(CONFIG.sessionKey) || 'null');
      if (!s || s.exp < Date.now()) return null;
      s.exp = Date.now() + CONFIG.sessionMinutes * 60000; // session glissante
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(s));
      return Store.user(s.userId) || null;
    } catch (e) {
      return null;
    }
  };
  Store.isAdmin = () => !!Store.currentUser();
  /** Compte Firebase connecté mais sans droits (sert à la mise en place du premier administrateur). */
  Store.orphanAccount = () => (remote() ? remote().orphan : null);

  Store.changePassword = async (password) => {
    if (remote()) return remote().changePassword(password);
    const u = Store.currentUser();
    Store.saveUser({ ...u, password });
  };
  Store.resetPassword = (email) => remote().resetPassword(email);

  Store.saveUser = async ({ id, username, name, email, role, password }) => {
    if (remote()) {
      if (id) {
        const u = Store.user(id);
        Object.assign(u, { name, role });
        await remote().merge('admins', id, { name, role });
        commit('user.update', u.username);
        return u;
      }
      const u = await remote().createUser({ email: username, password, name, role });
      commit('user.create', u.username);
      return u;
    }
    if (id) {
      const u = Store.user(id);
      Object.assign(u, { name, email, role });
      if (password) {
        u.salt = Math.random().toString(36).slice(2, 12);
        u.passwordHash = U.hashPassword(password, u.salt);
        u.mustChangePassword = false;
      }
      commit('user.update', u.username);
      return u;
    }
    if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) throw new Error("Ce nom d'utilisateur existe déjà.");
    const salt = Math.random().toString(36).slice(2, 12);
    const u = { id: U.uid('user'), username, name, email, role, salt, passwordHash: U.hashPassword(password, salt), createdAt: Date.now(), lastLogin: null };
    state.users.push(u);
    commit('user.create', username);
    return u;
  };
  Store.deleteUser = async (id) => {
    const admins = state.users.filter((u) => u.role === 'admin');
    const u = Store.user(id);
    if (!u) return;
    if (u.role === 'admin' && admins.length <= 1) throw new Error('Impossible de supprimer le dernier administrateur.');
    if (remote()) await remote().del('admins', id); // retire les droits ; le compte de connexion reste dans Firebase
    state.users = state.users.filter((x) => x.id !== id);
    commit('user.delete', u.username || u.email);
  };

  WA.Store = Store;
})(window.WA);
