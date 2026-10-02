/* Admin : « Contenus du site » — textes, logo, couleurs, villages, thématiques, publics. */
(function (WA) {
  const { U, UI, Store } = WA;

  const villageRow = (v = {}, used = 0) => `
    <div class="list-row" data-row="village" data-original="${U.esc(v.id || '')}">
      <label class="field"><span>Nom du village</span><input data-k="id" value="${U.esc(v.id || '')}" required></label>
      <label class="field"><span>Latitude</span><input data-k="lat" inputmode="decimal" value="${v.coords ? v.coords[0] : ''}" placeholder="50.64"></label>
      <label class="field"><span>Longitude</span><input data-k="lng" inputmode="decimal" value="${v.coords ? v.coords[1] : ''}" placeholder="4.69"></label>
      <span class="usage">${used} fiche${used > 1 ? 's' : ''}</span>
      <button type="button" class="icon-btn danger" data-remove ${used ? `disabled title="Utilisé par ${used} fiche(s) : impossible de le supprimer"` : 'aria-label="Supprimer"'}>${UI.icon('Trash2')}</button>
    </div>`;

  const iconOptions = (current) =>
    Object.keys(WA.ICONS)
      .sort()
      .map((n) => `<option ${n === current ? 'selected' : ''}>${n}</option>`)
      .join('');

  const themeRow = (t = { color: '#56626b', icon: 'Shapes' }, used = 0) => `
    <div class="list-row theme-row" data-row="theme" data-id="${U.esc(t.id || '')}">
      <span class="theme-icon" data-preview style="--c:${U.esc(t.color)}">${UI.icon(t.icon)}</span>
      <label class="field"><span>Nom de la thématique</span><input data-k="label" value="${U.esc(t.label || '')}" required></label>
      <label class="field"><span>Pictogramme</span><select data-k="icon">${iconOptions(t.icon)}</select></label>
      <label class="field field-color"><span>Couleur</span><input type="color" data-k="color" value="${U.esc(t.color)}"></label>
      <span class="usage">${used} fiche${used > 1 ? 's' : ''}</span>
      <button type="button" class="icon-btn danger" data-remove ${used ? `disabled title="Utilisée par ${used} fiche(s) : impossible de la supprimer"` : 'aria-label="Supprimer"'}>${UI.icon('Trash2')}</button>
    </div>`;

  const audienceRow = (a = {}, used = 0) => `
    <div class="list-row" data-row="audience" data-id="${U.esc(a.id || '')}">
      <label class="field"><span>Public cible</span><input data-k="label" value="${U.esc(a.label || '')}" required></label>
      <span class="usage">${used} fiche${used > 1 ? 's' : ''}</span>
      <button type="button" class="icon-btn danger" data-remove ${used ? `disabled title="Utilisé par ${used} fiche(s) : impossible de le supprimer"` : 'aria-label="Supprimer"'}>${UI.icon('Trash2')}</button>
    </div>`;

  const text = (name, label, value, { rows = 0, hint = '' } = {}) =>
    `<label class="field"><span>${label}${hint ? ` <small class="muted">${hint}</small>` : ''}</span>${
      rows ? `<textarea name="${name}" rows="${rows}">${U.esc(value)}</textarea>` : `<input name="${name}" value="${U.esc(value)}">`
    }</label>`;

  const panel = {
    render() {
      const s = Store.site();
      const use = Store.usage();
      return `
      <form id="site-form" class="form" novalidate>
        <p class="notice notice-info">${UI.icon('Info')}Toutes les modifications s'appliquent au site dès que vous cliquez sur « Enregistrer », sans toucher au code.</p>

        <fieldset class="panel"><legend>${UI.icon('Palette')}Identité</legend>
          <div class="grid-3">
            ${text('siteName', 'Nom du site', s.siteName)}
            ${text('siteSubtitle', 'Sous-titre', s.siteSubtitle)}
            ${text('communeName', 'Nom de la commune', s.communeName)}
          </div>
          <div class="grid-3">
            <div class="field image-field"><span>Logo <small class="muted">(carré, PNG conseillé)</small></span>
              <div class="image-drop">
                <div class="image-preview logo-preview" data-preview="logo">${s.logo ? `<img src="${U.esc(s.logo)}" alt="Logo">` : UI.icon('Image')}</div>
                <div><label class="btn btn-soft btn-sm file-btn">${UI.icon('Upload')}Choisir<input type="file" accept="image/*" id="logo-file"></label>
                <button type="button" class="btn btn-ghost btn-sm" id="logo-clear" ${s.logo ? '' : 'hidden'}>${UI.icon('Trash2')}Retirer</button></div>
                <input type="hidden" name="logo" value="${U.esc(s.logo)}">
              </div></div>
            <label class="field field-color"><span>Couleur principale</span><input type="color" name="primaryColor" value="${U.esc(s.primaryColor)}"></label>
            <label class="field field-color"><span>Couleur d'accent</span><input type="color" name="accentColor" value="${U.esc(s.accentColor)}"></label>
          </div>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Home')}Page d'accueil et pied de page</legend>
          ${text('heroEyebrow', 'Petit titre au-dessus du titre', s.heroEyebrow)}
          ${text('heroTitle', 'Titre principal', s.heroTitle, { rows: 2, hint: '(un retour à la ligne = une nouvelle ligne)' })}
          ${text('heroText', "Texte d'introduction", s.heroText, { rows: 3 })}
          <div class="grid-2">
            ${text('ctaTitle', 'Encadré « associations » : titre', s.ctaTitle)}
            ${text('ctaText', 'Encadré « associations » : texte', s.ctaText, { rows: 2 })}
          </div>
          ${text('partnersText', 'Texte des partenaires (bas de la page d\'accueil)', s.partnersText, { rows: 2 })}
          ${text('footerText', 'Texte du pied de page', s.footerText, { rows: 2 })}
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('MapPin')}Villages</legend>
          <p class="hint">Renommer un village met à jour automatiquement toutes les fiches et tous les événements. Un village utilisé ne peut pas être supprimé. Les coordonnées servent à la carte (clic droit sur Google Maps → coordonnées).</p>
          <div id="village-rows">${s.villages.map((v) => villageRow(v, use.villages[v.id] || 0)).join('')}</div>
          <button type="button" class="btn btn-soft btn-sm" data-add="village">${UI.icon('Plus')}Ajouter un village</button>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Tag')}Thématiques</legend>
          <div id="theme-rows">${s.themes.map((t) => themeRow(t, use.themes[t.id] || 0)).join('')}</div>
          <button type="button" class="btn btn-soft btn-sm" data-add="theme">${UI.icon('Plus')}Ajouter une thématique</button>
        </fieldset>

        <fieldset class="panel"><legend>${UI.icon('Users')}Publics cibles</legend>
          <div id="audience-rows">${s.audiences.map((a) => audienceRow(a, use.audiences[a.id] || 0)).join('')}</div>
          <button type="button" class="btn btn-soft btn-sm" data-add="audience">${UI.icon('Plus')}Ajouter un public</button>
        </fieldset>

        <div class="form-actions sticky-actions">
          <button type="button" class="btn btn-ghost" id="site-defaults">${UI.icon('RotateCcw')}Textes et couleurs par défaut</button>
          <a class="btn btn-ghost" href="#/" target="_blank">${UI.icon('Eye')}Voir le site</a>
          <button class="btn btn-primary">${UI.icon('Save')}Enregistrer</button>
        </div>
      </form>`;
    },

    mount(root) {
      const form = root.querySelector('#site-form');
      const rows = { village: '#village-rows', theme: '#theme-rows', audience: '#audience-rows' };
      const makers = { village: villageRow, theme: themeRow, audience: audienceRow };

      form.addEventListener('click', (e) => {
        const add = e.target.closest('[data-add]');
        if (add) {
          const list = form.querySelector(rows[add.dataset.add]);
          list.insertAdjacentHTML('beforeend', makers[add.dataset.add]());
          list.lastElementChild.querySelector('input').focus();
        }
        const rm = e.target.closest('[data-remove]');
        if (rm && !rm.disabled) rm.closest('.list-row').remove();
      });
      // Aperçu du pictogramme et de la couleur des thématiques.
      form.addEventListener('input', (e) => {
        const row = e.target.closest('.theme-row');
        if (!row) return;
        const prev = row.querySelector('[data-preview]');
        prev.style.setProperty('--c', row.querySelector('[data-k="color"]').value);
        prev.innerHTML = UI.icon(row.querySelector('[data-k="icon"]').value);
      });

      const logoInput = form.querySelector('[name="logo"]');
      form.querySelector('#logo-file').addEventListener('change', async (e) => {
        try {
          const data = await U.resizeImage(e.target.files[0], 256, 0.92, 'image/png');
          logoInput.value = data;
          form.querySelector('[data-preview="logo"]').innerHTML = `<img src="${data}" alt="Logo">`;
          form.querySelector('#logo-clear').hidden = false;
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
      form.querySelector('#logo-clear').addEventListener('click', (e) => {
        logoInput.value = '';
        form.querySelector('[data-preview="logo"]').innerHTML = UI.icon('Image');
        e.currentTarget.hidden = true;
      });

      form.querySelector('#site-defaults').addEventListener('click', async () => {
        if (!(await UI.confirm('Remettre les textes, le logo et les couleurs par défaut ? (Les villages, thématiques et publics ne changent pas.)', { confirmLabel: 'Rétablir' }))) return;
        const d = WA.siteDefaults();
        const cur = Store.site();
        await save({ ...d, villages: cur.villages, themes: cur.themes, audiences: cur.audiences }, []);
      });

      const save = async (site, renames) => {
        const button = form.querySelector('button.btn-primary');
        button.disabled = true;
        try {
          await Store.saveSite(site);
          renames.forEach(([from, to]) => Store.renameVillage(from, to));
          await Store.flush();
          UI.toast('Contenus enregistrés : le site est à jour.');
          WA.App.render();
        } catch (err) {
          button.disabled = false;
          UI.formError(form, `Enregistrement impossible. ${WA.Remote.errorMessage(err)}`);
        }
      };

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const get = (k) => String(fd.get(k) || '').trim();
        const val = (row, k) => row.querySelector(`[data-k="${k}"]`).value.trim();
        const errors = [];

        const renames = [];
        const villages = [...form.querySelectorAll('[data-row="village"]')].map((row) => {
          const id = val(row, 'id');
          const lat = parseFloat(val(row, 'lat').replace(',', '.'));
          const lng = parseFloat(val(row, 'lng').replace(',', '.'));
          if (row.dataset.original && id && row.dataset.original !== id) renames.push([row.dataset.original, id]);
          return { id, coords: isFinite(lat) && isFinite(lng) ? [lat, lng] : WA.CONFIG.mapCenter.slice() };
        });
        const themes = [...form.querySelectorAll('[data-row="theme"]')].map((row) => ({
          id: row.dataset.id || '',
          label: val(row, 'label'),
          icon: val(row, 'icon'),
          color: val(row, 'color'),
        }));
        const audiences = [...form.querySelectorAll('[data-row="audience"]')].map((row) => ({ id: row.dataset.id || '', label: val(row, 'label') }));

        // Identifiants stables pour les nouvelles thématiques / nouveaux publics.
        const assignIds = (list) => {
          const used = new Set(list.map((x) => x.id).filter(Boolean));
          list.forEach((x) => {
            if (x.id) return;
            let id = U.slugify(x.label);
            while (used.has(id)) id = `${U.slugify(x.label)}-${Math.random().toString(36).slice(2, 5)}`;
            used.add(id);
            x.id = id;
          });
        };
        assignIds(themes);
        assignIds(audiences);

        if (!get('siteName')) errors.push('le nom du site');
        if (!villages.length || villages.some((v) => !v.id)) errors.push('le nom de chaque village (au moins un)');
        if (new Set(villages.map((v) => v.id)).size !== villages.length) errors.push('des noms de villages différents');
        if (!themes.length || themes.some((t) => !t.label)) errors.push('le nom de chaque thématique (au moins une)');
        if (!audiences.length || audiences.some((a) => !a.label)) errors.push('le nom de chaque public (au moins un)');
        if (errors.length) return UI.formError(form, `Merci de compléter ${errors.join(', ')}.`);

        const keys = ['siteName', 'siteSubtitle', 'communeName', 'logo', 'primaryColor', 'accentColor', 'heroEyebrow', 'heroTitle', 'heroText', 'ctaTitle', 'ctaText', 'partnersText', 'footerText'];
        const site = Object.fromEntries(keys.map((k) => [k, k === 'heroTitle' || k === 'heroText' || /Text$/.test(k) ? String(fd.get(k) || '').trim() : get(k)]));
        await save({ ...site, villages, themes, audiences }, renames);
      });
    },
  };

  WA.AdminPanels = WA.AdminPanels || {};
  WA.AdminPanels.contenus = panel;
})(window.WA);
