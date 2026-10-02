/* Routeur et coque de l'application. */
(function (WA) {
  const { U, UI, Store, views: V } = WA;

  const ROUTES = [
    [/^\/?$/, V.home, 'accueil'],
    [/^\/associations\/nouvelle$/, V.associationForm, 'association-form'],
    [/^\/associations\/([^/]+)\/modifier$/, V.associationForm, 'association-form', ['id']],
    [/^\/associations\/([^/]+)$/, V.associationDetail, 'association', ['id']],
    [/^\/associations$/, V.directory, 'repertoire'],
    [/^\/agenda\/nouveau$/, V.eventForm, 'event-form'],
    [/^\/agenda\/evenement\/([^/]+)\/modifier$/, V.eventForm, 'event-form', ['id']],
    [/^\/agenda$/, V.agenda, 'agenda'],
    [/^\/evenement\/([^/]+)$/, V.eventDetail, 'evenement', ['id']],
    [/^\/carte$/, V.map, 'carte'],
    [/^\/confidentialite$/, V.privacy, 'confidentialite'],
    [/^\/merci$/, V.thanks, 'merci'],
    [/^\/newsletter\/desinscription$/, V.unsubscribe, 'desinscription'],
    [/^\/admin(?:\/([^/]+))?$/, V.admin, 'admin', ['tab']],
  ];

  const TITLES = {
    accueil: '',
    repertoire: 'Répertoire des associations',
    agenda: 'Agenda des activités',
    carte: 'Carte interactive',
    admin: 'Administration',
    confidentialite: 'Confidentialité',
  };

  const parseHash = () => {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = raw.split('?');
    return { path: decodeURIComponent(path), query: Object.fromEntries(new URLSearchParams(qs)) };
  };

  const App = {};
  let lastPath = null;

  App.render = () => {
    const { path, query } = parseHash();
    const root = document.getElementById('app');
    let view = V.notFound;
    let name = '404';
    let params = {};
    for (const [re, fn, n, keys = []] of ROUTES) {
      const m = path.match(re);
      if (m) {
        view = fn;
        name = n;
        keys.forEach((k, i) => (params[k] = m[i + 1] ? decodeURIComponent(m[i + 1]) : undefined));
        break;
      }
    }
    root.innerHTML = view(params, query);
    view.mount && view.mount(root, params, query);

    // Titre, navigation active, suivi, focus pour les lecteurs d'écran.
    const h1 = root.querySelector('h1');
    const title = TITLES[name] !== undefined ? TITLES[name] : h1 ? h1.textContent.trim() : '';
    const siteTitle = WA.SITE ? `${WA.SITE.siteName} ${WA.SITE.siteSubtitle}`.trim() : 'Réseau Associatif de Walhain';
    const waiting = Store.isAdmin() ? Store.associations('pending').length + Store.events('pending').length : 0;
    document.title = `${waiting ? `(${waiting}) ` : ''}${title ? `${title} – ${siteTitle}` : siteTitle}`;
    document.querySelectorAll('.main-nav a').forEach((a) => {
      const section = a.dataset.section;
      const active = section === name || (section === 'repertoire' && /^association/.test(name)) || (section === 'agenda' && /^(event|evenement)/.test(name));
      a.classList.toggle('active', active);
      active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    const pending = Store.isAdmin() ? Store.associations('pending').length + Store.events('pending').length : 0;
    const badge = document.getElementById('admin-badge');
    badge.textContent = pending || '';
    badge.hidden = !pending;
    document.body.classList.remove('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');

    if (path !== lastPath) {
      if (!/^admin/.test(name)) Store.track('page', name);
      window.scrollTo(0, 0);
      root.focus({ preventScroll: true });
      lastPath = path;
    }
  };

  const initShell = () => {
    document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = UI.icon(el.dataset.icon)));
    document.getElementById('year').textContent = new Date().getFullYear();

    document.getElementById('nav-toggle').addEventListener('click', (e) => {
      const open = document.body.classList.toggle('nav-open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    });

    document.getElementById('newsletter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!U.isEmail(f.email.value)) return UI.toast('Adresse e-mail invalide.', 'error');
      if (!f.consent.checked) return UI.toast('Merci de cocher la case de consentement.', 'error');
      try {
        const ok = await Store.subscribe(f.email.value);
        UI.toast(ok ? 'Inscription confirmée ! Vous recevrez les prochains événements.' : 'Cette adresse est déjà inscrite.', ok ? 'success' : 'error');
        f.reset();
      } catch (err) {
        UI.toast(WA.Remote.errorMessage(err), 'error');
      }
    });

    // Bandeau d'information RGPD (pas de traceur : simple information, mémorisée localement).
    const banner = document.getElementById('consent');
    let seen = false;
    try {
      seen = !!localStorage.getItem(WA.CONFIG.consentKey);
    } catch (e) {
      /* stockage indisponible */
    }
    banner.hidden = seen;
    banner.querySelector('button').addEventListener('click', () => {
      try {
        localStorage.setItem(WA.CONFIG.consentKey, String(Date.now()));
      } catch (e) {
        /* stockage indisponible */
      }
      banner.hidden = true;
    });
  };

  const isEditing = () => {
    if (document.getElementById('modal')) return true;
    if (/nouvelle|nouveau|modifier/.test(parseHash().path)) return true;
    const el = document.activeElement;
    if (el && el.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    // Un formulaire modifié ou affichant une erreur ne doit pas être effacé par une mise à jour.
    return [...document.querySelectorAll('#app form')].some(
      (form) =>
        form.querySelector('.form-error') ||
        [...form.elements].some((f) => {
          if (f.type === 'checkbox' || f.type === 'radio') return f.checked !== f.defaultChecked;
          if (f.tagName === 'SELECT') return [...f.options].some((o) => o.selected !== o.defaultSelected);
          return /^(INPUT|TEXTAREA)$/.test(f.tagName) && f.type !== 'hidden' && f.value !== f.defaultValue;
        })
    );
  };

  /* ---------- Alerte « nouvelle demande » pour l'administration ---------- */
  let knownPending = null;
  const watchRequests = () => {
    if (!Store.isAdmin()) {
      knownPending = null;
      return;
    }
    const pending = [...Store.associations('pending'), ...Store.events('pending')];
    const ids = new Set(pending.map((x) => x.id));
    if (knownPending) {
      const fresh = pending.filter((x) => !knownPending.has(x.id));
      if (fresh.length) {
        const label = fresh.length === 1 ? `Nouvelle demande : ${fresh[0].name || fresh[0].title}` : `${fresh.length} nouvelles demandes à valider`;
        UI.toast(label);
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            const n = new Notification(WA.SITE ? `${WA.SITE.siteName} ${WA.SITE.siteSubtitle}` : 'Réseau associatif', { body: label, icon: 'assets/icons/icon-192.png' });
            n.onclick = () => {
              window.focus();
              location.hash = '#/admin/validation';
            };
          } catch (e) {
            /* notifications indisponibles */
          }
        }
      }
    }
    knownPending = ids;
  };

  /* ---------- Application installable (PWA) ---------- */
  const initInstall = () => {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker', e));
    }
    const btn = document.getElementById('install-app');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return;
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) btn.hidden = false;
    btn.addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') btn.hidden = true;
        deferred = null;
        return;
      }
      UI.modal(
        `<ol class="install-steps">
          <li>Touchez le bouton <strong>Partager</strong> ${UI.icon('Share2')} en bas de Safari.</li>
          <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>.</li>
          <li>Touchez <strong>Ajouter</strong> : l'appli apparaît avec les autres applications.</li>
        </ol>`,
        { title: "Installer l'appli sur iPhone / iPad", size: 'modal-sm' }
      );
    });
    window.addEventListener('appinstalled', () => (btn.hidden = true));
  };

  App.start = async () => {
    const root = document.getElementById('app');
    root.innerHTML = `<div class="loading" role="status">${UI.icon('Hourglass')}<p>Chargement du portail…</p></div>`;
    initShell();
    try {
      await Store.init();
    } catch (err) {
      console.error(err);
      root.innerHTML = `<section class="container narrow thanks"><div class="panel center">${UI.icon('CircleAlert', 'xl')}<h1>Connexion à la base de données impossible</h1>
        <p>Vérifiez votre connexion Internet puis rechargez la page. Si le problème persiste, contactez l'administration communale.</p></div></section>`;
      return;
    }
    if (Store.mode === 'local') WA.Newsletter && WA.Newsletter.autoSend();
    // Base partagée : l'affichage suit les changements faits par les autres utilisateurs.
    if (Store.mode === 'firebase') Store.onChange(U.debounce(() => !isEditing() && App.render(), 200));
    if (Store.mode === 'firebase') Store.onChange(U.debounce(watchRequests, 300));
    initInstall();
    window.addEventListener('hashchange', App.render);
    App.render();
  };

  WA.App = App;
  document.addEventListener('DOMContentLoaded', App.start);
})(window.WA);
