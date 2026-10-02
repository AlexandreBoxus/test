/* Formulaires collaboratifs : ajout / modification d'associations et d'événements. */
(function (WA) {
  const { U, UI, Store } = WA;
  const V = (WA.views = WA.views || {});

  const checkboxes = (name, items, selected, getId, getLabel, extra = () => '') =>
    `<div class="checks">${items
      .map((x) => `<label class="check-pill"><input type="checkbox" name="${name}" value="${U.esc(getId(x))}" ${selected.includes(getId(x)) ? 'checked' : ''}><span>${extra(x)}${U.esc(getLabel(x))}</span></label>`)
      .join('')}</div>`;

  const imageField = (name, label, value, hint) => `
    <div class="field image-field">
      <span>${label}</span>
      <div class="image-drop">
        <div class="image-preview" data-preview="${name}">${value ? `<img src="${U.esc(value)}" alt="Aperçu">` : UI.icon('Image')}</div>
        <div>
          <label class="btn btn-soft btn-sm file-btn">${UI.icon('Upload')}Choisir une image<input type="file" accept="image/*" data-image="${name}"></label>
          <button type="button" class="btn btn-ghost btn-sm" data-clear-image="${name}" ${value ? '' : 'hidden'}>${UI.icon('Trash2')}Retirer</button>
          <p class="hint">${hint}</p>
        </div>
        <input type="hidden" name="${name}" value="${U.esc(value || '')}">
      </div>
    </div>`;

  const bindImage = (root) => {
    root.querySelectorAll('[data-image]').forEach((input) =>
      input.addEventListener('change', async () => {
        const name = input.dataset.image;
        try {
          const data = await U.resizeImage(input.files[0]);
          root.querySelector(`input[name="${name}"]`).value = data;
          root.querySelector(`[data-preview="${name}"]`).innerHTML = `<img src="${data}" alt="Aperçu">`;
          root.querySelector(`[data-clear-image="${name}"]`).hidden = false;
        } catch (e) {
          UI.toast(e.message, 'error');
        }
      })
    );
    root.querySelectorAll('[data-clear-image]').forEach((b) =>
      b.addEventListener('click', () => {
        const name = b.dataset.clearImage;
        root.querySelector(`input[name="${name}"]`).value = '';
        root.querySelector(`[data-preview="${name}"]`).innerHTML = UI.icon('Image');
        b.hidden = true;
      })
    );
  };

  /* ================= Association ================= */
  const activityRow = (x = {}) => `
    <div class="activity-row">
      <label class="field"><span>Nom de l'activité</span><input data-k="name" value="${U.esc(x.name)}" placeholder="Ex. : Entraînement"></label>
      <label class="field"><span>Fréquence</span><select data-k="frequency"><option value="">—</option>${WA.FREQUENCIES.map((f) => `<option ${f === x.frequency ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Jour</span><input data-k="day" value="${U.esc(x.day)}" placeholder="Ex. : Mercredi" list="weekdays"></label>
      <label class="field"><span>Heure</span><input data-k="time" value="${U.esc(x.time)}" placeholder="Ex. : 18:00"></label>
      <label class="field"><span>Lieu</span><input data-k="place" value="${U.esc(x.place)}" placeholder="Ex. : Salle communale"></label>
      <button type="button" class="icon-btn danger" data-remove-activity aria-label="Supprimer cette activité">${UI.icon('Trash2')}</button>
    </div>`;

  V.associationForm = (params) => {
    const editing = params.id ? Store.association(params.id) : null;
    if (params.id && !editing) return V.notFound();
    const a = editing || { themes: [], villages: [], audiences: [], activities: [], socials: {}, keywords: [] };
    const admin = Store.isAdmin();
    const socials = a.socials || {};
    return `
    <section class="page-head page-head-sand">
      <div class="container">
        <a class="back-link" href="${editing ? `#/associations/${a.id}` : '#/associations'}">${UI.icon('ArrowLeft')}Retour</a>
        <h1>${editing ? `Modifier la fiche « ${U.esc(a.name)} »` : 'Ajouter une association'}</h1>
        <p class="lead">${admin ? 'Vous êtes connecté·e en tant qu\'administrateur : les modifications seront publiées immédiatement.' : 'Votre proposition sera vérifiée par l\'administration communale avant publication.'}</p>
      </div>
    </section>
    <section class="container narrow">
      <form class="form" id="assoc-form" novalidate>
        <fieldset class="panel"><legend>${UI.icon('Info')}Informations générales</legend>
          <label class="field"><span>Nom de l'association *</span><input name="name" required value="${U.esc(a.name)}" maxlength="120"></label>
          <div class="field"><span>Thématique(s) * <small class="muted">— la première cochée est la thématique principale</small></span>
            ${checkboxes('themes', WA.THEMES, a.themes, (t) => t.id, (t) => t.label, (t) => `<i class="dot" style="--c:${t.color}">${UI.icon(t.icon)}</i>`)}</div>
          <label class="field"><span>Description courte * <small class="muted">(affichée sur la carte, 180 caractères max.)</small></span><input name="shortDescription" required maxlength="180" value="${U.esc(a.shortDescription)}"></label>
          <label class="field"><span>Description complète *</span><textarea name="description" rows="5" required>${U.esc(a.description)}</textarea></label>
          <label class="field"><span>Historique ou présentation</span><textarea name="history" rows="3">${U.esc(a.history)}</textarea></label>
          ${imageField('photo', 'Logo ou photo principale', a.photo, 'JPG ou PNG. L\'image est automatiquement redimensionnée.')}
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('MapPin')}Localisation et public</legend>
          <div class="field"><span>Village(s) concerné(s) *</span>${checkboxes('villages', WA.VILLAGES, a.villages, (v) => v.id, (v) => v.id)}</div>
          <label class="field"><span>Adresse</span><input name="address" value="${U.esc(a.address)}" autocomplete="street-address"></label>
          <div class="field"><span>Position sur la carte <small class="muted">— cliquez sur la carte pour placer l'association (facultatif)</small></span>
            <div class="mini-map" id="pick-map" role="application" aria-label="Carte pour positionner l'association"></div>
            <input type="hidden" name="lat" value="${a.coords ? a.coords[0] : ''}"><input type="hidden" name="lng" value="${a.coords ? a.coords[1] : ''}">
          </div>
          <div class="field"><span>Public cible</span>${checkboxes('audiences', WA.AUDIENCES, a.audiences || [], (x) => x.id, (x) => x.label)}</div>
          <label class="field"><span>Mots-clés <small class="muted">(séparés par des virgules)</small></span><input name="keywords" value="${U.esc((a.keywords || []).join(', '))}"></label>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Mail')}Contact</legend>
          <div class="grid-2">
            <label class="field"><span>Personne de contact</span><input name="contactName" value="${U.esc(a.contactName)}" autocomplete="name"></label>
            <label class="field"><span>Téléphone</span><input name="phone" type="tel" value="${U.esc(a.phone)}" autocomplete="tel"></label>
            <label class="field"><span>E-mail</span><input name="email" type="email" value="${U.esc(a.email)}" autocomplete="email"></label>
            <label class="field"><span>Site internet</span><input name="website" type="url" value="${U.esc(a.website)}" placeholder="https://"></label>
            <label class="field"><span>Facebook</span><input name="facebook" value="${U.esc(socials.facebook)}" placeholder="https://facebook.com/…"></label>
            <label class="field"><span>Instagram</span><input name="instagram" value="${U.esc(socials.instagram)}" placeholder="https://instagram.com/…"></label>
          </div>
          <label class="field"><span>Autre réseau social</span><input name="otherSocial" value="${U.esc(socials.other)}"></label>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Repeat')}Activités récurrentes</legend>
          <div id="activities">${(a.activities || []).map(activityRow).join('')}</div>
          <datalist id="weekdays">${U.WEEKDAYS.map((d) => `<option value="${d}">`).join('')}</datalist>
          <button type="button" class="btn btn-soft btn-sm" id="add-activity">${UI.icon('Plus')}Ajouter une activité</button>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Handshake')}Collaborations</legend>
          <label class="field"><span>Partenaires</span><textarea name="partners" rows="2">${U.esc(a.partners)}</textarea></label>
          <label class="field"><span>Appel à collaboration <small class="muted">(bénévoles, matériel, locaux, projets communs…)</small></span><textarea name="needs" rows="2">${U.esc(a.needs)}</textarea></label>
        </fieldset>

        ${
          admin
            ? ''
            : `<fieldset class="panel panel-accent"><legend>${UI.icon('User')}Vos coordonnées</legend>
          <p class="hint">Pour le suivi de votre demande uniquement : elles ne sont pas publiées. L'administration communale vous contactera si une précision est nécessaire.</p>
          <div class="grid-2">
            <label class="field"><span>Votre nom *</span><input name="submitterName" required autocomplete="name"></label>
            <label class="field"><span>Votre e-mail *</span><input type="email" name="submitterEmail" required autocomplete="email"></label>
          </div></fieldset>`
        }
        ${admin ? '' : `<label class="check"><input type="checkbox" name="consent" required><span>Je certifie être habilité·e à représenter cette association et j'accepte que ces informations soient publiées sur le portail. <a href="#/confidentialite" target="_blank">Politique de confidentialité</a></span></label>`}
        <div class="form-actions sticky-actions">
          <a class="btn btn-ghost" href="${editing ? `#/associations/${a.id}` : '#/associations'}">Annuler</a>
          <button class="btn btn-primary">${UI.icon(admin ? 'Save' : 'Send')}${admin ? 'Enregistrer' : editing ? 'Proposer la modification' : 'Soumettre la fiche'}</button>
        </div>
      </form>
    </section>`;
  };

  V.associationForm.mount = (root, params) => {
    const form = root.querySelector('#assoc-form');
    if (!form) return;
    const list = root.querySelector('#activities');
    const editing = params.id ? Store.association(params.id) : null;
    bindImage(root);
    root.querySelector('#add-activity').addEventListener('click', () => {
      list.insertAdjacentHTML('beforeend', activityRow());
      list.lastElementChild.querySelector('input').focus();
    });
    list.addEventListener('click', (e) => e.target.closest('[data-remove-activity]') && e.target.closest('.activity-row').remove());

    // Ordre de coche des thématiques : la première cochée devient la principale.
    const themeOrder = editing ? [...editing.themes] : [];
    form.querySelectorAll('input[name="themes"]').forEach((cb) =>
      cb.addEventListener('change', () => {
        const i = themeOrder.indexOf(cb.value);
        if (cb.checked && i < 0) themeOrder.push(cb.value);
        if (!cb.checked && i >= 0) themeOrder.splice(i, 1);
      })
    );

    WA.Map && WA.Map.picker(root.querySelector('#pick-map'), form, () => form.querySelectorAll('input[name="villages"]:checked')[0]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const get = (k) => String(fd.get(k) || '').trim();
      const villages = fd.getAll('villages');
      const errors = [];
      if (!get('name')) errors.push('le nom');
      if (!themeOrder.length) errors.push('au moins une thématique');
      if (!get('shortDescription')) errors.push('la description courte');
      if (!get('description')) errors.push('la description complète');
      if (!villages.length) errors.push('au moins un village');
      if (get('email') && !U.isEmail(get('email'))) errors.push('une adresse e-mail valide');
      if (!Store.isAdmin() && !get('submitterName')) errors.push('votre nom');
      if (!Store.isAdmin() && !U.isEmail(get('submitterEmail'))) errors.push('votre e-mail (pour le suivi)');
      if (!Store.isAdmin() && !fd.get('consent')) errors.push('la case de consentement');
      if (errors.length) return UI.formError(form, `Merci de compléter ${errors.join(', ')}.`);

      const activities = [...list.querySelectorAll('.activity-row')]
        .map((row) => Object.fromEntries([...row.querySelectorAll('[data-k]')].map((i) => [i.dataset.k, i.value.trim()])))
        .filter((x) => x.name);
      const lat = parseFloat(get('lat'));
      const lng = parseFloat(get('lng'));
      const data = {
        ...(editing ? { id: editing.id } : {}),
        name: get('name'),
        themes: themeOrder.slice(),
        shortDescription: get('shortDescription'),
        description: get('description'),
        history: get('history'),
        photo: get('photo'),
        villages,
        address: get('address'),
        coords: isFinite(lat) && isFinite(lng) ? [lat, lng] : null,
        audiences: fd.getAll('audiences'),
        keywords: get('keywords')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        contactName: get('contactName'),
        phone: get('phone'),
        email: get('email'),
        website: get('website'),
        socials: { facebook: get('facebook'), instagram: get('instagram'), other: get('otherSocial') },
        activities,
        partners: get('partners'),
        needs: get('needs'),
        ...(Store.isAdmin() ? {} : { submitter: { name: get('submitterName'), email: get('submitterEmail').toLowerCase(), at: Date.now() } }),
      };
      const button = form.querySelector('button.btn-primary');
      button.disabled = true;
      const saved = Store.saveAssociation(data, { asAdmin: Store.isAdmin() });
      try {
        await Store.flush();
      } catch (err) {
        button.disabled = false;
        return UI.formError(form, `L'enregistrement a échoué. ${WA.Remote.errorMessage(err)}`);
      }
      if (Store.isAdmin()) {
        UI.toast('Fiche enregistrée et publiée.');
        location.hash = `#/associations/${saved.id}`;
      } else {
        location.hash = '#/merci?type=association';
      }
    });
  };

  /* ================= Événement ================= */
  V.eventForm = (params, query) => {
    const editing = params.id ? Store.event(params.id) : null;
    if (params.id && (!editing || !Store.isAdmin())) return V.notFound();
    const admin = Store.isAdmin();
    const e = editing || { associationId: query.association || '', recurrence: { type: 'none' }, free: true, village: '', date: '' };
    const rec = e.recurrence || { type: 'none' };
    const assocs = Store.associations();
    const radio = (name, value, label, checked, icon) => `<label class="radio-card"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${icon ? UI.icon(icon) : ''}${label}</span></label>`;
    return `
    <section class="page-head page-head-sand">
      <div class="container">
        <a class="back-link" href="#/agenda">${UI.icon('ArrowLeft')}Retour à l'agenda</a>
        <h1>${editing ? 'Modifier l\'événement' : 'Ajouter un événement à l\'agenda'}</h1>
        <p class="lead">${admin ? 'Publication immédiate (administrateur).' : 'Formulaire collaboratif : chaque association peut proposer ses activités. Elles apparaîtront dans l\'agenda après validation.'}</p>
      </div>
    </section>
    <section class="container narrow">
      <form class="form" id="event-form" novalidate>
        <fieldset class="panel"><legend>${UI.icon('Info')}L'activité</legend>
          <label class="field"><span>Association organisatrice *</span>
            <select name="associationId" required><option value="">Choisir une association…</option>${assocs.map((a) => `<option value="${a.id}" ${a.id === e.associationId ? 'selected' : ''}>${U.esc(a.name)}</option>`).join('')}</select>
            <small class="hint">Votre association n'est pas encore référencée ? <a href="#/associations/nouvelle">Ajoutez-la d'abord</a>.</small></label>
          <label class="field"><span>Nom de l'activité *</span><input name="title" required maxlength="140" value="${U.esc(e.title)}"></label>
          <label class="field"><span>Description</span><textarea name="description" rows="4">${U.esc(e.description)}</textarea></label>
          <label class="field"><span>Catégorie *</span><select name="category" required>${WA.THEMES.map((t) => `<option value="${t.id}" ${t.id === e.category ? 'selected' : ''}>${U.esc(t.label)}</option>`).join('')}</select></label>
          ${imageField('image', 'Affiche ou image', e.image, 'L\'affiche est affichée sur la fiche de l\'activité.')}
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('CalendarDays')}Date et lieu</legend>
          <div class="grid-3">
            <label class="field"><span>Date *</span><input type="date" name="date" required value="${U.esc(e.date)}"></label>
            <label class="field"><span>Heure de début</span><input type="time" name="startTime" value="${U.esc(e.startTime)}"></label>
            <label class="field"><span>Heure de fin</span><input type="time" name="endTime" value="${U.esc(e.endTime)}"></label>
          </div>
          <label class="field"><span>Date de fin <small class="muted">(uniquement pour un événement sur plusieurs jours)</small></span><input type="date" name="endDate" value="${U.esc(e.endDate)}"></label>
          <div class="grid-2">
            <label class="field"><span>Lieu *</span><input name="place" required value="${U.esc(e.place)}" placeholder="Ex. : Salle communale, La Forge…"></label>
            <label class="field"><span>Village *</span><select name="village" required><option value="">Choisir…</option>${WA.VILLAGES.map((v) => `<option ${v.id === e.village ? 'selected' : ''}>${v.id}</option>`).join('')}</select></label>
          </div>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Repeat')}Récurrence</legend>
          <div class="radio-cards">
            ${radio('recType', 'none', 'Unique', rec.type === 'none' || !rec.type, 'Calendar')}
            ${radio('recType', 'weekly', 'Hebdomadaire', rec.type === 'weekly', 'Repeat')}
            ${radio('recType', 'monthly', 'Mensuelle', rec.type === 'monthly', 'CalendarDays')}
            ${radio('recType', 'yearly', 'Annuelle', rec.type === 'yearly', 'CalendarRange')}
          </div>
          <div class="rec-options" ${rec.type && rec.type !== 'none' ? '' : 'hidden'}>
            <div class="grid-3">
              <label class="field"><span>Répéter tous les</span><input type="number" name="recInterval" min="1" max="12" value="${Number(rec.interval) || 1}"><small class="hint" id="rec-unit"></small></label>
              <label class="field rec-monthly"><span>Mode mensuel</span><select name="recMonthlyMode"><option value="weekday" ${rec.monthlyMode !== 'date' ? 'selected' : ''}>Même jour de la semaine (ex. 2e vendredi)</option><option value="date" ${rec.monthlyMode === 'date' ? 'selected' : ''}>Même date (ex. le 15)</option></select></label>
              <label class="field"><span>Jusqu'au</span><input type="date" name="recUntil" value="${U.esc(rec.until)}"><small class="hint">Sans date : 12 mois générés.</small></label>
            </div>
            <div class="rec-preview" id="rec-preview" aria-live="polite"></div>
          </div>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Ticket')}Tarif et inscription</legend>
          <div class="radio-cards">${radio('free', '1', 'Gratuit', e.free !== false, 'Heart')}${radio('free', '0', 'Payant', e.free === false, 'Euro')}</div>
          <div class="grid-3">
            <label class="field price-field"><span>Prix</span><input name="price" value="${U.esc(e.price)}" placeholder="Ex. : 5 € / 3 € enfants"></label>
            <label class="field"><span>Nombre de places <small class="muted">(optionnel)</small></span><input type="number" min="1" name="seats" value="${U.esc(e.seats)}"></label>
            <label class="field"><span>Lien d'inscription <small class="muted">(optionnel)</small></span><input type="url" name="registrationUrl" value="${U.esc(e.registrationUrl)}" placeholder="https://"></label>
          </div>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('User')}Personne de contact</legend>
          <div class="grid-3">
            <label class="field"><span>Nom *</span><input name="contactName" required value="${U.esc(e.contactName)}" autocomplete="name"></label>
            <label class="field"><span>E-mail *</span><input type="email" name="contactEmail" required value="${U.esc(e.contactEmail)}" autocomplete="email"></label>
            <label class="field"><span>Téléphone</span><input type="tel" name="contactPhone" value="${U.esc(e.contactPhone)}" autocomplete="tel"></label>
          </div>
          ${admin ? `<label class="check"><input type="checkbox" name="tentative" ${e.tentative ? 'checked' : ''}><span>Date ou horaire à confirmer</span></label>` : ''}
        </fieldset>

        ${admin ? '' : `<label class="check"><input type="checkbox" name="consent" required><span>J'accepte que ces informations (y compris les coordonnées de contact) soient publiées dans l'agenda. <a href="#/confidentialite" target="_blank">Politique de confidentialité</a></span></label>`}
        <div class="form-actions sticky-actions">
          <a class="btn btn-ghost" href="#/agenda">Annuler</a>
          <button class="btn btn-primary">${UI.icon(admin ? 'Save' : 'Send')}${admin ? 'Enregistrer' : 'Soumettre l\'événement'}</button>
        </div>
      </form>
    </section>`;
  };

  V.eventForm.mount = (root, params) => {
    const form = root.querySelector('#event-form');
    if (!form) return;
    const editing = params.id ? Store.event(params.id) : null;
    bindImage(root);
    const recOptions = root.querySelector('.rec-options');
    const preview = root.querySelector('#rec-preview');

    const readRecurrence = () => {
      const type = form.recType.value;
      if (type === 'none') return { type: 'none' };
      return { type, interval: Number(form.recInterval.value) || 1, until: form.recUntil.value || '', monthlyMode: form.recMonthlyMode.value };
    };

    const update = () => {
      const type = form.recType.value;
      recOptions.hidden = type === 'none';
      root.querySelector('.rec-monthly').hidden = type !== 'monthly';
      root.querySelector('#rec-unit').textContent = { weekly: 'semaine(s)', monthly: 'mois', yearly: 'an(s)' }[type] || '';
      root.querySelector('.price-field').hidden = form.free.value === '1';
      if (type !== 'none' && form.date.value) {
        const draft = { id: 'preview', date: form.date.value, endDate: form.endDate.value, recurrence: readRecurrence() };
        const horizon = draft.recurrence.until || U.iso(U.addDays(U.parseDate(form.date.value), 366));
        const occ = U.expandOccurrences(draft, form.date.value, horizon);
        preview.innerHTML = `<p><strong>${UI.icon('Repeat')}${U.esc(U.recurrenceLabel(draft))}</strong> — ${occ.length} date${occ.length > 1 ? 's' : ''} générée${occ.length > 1 ? 's' : ''} automatiquement :</p>
          <ul class="badges">${occ
            .slice(0, 12)
            .map((o) => `<li class="badge">${U.fmtDate(o.occDate, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}</li>`)
            .join('')}${occ.length > 12 ? `<li class="badge badge-soft">+ ${occ.length - 12}</li>` : ''}</ul>`;
      } else preview.innerHTML = type !== 'none' ? '<p class="muted">Choisissez une date de début pour voir les occurrences.</p>' : '';
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.associationId.addEventListener('change', () => {
      const a = Store.association(form.associationId.value);
      if (!a) return;
      if (!editing) form.category.value = a.themes[0];
      if (!form.village.value && a.villages.length === 1) form.village.value = a.villages[0];
    });
    update();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const get = (k) => String(fd.get(k) || '').trim();
      const errors = [];
      if (!get('associationId')) errors.push("l'association organisatrice");
      if (!get('title')) errors.push("le nom de l'activité");
      if (!get('date')) errors.push('la date');
      if (get('endDate') && get('endDate') < get('date')) errors.push('une date de fin postérieure à la date de début');
      if (get('startTime') && get('endTime') && get('endTime') <= get('startTime') && !get('endDate')) errors.push('une heure de fin après l\'heure de début');
      if (!get('place')) errors.push('le lieu');
      if (!get('village')) errors.push('le village');
      if (!get('contactName')) errors.push('la personne de contact');
      if (!U.isEmail(get('contactEmail'))) errors.push("l'e-mail de contact");
      if (get('registrationUrl') && !U.safeUrl(get('registrationUrl'))) errors.push("un lien d'inscription valide");
      if (!Store.isAdmin() && !fd.get('consent')) errors.push('la case de consentement');
      if (errors.length) return UI.formError(form, `Merci de compléter ${errors.join(', ')}.`);
      const free = get('free') === '1';
      const data = {
        ...(editing ? { id: editing.id } : {}),
        associationId: get('associationId'),
        title: get('title'),
        description: get('description'),
        category: get('category'),
        image: get('image'),
        date: get('date'),
        endDate: get('endDate') > get('date') ? get('endDate') : '',
        startTime: get('startTime'),
        endTime: get('endTime'),
        place: get('place'),
        village: get('village'),
        recurrence: readRecurrence(),
        free,
        price: free ? '' : get('price'),
        seats: get('seats'),
        registrationUrl: get('registrationUrl'),
        contactName: get('contactName'),
        contactEmail: get('contactEmail'),
        contactPhone: get('contactPhone'),
        tentative: Store.isAdmin() ? !!fd.get('tentative') : false,
      };
      const button = form.querySelector('button.btn-primary');
      button.disabled = true;
      const saved = Store.saveEvent(data, { asAdmin: Store.isAdmin() });
      try {
        await Store.flush();
      } catch (err) {
        button.disabled = false;
        return UI.formError(form, `L'enregistrement a échoué. ${WA.Remote.errorMessage(err)}`);
      }
      if (Store.isAdmin()) {
        UI.toast('Événement enregistré.');
        location.hash = `#/evenement/${saved.id}`;
      } else location.hash = '#/merci?type=evenement';
    });
  };
})(window.WA);
