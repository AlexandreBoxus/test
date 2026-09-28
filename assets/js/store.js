/*
 * Couche de données du prototype.
 * Persistance : localStorage du navigateur. Toutes les lectures/écritures passent par
 * cet objet, ce qui permet de le remplacer par des appels à une API (backend communal)
 * sans modifier les écrans.
 */
(function (WA) {
  const { U, CONFIG } = WA;
  let state = null;
  const listeners = new Set();

  const Store = {};

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
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error(e);
      WA.UI && WA.UI.toast("L'espace de stockage du navigateur est plein : réduisez la taille des images.", 'error');
      return false;
    }
  }

  Store.init = () => {
    state = load();
    if (!state || state.version !== 1) {
      state = WA.buildSeed();
      persist();
    }
    Store.purgeExpiredMessages();
    return state;
  };

  Store.reset = () => {
    state = WA.buildSeed();
    persist();
    Store.logout();
    emit();
  };

  Store.exportJson = () => JSON.stringify(state, null, 2);
  Store.importJson = (json) => {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.associations) || !Array.isArray(data.events)) throw new Error('Fichier invalide');
    state = { ...WA.buildSeed(), ...data, version: 1 };
    persist();
    emit();
  };

  Store.onChange = (fn) => listeners.add(fn);
  function emit() {
    listeners.forEach((fn) => fn());
  }
  function commit(auditAction, auditLabel) {
    if (auditAction) {
      const user = Store.currentUser();
      state.audit.unshift({ at: Date.now(), action: auditAction, label: auditLabel, user: user ? user.username : 'public' });
      state.audit = state.audit.slice(0, 200);
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
        commit('association.update', existing.name);
        return existing;
      }
      // Proposition de modification : soumise à validation, la fiche publiée reste inchangée.
      const revision = { ...existing, ...data, id: U.uid('rev'), revisionOf: existing.id, status: 'pending', createdAt: now, updatedAt: now };
      state.associations.push(revision);
      commit('association.revision', existing.name);
      return revision;
    }
    let id = U.slugify(data.name);
    while (Store.association(id)) id = `${U.slugify(data.name)}-${Math.random().toString(36).slice(2, 5)}`;
    const record = { ...data, id, status: asAdmin ? 'published' : 'pending', createdAt: now, updatedAt: now };
    state.associations.push(record);
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
      }
      state.associations = state.associations.filter((x) => x.id !== id);
      commit('association.revision.approve', a.name);
      return;
    }
    a.status = 'published';
    a.updatedAt = Date.now();
    commit('association.approve', a.name);
  };

  Store.rejectAssociation = (id) => {
    const a = Store.association(id);
    if (!a) return;
    state.associations = state.associations.filter((x) => x.id !== id);
    commit('association.reject', a.name);
  };

  Store.deleteAssociation = (id) => {
    const a = Store.association(id);
    if (!a) return;
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
      commit('event.update', existing.title);
      return existing;
    }
    const record = { ...data, id: U.uid('ev'), status: asAdmin ? 'published' : 'pending', createdAt: now, updatedAt: now };
    state.events.push(record);
    commit('event.create', record.title);
    return record;
  };

  Store.setEventStatus = (id, status) => {
    const e = Store.event(id);
    if (!e) return;
    e.status = status;
    e.updatedAt = Date.now();
    commit(`event.${status === 'published' ? 'approve' : status}`, e.title);
  };

  Store.deleteEvent = (id) => {
    const e = Store.event(id);
    if (!e) return;
    state.events = state.events.filter((x) => x.id !== id);
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
    commit();
    return record;
  };
  Store.deleteMessage = (id) => {
    state.messages = state.messages.filter((m) => m.id !== id);
    commit('message.delete', id);
  };
  Store.purgeExpiredMessages = () => {
    const limit = Date.now() - CONFIG.messageRetentionMonths * 30 * 86400000;
    const before = state.messages.length;
    state.messages = state.messages.filter((m) => m.createdAt >= limit);
    if (state.messages.length !== before) persist();
  };

  /* ---------------- Newsletter ---------------- */
  Store.subscribers = () => state.subscribers.slice().sort((a, b) => b.createdAt - a.createdAt);
  Store.subscribe = (email, villages = []) => {
    const e = String(email).trim().toLowerCase();
    if (state.subscribers.some((s) => s.email === e)) return false;
    state.subscribers.push({ id: U.uid('sub'), email: e, villages, createdAt: Date.now(), consent: true });
    commit();
    return true;
  };
  Store.unsubscribe = (email) => {
    const e = String(email).trim().toLowerCase();
    const before = state.subscribers.length;
    state.subscribers = state.subscribers.filter((s) => s.email !== e);
    commit();
    return before !== state.subscribers.length;
  };
  Store.newsletters = () => state.newsletters.slice().sort((a, b) => b.sentAt - a.sentAt);
  Store.recordNewsletter = (nl) => {
    state.newsletters.push({ ...nl, id: U.uid('nl'), sentAt: Date.now() });
    state.settings.lastNewsletterAt = Date.now();
    commit('newsletter.send', nl.subject);
  };

  /* ---------------- Paramètres ---------------- */
  Store.settings = () => state.settings;
  Store.updateSettings = (patch) => {
    Object.assign(state.settings, patch);
    commit('settings.update', Object.keys(patch).join(', '));
  };

  /* ---------------- Statistiques d'usage (anonymes) ---------------- */
  const bump = (obj, key, n = 1) => {
    obj[key] = (obj[key] || 0) + n;
  };
  Store.track = (kind, key) => {
    const s = state.stats;
    if (kind === 'page') {
      bump(s.pageViews, key);
      bump(s.daily, U.today());
    } else if (kind === 'association') bump(s.assocViews, key);
    else if (kind === 'event') bump(s.eventViews, key);
    else if (kind === 'search' && key && key.length > 2) bump(s.searches, U.norm(key));
    else if (kind === 'share') s.shares = (s.shares || 0) + 1;
    else if (kind === 'export') s.exports = (s.exports || 0) + 1;
    persist();
  };
  Store.stats = () => state.stats;
  Store.audit = () => state.audit;

  /* ---------------- Utilisateurs & session ---------------- */
  Store.users = () => state.users;
  Store.user = (id) => state.users.find((u) => u.id === id);

  Store.login = (username, password) => {
    const user = state.users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (!user || user.passwordHash !== U.hashPassword(password, user.salt)) return null;
    user.lastLogin = Date.now();
    sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify({ userId: user.id, exp: Date.now() + CONFIG.sessionMinutes * 60000 }));
    commit('auth.login', user.username);
    return user;
  };
  Store.logout = () => sessionStorage.removeItem(CONFIG.sessionKey);
  Store.currentUser = () => {
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

  Store.saveUser = ({ id, username, name, email, role, password }) => {
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
  Store.deleteUser = (id) => {
    const admins = state.users.filter((u) => u.role === 'admin');
    const u = Store.user(id);
    if (!u) return;
    if (u.role === 'admin' && admins.length <= 1) throw new Error('Impossible de supprimer le dernier administrateur.');
    state.users = state.users.filter((x) => x.id !== id);
    commit('user.delete', u.username);
  };

  WA.Store = Store;
})(window.WA);
