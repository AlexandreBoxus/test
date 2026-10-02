/* Pages : accueil, confidentialité, remerciements, désinscription, 404. */
(function (WA) {
  const { U, UI, Store } = WA;
  const V = (WA.views = WA.views || {});

  V.home = () => {
    const site = WA.SITE || WA.siteDefaults();
    const assocs = Store.associations();
    const upcoming = Store.occurrences(U.today(), U.iso(U.addDays(new Date(), 120))).slice(0, 5);
    // Trois associations mises en avant, qui changent chaque semaine.
    const week = Math.floor(Date.now() / (7 * 86400000));
    const featured = assocs.length ? [0, 1, 2].map((i) => assocs[(week * 3 + i) % assocs.length]).filter((a, i, arr) => arr.indexOf(a) === i) : [];
    const counts = Object.fromEntries(WA.THEMES.map((t) => [t.id, assocs.filter((a) => a.themes.includes(t.id)).length]));
    return `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <p class="eyebrow light">${UI.icon('Sprout')}${U.esc(site.heroEyebrow)}</p>
          <h1>${U.nl2br(site.heroTitle)}</h1>
          <p class="lead">${U.nl2br(site.heroText)}</p>
          <form class="hero-search" action="#/associations" role="search" id="hero-search">
            <label class="sr-only" for="hero-q">Rechercher une association</label>
            ${UI.icon('Search')}<input id="hero-q" name="q" type="search" placeholder="Sport, jeux, nature, Perbais…">
            <button class="btn btn-accent">Rechercher</button>
          </form>
          <div class="hero-ctas">
            <a class="btn btn-light" href="#/associations">${UI.icon('Users')}Répertoire des associations</a>
            <a class="btn btn-outline-light" href="#/agenda">${UI.icon('CalendarDays')}Agenda des activités</a>
          </div>
        </div>
        <div class="hero-stats" aria-label="Chiffres clés">
          <div><strong>${assocs.length}</strong><span>associations</span></div>
          <div><strong>${WA.VILLAGES.length}</strong><span>village${WA.VILLAGES.length > 1 ? 's' : ''}</span></div>
          <div><strong>${Store.occurrences(U.today(), U.iso(U.addDays(new Date(), 90))).length}</strong><span>dates dans les 3 mois</span></div>
        </div>
      </div>
      <svg class="hero-landscape" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 110 C 200 60 380 70 560 100 S 900 150 1100 100 S 1340 60 1440 80 V160 H0Z" fill="#3f7f45" opacity=".55"/>
        <path d="M0 130 C 240 100 460 110 700 130 S 1120 150 1440 115 V160 H0Z" fill="#fbf8f2"/>
        <g fill="#2a5b30" opacity=".75"><rect x="1128" y="52" width="6" height="48"/><path d="M1122 56 L1131 20 L1140 56Z"/><rect x="1110" y="70" width="42" height="32"/></g>
        <g fill="#2a5b30" opacity=".6"><circle cx="300" cy="84" r="16"/><rect x="298" y="92" width="4" height="16"/><circle cx="330" cy="90" r="11"/><circle cx="1260" cy="80" r="14"/><rect x="1258" y="88" width="4" height="14"/></g>
      </svg>
    </section>

    <section class="container section">
      <div class="section-head"><h2>Explorer par thématique</h2><a href="#/associations" class="link-more">Tout le répertoire${UI.icon('ChevronRight')}</a></div>
      <div class="theme-grid">
        ${WA.THEMES.filter((t) => t.id !== 'autres' || counts.autres)
          .map((t) => `<a class="theme-tile" href="#/associations?theme=${t.id}" style="--c:${t.color}">${UI.themeIcon(t.id)}<span>${U.esc(t.label)}</span><small>${counts[t.id] || 0} asso.</small></a>`)
          .join('')}
      </div>
    </section>

    <section class="section section-sand">
      <div class="container home-split">
        <div>
          <div class="section-head"><h2>Prochainement à Walhain</h2><a href="#/agenda?view=list" class="link-more">Tout l'agenda${UI.icon('ChevronRight')}</a></div>
          ${upcoming.length ? `<ul class="event-list">${upcoming.map((o) => V.eventRow(o, { showAssoc: true })).join('')}</ul>` : '<p class="muted">Aucun événement programmé.</p>'}
        </div>
        <aside class="panel cta-panel">
          ${UI.icon('Handshake', 'lg')}
          <h2>${U.esc(site.ctaTitle)}</h2>
          <p>${U.nl2br(site.ctaText)}</p>
          <a class="btn btn-primary btn-block" href="#/associations/nouvelle">${UI.icon('Plus')}Référencer mon association</a>
          <a class="btn btn-soft btn-block" href="#/agenda/nouveau">${UI.icon('CalendarDays')}Publier un événement</a>
        </aside>
      </div>
    </section>

    <section class="container section">
      <div class="section-head"><h2>À la découverte de…</h2><a href="#/carte" class="link-more">Voir la carte${UI.icon('ChevronRight')}</a></div>
      <div class="card-grid">${featured.map(V.associationCard).join('')}</div>
    </section>

    <section class="container section partners">
      <p>${U.nl2br(site.partnersText)}</p>
    </section>`;
  };

  V.home.mount = (root) => {
    root.querySelector('#hero-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim();
      Store.track('search', q);
      location.hash = `#/associations${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
  };

  V.privacy = () => `
    <section class="page-head"><div class="container"><p class="eyebrow">${UI.icon('ShieldCheck')}RGPD</p><h1>Politique de confidentialité</h1>
      <p class="lead">Comment le portail du Réseau Associatif de Walhain traite vos données personnelles.</p></div></section>
    <section class="container narrow prose">
      <h2>Responsable du traitement</h2>
      <p>L'Administration communale de Walhain est responsable des traitements réalisés via ce portail. Pour toute question ou pour exercer vos droits, contactez le délégué à la protection des données (DPO) de la Commune <em>[coordonnées du DPO à compléter]</em>.</p>
      <h2>Données collectées et finalités</h2>
      <ul>
        <li><strong>Formulaires de contact</strong> (nom, prénom, e-mail, message) : transmettre votre demande à l'association ou à l'organisateur concerné. Base légale : votre consentement. Conservation : ${WA.CONFIG.messageRetentionMonths} mois maximum.</li>
        <li><strong>Fiches associations et événements</strong> (coordonnées de la personne de contact) : publication dans le répertoire et l'agenda. Base légale : consentement de la personne qui soumet la fiche. Conservation : tant que l'association est active ou jusqu'à demande de suppression.</li>
        <li><strong>Newsletter</strong> (adresse e-mail) : envoi des événements à venir. Base légale : consentement. Désinscription possible à tout moment via le lien présent dans chaque envoi ou <a href="#/newsletter/desinscription">sur cette page</a>.</li>
        <li><strong>Statistiques d'utilisation</strong> : comptages anonymes des pages consultées et des recherches, sans cookie de traçage ni identification des visiteurs.</li>
      </ul>
      <h2>Destinataires</h2>
      <p>Vos données ne sont ni vendues ni cédées. Elles sont uniquement transmises à l'association ou l'organisateur que vous contactez, et accessibles aux agents communaux habilités.</p>
      <h2>Cookies et stockage local</h2>
      <p>Le portail n'utilise aucun cookie publicitaire. Le stockage local du navigateur sert uniquement au fonctionnement (session d'administration, préférences). La carte interactive charge des fonds de plan depuis OpenStreetMap, ce qui transmet votre adresse IP à ce service.</p>
      <h2>Vos droits</h2>
      <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de retrait du consentement. Vous pouvez également introduire une réclamation auprès de l'Autorité de protection des données (<a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener">autoriteprotectiondonnees.be</a>).</p>
    </section>`;

  V.thanks = (params, query) => `
    <section class="container narrow thanks">
      <div class="panel center">
        ${UI.icon('CircleCheck', 'xl')}
        <h1>Merci pour votre contribution !</h1>
        <p class="lead">${query.type === 'evenement' ? "Votre événement a bien été transmis. Il apparaîtra dans l'agenda dès sa validation par l'administration communale." : "Votre fiche a bien été transmise. Elle sera publiée dans le répertoire après vérification par l'administration communale."}</p>
        <div class="form-actions center"><a class="btn btn-primary" href="#/${query.type === 'evenement' ? 'agenda' : 'associations'}">Retour ${query.type === 'evenement' ? "à l'agenda" : 'au répertoire'}</a><a class="btn btn-ghost" href="#/">Accueil</a></div>
      </div>
    </section>`;

  V.unsubscribe = () => `
    <section class="container narrow thanks"><form class="panel form" id="unsub">
      <h1>Se désinscrire de la newsletter</h1>
      <label class="field"><span>Votre adresse e-mail</span><input type="email" name="email" required autocomplete="email"></label>
      <button class="btn btn-primary">Me désinscrire</button></form></section>`;
  V.unsubscribe.mount = (root) =>
    root.querySelector('#unsub').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!U.isEmail(f.email.value)) return UI.toast('Adresse e-mail invalide.', 'error');
      try {
        const ok = await Store.unsubscribe(f.email.value);
        if (ok === null) UI.toast('Si cette adresse était inscrite, elle a été désinscrite et supprimée.');
        else UI.toast(ok ? 'Vous êtes désinscrit·e. Vos données ont été supprimées.' : "Cette adresse n'était pas inscrite.", ok ? 'success' : 'error');
        f.reset();
      } catch (err) {
        UI.toast(WA.Remote.errorMessage(err), 'error');
      }
    });

  V.notFound = () => `
    <section class="container narrow thanks"><div class="panel center">${UI.icon('Map', 'xl')}<h1>Page introuvable</h1>
      <p>Ce contenu n'existe pas ou n'est pas encore publié.</p><a class="btn btn-primary" href="#/">Retour à l'accueil</a></div></section>`;
})(window.WA);
