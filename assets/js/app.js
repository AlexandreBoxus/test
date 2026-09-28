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
    document.title = title ? `${title} – Réseau Associatif de Walhain` : 'Réseau Associatif de Walhain';
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

    document.getElementById('newsletter-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      if (!U.isEmail(f.email.value)) return UI.toast('Adresse e-mail invalide.', 'error');
      if (!f.consent.checked) return UI.toast('Merci de cocher la case de consentement.', 'error');
      const ok = Store.subscribe(f.email.value);
      UI.toast(ok ? 'Inscription confirmée ! Vous recevrez les prochains événements.' : 'Cette adresse est déjà inscrite.', ok ? 'success' : 'error');
      f.reset();
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

  App.start = () => {
    Store.init();
    initShell();
    WA.Newsletter && WA.Newsletter.autoSend();
    window.addEventListener('hashchange', App.render);
    App.render();
  };

  WA.App = App;
  document.addEventListener('DOMContentLoaded', App.start);
})(window.WA);
