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
