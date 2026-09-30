/* Espace administration : validation, gestion des contenus, utilisateurs, newsletter, statistiques. */
(function (WA) {
  const { U, UI, Store } = WA;
  const V = (WA.views = WA.views || {});

  const TABS = [
    { id: 'tableau-de-bord', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    { id: 'validation', label: 'Validation', icon: 'ShieldCheck' },
    { id: 'associations', label: 'Associations', icon: 'Users' },
    { id: 'evenements', label: 'Événements', icon: 'CalendarDays' },
    { id: 'messages', label: 'Messages', icon: 'Inbox' },
    { id: 'newsletter', label: 'Newsletter', icon: 'Newspaper' },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: 'UsersRound', adminOnly: true },
    { id: 'donnees', label: 'Données & RGPD', icon: 'Settings', adminOnly: true },
  ];

  const pendingCount = () => Store.associations('pending').length + Store.events('pending').length;

  /* ---------------- Connexion ---------------- */
  const shared = () => Store.mode === 'firebase';

  const orphanNotice = (o) => `
    <div class="notice notice-warn orphan">${UI.icon('ShieldCheck')}<div>
      <p><strong>Le compte ${U.esc(o.email)} n'a pas encore les droits d'administration.</strong></p>
      <p>Pour le premier administrateur : dans la console Firebase, ouvrez <em>Firestore Database</em>, créez la collection <code>admins</code> avec un document dont l'identifiant est :</p>
      <p class="uid"><code id="orphan-uid">${U.esc(o.uid)}</code> <button type="button" class="btn btn-ghost btn-sm" id="copy-uid">${UI.icon('Copy')}Copier</button></p>
      <p>et les champs <code>role</code> = <code>admin</code>, <code>email</code> = <code>${U.esc(o.email)}</code>, <code>name</code> = votre nom. Rechargez ensuite cette page.</p>
      <p>Les administrateurs suivants s'ajoutent directement depuis l'onglet « Utilisateurs ».</p>
      <button type="button" class="btn btn-ghost btn-sm" id="orphan-logout">${UI.icon('LogOut')}Se déconnecter</button></div></div>`;

  const loginView = () => {
    const orphan = Store.orphanAccount();
    return `
    <section class="container login-wrap">
      ${orphan ? orphanNotice(orphan) : ''}
      <form class="panel login" id="login-form" novalidate>
        <div class="login-head">${UI.icon('Lock', 'lg')}<h1>Espace administration</h1><p class="muted">Réservé aux agents communaux et modérateurs du portail.</p></div>
        <label class="field"><span>${shared() ? 'Adresse e-mail' : "Nom d'utilisateur"}</span><input name="username" ${shared() ? 'type="email" autocomplete="email"' : 'autocomplete="username"'} required></label>
        <label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn btn-primary btn-block">${UI.icon('KeyRound')}Se connecter</button>
        ${
          shared()
            ? '<button type="button" class="btn btn-ghost btn-sm" id="forgot">Mot de passe oublié ?</button>'
            : '<p class="hint">Mode démonstration : identifiants par défaut indiqués dans le fichier README (à changer à la première connexion).</p>'
        }
      </form>
    </section>`;
  };

  let failedAttempts = 0;
  let lockedUntil = 0;
  const mountLogin = (root) => {
    const copy = root.querySelector('#copy-uid');
    copy &&
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(root.querySelector('#orphan-uid').textContent);
          UI.toast('Identifiant copié.');
        } catch (e) {
          UI.toast("Copie impossible : sélectionnez l'identifiant à la main.", 'error');
        }
      });
    const orphanOut = root.querySelector('#orphan-logout');
    orphanOut &&
      orphanOut.addEventListener('click', async () => {
        await Store.logout();
        WA.App.render();
      });
    const forgot = root.querySelector('#forgot');
    forgot &&
      forgot.addEventListener('click', async () => {
        const email = root.querySelector('[name=username]').value.trim();
        if (!U.isEmail(email)) return UI.formError(root.querySelector('#login-form'), 'Indiquez votre adresse e-mail ci-dessus, puis cliquez à nouveau sur « Mot de passe oublié ? ».');
        try {
          await Store.resetPassword(email);
        } catch (err) {
          console.warn(err);
        }
        UI.toast('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d\'être envoyé.');
      });
    root.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (Date.now() < lockedUntil) return UI.formError(f, `Trop de tentatives. Réessayez dans ${Math.ceil((lockedUntil - Date.now()) / 1000)} secondes.`);
      let user = null;
      const button = f.querySelector('button.btn-primary');
      button.disabled = true;
      try {
        user = await Store.login(f.username.value, f.password.value);
      } catch (err) {
        button.disabled = false;
        if (err && err.code && !/credential|password|user-not-found/.test(err.code)) return UI.formError(f, WA.Remote.errorMessage(err));
      }
      button.disabled = false;
      if (!user && Store.orphanAccount()) return WA.App.render();
      if (!user) {
        failedAttempts++;
        if (failedAttempts >= 5) {
          lockedUntil = Date.now() + 60000;
          failedAttempts = 0;
        }
        return UI.formError(f, 'Identifiants incorrects.');
      }
      failedAttempts = 0;
      UI.toast(`Bienvenue, ${user.name || user.username} !`);
      WA.App.render();
      if (user.mustChangePassword) setTimeout(() => changePassword(user, true), 300);
    });
  };

  const changePassword = (user, forced = false) => {
    const m = UI.modal(
      `<form class="form" novalidate>
        ${forced ? `<p class="notice notice-warn">${UI.icon('ShieldCheck')}Pour votre sécurité, remplacez le mot de passe par défaut.</p>` : ''}
        <label class="field"><span>Nouveau mot de passe (10 caractères min.)</span><input type="password" name="p1" autocomplete="new-password" minlength="10" required></label>
        <label class="field"><span>Confirmation</span><input type="password" name="p2" autocomplete="new-password" required></label>
        <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Plus tard</button><button class="btn btn-primary">Enregistrer</button></div>
      </form>`,
      { title: 'Changer le mot de passe', size: 'modal-sm' }
    );
    m.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { p1, p2 } = e.target;
      if (p1.value.length < 10) return UI.formError(e.target, 'Le mot de passe doit contenir au moins 10 caractères.');
      if (p1.value !== p2.value) return UI.formError(e.target, 'Les deux mots de passe ne correspondent pas.');
      try {
        await Store.changePassword(p1.value);
      } catch (err) {
        return UI.formError(e.target, WA.Remote.errorMessage(err));
      }
      UI.closeModal();
      UI.toast('Mot de passe modifié.');
    });
  };

  /* ---------------- Mise en page ---------------- */
  V.admin = (params) => {
    const user = Store.currentUser();
    if (!user) return loginView();
    const tab = TABS.find((t) => t.id === params.tab && (!t.adminOnly || user.role === 'admin')) || TABS[0];
    const pending = pendingCount();
    return `
    <section class="admin">
      <div class="admin-bar"><div class="container admin-bar-inner">
        <div><p class="eyebrow">${UI.icon('ShieldCheck')}Espace administration</p><h1>${U.esc(tab.label)}</h1></div>
        <div class="admin-user">${UI.icon('User')}<span>${U.esc(user.name || user.username)}<small>${user.role === 'admin' ? 'Administrateur' : 'Modérateur'}</small></span>
          <button class="btn btn-ghost btn-sm" data-action="password">${UI.icon('KeyRound')}Mot de passe</button>
          <button class="btn btn-ghost btn-sm" data-action="logout">${UI.icon('LogOut')}Déconnexion</button></div>
      </div></div>
      <div class="container admin-layout">
        <nav class="admin-nav" aria-label="Menu d'administration">
          ${TABS.filter((t) => !t.adminOnly || user.role === 'admin')
            .map((t) => `<a href="#/admin/${t.id}" class="${t.id === tab.id ? 'active' : ''}" ${t.id === tab.id ? 'aria-current="page"' : ''}>${UI.icon(t.icon)}<span>${t.label}</span>${t.id === 'validation' && pending ? `<b class="count">${pending}</b>` : ''}</a>`)
            .join('')}
        </nav>
        <div class="admin-content" data-tab="${tab.id}">${PANELS[tab.id].render(user)}</div>
      </div>
    </section>`;
  };

  V.admin.mount = (root, params) => {
    const user = Store.currentUser();
    if (!user) return mountLogin(root);
    root.querySelector('[data-action="logout"]').addEventListener('click', async () => {
      await Store.logout();
      UI.toast('Vous êtes déconnecté·e.');
      location.hash = '#/';
    });
    root.querySelector('[data-action="password"]').addEventListener('click', () => changePassword(user));
    const content = root.querySelector('.admin-content');
    const panel = PANELS[content.dataset.tab];
    panel.mount && panel.mount(content, user);
  };

  const rerender = () => WA.App.render();
  const statusTag = (s) =>
    ({ published: '<span class="tag tag-free">Publié</span>', pending: '<span class="tag tag-warn">En attente</span>', rejected: '<span class="tag tag-paid">Refusé</span>' }[s] || '');

  /* ---------------- Graphiques simples (une série, une teinte) ---------------- */
  const hbar = (rows, { unit = '' } = {}) => {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (!rows.length) return '<p class="muted small">Pas encore de données.</p>';
    return `<ul class="hbar">${rows
      .map(
        (r) => `<li title="${U.esc(r.label)} : ${r.value}${unit}"><span class="hbar-label">${r.href ? `<a href="${r.href}">${U.esc(r.label)}</a>` : U.esc(r.label)}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${Math.max(2, (r.value / max) * 100)}%"></span></span><span class="hbar-value">${r.value}${unit}</span></li>`
      )
      .join('')}</ul>`;
  };
  const columns = (rows) => {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="cols" role="img" aria-label="Visites quotidiennes sur 14 jours">${rows
      .map((r) => `<div class="col" title="${U.esc(r.label)} : ${r.value} vue${r.value > 1 ? 's' : ''}"><span class="col-value">${r.value || ''}</span><span class="col-bar" style="height:${(r.value / max) * 100}%"></span><span class="col-label">${U.esc(r.short)}</span></div>`)
      .join('')}</div>`;
  };

  const PANELS = {};

  /* ---------------- Tableau de bord ---------------- */
  PANELS['tableau-de-bord'] = {
    render() {
      const s = Store.stats();
      const assocs = Store.associations();
      const upcoming = Store.occurrences(U.today(), U.iso(U.addDays(new Date(), 30)));
      const totalViews = Object.values(s.pageViews).reduce((a, b) => a + b, 0);
      const days = [...Array(14)].map((_, i) => {
        const d = U.addDays(new Date(), i - 13);
        return { label: U.fmtDate(U.iso(d), { weekday: 'long', day: 'numeric', month: 'long' }), short: `${d.getDate()}/${d.getMonth() + 1}`, value: s.daily[U.iso(d)] || 0 };
      });
      const topAssoc = Object.entries(s.assocViews)
        .map(([id, v]) => ({ label: (Store.association(id) || {}).name, value: v, href: `#/associations/${id}` }))
        .filter((r) => r.label)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      const byTheme = WA.THEMES.map((t) => ({ label: t.label, value: assocs.filter((a) => a.themes.includes(t.id)).length })).filter((r) => r.value).sort((a, b) => b.value - a.value);
      const byVillage = WA.VILLAGES.map((v) => ({ label: v.id, value: assocs.filter((a) => a.villages.includes(v.id)).length }));
      const searches = Object.entries(s.searches)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      const kpi = (icon, value, label, href) => `<a class="kpi" href="${href}">${UI.icon(icon)}<strong>${value}</strong><span>${label}</span></a>`;
      return `
        <div class="kpis">
          ${kpi('Users', assocs.length, 'associations publiées', '#/admin/associations')}
          ${kpi('CalendarDays', upcoming.length, 'dates dans les 30 jours', '#/admin/evenements')}
          ${kpi('Hourglass', pendingCount(), 'contenus à valider', '#/admin/validation')}
          ${kpi('Inbox', Store.messages().length, 'messages transmis', '#/admin/messages')}
          ${kpi('Newspaper', Store.subscribers().length, 'abonnés newsletter', '#/admin/newsletter')}
          ${kpi('Eye', totalViews, 'pages vues', '#/admin/tableau-de-bord')}
        </div>
        <div class="dash-grid">
          <section class="panel span-2"><h2>Visites quotidiennes (14 derniers jours)</h2>${columns(days)}</section>
          <section class="panel"><h2>Fiches les plus consultées</h2>${hbar(topAssoc)}</section>
          <section class="panel"><h2>Associations par thématique</h2>${hbar(byTheme)}</section>
          <section class="panel"><h2>Associations par village</h2>${hbar(byVillage)}</section>
          <section class="panel"><h2>Recherches fréquentes</h2>${
            searches.length ? `<ul class="badges">${searches.map(([q, n]) => `<li class="badge">${U.esc(q)} <b>${n}</b></li>`).join('')}</ul>` : '<p class="muted small">Pas encore de recherche.</p>'
          }
          <h3>Engagement</h3><ul class="plain"><li>${UI.icon('Share2')}${s.shares || 0} partages</li><li>${UI.icon('FileDown')}${s.exports || 0} exports PDF</li></ul></section>
          <section class="panel span-2"><h2>Journal d'activité</h2>${
            Store.audit().length
              ? `<ul class="audit">${Store.audit()
                  .slice(0, 12)
                  .map((l) => `<li><time>${U.fmtDateTime(l.at)}</time><code>${U.esc(l.action)}</code><span>${U.esc(l.label)}</span><small>${U.esc(l.user)}</small></li>`)
                  .join('')}</ul>`
              : '<p class="muted small">Aucune action enregistrée.</p>'
          }</section>
        </div>
        <p class="hint">Statistiques anonymes, sans cookie de mesure d'audience ; dans ce prototype elles sont propres à ce navigateur.</p>`;
    },
  };

  /* ---------------- Validation ---------------- */
  PANELS.validation = {
    render() {
      const assocs = Store.associations('pending');
      const events = Store.events('pending');
      const diffLine = (a) => {
        if (!a.revisionOf) return '<span class="tag tag-soft">Nouvelle fiche</span>';
        const orig = Store.association(a.revisionOf);
        const fields = ['name', 'shortDescription', 'description', 'history', 'address', 'contactName', 'email', 'phone', 'website', 'photo', 'partners', 'needs'];
        const changed = orig ? fields.filter((f) => (orig[f] || '') !== (a[f] || '')) : [];
        ['themes', 'villages', 'audiences', 'activities', 'socials', 'keywords', 'coords'].forEach((f) => orig && JSON.stringify(orig[f]) !== JSON.stringify(a[f]) && changed.push(f));
        return `<span class="tag tag-soft">Modification</span> <small class="muted">Champs modifiés : ${changed.length ? changed.join(', ') : 'aucun'}</small>`;
      };
      return `
        <section class="panel"><h2>${UI.icon('Users')}Associations à valider <span class="count">${assocs.length}</span></h2>
        ${
          assocs.length
            ? `<ul class="queue">${assocs
                .map(
                  (a) => `<li><div class="queue-main">${UI.themeIcon(a.themes[0])}<div><strong>${U.esc(a.name)}</strong><p class="small">${U.esc(a.shortDescription)}</p>${diffLine(a)}<p class="small muted">Soumis le ${U.fmtDateTime(a.createdAt)} · ${U.esc(a.villages.join(', '))}</p></div></div>
                <div class="queue-actions"><a class="btn btn-ghost btn-sm" href="#/associations/${a.id}">${UI.icon('Eye')}Aperçu</a><button class="btn btn-primary btn-sm" data-approve-assoc="${a.id}">${UI.icon('Check')}Valider</button><button class="btn btn-danger-ghost btn-sm" data-reject-assoc="${a.id}">${UI.icon('X')}Refuser</button></div></li>`
                )
                .join('')}</ul>`
            : `<p class="muted">${UI.icon('CircleCheck')} Aucune fiche en attente.</p>`
        }</section>
        <section class="panel"><h2>${UI.icon('CalendarDays')}Événements à valider <span class="count">${events.length}</span></h2>
        ${
          events.length
            ? `<ul class="queue">${events
                .map(
                  (e) => `<li><div class="queue-main">${UI.themeIcon(e.category)}<div><strong>${U.esc(e.title)}</strong><p class="small">${U.esc((Store.association(e.associationId) || {}).name || '')} · ${U.fmtDate(e.date)} ${e.startTime ? `· ${U.fmtTime(e.startTime)}` : ''} · ${U.esc(e.village)}</p><p class="small muted">${U.esc(U.recurrenceLabel(e))} · Contact : ${U.esc(e.contactName)} ${U.esc(e.contactEmail)}</p></div></div>
                <div class="queue-actions"><a class="btn btn-ghost btn-sm" href="#/evenement/${e.id}">${UI.icon('Eye')}Aperçu</a><button class="btn btn-primary btn-sm" data-approve-event="${e.id}">${UI.icon('Check')}Valider</button><button class="btn btn-danger-ghost btn-sm" data-reject-event="${e.id}">${UI.icon('X')}Refuser</button></div></li>`
                )
                .join('')}</ul>`
            : `<p class="muted">${UI.icon('CircleCheck')} Aucun événement en attente.</p>`
        }</section>`;
    },
    mount(root) {
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.approveAssoc) {
          Store.approveAssociation(b.dataset.approveAssoc);
          UI.toast('Fiche validée et publiée.');
        } else if (b.dataset.rejectAssoc) {
          if (!(await UI.confirm('Refuser et supprimer cette proposition ?', { confirmLabel: 'Refuser', danger: true }))) return;
          Store.rejectAssociation(b.dataset.rejectAssoc);
          UI.toast('Proposition refusée.');
        } else if (b.dataset.approveEvent) {
          Store.setEventStatus(b.dataset.approveEvent, 'published');
          UI.toast("Événement publié dans l'agenda.");
        } else if (b.dataset.rejectEvent) {
          if (!(await UI.confirm('Refuser cet événement ?', { confirmLabel: 'Refuser', danger: true }))) return;
          Store.setEventStatus(b.dataset.rejectEvent, 'rejected');
          UI.toast('Événement refusé.');
        } else return;
        rerender();
      });
    },
  };

  /* ---------------- Associations ---------------- */
  PANELS.associations = {
    render() {
      const list = Store.associations('all').filter((a) => !a.revisionOf);
      return `<div class="panel">
        <div class="panel-toolbar"><label class="search-field">${UI.icon('Search')}<input type="search" id="adm-q" placeholder="Filtrer les associations…" aria-label="Filtrer"></label>
          <a class="btn btn-primary btn-sm" href="#/associations/nouvelle">${UI.icon('Plus')}Nouvelle association</a>
          <button class="btn btn-ghost btn-sm" data-export="assoc">${UI.icon('Download')}Export CSV</button></div>
        <div class="table-wrap"><table class="table admin-table"><thead><tr><th>Association</th><th>Thématique</th><th>Villages</th><th>Statut</th><th>Mise à jour</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list
          .map(
            (a) => `<tr data-row="${U.esc(U.norm(a.name + ' ' + a.villages.join(' ')))}"><td data-label="Association"><a href="#/associations/${a.id}"><strong>${U.esc(a.name)}</strong></a>${a.email ? '' : ' <span class="tag tag-warn" title="Coordonnées à compléter">contact ?</span>'}</td>
          <td data-label="Thématique">${UI.themeChip(a.themes[0])}</td><td data-label="Villages">${U.esc(a.villages.length === WA.VILLAGES.length ? 'Toute la commune' : a.villages.join(', '))}</td>
          <td data-label="Statut">${statusTag(a.status)}</td><td data-label="Mise à jour">${U.fmtDateTime(a.updatedAt)}</td>
          <td class="row-actions"><a class="icon-btn" href="#/associations/${a.id}/modifier" aria-label="Modifier ${U.esc(a.name)}">${UI.icon('Pencil')}</a><button class="icon-btn danger" data-delete="${a.id}" aria-label="Supprimer ${U.esc(a.name)}">${UI.icon('Trash2')}</button></td></tr>`
          )
          .join('')}</tbody></table></div></div>`;
    },
    mount(root) {
      root.querySelector('#adm-q').addEventListener('input', (e) => {
        const q = U.norm(e.target.value);
        root.querySelectorAll('[data-row]').forEach((tr) => (tr.hidden = q && !tr.dataset.row.includes(q)));
      });
      root.addEventListener('click', async (e) => {
        const del = e.target.closest('[data-delete]');
        if (del) {
          const a = Store.association(del.dataset.delete);
          if (!(await UI.confirm(`Supprimer définitivement « ${a.name} » et ses événements ?`, { confirmLabel: 'Supprimer', danger: true }))) return;
          Store.deleteAssociation(a.id);
          UI.toast('Association supprimée.');
          rerender();
        }
        if (e.target.closest('[data-export="assoc"]')) {
          const rows = [['Nom', 'Thématiques', 'Villages', 'Contact', 'E-mail', 'Téléphone', 'Site web', 'Statut']].concat(
            Store.associations('all')
              .filter((a) => !a.revisionOf)
              .map((a) => [a.name, a.themes.map((t) => WA.theme(t).label).join(', '), a.villages.join(', '), a.contactName, a.email, a.phone, a.website, a.status])
          );
          U.download('associations-walhain.csv', U.toCsv(rows), 'text/csv;charset=utf-8');
        }
      });
    },
  };

  /* ---------------- Événements ---------------- */
  PANELS.evenements = {
    render() {
      const list = Store.events('all').sort((a, b) => b.date.localeCompare(a.date));
      return `<div class="panel">
        <div class="panel-toolbar"><label class="search-field">${UI.icon('Search')}<input type="search" id="adm-q" placeholder="Filtrer les événements…" aria-label="Filtrer"></label>
          <a class="btn btn-primary btn-sm" href="#/agenda/nouveau">${UI.icon('Plus')}Nouvel événement</a></div>
        <div class="table-wrap"><table class="table admin-table"><thead><tr><th>Événement</th><th>Date</th><th>Organisateur</th><th>Récurrence</th><th>Statut</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list
          .map(
            (e) => `<tr data-row="${U.esc(U.norm(e.title + ' ' + ((Store.association(e.associationId) || {}).name || '')))}"><td data-label="Événement"><a href="#/evenement/${e.id}"><strong>${U.esc(e.title)}</strong></a>${e.tentative ? ' <span class="tag tag-warn">à confirmer</span>' : ''}</td>
          <td data-label="Date">${U.fmtDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td data-label="Organisateur">${U.esc((Store.association(e.associationId) || {}).name || '—')}</td>
          <td data-label="Récurrence">${U.esc(U.recurrenceLabel(e))}</td><td data-label="Statut">${statusTag(e.status)}</td>
          <td class="row-actions">${e.status !== 'published' ? `<button class="icon-btn" data-publish="${e.id}" aria-label="Publier">${UI.icon('Check')}</button>` : ''}<a class="icon-btn" href="#/agenda/evenement/${e.id}/modifier" aria-label="Modifier">${UI.icon('Pencil')}</a><button class="icon-btn danger" data-delete="${e.id}" aria-label="Supprimer">${UI.icon('Trash2')}</button></td></tr>`
          )
          .join('')}</tbody></table></div></div>`;
    },
    mount(root) {
      root.querySelector('#adm-q').addEventListener('input', (e) => {
        const q = U.norm(e.target.value);
        root.querySelectorAll('[data-row]').forEach((tr) => (tr.hidden = q && !tr.dataset.row.includes(q)));
      });
      root.addEventListener('click', async (e) => {
        const del = e.target.closest('[data-delete]');
        const pub = e.target.closest('[data-publish]');
        if (pub) {
          Store.setEventStatus(pub.dataset.publish, 'published');
          UI.toast('Événement publié.');
          rerender();
        }
        if (del) {
          if (!(await UI.confirm('Supprimer cet événement (et toutes ses occurrences) ?', { confirmLabel: 'Supprimer', danger: true }))) return;
          Store.deleteEvent(del.dataset.delete);
          UI.toast('Événement supprimé.');
          rerender();
        }
      });
    },
  };

  /* ---------------- Messages ---------------- */
  PANELS.messages = {
    render() {
      const list = Store.messages();
      return `<div class="panel">
        <p class="muted small">Demandes envoyées via les boutons « Contacter ». En production, chaque message est envoyé par e-mail au destinataire ; quand l'association n'a pas encore d'adresse, il doit être relayé par l'administration. Conservation : ${WA.CONFIG.messageRetentionMonths} mois.</p>
        ${
          list.length
            ? `<ul class="messages">${list
                .map(
                  (m) => `<li class="message"><header><strong>${U.esc(m.firstName)} ${U.esc(m.lastName)}</strong> <a href="mailto:${U.esc(m.email)}">${U.esc(m.email)}</a> → <span>${U.esc(m.to.name)}</span>
              ${m.to.email ? `<span class="tag tag-free">envoyé à ${U.esc(m.to.email)}</span>` : '<span class="tag tag-warn">à relayer</span>'}<time>${U.fmtDateTime(m.createdAt)}</time></header>
              <p>${U.nl2br(m.message)}</p><div class="row-actions"><a class="btn btn-ghost btn-sm" href="mailto:${U.esc(m.email)}?subject=${encodeURIComponent(`Re: votre message à ${m.to.name}`)}">${UI.icon('Mail')}Répondre</a><button class="btn btn-danger-ghost btn-sm" data-delete="${m.id}">${UI.icon('Trash2')}Supprimer</button></div></li>`
                )
                .join('')}</ul>`
            : `<div class="empty">${UI.icon('Inbox')}<p>Aucun message pour le moment.</p></div>`
        }</div>`;
    },
    mount(root) {
      root.addEventListener('click', async (e) => {
        const del = e.target.closest('[data-delete]');
        if (!del) return;
        if (!(await UI.confirm('Supprimer ce message ?', { confirmLabel: 'Supprimer', danger: true }))) return;
        Store.deleteMessage(del.dataset.delete);
        rerender();
      });
    },
  };

  /* ---------------- Newsletter ---------------- */
  const Newsletter = {};
  Newsletter.build = (horizonDays) => {
    const from = U.today();
    const to = U.iso(U.addDays(new Date(), horizonDays));
    const occ = Store.occurrences(from, to);
    const base = location.href.split('#')[0];
    const subject = `Agenda associatif de Walhain – du ${U.fmtDate(from, { day: 'numeric', month: 'long' })} au ${U.fmtDate(to, { day: 'numeric', month: 'long' })}`;
    const items = occ
      .map((o) => {
        const a = Store.association(o.associationId);
        return `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d4;vertical-align:top;width:92px;color:#2f6b35;font-weight:700">${U.esc(U.fmtDate(o.occDate, { weekday: 'short', day: 'numeric', month: 'short' }))}${o.startTime ? `<br><span style="font-weight:400;color:#5b6660">${U.esc(U.fmtTime(o.startTime))}</span>` : ''}</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid #e6e0d4"><a href="${U.esc(`${base}#/evenement/${o.id}?date=${o.occDate}`)}" style="color:#1f4d2a;font-weight:700;text-decoration:none">${U.esc(o.title)}</a><br><span style="color:#5b6660;font-size:14px">${U.esc([o.place, o.village].filter(Boolean).join(', '))} · ${U.esc(a ? a.name : '')} · ${o.free ? 'Gratuit' : U.esc(o.price || 'Payant')}</span></td></tr>`;
      })
      .join('');
    const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2a24">
      <div style="background:#2f6b35;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.85">Réseau Associatif de Walhain</div><div style="font-size:22px;font-weight:700;margin-top:4px">Les activités à venir</div></div>
      <div style="background:#fff;padding:8px 24px 20px;border:1px solid #e6e0d4;border-top:0">
      ${occ.length ? `<table style="width:100%;border-collapse:collapse">${items}</table>` : '<p>Aucune activité programmée sur cette période.</p>'}
      <p style="margin-top:20px"><a href="${U.esc(base)}#/agenda" style="background:#2d6a8f;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none">Voir tout l'agenda</a></p>
      <p style="font-size:12px;color:#7a847e;margin-top:24px">Vous recevez cet e-mail car vous êtes inscrit·e à la newsletter du Réseau Associatif de Walhain. <a href="${U.esc(base)}#/newsletter/desinscription" style="color:#7a847e">Se désinscrire</a></p></div></div>`;
    return { subject, html, count: occ.length };
  };

  /** Envoi automatique : au chargement, si le jour d'envoi est atteint et qu'aucune newsletter n'est partie depuis 6 jours. */
  Newsletter.autoSend = () => {
    const s = Store.settings();
    if (!s.newsletterAuto) return;
    const now = new Date();
    const last = s.lastNewsletterAt || 0;
    if (now.getDay() !== Number(s.newsletterDay) || Date.now() - last < 6 * 86400000) return;
    const nl = Newsletter.build(Number(s.newsletterHorizonDays) || 14);
    Store.recordNewsletter({ subject: nl.subject, html: nl.html, recipients: Store.subscribers().length, auto: true });
  };
  WA.Newsletter = Newsletter;

  PANELS.newsletter = {
    render() {
      const s = Store.settings();
      const nl = Newsletter.build(Number(s.newsletterHorizonDays) || 14);
      const subs = Store.subscribers();
      const sent = Store.newsletters();
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return `
      <div class="dash-grid">
        <section class="panel"><h2>${UI.icon('Settings')}Envoi automatique</h2>
          <form id="nl-settings" class="form">
            <label class="check"><input type="checkbox" name="newsletterAuto" ${s.newsletterAuto ? 'checked' : ''}><span>Envoyer automatiquement les événements à venir</span></label>
            <div class="grid-2">
              <label class="field"><span>Jour d'envoi</span><select name="newsletterDay">${days.map((d, i) => `<option value="${i}" ${Number(s.newsletterDay) === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
              <label class="field"><span>Période couverte</span><select name="newsletterHorizonDays">${[7, 14, 30].map((n) => `<option value="${n}" ${Number(s.newsletterHorizonDays) === n ? 'selected' : ''}>${n} jours</option>`).join('')}</select></label>
            </div>
            <p class="small muted">Dernier envoi : ${s.lastNewsletterAt ? U.fmtDateTime(s.lastNewsletterAt) : 'jamais'}.</p>
          </form>
          <div class="form-actions"><button class="btn btn-primary btn-sm" id="nl-send">${UI.icon('Send')}Envoyer maintenant (${subs.length})</button><button class="btn btn-ghost btn-sm" id="nl-copy">${UI.icon('Copy')}Copier le HTML</button></div>
        </section>
        <section class="panel"><h2>${UI.icon('Users')}Abonnés <span class="count">${subs.length}</span></h2>
          ${subs.length ? `<ul class="plain subs">${subs.map((x) => `<li><span>${U.esc(x.email)}</span><small>${U.fmtDateTime(x.createdAt)}</small><button class="icon-btn danger" data-unsub="${U.esc(x.email)}" aria-label="Désinscrire ${U.esc(x.email)}">${UI.icon('Trash2')}</button></li>`).join('')}</ul>` : '<p class="muted small">Aucun abonné pour le moment. Le formulaire d\'inscription se trouve en pied de page.</p>'}
          ${subs.length ? `<button class="btn btn-ghost btn-sm" id="nl-export">${UI.icon('Download')}Exporter (CSV)</button>` : ''}
        </section>
        <section class="panel span-2"><h2>${UI.icon('Eye')}Aperçu – ${U.esc(nl.subject)}</h2><p class="small muted">${nl.count} date${nl.count > 1 ? 's' : ''} incluse${nl.count > 1 ? 's' : ''}.</p>
          <div class="nl-preview">${nl.html}</div></section>
        <section class="panel span-2"><h2>${UI.icon('Newspaper')}Historique des envois</h2>
          ${sent.length ? `<ul class="plain">${sent.map((n) => `<li>${UI.icon('Send')}<span>${U.esc(n.subject)}</span><small>${U.fmtDateTime(n.sentAt)} · ${n.recipients} destinataire(s)${n.auto ? ' · automatique' : ''}</small></li>`).join('')}</ul>` : '<p class="muted small">Aucun envoi.</p>'}</section>
      </div>
      <p class="hint">Prototype : l'envoi est simulé et journalisé. En production, brancher un service d'e-mailing (SMTP communal, Brevo, Mailjet…) via le backend.</p>`;
    },
    mount(root) {
      const s = Store.settings();
      root.querySelector('#nl-settings').addEventListener('change', (e) => {
        const f = e.currentTarget;
        Store.updateSettings({ newsletterAuto: f.newsletterAuto.checked, newsletterDay: Number(f.newsletterDay.value), newsletterHorizonDays: Number(f.newsletterHorizonDays.value) });
        UI.toast('Paramètres enregistrés.');
        rerender();
      });
      root.querySelector('#nl-send').addEventListener('click', async () => {
        const n = Store.subscribers().length;
        if (!n) return UI.toast('Aucun abonné à qui envoyer la newsletter.', 'error');
        if (!(await UI.confirm(`Envoyer la newsletter à ${n} abonné(s) ?`, { confirmLabel: 'Envoyer' }))) return;
        const nl = Newsletter.build(Number(s.newsletterHorizonDays) || 14);
        Store.recordNewsletter({ subject: nl.subject, html: nl.html, recipients: n });
        UI.toast('Newsletter envoyée.');
        rerender();
      });
      root.querySelector('#nl-copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(Newsletter.build(Number(s.newsletterHorizonDays) || 14).html);
          UI.toast('HTML copié.');
        } catch (e) {
          UI.toast('Copie impossible dans ce navigateur.', 'error');
        }
      });
      const exp = root.querySelector('#nl-export');
      exp && exp.addEventListener('click', () => U.download('abonnes-newsletter.csv', U.toCsv([['E-mail', 'Inscription'], ...Store.subscribers().map((x) => [x.email, new Date(x.createdAt).toISOString()])]), 'text/csv;charset=utf-8'));
      root.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-unsub]');
        if (!b) return;
        if (!(await UI.confirm(`Désinscrire ${b.dataset.unsub} ?`, { confirmLabel: 'Désinscrire', danger: true }))) return;
        try {
          await Store.unsubscribe(b.dataset.unsub);
        } catch (err) {
          return UI.toast(WA.Remote.errorMessage(err), 'error');
        }
        rerender();
      });
    },
  };

  /* ---------------- Utilisateurs ---------------- */
  PANELS.utilisateurs = {
    render(me) {
      return `<div class="panel">
        <div class="panel-toolbar"><p class="muted small">Les <strong>administrateurs</strong> gèrent tout le portail ; les <strong>modérateurs</strong> valident et modifient les contenus.${shared() ? ' Retirer un utilisateur supprime ses droits ; son compte de connexion peut ensuite être supprimé dans la console Firebase (Authentication).' : ''}</p>
          <button class="btn btn-primary btn-sm" data-user="new">${UI.icon('UserPlus')}Ajouter un utilisateur</button></div>
        <div class="table-wrap"><table class="table admin-table"><thead><tr><th>Utilisateur</th><th>Nom</th><th>Rôle</th><th>Dernière connexion</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${Store.users()
          .map(
            (u) => `<tr><td data-label="Utilisateur"><strong>${U.esc(u.username || u.email)}</strong>${u.id === me.id ? ' <span class="tag tag-soft">vous</span>' : ''}</td><td data-label="Nom">${U.esc(u.name)}<br><small class="muted">${U.esc(u.email)}</small></td>
          <td data-label="Rôle">${u.role === 'admin' ? 'Administrateur' : 'Modérateur'}</td><td data-label="Dernière connexion">${u.lastLogin ? U.fmtDateTime(u.lastLogin) : '—'}</td>
          <td class="row-actions"><button class="icon-btn" data-user="${u.id}" aria-label="Modifier">${UI.icon('Pencil')}</button>${u.id !== me.id ? `<button class="icon-btn danger" data-delete="${u.id}" aria-label="Supprimer">${UI.icon('Trash2')}</button>` : ''}</td></tr>`
          )
          .join('')}</tbody></table></div></div>`;
    },
    mount(root) {
      root.addEventListener('click', async (e) => {
        const edit = e.target.closest('[data-user]');
        const del = e.target.closest('[data-delete]');
        if (del) {
          if (!(await UI.confirm('Supprimer cet utilisateur ?', { confirmLabel: 'Supprimer', danger: true }))) return;
          try {
            await Store.deleteUser(del.dataset.delete);
            rerender();
          } catch (err) {
            UI.toast(err.code ? WA.Remote.errorMessage(err) : err.message, 'error');
          }
        }
        if (!edit) return;
        const u = edit.dataset.user === 'new' ? null : Store.user(edit.dataset.user);
        const sh = shared();
        const passwordField = sh && u
          ? `<button type="button" class="btn btn-ghost btn-sm" id="send-reset">${UI.icon('Mail')}Envoyer un lien de réinitialisation du mot de passe</button>`
          : `<label class="field"><span>${u ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe * (10 caractères min.)'}</span><input type="password" name="password" autocomplete="new-password"></label>`;
        const m = UI.modal(
          `<form class="form" novalidate>
            <label class="field"><span>${sh ? 'Adresse e-mail de connexion *' : "Nom d'utilisateur *"}</span><input name="username" ${sh ? 'type="email"' : ''} value="${U.esc(u ? u.username || u.email : '')}" ${u ? 'readonly' : ''} required autocomplete="off"></label>
            <label class="field"><span>Nom complet</span><input name="name" value="${U.esc(u ? u.name : '')}"></label>
            ${sh ? '' : `<label class="field"><span>E-mail</span><input type="email" name="email" value="${U.esc(u ? u.email : '')}"></label>`}
            <label class="field"><span>Rôle</span><select name="role"><option value="moderateur">Modérateur</option><option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Administrateur</option></select></label>
            ${passwordField}
            <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
          </form>`,
          { title: u ? `Modifier ${u.username || u.email}` : 'Nouvel utilisateur', size: 'modal-sm' }
        );
        const sendReset = m.querySelector('#send-reset');
        sendReset &&
          sendReset.addEventListener('click', async () => {
            try {
              await Store.resetPassword(u.username || u.email);
              UI.toast(`Lien de réinitialisation envoyé à ${u.username || u.email}.`);
            } catch (err) {
              UI.toast(WA.Remote.errorMessage(err), 'error');
            }
          });
        m.querySelector('form').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const d = { password: '', email: '', ...Object.fromEntries(new FormData(ev.target)) };
          if (!u && sh && !U.isEmail(d.username)) return UI.formError(ev.target, 'Adresse e-mail de connexion invalide.');
          if (!u && !sh && !/^[a-z0-9._-]{3,}$/i.test(d.username)) return UI.formError(ev.target, "Nom d'utilisateur invalide (3 caractères min., lettres, chiffres, . _ -).");
          if ((!u || d.password) && d.password.length < 10) return UI.formError(ev.target, 'Le mot de passe doit contenir au moins 10 caractères.');
          if (d.email && !U.isEmail(d.email)) return UI.formError(ev.target, 'Adresse e-mail invalide.');
          if (u && u.role === 'admin' && d.role !== 'admin' && Store.users().filter((x) => x.role === 'admin').length <= 1) return UI.formError(ev.target, 'Il doit rester au moins un administrateur.');
          try {
            await Store.saveUser({ id: u && u.id, ...d });
            UI.closeModal();
            UI.toast('Utilisateur enregistré.');
            rerender();
          } catch (err) {
            UI.formError(ev.target, err.code ? WA.Remote.errorMessage(err) : err.message);
          }
        });
      });
    },
  };

  /* ---------------- Données & RGPD ---------------- */
  PANELS.donnees = {
    render() {
      return `<div class="dash-grid">
        <section class="panel"><h2>${UI.icon('Download')}Sauvegarde</h2><p class="small">Exportez l'ensemble des données (associations, événements, messages, abonnés, utilisateurs) au format JSON, ou restaurez une sauvegarde.</p>
          <div class="form-actions"><button class="btn btn-primary btn-sm" id="data-export">${UI.icon('Download')}Exporter (JSON)</button>
          <label class="btn btn-ghost btn-sm file-btn">${UI.icon('Upload')}Importer<input type="file" accept="application/json" id="data-import"></label></div></section>
        <section class="panel"><h2>${UI.icon('ShieldCheck')}RGPD</h2>
          <ul class="plain small"><li>${UI.icon('Check')}Messages de contact conservés ${WA.CONFIG.messageRetentionMonths} mois puis supprimés automatiquement.</li>
          <li>${UI.icon('Check')}Désinscription de la newsletter en un clic (lien dans chaque envoi).</li>
          <li>${UI.icon('Check')}Aucun cookie publicitaire ni traceur tiers ; statistiques anonymes.</li>
          <li>${UI.icon('Check')}Droit d'accès et d'effacement : recherche et suppression ci-dessous.</li></ul>
          <form id="gdpr-search" class="form"><label class="field"><span>Rechercher les données d'une personne (e-mail)</span><input type="email" name="email" required></label><button class="btn btn-soft btn-sm">${UI.icon('Search')}Rechercher</button></form>
          <div id="gdpr-result"></div></section>
        ${
          shared()
            ? `<section class="panel span-2"><h2>${UI.icon('Upload')}Données de départ</h2><p class="small">Charge dans la base partagée les ${WA.buildSeed().associations.length} associations issues des fiches individuelles et les événements d'exemple. Les fiches existantes portant le même identifiant sont remplacées.</p>
          <button class="btn btn-primary btn-sm" id="data-seed">${UI.icon('Upload')}Importer les données de départ</button></section>`
            : `<section class="panel span-2 panel-danger"><h2>${UI.icon('RotateCcw')}Réinitialiser le prototype</h2><p class="small">Remet les données de démonstration issues des fiches individuelles (les ajouts et modifications seront perdus).</p>
          <button class="btn btn-danger btn-sm" id="data-reset">${UI.icon('RotateCcw')}Réinitialiser</button></section>`
        }
      </div>`;
    },
    mount(root) {
      root.querySelector('#data-export').addEventListener('click', () => U.download(`reseau-associatif-walhain-${U.today()}.json`, Store.exportJson(), 'application/json'));
      root.querySelector('#data-import').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await Store.importJson(await file.text());
          UI.toast('Données importées.');
          rerender();
        } catch (err) {
          UI.toast(`Import impossible : ${err.message}`, 'error');
        }
      });
      const seedBtn = root.querySelector('#data-seed');
      seedBtn &&
        seedBtn.addEventListener('click', async () => {
          if (!(await UI.confirm('Importer les associations et événements de départ dans la base partagée ?', { confirmLabel: 'Importer' }))) return;
          seedBtn.disabled = true;
          try {
            await Store.importSeed();
            UI.toast('Données de départ importées.');
            rerender();
          } catch (err) {
            seedBtn.disabled = false;
            UI.toast(WA.Remote.errorMessage(err), 'error');
          }
        });
      const resetBtn = root.querySelector('#data-reset');
      resetBtn && resetBtn.addEventListener('click', async () => {
        if (!(await UI.confirm('Réinitialiser toutes les données du prototype ?', { confirmLabel: 'Réinitialiser', danger: true }))) return;
        Store.reset();
        UI.toast('Données réinitialisées. Reconnectez-vous.');
        location.hash = '#/admin';
      });
      root.querySelector('#gdpr-search').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim().toLowerCase();
        const msgs = Store.messages().filter((m) => m.email.toLowerCase() === email);
        const sub = Store.subscribers().find((s) => s.email === email);
        const events = Store.events('all').filter((ev) => (ev.contactEmail || '').toLowerCase() === email);
        const assocs = Store.associations('all').filter((a) => (a.email || '').toLowerCase() === email);
        const out = root.querySelector('#gdpr-result');
        out.innerHTML = `<ul class="plain small"><li>${msgs.length} message(s) de contact</li><li>${sub ? 'Abonné·e' : 'Non abonné·e'} à la newsletter</li><li>${events.length} événement(s) avec ce contact</li><li>${assocs.length} fiche(s) association avec cet e-mail</li></ul>
          ${msgs.length || sub ? `<button class="btn btn-danger-ghost btn-sm" id="gdpr-erase">${UI.icon('Trash2')}Effacer messages et abonnement</button>` : ''}`;
        const erase = out.querySelector('#gdpr-erase');
        erase &&
          erase.addEventListener('click', async () => {
            if (!(await UI.confirm(`Effacer les messages et l'abonnement de ${email} ?`, { confirmLabel: 'Effacer', danger: true }))) return;
            msgs.forEach((m) => Store.deleteMessage(m.id));
            try {
              await Store.unsubscribe(email);
              await Store.flush();
            } catch (err) {
              return UI.toast(WA.Remote.errorMessage(err), 'error');
            }
            UI.toast('Données effacées.');
            out.innerHTML = '';
          });
      });
    },
  };
})(window.WA);
