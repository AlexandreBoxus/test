/* Module 2 : Agenda communal associatif. */
(function (WA) {
  const { U, UI, Store } = WA;
  const V = (WA.views = WA.views || {});

  const assocName = (id) => (Store.association(id) || {}).name || 'Organisateur';
  const occUrl = (o) => `#/evenement/${o.id}?date=${o.occDate}`;
  const timeRange = (o) => (o.startTime ? `${U.fmtTime(o.startTime)}${o.endTime ? ` – ${U.fmtTime(o.endTime)}` : ''}` : 'Horaire à préciser');
  const priceLabel = (o) => (o.free ? 'Gratuit' : o.price || 'Payant');

  V.eventRow = (o, { showAssoc = false } = {}) => {
    const d = U.parseDate(o.occDate);
    const t = WA.theme(o.category);
    return `<li class="event-row" style="--c:${t.color}">
      <a href="${occUrl(o)}">
        <span class="date-tile"><span class="dt-day">${d.getDate()}</span><span class="dt-month">${U.fmtDate(o.occDate, { month: 'short' }).replace('.', '')}</span></span>
        <span class="event-row-body">
          <span class="event-row-title">${U.esc(o.title)}${o.tentative ? ' <span class="tag tag-warn">à confirmer</span>' : ''}</span>
          <span class="event-row-meta">${UI.icon('Clock')}${U.esc(timeRange(o))}${o.occEndDate !== o.occDate ? ` · jusqu'au ${U.fmtShort(o.occEndDate)}` : ''}</span>
          <span class="event-row-meta">${UI.icon('MapPin')}${U.esc([o.place, o.village].filter(Boolean).join(', '))}</span>
          ${showAssoc ? `<span class="event-row-meta">${UI.icon('Users')}${U.esc(assocName(o.associationId))}</span>` : ''}
        </span>
        <span class="event-row-side"><span class="tag ${o.free ? 'tag-free' : 'tag-paid'}">${U.esc(priceLabel(o))}</span>${o.recurrence && o.recurrence.type !== 'none' ? `<span class="tag tag-soft" title="${U.esc(U.recurrenceLabel(o))}">${UI.icon('Repeat')}Récurrent</span>` : ''}</span>
      </a></li>`;
  };

  const filterEvents = (f) =>
    Store.events().filter(
      (e) =>
        (!f.association || e.associationId === f.association) &&
        (!f.village || e.village === f.village) &&
        (!f.category || e.category === f.category) &&
        (!f.price || (f.price === 'free' ? e.free : !e.free))
    );

  V.agenda = (params, query) => {
    const f = {
      view: ['month', 'week', 'list'].includes(query.view) ? query.view : 'month',
      date: /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : U.today(),
      association: query.association || '',
      village: query.village || '',
      category: query.category || '',
      price: query.price || '',
    };
    const sel = (name, label, options, value) =>
      `<label class="field-inline"><span>${label}</span><select name="${name}">${options.map(([v, l]) => `<option value="${U.esc(v)}" ${v === value ? 'selected' : ''}>${U.esc(l)}</option>`).join('')}</select></label>`;
    const viewBtn = (v, icon, label) => `<button type="button" class="seg-btn ${f.view === v ? 'active' : ''}" data-view="${v}" aria-pressed="${f.view === v}">${UI.icon(icon)}<span>${label}</span></button>`;
    return `
    <section class="page-head page-head-blue">
      <div class="container">
        <p class="eyebrow">${UI.icon('CalendarDays')}Module 2</p>
        <h1>Agenda communal associatif</h1>
        <p class="lead">Toutes les activités des associations de Walhain, au même endroit. Un agenda partagé pour éviter les conflits de dates et découvrir ce qui se passe près de chez vous.</p>
      </div>
    </section>
    <section class="container">
      <form class="filters" id="ag-filters" aria-label="Filtrer l'agenda">
        <input type="hidden" name="view" value="${f.view}">
        <div class="filter-row">
          <label class="field-inline"><span>Date</span><input type="date" name="date" value="${f.date}"></label>
          ${sel('association', 'Association', [['', 'Toutes les associations'], ...Store.associations().map((a) => [a.id, a.name])], f.association)}
          ${sel('village', 'Village', [['', 'Tous les villages'], ...WA.VILLAGES.map((v) => [v.id, v.id])], f.village)}
          ${sel('category', 'Catégorie', [['', 'Toutes les catégories'], ...WA.THEMES.map((t) => [t.id, t.label])], f.category)}
          ${sel('price', 'Tarif', [['', 'Gratuit ou payant'], ['free', 'Gratuit'], ['paid', 'Payant']], f.price)}
        </div>
      </form>
      <div class="agenda-toolbar">
        <div class="seg" role="group" aria-label="Mode d'affichage">${viewBtn('month', 'CalendarDays', 'Mois')}${viewBtn('week', 'CalendarRange', 'Semaine')}${viewBtn('list', 'List', 'Liste')}</div>
        <div class="period-nav">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="Période précédente">${UI.icon('ChevronLeft')}</button>
          <h2 id="ag-period" aria-live="polite"></h2>
          <button type="button" class="icon-btn" data-nav="1" aria-label="Période suivante">${UI.icon('ChevronRight')}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-today>Aujourd'hui</button>
        </div>
        <a class="btn btn-primary btn-sm" href="#/agenda/nouveau">${UI.icon('Plus')}Ajouter un événement</a>
      </div>
      <div id="ag-view"></div>
    </section>`;
  };

  V.agenda.mount = (root) => {
    const form = root.querySelector('#ag-filters');
    const view = root.querySelector('#ag-view');
    const period = root.querySelector('#ag-period');

    const state = () => Object.fromEntries(new FormData(form));
    const syncUrl = (f) => {
      const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === 'date' && v === U.today()))).toString();
      history.replaceState(null, '', `#/agenda${qs ? `?${qs}` : ''}`);
    };

    const render = () => {
      const f = state();
      const cursor = U.parseDate(f.date || U.today());
      const events = filterEvents(f);
      root.querySelectorAll('[data-view]').forEach((b) => {
        b.classList.toggle('active', b.dataset.view === f.view);
        b.setAttribute('aria-pressed', b.dataset.view === f.view);
      });
      if (f.view === 'month') {
        period.textContent = U.fmtMonthYear(cursor);
        view.innerHTML = renderMonth(cursor, events);
      } else if (f.view === 'week') {
        const start = U.startOfWeek(cursor);
        const end = U.addDays(start, 6);
        period.textContent = `Semaine du ${U.fmtDate(U.iso(start), { day: 'numeric', month: 'long' })} au ${U.fmtDate(U.iso(end), { day: 'numeric', month: 'long', year: 'numeric' })}`;
        view.innerHTML = renderWeek(start, events);
      } else {
        const end = U.addMonths(cursor, 6);
        period.textContent = `À partir du ${U.fmtDate(f.date, { day: 'numeric', month: 'long', year: 'numeric' })}`;
        view.innerHTML = renderList(U.iso(cursor), U.iso(U.addDays(end, -1)), events);
      }
      syncUrl(f);
    };

    form.addEventListener('input', render);
    form.addEventListener('submit', (e) => e.preventDefault());
    root.querySelector('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      form.view.value = b.dataset.view;
      render();
    });
    root.querySelector('.period-nav').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (e.target.closest('[data-today]')) form.date.value = U.today();
      else if (nav) {
        const d = U.parseDate(form.date.value || U.today());
        const n = Number(nav.dataset.nav);
        const v = form.view.value;
        form.date.value = U.iso(v === 'week' ? U.addDays(d, 7 * n) : new Date(d.getFullYear(), d.getMonth() + (v === 'list' ? 6 : 1) * n, 1));
      } else return;
      render();
    });
    view.addEventListener('click', (e) => {
      const day = e.target.closest('[data-day]');
      if (day && !e.target.closest('a')) {
        form.date.value = day.dataset.day;
        form.view.value = 'week';
        render();
      }
    });
    render();
  };

  function renderMonth(cursor, events) {
    const first = U.startOfMonth(cursor);
    const gridStart = U.startOfWeek(first);
    const last = U.endOfMonth(cursor);
    const gridEnd = U.addDays(U.startOfWeek(last), 6);
    const occ = Store.occurrences(U.iso(gridStart), U.iso(gridEnd), events);
    const byDay = {};
    occ.forEach((o) => {
      for (let d = U.parseDate(o.occDate < U.iso(gridStart) ? U.iso(gridStart) : o.occDate); U.iso(d) <= o.occEndDate && d <= gridEnd; d = U.addDays(d, 1)) {
        (byDay[U.iso(d)] = byDay[U.iso(d)] || []).push(o);
      }
    });
    const today = U.today();
    let cells = '';
    for (let d = gridStart; d <= gridEnd; d = U.addDays(d, 1)) {
      const iso = U.iso(d);
      const list = byDay[iso] || [];
      const out = d.getMonth() !== cursor.getMonth();
      cells += `<div class="cal-cell ${out ? 'out' : ''} ${iso === today ? 'today' : ''}" data-day="${iso}">
        <span class="cal-date" aria-label="${U.fmtDate(iso)}">${d.getDate()}</span>
        <ul class="cal-events">${list
          .slice(0, 3)
          .map((o) => `<li><a class="cal-chip" style="--c:${WA.theme(o.category).color}" href="${occUrl(o)}" title="${U.esc(o.title)}">${o.startTime && o.occDate === iso ? `<b>${U.fmtTime(o.startTime)}</b> ` : ''}${U.esc(o.title)}</a></li>`)
          .join('')}${list.length > 3 ? `<li class="cal-more">+${list.length - 3} autre${list.length > 4 ? 's' : ''}</li>` : ''}</ul>
        ${list.length ? `<span class="cal-dots" aria-hidden="true">${list
          .slice(0, 4)
          .map((o) => `<i style="--c:${WA.theme(o.category).color}"></i>`)
          .join('')}</span>` : ''}
      </div>`;
    }
    const inMonth = occ.filter((o) => o.occEndDate >= U.iso(first) && o.occDate <= U.iso(last));
    return `<div class="calendar" role="grid" aria-label="Calendrier mensuel">
        <div class="cal-head">${U.WEEKDAYS_SHORT.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="cal-mobile-list">
        <h3>${inMonth.length} événement${inMonth.length > 1 ? 's' : ''} ce mois-ci</h3>
        ${inMonth.length ? `<ul class="event-list">${inMonth.map((o) => V.eventRow(o, { showAssoc: true })).join('')}</ul>` : '<p class="muted">Aucun événement ce mois-ci.</p>'}
      </div>`;
  }

  function renderWeek(start, events) {
    const end = U.addDays(start, 6);
    const occ = Store.occurrences(U.iso(start), U.iso(end), events);
    const today = U.today();
    let cols = '';
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(start, i);
      const iso = U.iso(d);
      const list = occ.filter((o) => o.occDate <= iso && o.occEndDate >= iso);
      cols += `<section class="week-col ${iso === today ? 'today' : ''}">
        <h3><span>${U.WEEKDAYS[i]}</span><strong>${d.getDate()} ${U.fmtDate(iso, { month: 'short' })}</strong></h3>
        ${
          list.length
            ? list
                .map(
                  (o) => `<a class="week-event" href="${occUrl(o)}" style="--c:${WA.theme(o.category).color}">
            <span class="we-time">${U.esc(o.startTime ? timeRange(o) : 'Toute la journée')}</span>
            <span class="we-title">${U.esc(o.title)}</span>
            <span class="we-meta">${UI.icon('MapPin')}${U.esc(o.village)}</span>
            <span class="we-meta">${U.esc(assocName(o.associationId))}</span>
            ${o.tentative ? '<span class="tag tag-warn">à confirmer</span>' : ''}</a>`
                )
                .join('')
            : '<p class="week-empty">—</p>'
        }</section>`;
    }
    return `<div class="week">${cols}</div>`;
  }

  function renderList(fromIso, toIso, events) {
    const occ = Store.occurrences(fromIso, toIso, events);
    if (!occ.length) return `<div class="empty">${UI.icon('CalendarDays')}<p>Aucun événement ne correspond à ces critères.</p></div>`;
    const groups = {};
    occ.forEach((o) => {
      const k = o.occDate.slice(0, 7);
      (groups[k] = groups[k] || []).push(o);
    });
    return Object.entries(groups)
      .map(([k, list]) => `<section class="list-group"><h3 class="list-month">${U.fmtMonthYear(U.parseDate(`${k}-01`))}</h3><ul class="event-list">${list.map((o) => V.eventRow(o, { showAssoc: true })).join('')}</ul></section>`)
      .join('');
  }

  /* ---------------- Fiche activité ---------------- */
  V.eventDetail = (params, query) => {
    const e = Store.event(params.id);
    if (!e || (e.status !== 'published' && !Store.isAdmin())) return V.notFound();
    Store.track('event', e.id);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : e.date;
    const occ = U.expandOccurrences(e, date, date)[0] || U.expandOccurrences(e, e.date, e.date)[0];
    const a = Store.association(e.associationId);
    const t = WA.theme(e.category);
    const next = Store.occurrences(U.today(), U.iso(U.addDays(new Date(), 180)), [e]).filter((o) => o.occDate !== occ.occDate).slice(0, 4);
    const reg = U.safeUrl(e.registrationUrl);
    return `
    <article class="detail">
      <header class="detail-hero" style="--c:${t.color}">
        <div class="container detail-hero-inner">
          <a class="back-link" href="#/agenda">${UI.icon('ArrowLeft')}Retour à l'agenda</a>
          ${e.status !== 'published' ? `<p class="notice notice-warn">${UI.icon('Hourglass')}Événement en attente de validation.</p>` : ''}
          <div class="detail-title">${UI.themeIcon(t.id, 'lg')}
            <div><p class="eyebrow light">${U.esc(t.label)}</p><h1>${U.esc(e.title)}</h1>
            <p class="lead">${U.fmtDate(occ.occDate)}${occ.occEndDate !== occ.occDate ? ` → ${U.fmtDate(occ.occEndDate)}` : ''}</p></div>
          </div>
          ${e.tentative ? `<p class="notice notice-light">${UI.icon('Info')}Date ou horaire à confirmer par l'organisateur.</p>` : ''}
        </div>
      </header>
      <div class="container detail-grid event-grid">
        <div class="detail-main">
          ${e.image ? UI.cover(e, { themeId: e.category, label: e.title, cls: 'detail-photo poster' }) : ''}
          <section class="panel"><h2>${UI.icon('Info')}Description</h2><p>${U.nl2br(e.description || 'Pas de description pour le moment.')}</p></section>
          ${next.length ? `<section class="panel"><h2>${UI.icon('Repeat')}Prochaines dates</h2><p class="muted">${U.esc(U.recurrenceLabel(e))}</p><ul class="event-list compact">${next.map((o) => V.eventRow(o)).join('')}</ul></section>` : ''}
        </div>
        <aside class="detail-side">
          <section class="panel sticky">
            <h2>${UI.icon('CalendarDays')}Infos pratiques</h2>
            <dl class="facts">
              <div><dt>${UI.icon('Calendar')}Date</dt><dd>${U.fmtDate(occ.occDate)}${occ.occEndDate !== occ.occDate ? `<br>au ${U.fmtDate(occ.occEndDate)}` : ''}</dd></div>
              <div><dt>${UI.icon('Clock')}Horaire</dt><dd>${U.esc(timeRange(e))}</dd></div>
              <div><dt>${UI.icon('MapPin')}Lieu</dt><dd>${U.esc(e.place || 'À préciser')}<br><span class="badge badge-village">${U.esc(e.village)}</span></dd></div>
              <div><dt>${UI.icon('Euro')}Prix</dt><dd><span class="tag ${e.free ? 'tag-free' : 'tag-paid'}">${U.esc(priceLabel(e))}</span></dd></div>
              ${e.seats ? `<div><dt>${UI.icon('Ticket')}Places</dt><dd>${U.esc(e.seats)} places</dd></div>` : ''}
              <div><dt>${UI.icon('Users')}Organisateur</dt><dd>${a ? `<a href="#/associations/${a.id}">${U.esc(a.name)}</a>` : 'Organisateur'}</dd></div>
              ${e.contactName || e.contactEmail || e.contactPhone ? `<div><dt>${UI.icon('User')}Contact</dt><dd>${U.esc(e.contactName)}${e.contactEmail ? `<br><a href="mailto:${U.esc(e.contactEmail)}">${U.esc(e.contactEmail)}</a>` : ''}${e.contactPhone ? `<br><a href="tel:${U.esc(e.contactPhone.replace(/[^+\d]/g, ''))}">${U.esc(e.contactPhone)}</a>` : ''}</dd></div>` : ''}
            </dl>
            ${reg ? `<a class="btn btn-accent btn-block" href="${U.esc(reg)}" target="_blank" rel="noopener">${UI.icon('Ticket')}S'inscrire</a>` : ''}
            <button class="btn btn-primary btn-block" id="contact-org">${UI.icon('Send')}Contacter l'organisateur</button>
            <button class="btn btn-ghost btn-block btn-sm" id="ics">${UI.icon('CalendarDays')}Ajouter à mon agenda (.ics)</button>
            <h3 class="share-title">Partager</h3>
            ${UI.shareButtons(e.title)}
          </section>
        </aside>
      </div>
    </article>`;
  };

  V.eventDetail.mount = (root, params, query) => {
    const e = Store.event(params.id);
    if (!e) return;
    const a = Store.association(e.associationId);
    const date = query.date || e.date;
    const occ = U.expandOccurrences(e, date, date)[0] || U.expandOccurrences(e, e.date, e.date)[0];
    root.querySelector('#contact-org').addEventListener('click', () =>
      UI.contactForm({
        recipientType: 'event',
        recipientId: e.id,
        recipientName: a ? a.name : e.contactName || 'Organisateur',
        recipientEmail: e.contactEmail || (a && a.email),
        subject: `Contacter l'organisateur – ${e.title}`,
      })
    );
    root.querySelector('#ics').addEventListener('click', () => UI.downloadIcs(occ));
  };
})(window.WA);
