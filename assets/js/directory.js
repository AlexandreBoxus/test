/* Module 1 : Répertoire des associations (liste, filtres, fiche détaillée). */
(function (WA) {
  const { U, UI, Store } = WA;
  const V = (WA.views = WA.views || {});

  const matches = (a, f) => {
    if (f.village && !a.villages.includes(f.village)) return false;
    if (f.theme && !a.themes.includes(f.theme)) return false;
    if (f.public && !(a.audiences || []).includes(f.public)) return false;
    if (f.q) {
      const hay = U.norm([a.name, a.shortDescription, a.description, (a.keywords || []).join(' '), (a.activities || []).map((x) => x.name).join(' '), a.villages.join(' '), a.themes.map((t) => WA.theme(t).label).join(' ')].join(' '));
      return U.norm(f.q)
        .split(/\s+/)
        .every((w) => hay.includes(w));
    }
    return true;
  };

  V.associationCard = (a) => {
    const t = WA.theme(a.themes[0]);
    return `<article class="card assoc-card">
      <a class="card-media" href="#/associations/${a.id}" tabindex="-1" aria-hidden="true">${UI.cover(a, { label: a.name })}</a>
      <div class="card-body">
        <div class="card-themes">${UI.themeIcon(t.id)}${a.themes
          .slice(1)
          .map((x) => UI.themeIcon(x, 'sm'))
          .join('')}<span class="card-theme-label" style="color:${t.color}">${U.esc(t.label)}</span></div>
        <h3 class="card-title"><a href="#/associations/${a.id}">${U.esc(a.name)}</a></h3>
        <p class="card-text">${U.esc(a.shortDescription)}</p>
        ${UI.villageBadges(a.villages.length === WA.VILLAGES.length ? ['Toute la commune'] : a.villages)}
      </div>
      <div class="card-foot"><a class="btn btn-primary btn-block" href="#/associations/${a.id}">Voir la fiche${UI.icon('ChevronRight')}</a></div>
    </article>`;
  };

  V.directory = (params, query) => {
    const f = { q: query.q || '', village: query.village || '', theme: query.theme || '', public: query.public || '' };
    const opt = (list, val, getId, getLabel) => list.map((x) => `<option value="${U.esc(getId(x))}" ${getId(x) === val ? 'selected' : ''}>${U.esc(getLabel(x))}</option>`).join('');
    return `
    <section class="page-head">
      <div class="container">
        <p class="eyebrow">${UI.icon('Users')}Module 1</p>
        <h1>Répertoire des associations</h1>
        <p class="lead">Découvrez les associations qui font vivre les cinq villages de Walhain et entrez en contact avec elles.</p>
      </div>
    </section>
    <section class="container">
      <form class="filters" id="dir-filters" role="search" aria-label="Rechercher une association">
        <label class="search-field">${UI.icon('Search')}<span class="sr-only">Rechercher</span>
          <input type="search" name="q" value="${U.esc(f.q)}" placeholder="Rechercher une association, une activité, un mot-clé…" autocomplete="off">
        </label>
        <div class="filter-row">
          <label class="field-inline"><span>Village</span><select name="village"><option value="">Tous les villages</option>${opt(WA.VILLAGES, f.village, (v) => v.id, (v) => v.id)}</select></label>
          <label class="field-inline"><span>Thématique</span><select name="theme"><option value="">Toutes les thématiques</option>${opt(WA.THEMES, f.theme, (t) => t.id, (t) => t.label)}</select></label>
          <label class="field-inline"><span>Public cible</span><select name="public"><option value="">Tous les publics</option>${opt(WA.AUDIENCES, f.public, (x) => x.id, (x) => x.label)}</select></label>
          <button type="button" class="btn btn-ghost btn-sm" id="dir-reset">${UI.icon('RotateCcw')}Réinitialiser</button>
        </div>
        <div class="theme-strip" role="group" aria-label="Filtrer par thématique">
          ${WA.THEMES.map((t) => `<button type="button" class="theme-pill ${f.theme === t.id ? 'active' : ''}" style="--c:${t.color}" data-theme="${t.id}" aria-pressed="${f.theme === t.id}">${UI.icon(t.icon)}<span>${U.esc(t.label)}</span></button>`).join('')}
        </div>
      </form>
      <div class="results-bar"><p id="dir-count" aria-live="polite"></p>
        <a class="btn btn-soft btn-sm" href="#/associations/nouvelle">${UI.icon('Plus')}Ajouter une association</a></div>
      <div class="card-grid" id="dir-results"></div>
    </section>`;
  };

  V.directory.mount = (root, params, query) => {
    const form = root.querySelector('#dir-filters');
    const results = root.querySelector('#dir-results');
    const count = root.querySelector('#dir-count');
    const all = Store.associations();
    const render = () => {
      const f = Object.fromEntries(new FormData(form));
      const list = all.filter((a) => matches(a, f));
      count.textContent = `${list.length} association${list.length > 1 ? 's' : ''} ${list.length === all.length ? 'référencées' : 'trouvée' + (list.length > 1 ? 's' : '')}`;
      results.innerHTML = list.length
        ? list.map(V.associationCard).join('')
        : `<div class="empty">${UI.icon('Search')}<p>Aucune association ne correspond à votre recherche.</p><button class="btn btn-ghost" type="button" data-reset>Effacer les filtres</button></div>`;
      root.querySelectorAll('.theme-pill').forEach((b) => {
        b.classList.toggle('active', b.dataset.theme === f.theme);
        b.setAttribute('aria-pressed', b.dataset.theme === f.theme);
      });
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
      history.replaceState(null, '', `#/associations${qs ? `?${qs}` : ''}`);
    };
    const trackSearch = U.debounce((q) => Store.track('search', q), 1200);
    form.addEventListener('input', (e) => {
      if (e.target.name === 'q') trackSearch(e.target.value);
      render();
    });
    form.addEventListener('submit', (e) => e.preventDefault());
    const reset = () => {
      form.reset();
      form.q.value = '';
      [...form.querySelectorAll('select')].forEach((s) => (s.value = ''));
      render();
    };
    root.querySelector('#dir-reset').addEventListener('click', reset);
    results.addEventListener('click', (e) => e.target.closest('[data-reset]') && reset());
    root.querySelector('.theme-strip').addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      form.theme.value = form.theme.value === b.dataset.theme ? '' : b.dataset.theme;
      render();
    });
    render();
  };

  /* ---------------- Fiche détaillée ---------------- */
  V.associationDetail = (params) => {
    const a = Store.association(params.id);
    if (!a || (a.status !== 'published' && !Store.isAdmin())) return V.notFound();
    Store.track('association', a.id);
    const t = WA.theme(a.themes[0]);
    const today = U.today();
    const upcoming = Store.occurrences(today, U.iso(U.addDays(new Date(), 365)), Store.events().filter((e) => e.associationId === a.id)).slice(0, 5);
    const link = (href, icon, label) => (href ? `<li><a href="${U.esc(href)}" target="_blank" rel="noopener">${UI.icon(icon)}<span>${U.esc(label)}</span>${UI.icon('ExternalLink', 'ext')}</a></li>` : '');
    const socials = a.socials || {};
    const hasContact = a.contactName || a.email || a.phone || a.website || socials.facebook || socials.instagram || socials.other;
    return `
    <article class="detail">
      <header class="detail-hero" style="--c:${t.color}">
        <div class="container detail-hero-inner">
          <a class="back-link" href="#/associations">${UI.icon('ArrowLeft')}Retour au répertoire</a>
          ${a.status !== 'published' ? `<p class="notice notice-warn">${UI.icon('Hourglass')}Fiche en attente de validation – visible uniquement par l'administration.</p>` : ''}
          <div class="detail-title">
            ${UI.themeIcon(t.id, 'lg')}
            <div><p class="eyebrow light">${a.themes.map((x) => U.esc(WA.theme(x).label)).join(' · ')}</p><h1>${U.esc(a.name)}</h1>
            <p class="lead">${U.esc(a.shortDescription)}</p></div>
          </div>
          ${UI.villageBadges(a.villages)}
        </div>
      </header>
      <div class="container detail-grid">
        <div class="detail-main">
          ${a.photo ? UI.cover(a, { label: a.name, cls: 'detail-photo' }) : ''}
          <section class="panel"><h2>${UI.icon('Info')}Présentation</h2><p>${U.nl2br(a.description)}</p>
            ${a.history ? `<h3>Historique et fonctionnement</h3><p>${U.nl2br(a.history)}</p>` : ''}
            ${(a.audiences || []).length ? `<h3>Public cible</h3><ul class="badges">${a.audiences.map((x) => `<li class="badge">${U.esc((WA.audience(x) || {}).label || x)}</li>`).join('')}</ul>` : ''}
            ${(a.keywords || []).length ? `<h3>Mots-clés</h3><ul class="badges">${a.keywords.map((k) => `<li class="badge badge-soft">#${U.esc(k)}</li>`).join('')}</ul>` : ''}
          </section>
          <section class="panel"><h2>${UI.icon('Repeat')}Activités récurrentes</h2>
            ${
              (a.activities || []).length
                ? `<div class="table-wrap"><table class="table"><thead><tr><th>Activité</th><th>Fréquence</th><th>Jour</th><th>Heure</th><th>Lieu</th></tr></thead><tbody>${a.activities
                    .map((x) => `<tr><td data-label="Activité"><strong>${U.esc(x.name)}</strong></td><td data-label="Fréquence">${U.esc(x.frequency) || '–'}</td><td data-label="Jour">${U.esc(x.day) || '–'}</td><td data-label="Heure">${U.esc(U.fmtTime(x.time)) || '–'}</td><td data-label="Lieu">${U.esc(x.place) || '–'}</td></tr>`)
                    .join('')}</tbody></table></div>`
                : '<p class="muted">Aucune activité récurrente renseignée.</p>'
            }
          </section>
          <section class="panel"><h2>${UI.icon('CalendarDays')}Prochains événements</h2>
            ${upcoming.length ? `<ul class="event-list compact">${upcoming.map((o) => V.eventRow(o)).join('')}</ul>` : '<p class="muted">Aucun événement programmé pour le moment.</p>'}
            <a class="btn btn-soft btn-sm" href="#/agenda/nouveau?association=${a.id}">${UI.icon('Plus')}Proposer un événement</a>
          </section>
          ${
            a.partners || a.needs
              ? `<section class="panel panel-accent"><h2>${UI.icon('Handshake')}Collaborations</h2>
            ${a.partners ? `<h3>Partenaires</h3><p>${U.nl2br(a.partners)}</p>` : ''}
            ${a.needs ? `<h3>Appel à collaboration</h3><p>${U.nl2br(a.needs)}</p>` : ''}</section>`
              : ''
          }
        </div>
        <aside class="detail-side">
          <section class="panel sticky">
            <h2>${UI.icon('Mail')}Contact</h2>
            ${
              hasContact
                ? `<ul class="contact-list">
                ${a.contactName ? `<li>${UI.icon('User')}<span>${U.esc(a.contactName)}</span></li>` : ''}
                ${a.email ? `<li><a href="mailto:${U.esc(a.email)}">${UI.icon('Mail')}<span>${U.esc(a.email)}</span></a></li>` : ''}
                ${a.phone ? `<li><a href="tel:${U.esc(a.phone.replace(/[^+\d]/g, ''))}">${UI.icon('Phone')}<span>${U.esc(a.phone)}</span></a></li>` : ''}
                ${link(U.safeUrl(a.website), 'Globe', 'Site web')}
                ${link(U.safeUrl(socials.facebook), 'Facebook', 'Facebook')}
                ${link(U.safeUrl(socials.instagram), 'Instagram', 'Instagram')}
                ${link(U.safeUrl(socials.other), 'Link', 'Autre réseau')}
              </ul>`
                : `<p class="muted small">Les coordonnées de cette association n'ont pas encore été publiées. Utilisez le formulaire ci-dessous : votre message sera relayé.</p>`
            }
            ${a.address ? `<p class="address">${UI.icon('MapPin')}<span>${U.esc(a.address)}</span></p>` : ''}
            <button class="btn btn-primary btn-block" id="contact-assoc">${UI.icon('Send')}Contacter cette association</button>
            <div class="side-actions">
              <button class="btn btn-ghost btn-sm" id="export-pdf">${UI.icon('FileDown')}Exporter en PDF</button>
              <a class="btn btn-ghost btn-sm" href="#/associations/${a.id}/modifier">${UI.icon('Pencil')}Modifier la fiche</a>
              <a class="btn btn-ghost btn-sm" href="#/carte?focus=${a.id}">${UI.icon('Map')}Voir sur la carte</a>
            </div>
            <h3 class="share-title">Partager</h3>
            ${UI.shareButtons(a.name)}
          </section>
        </aside>
      </div>
    </article>`;
  };

  V.associationDetail.mount = (root, params) => {
    const a = Store.association(params.id);
    if (!a) return;
    const btn = root.querySelector('#contact-assoc');
    btn &&
      btn.addEventListener('click', () =>
        UI.contactForm({ recipientType: 'association', recipientId: a.id, recipientName: a.name, recipientEmail: a.email, subject: `Contacter ${a.name}` })
      );
    const pdf = root.querySelector('#export-pdf');
    pdf && pdf.addEventListener('click', () => UI.exportAssociationPdf(a));
  };
})(window.WA);
