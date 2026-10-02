/* Référentiels : villages, thématiques, publics cibles. */
window.WA = window.WA || {};

WA.CONFIG = {
  appName: 'Réseau Associatif de Walhain',
  storageKey: 'reseau-associatif-walhain:v1',
  sessionKey: 'reseau-associatif-walhain:session',
  consentKey: 'reseau-associatif-walhain:consent',
  sessionMinutes: 60,
  messageRetentionMonths: 12,
  mapCenter: [50.6405, 4.6935],
  mapZoom: 13,
};

WA.VILLAGES = [
  { id: 'Walhain', coords: [50.6252, 4.6975] },
  { id: 'Tourinnes-Saint-Lambert', coords: [50.6508, 4.7285] },
  { id: 'Perbais', coords: [50.6585, 4.6905] },
  { id: 'Nil-Saint-Vincent', coords: [50.6405, 4.6655] },
  { id: 'Nil-Pierreux', coords: [50.6300, 4.6520] },
];

WA.THEMES = [
  { id: 'culture', label: 'Culture & Patrimoine', icon: 'Landmark', color: '#7a4a8c' },
  { id: 'nature', label: 'Nature & Environnement', icon: 'Leaf', color: '#2f6b35' },
  { id: 'jeunesse', label: 'Jeunesse', icon: 'Backpack', color: '#a8561a' },
  { id: 'sport', label: 'Sport', icon: 'Trophy', color: '#1f6394' },
  { id: 'aines', label: 'Aînés', icon: 'Glasses', color: '#7b6334' },
  { id: 'solidarite', label: 'Solidarité & Social', icon: 'HeartHandshake', color: '#a8374a' },
  { id: 'sante', label: 'Santé', icon: 'Stethoscope', color: '#16705f' },
  { id: 'education', label: 'Éducation & Formation', icon: 'GraduationCap', color: '#3d4f9f' },
  { id: 'loisirs', label: 'Loisirs', icon: 'Dice5', color: '#a3325b' },
  { id: 'animation', label: 'Animation villageoise', icon: 'PartyPopper', color: '#b0470c' },
  { id: 'artisanat', label: 'Artisanat', icon: 'Scissors', color: '#85522f' },
  { id: 'economie', label: 'Économie locale', icon: 'Store', color: '#566628' },
  { id: 'mobilite', label: 'Mobilité', icon: 'Footprints', color: '#0d6c75' },
  { id: 'autres', label: 'Autres', icon: 'Shapes', color: '#56626b' },
];

WA.AUDIENCES = [
  { id: 'tout-public', label: 'Tout public' },
  { id: 'enfants', label: 'Enfants' },
  { id: 'jeunes', label: 'Jeunes' },
  { id: 'adultes', label: 'Adultes' },
  { id: 'aines', label: 'Aînés' },
  { id: 'familles', label: 'Familles' },
];

WA.FREQUENCIES = ['Hebdomadaire', 'Bimensuelle', 'Mensuelle', 'Trimestrielle', 'Annuelle', 'Ponctuelle', 'Plusieurs fois par semaine'];

WA.theme = (id) => WA.THEMES.find((t) => t.id === id) || WA.THEMES[WA.THEMES.length - 1];
WA.audience = (id) => WA.AUDIENCES.find((a) => a.id === id);
WA.village = (id) => WA.VILLAGES.find((v) => v.id === id);

/* ---------------- Contenus modifiables depuis l'admin ---------------- */
const DEFAULT_LISTS = JSON.parse(JSON.stringify({ villages: WA.VILLAGES, themes: WA.THEMES, audiences: WA.AUDIENCES }));

WA.siteDefaults = () => ({
  siteName: 'Réseau Associatif',
  siteSubtitle: 'de Walhain',
  communeName: 'Commune de Walhain',
  logo: '',
  primaryColor: '#2f6b35',
  accentColor: '#2d6a8f',
  heroEyebrow: 'Commune de Walhain',
  heroTitle: 'Le réseau des associations\nde nos cinq villages',
  heroText:
    'Trouvez une association, découvrez les activités près de chez vous et participez à la vie locale de Walhain, Tourinnes-Saint-Lambert, Perbais, Nil-Saint-Vincent et Nil-Pierreux.',
  ctaTitle: 'Vous animez une association ?',
  ctaText: 'Faites connaître vos activités, trouvez des bénévoles et des partenaires, et coordonnez vos dates avec les autres associations.',
  partnersText:
    "Un outil de la Commune de Walhain, développé avec la CLDR et la Fondation Rurale de Wallonie dans le cadre de l'Opération de Développement Rural.",
  footerText: 'Le portail numérique des associations de Walhain, Tourinnes-Saint-Lambert, Perbais, Nil-Saint-Vincent et Nil-Pierreux.',
  ...JSON.parse(JSON.stringify(DEFAULT_LISTS)),
});

const replaceInPlace = (target, items) => {
  if (Array.isArray(items) && items.length) target.splice(0, target.length, ...items);
};

/** Applique les contenus (listes, couleurs, textes de l'en-tête et du pied de page). */
WA.applySite = (site) => {
  WA.SITE = site;
  replaceInPlace(WA.VILLAGES, site.villages);
  replaceInPlace(WA.THEMES, site.themes);
  replaceInPlace(WA.AUDIENCES, site.audiences);
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const valid = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
  if (valid(site.primaryColor)) {
    const p = site.primaryColor;
    root.setProperty('--green-700', p);
    root.setProperty('--green-600', `color-mix(in srgb, ${p} 85%, white)`);
    root.setProperty('--green-800', `color-mix(in srgb, ${p} 78%, black)`);
    root.setProperty('--green-900', `color-mix(in srgb, ${p} 55%, black)`);
    root.setProperty('--green-100', `color-mix(in srgb, ${p} 16%, white)`);
    root.setProperty('--green-50', `color-mix(in srgb, ${p} 7%, white)`);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta && meta.setAttribute('content', p);
  }
  if (valid(site.accentColor)) {
    root.setProperty('--blue-700', site.accentColor);
    root.setProperty('--blue-800', `color-mix(in srgb, ${site.accentColor} 78%, black)`);
    root.setProperty('--blue-100', `color-mix(in srgb, ${site.accentColor} 15%, white)`);
  }
  const set = (sel, text) => document.querySelectorAll(sel).forEach((el) => (el.textContent = text));
  set('[data-site="name"]', site.siteName);
  set('[data-site="subtitle"]', site.siteSubtitle);
  set('[data-site="footer"]', site.footerText);
  set('[data-site="fullname"]', `${site.siteName} ${site.siteSubtitle}`.trim());
  set('[data-site="commune"]', site.communeName);
  const logo = document.querySelector('[data-site="logo"]');
  const svg = document.querySelector('.brand-logo');
  if (logo && svg) {
    logo.hidden = !site.logo;
    svg.style.display = site.logo ? 'none' : '';
    if (site.logo) logo.src = site.logo;
  }
};
