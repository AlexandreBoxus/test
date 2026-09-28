/* Composants d'interface réutilisables. */
(function (WA) {
  const { U } = WA;
  const UI = {};

  UI.icon = (name, cls = '', label = '') => {
    const body = WA.ICONS[name] || WA.ICONS.Info;
    const a11y = label ? `role="img" aria-label="${U.esc(label)}"` : 'aria-hidden="true" focusable="false"';
    return `<svg class="icon ${cls}" ${a11y} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  };

  UI.themeChip = (id, { compact = false } = {}) => {
    const t = WA.theme(id);
    return `<span class="theme-chip" style="--c:${t.color}" title="${U.esc(t.label)}">${UI.icon(t.icon)}${compact ? `<span class="sr-only">${U.esc(t.label)}</span>` : `<span>${U.esc(t.label)}</span>`}</span>`;
  };

  UI.themeIcon = (id, size = '') => {
    const t = WA.theme(id);
    return `<span class="theme-icon ${size}" style="--c:${t.color}" title="${U.esc(t.label)}">${UI.icon(t.icon, '', t.label)}</span>`;
  };

  UI.villageBadges = (villages = []) =>
    `<ul class="badges" aria-label="Villages concernés">${villages
      .map((v) => `<li class="badge badge-village">${UI.icon('MapPin')}${U.esc(v)}</li>`)
      .join('')}</ul>`;

  /** Visuel : photo si disponible, sinon illustration aux couleurs de la thématique. */
  UI.cover = (item, { themeId, label, cls = '' } = {}) => {
    const img = item.photo || item.image;
    const t = WA.theme(themeId || (item.themes && item.themes[0]) || item.category);
    if (img) return `<div class="cover ${cls}"><img src="${U.esc(img)}" alt="${U.esc(label || '')}" loading="lazy"></div>`;
    return `<div class="cover cover-placeholder ${cls}" style="--c:${t.color}" aria-hidden="true">
      <svg class="cover-hills" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 90 Q60 50 130 78 T260 70 T400 60 V120 H0Z" opacity=".18"/><path d="M0 105 Q90 70 190 96 T400 88 V120 H0Z" opacity=".28"/></svg>
      <span class="cover-initials">${U.esc(U.initials(label || item.name || item.title))}</span>
      <span class="cover-icon">${UI.icon(t.icon)}</span>
    </div>`;
  };

  /* ---------------- Notifications ---------------- */
  UI.toast = (message, type = 'success') => {
    const zone = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `${UI.icon(type === 'error' ? 'CircleAlert' : 'CircleCheck')}<span>${U.esc(message)}</span>`;
    zone.appendChild(el);
    while (zone.children.length > 3) zone.firstElementChild.remove();
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4700);
  };

  /* ---------------- Modales accessibles ---------------- */
  let lastFocus = null;
  UI.modal = (html, { title = '', size = '', onClose } = {}) => {
    UI.closeModal();
    lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'modal';
    wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-head"><h2 id="modal-title">${U.esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Fermer">${UI.icon('X')}</button></header>
      <div class="modal-body">${html}</div></div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const close = () => {
      UI.closeModal();
      onClose && onClose();
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = [...wrap.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    });
    const first = wrap.querySelector('.modal-body input, .modal-body textarea, .modal-body button, [data-close]');
    first && first.focus();
    return wrap.querySelector('.modal');
  };
  UI.closeModal = () => {
    const m = document.getElementById('modal');
    if (m) {
      m.remove();
      document.body.classList.remove('no-scroll');
      lastFocus && lastFocus.focus && lastFocus.focus();
    }
  };
  UI.confirm = (message, { confirmLabel = 'Confirmer', danger = false } = {}) =>
    new Promise((resolve) => {
      const m = UI.modal(
        `<p>${U.esc(message)}</p><div class="form-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${U.esc(confirmLabel)}</button></div>`,
        { title: 'Confirmation', size: 'modal-sm', onClose: () => resolve(false) }
      );
      m.querySelector('[data-ok]').addEventListener('click', () => {
        UI.closeModal();
        resolve(true);
      });
    });

  /* ---------------- Formulaire de contact (association / organisateur) ---------------- */
  UI.contactForm = ({ recipientType, recipientId, recipientName, recipientEmail, subject }) => {
    const m = UI.modal(
      `<form class="form" novalidate>
        <p class="muted">Votre message sera transmis à <strong>${U.esc(recipientName)}</strong>${recipientEmail ? '' : " par l'intermédiaire de l'administration communale"}.</p>
        <div class="grid-2">
          <label class="field"><span>Nom *</span><input name="lastName" required autocomplete="family-name"></label>
          <label class="field"><span>Prénom *</span><input name="firstName" required autocomplete="given-name"></label>
        </div>
        <label class="field"><span>Adresse e-mail *</span><input type="email" name="email" required autocomplete="email"></label>
        <label class="field"><span>Message *</span><textarea name="message" rows="5" required minlength="10"></textarea></label>
        <label class="check"><input type="checkbox" name="consent" required><span>J'accepte que mes données soient transmises au destinataire afin qu'il puisse me répondre. <a href="#/confidentialite" target="_blank">Politique de confidentialité</a></span></label>
        <div class="hp" aria-hidden="true"><label>Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary">${UI.icon('Send')}Envoyer</button></div>
      </form>`,
      { title: subject || 'Contacter' }
    );
    m.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const d = Object.fromEntries(new FormData(f));
      if (d.website) return UI.closeModal(); // pot de miel anti-spam
      const errors = [];
      if (!d.lastName.trim()) errors.push('nom');
      if (!d.firstName.trim()) errors.push('prénom');
      if (!U.isEmail(d.email)) errors.push('adresse e-mail valide');
      if (d.message.trim().length < 10) errors.push('message (10 caractères min.)');
      if (!d.consent) errors.push('consentement');
      if (errors.length) return UI.formError(f, `Veuillez compléter : ${errors.join(', ')}.`);
      WA.Store.addMessage({
        to: { type: recipientType, id: recipientId, name: recipientName, email: recipientEmail || '' },
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        email: d.email.trim(),
        message: d.message.trim(),
      });
      UI.closeModal();
      UI.toast('Merci ! Votre message a bien été transmis.');
    });
  };

  UI.formError = (form, message) => {
    let box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      form.prepend(box);
    }
    box.innerHTML = `${UI.icon('CircleAlert')}<span>${U.esc(message)}</span>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /* ---------------- Partage ---------------- */
  UI.shareButtons = (title) =>
    `<div class="share" data-share-title="${U.esc(title)}">
      <button type="button" class="btn btn-soft btn-sm" data-share="facebook">${UI.icon('Facebook')}Facebook</button>
      <button type="button" class="btn btn-soft btn-sm" data-share="instagram">${UI.icon('Instagram')}Instagram</button>
      <button type="button" class="btn btn-soft btn-sm" data-share="copy">${UI.icon('Link')}Copier le lien</button>
    </div>`;

  UI.handleShare = async (kind, title) => {
    const url = location.href;
    WA.Store.track('share');
    if (kind === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,width=620,height=560');
      return;
    }
    if (kind === 'instagram' && navigator.share) {
      try {
        await navigator.share({ title, text: `${title} – Réseau Associatif de Walhain`, url });
        return;
      } catch (e) {
        /* annulé : on retombe sur la copie du lien */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      /* presse-papiers indisponible */
    }
    if (kind === 'instagram') {
      UI.toast("Lien copié : collez-le dans votre story ou votre bio Instagram (Instagram ne permet pas le partage direct depuis un site web).");
      window.open('https://www.instagram.com/', '_blank', 'noopener');
    } else UI.toast('Lien copié dans le presse-papiers.');
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    UI.handleShare(b.dataset.share, b.closest('.share').dataset.shareTitle);
  });

  /* ---------------- Export PDF (via l'impression du navigateur) ---------------- */
  UI.exportAssociationPdf = (a) => {
    const w = window.open('', '_blank');
    if (!w) return UI.toast("Autorisez l'ouverture des fenêtres pour exporter la fiche.", 'error');
    WA.Store.track('export');
    const themes = a.themes.map((t) => WA.theme(t).label).join(' · ');
    const row = (label, value) => (value ? `<tr><th>${label}</th><td>${U.esc(value)}</td></tr>` : '');
    const activities = (a.activities || [])
      .map((x) => `<tr><td>${U.esc(x.name)}</td><td>${U.esc(x.frequency)}</td><td>${U.esc(x.day)}</td><td>${U.esc(x.time)}</td><td>${U.esc(x.place)}</td></tr>`)
      .join('');
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche – ${U.esc(a.name)}</title>
      <style>
        @page { margin: 16mm; }
        body { font: 11pt/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2a24; margin: 0; }
        header { border-bottom: 3px solid #2f6b35; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: end; gap: 16px; }
        header small { color: #5b6660; text-transform: uppercase; letter-spacing: .08em; font-size: 8pt; }
        h1 { font-family: Georgia, serif; color: #1f4d2a; margin: 4px 0 0; font-size: 20pt; }
        h2 { font-family: Georgia, serif; color: #2f6b35; font-size: 13pt; margin: 18px 0 6px; border-bottom: 1px solid #d9d2c3; padding-bottom: 3px; }
        .photo { width: 100%; max-height: 220px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
        .tags span { display: inline-block; background: #efe8da; border-radius: 99px; padding: 2px 10px; margin: 0 4px 4px 0; font-size: 9pt; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e6e0d4; vertical-align: top; }
        th { width: 32%; color: #4b5650; font-weight: 600; }
        .acts th { width: auto; background: #f5f0e6; }
        footer { margin-top: 24px; font-size: 8pt; color: #7a847e; border-top: 1px solid #e6e0d4; padding-top: 6px; }
      </style></head><body>
      <header><div><small>Réseau Associatif de Walhain</small><h1>${U.esc(a.name)}</h1></div><div class="tags">${themes
        .split(' · ')
        .map((t) => `<span>${U.esc(t)}</span>`)
        .join('')}</div></header>
      ${a.photo ? `<img class="photo" src="${U.esc(a.photo)}" alt="">` : ''}
      <p><strong>${U.esc(a.shortDescription)}</strong></p>
      <p>${U.nl2br(a.description)}</p>
      ${a.history ? `<h2>Historique et présentation</h2><p>${U.nl2br(a.history)}</p>` : ''}
      <h2>Informations pratiques</h2><table>
        ${row('Village(s)', a.villages.join(', '))}
        ${row('Public', (a.audiences || []).map((x) => (WA.audience(x) || {}).label).join(', '))}
        ${row('Adresse', a.address)}
        ${row('Personne de contact', a.contactName)}
        ${row('E-mail', a.email)}
        ${row('Téléphone', a.phone)}
        ${row('Site web', a.website)}
        ${row('Facebook', a.socials && a.socials.facebook)}
        ${row('Instagram', a.socials && a.socials.instagram)}
      </table>
      ${activities ? `<h2>Activités récurrentes</h2><table class="acts"><tr><th>Activité</th><th>Fréquence</th><th>Jour</th><th>Heure</th><th>Lieu</th></tr>${activities}</table>` : ''}
      ${a.partners ? `<h2>Partenariats</h2><p>${U.nl2br(a.partners)}</p>` : ''}
      ${a.needs ? `<h2>Appel à collaboration</h2><p>${U.nl2br(a.needs)}</p>` : ''}
      <footer>Fiche générée le ${U.fmtDate(U.today(), { day: 'numeric', month: 'long', year: 'numeric' })} depuis le portail du Réseau Associatif de Walhain – ${U.esc(location.href)}</footer>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
      </body></html>`);
    w.document.close();
  };

  /* ---------------- Fichier .ics (ajout à l'agenda personnel) ---------------- */
  UI.downloadIcs = (occ) => {
    const d = (iso, t) => iso.replace(/-/g, '') + (t ? `T${t.replace(':', '')}00` : '');
    const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const allDay = !occ.startTime;
    const endIso = allDay ? U.iso(U.addDays(U.parseDate(occ.occEndDate), 1)) : occ.occEndDate;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Reseau Associatif de Walhain//FR',
      'BEGIN:VEVENT',
      `UID:${occ.occKey}@reseau-associatif-walhain`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      allDay ? `DTSTART;VALUE=DATE:${d(occ.occDate)}` : `DTSTART:${d(occ.occDate, occ.startTime)}`,
      allDay ? `DTEND;VALUE=DATE:${d(endIso)}` : `DTEND:${d(endIso, occ.endTime || occ.startTime)}`,
      `SUMMARY:${esc(occ.title)}`,
      `DESCRIPTION:${esc(occ.description)}`,
      `LOCATION:${esc([occ.place, occ.village].filter(Boolean).join(', '))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    U.download(`${U.slugify(occ.title)}.ics`, lines.join('\r\n'), 'text/calendar');
  };

  WA.UI = UI;
})(window.WA);
