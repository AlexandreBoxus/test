/* Carte interactive de Walhain (Leaflet + OpenStreetMap). */
(function (WA) {
  const { U, UI, Store, CONFIG } = WA;
  const V = (WA.views = WA.views || {});
  const M = {};

  const hasLeaflet = () => typeof window.L !== 'undefined';

  /** Position d'une association : coordonnées saisies, sinon centre du village avec léger décalage déterministe. */
  M.position = (a) => {
    if (a.coords && a.coords.length === 2) return a.coords;
    const v = WA.village(a.villages.length === WA.VILLAGES.length ? 'Walhain' : a.villages[0]) || WA.VILLAGES[0];
    let h = 0;
    for (const c of a.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const angle = (h % 360) * (Math.PI / 180);
    const r = 0.0012 + ((h >> 9) % 100) / 100000 * 3;
    return [v.coords[0] + Math.sin(angle) * r, v.coords[1] + Math.cos(angle) * r * 1.5];
  };

  const baseMap = (el, opts = {}) => {
    const map = L.map(el, { scrollWheelZoom: false, ...opts }).setView(CONFIG.mapCenter, CONFIG.mapZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    return map;
  };

  const pin = (color, icon) =>
    L.divIcon({
      className: 'map-pin',
      html: `<span class="map-pin-inner" style="--c:${color}">${UI.icon(icon)}</span>`,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -38],
    });

  V.map = (params, query) => `
    <section class="page-head page-head-green">
      <div class="container">
        <p class="eyebrow">${UI.icon('Map')}Carte interactive</p>
        <h1>Les associations sur le territoire</h1>
        <p class="lead">Explorez les associations de Walhain, Tourinnes-Saint-Lambert, Perbais, Nil-Saint-Vincent et Nil-Pierreux.</p>
      </div>
    </section>
    <section class="container map-layout">
      <aside class="map-side">
        <label class="search-field">${UI.icon('Search')}<span class="sr-only">Filtrer</span><input type="search" id="map-q" placeholder="Filtrer…"></label>
        <label class="field-inline"><span>Thématique</span><select id="map-theme"><option value="">Toutes</option>${WA.THEMES.map((t) => `<option value="${t.id}">${U.esc(t.label)}</option>`).join('')}</select></label>
        <ul class="map-list" id="map-list"></ul>
      </aside>
      <div class="map-wrap"><div id="map" class="map" role="application" aria-label="Carte des associations"></div>
        <p class="hint">Les positions sont indicatives (centre du village) tant que l'association n'a pas précisé son adresse.</p></div>
    </section>`;

  V.map.mount = (root, params, query) => {
    const el = root.querySelector('#map');
    const listEl = root.querySelector('#map-list');
    const assocs = Store.associations();
    let map = null;
    const markers = {};
    if (hasLeaflet()) {
      map = baseMap(el, { scrollWheelZoom: true });
      WA.VILLAGES.forEach((v) =>
        L.marker(v.coords, { interactive: false, icon: L.divIcon({ className: 'village-label', html: `<span>${U.esc(v.id)}</span>`, iconSize: null }) }).addTo(map)
      );
      assocs.forEach((a) => {
        const t = WA.theme(a.themes[0]);
        markers[a.id] = L.marker(M.position(a), { icon: pin(t.color, t.icon), title: a.name, alt: a.name })
          .bindPopup(
            `<div class="map-popup"><strong>${U.esc(a.name)}</strong><span style="color:${t.color}">${U.esc(t.label)}</span><p>${U.esc(a.shortDescription)}</p><a href="#/associations/${a.id}">Voir la fiche →</a></div>`
          )
          .addTo(map);
      });
      setTimeout(() => map.invalidateSize(), 50);
    } else {
      el.innerHTML = `<div class="empty">${UI.icon('Map')}<p>La carte n'a pas pu être chargée.</p></div>`;
    }
    const render = () => {
      const q = U.norm(root.querySelector('#map-q').value);
      const th = root.querySelector('#map-theme').value;
      const visible = assocs.filter((a) => (!th || a.themes.includes(th)) && (!q || U.norm(`${a.name} ${a.villages.join(' ')} ${(a.keywords || []).join(' ')}`).includes(q)));
      listEl.innerHTML = visible
        .map((a) => `<li><button type="button" data-focus="${a.id}">${UI.themeIcon(a.themes[0], 'sm')}<span><strong>${U.esc(a.name)}</strong><small>${U.esc(a.villages.length === WA.VILLAGES.length ? 'Toute la commune' : a.villages.join(', '))}</small></span></button></li>`)
        .join('');
      if (map)
        assocs.forEach((a) => {
          const on = visible.includes(a);
          if (on && !map.hasLayer(markers[a.id])) markers[a.id].addTo(map);
          if (!on && map.hasLayer(markers[a.id])) map.removeLayer(markers[a.id]);
        });
    };
    const focus = (id) => {
      if (!map || !markers[id]) return (location.hash = `#/associations/${id}`);
      map.setView(markers[id].getLatLng(), 15);
      markers[id].openPopup();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    root.querySelector('#map-q').addEventListener('input', render);
    root.querySelector('#map-theme').addEventListener('change', render);
    listEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-focus]');
      b && focus(b.dataset.focus);
    });
    render();
    if (query.focus) setTimeout(() => focus(query.focus), 120);
  };

  /** Mini-carte de saisie de position dans le formulaire d'association. */
  M.picker = (el, form, firstVillage) => {
    if (!el) return;
    if (!hasLeaflet()) {
      el.hidden = true;
      return;
    }
    const map = baseMap(el);
    let marker = null;
    const set = (latlng) => {
      form.lat.value = latlng.lat.toFixed(6);
      form.lng.value = latlng.lng.toFixed(6);
      if (marker) marker.setLatLng(latlng);
      else marker = L.marker(latlng, { icon: pin('#2f6b35', 'MapPin'), draggable: true }).addTo(map).on('dragend', (e) => set(e.target.getLatLng()));
    };
    if (form.lat.value && form.lng.value) {
      set({ lat: +form.lat.value, lng: +form.lng.value });
      map.setView([+form.lat.value, +form.lng.value], 15);
    }
    map.on('click', (e) => set(e.latlng));
    form.addEventListener('change', (e) => {
      if (e.target.name === 'villages' && e.target.checked && !marker) {
        const v = WA.village(e.target.value);
        v && map.setView(v.coords, 15);
      }
    });
    setTimeout(() => map.invalidateSize(), 80);
  };

  WA.Map = M;
})(window.WA);
