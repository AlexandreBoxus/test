/* Utilitaires génériques : échappement HTML, dates, récurrences, hachage, images. */
(function (root) {
  const U = {};

  U.uid = (prefix = 'id') =>
    `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  U.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  U.slugify = (s) => U.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'element';

  U.nl2br = (s) => U.esc(s).replace(/\n/g, '<br>');

  const STOP_WORDS = new Set(['asbl', 'le', 'la', 'les', 'de', 'du', 'des', 'et', 'a', 'au', 'aux']);
  U.sortName = (name) => String(name || '').replace(/^(ASBL|Groupe)\s+/i, '');
  U.initials = (name) =>
    String(name || '?')
      .replace(/[«»"()'’]/g, ' ')
      .split(/[\s–-]+/)
      .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()) && /^[\p{L}0-9]/u.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';

  U.debounce = (fn, ms = 250) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  U.isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

  U.safeUrl = (u) => {
    const s = String(u || '').trim();
    if (!s) return '';
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
      const url = new URL(withProto);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (e) {
      return '';
    }
  };

  /* ---------- Dates (chaînes locales AAAA-MM-JJ, sans fuseau) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  U.pad = pad;
  U.parseDate = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  U.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.today = () => U.iso(new Date());
  U.addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  U.addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  U.diffDays = (a, b) => Math.round((a - b) / 86400000);
  U.startOfWeek = (d) => U.addDays(d, -((d.getDay() + 6) % 7)); // lundi
  U.startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  U.endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const LOCALE = 'fr-BE';
  const fmt = (opts) => new Intl.DateTimeFormat(LOCALE, opts);
  U.fmtDate = (s, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
    s ? fmt(opts).format(U.parseDate(s)) : '';
  U.fmtShort = (s) => U.fmtDate(s, { day: 'numeric', month: 'short' });
  U.fmtMonthYear = (d) => fmt({ month: 'long', year: 'numeric' }).format(d);
  U.fmtDateTime = (ts) => fmt({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  U.fmtTime = (t) => (t ? t.replace(':', 'h') : '');
  U.WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  U.WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  U.ORDINALS = ['1er', '2e', '3e', '4e', '5e'];

  /* ---------- Récurrences ---------- */
  /**
   * Génère les occurrences d'un événement entre deux dates (incluses).
   * recurrence = { type: 'none'|'weekly'|'monthly'|'yearly', interval, until, monthlyMode: 'date'|'weekday', exceptions: [] }
   * Sans date de fin, la série est générée sur 12 mois maximum.
   */
  U.MAX_RECURRENCE_MONTHS = 12;
  U.nthWeekdayOfMonth = (year, month, weekday, nth) => {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    const day = 1 + offset + (nth - 1) * 7;
    const d = new Date(year, month, day);
    return d.getMonth() === ((month % 12) + 12) % 12 ? d : null;
  };

  U.occurrenceDate = (start, type, i, mode) => {
    const y = start.getFullYear();
    const m = start.getMonth();
    const day = start.getDate();
    if (type === 'weekly') return U.addDays(start, 7 * i);
    if (type === 'yearly') {
      const d = new Date(y + i, m, day);
      return d.getDate() === day ? d : null; // 29 février
    }
    if (type === 'monthly') {
      if (mode === 'weekday') {
        const target = new Date(y, m + i, 1);
        return U.nthWeekdayOfMonth(target.getFullYear(), target.getMonth(), start.getDay(), Math.ceil(day / 7));
      }
      const d = new Date(y, m + i, day);
      return d.getDate() === day ? d : null; // pas de 31 dans les mois courts
    }
    return i === 0 ? start : null;
  };

  U.expandOccurrences = (ev, fromIso, toIso) => {
    const out = [];
    if (!ev || !ev.date) return out;
    const start = U.parseDate(ev.date);
    const span = ev.endDate && ev.endDate > ev.date ? U.diffDays(U.parseDate(ev.endDate), start) : 0;
    const from = U.parseDate(fromIso);
    const to = U.parseDate(toIso);
    const rec = ev.recurrence || { type: 'none' };
    const type = rec.type || 'none';
    const interval = Math.max(1, Number(rec.interval) || 1);
    const exceptions = new Set(rec.exceptions || []);
    let until = rec.until ? U.parseDate(rec.until) : new Date(start.getFullYear(), start.getMonth() + U.MAX_RECURRENCE_MONTHS, start.getDate());
    if (type === 'none') until = start;
    if (until > to) until = to;

    for (let i = 0, guard = 0; guard < 1000; i += interval, guard++) {
      const d = U.occurrenceDate(start, type, i, rec.monthlyMode);
      if (type === 'none' && i > 0) break;
      if (d === null) continue;
      if (d > until) break;
      const end = U.addDays(d, span);
      const iso = U.iso(d);
      if (end >= from && !exceptions.has(iso)) {
        out.push({ ...ev, occDate: iso, occEndDate: span ? U.iso(end) : iso, occKey: `${ev.id}@${iso}` });
      }
      if (type === 'none') break;
    }
    return out;
  };

  U.recurrenceLabel = (ev) => {
    const r = ev.recurrence || {};
    const d = ev.date ? U.parseDate(ev.date) : null;
    const until = r.until ? ` jusqu'au ${U.fmtDate(r.until, { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
    const n = Number(r.interval) || 1;
    switch (r.type) {
      case 'weekly':
        return `${n > 1 ? `Toutes les ${n} semaines` : 'Chaque semaine'}${d ? ` le ${U.WEEKDAYS[(d.getDay() + 6) % 7].toLowerCase()}` : ''}${until}`;
      case 'monthly':
        if (r.monthlyMode === 'weekday' && d)
          return `Chaque mois, le ${U.ORDINALS[Math.ceil(d.getDate() / 7) - 1]} ${U.WEEKDAYS[(d.getDay() + 6) % 7].toLowerCase()}${until}`;
        return `Chaque mois${d ? `, le ${d.getDate()}` : ''}${until}`;
      case 'yearly':
        return `Chaque année${d ? `, le ${U.fmtDate(ev.date, { day: 'numeric', month: 'long' })}` : ''}${until}`;
      default:
        return 'Événement unique';
    }
  };

  /* ---------- SHA-256 (synchrone, pour le prototype hors-ligne) ---------- */
  U.sha256 = (ascii) => {
    const rightRotate = (v, a) => (v >>> a) | (v << (32 - a));
    const maxWord = 2 ** 32;
    const str = unescape(encodeURIComponent(ascii));
    const hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (candidate ** 0.5 * maxWord) | 0;
        k[primeCounter++] = (candidate ** (1 / 3) * maxWord) | 0;
      }
    }
    const H = hash.slice(0, 8);
    const words = [];
    let s = str + '\x80';
    while ((s.length % 64) - 56) s += '\x00';
    for (let i = 0; i < s.length; i++) {
      const j = s.charCodeAt(i);
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (str.length * 8 / maxWord) | 0;
    words[words.length] = (str.length * 8) | 0;
    for (let j = 0; j < words.length; ) {
      const w = words.slice(j, (j += 16));
      const old = H.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = H[0];
        const e = H[4];
        const temp1 =
          H[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & H[5]) ^ (~e & H[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H.unshift((temp1 + temp2) | 0);
        H.pop();
        H[4] = (H[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  };

  U.hashPassword = (password, salt) => U.sha256(`${salt}::${password}`);

  /* ---------- Images : redimensionnement avant stockage ---------- */
  U.resizeImage = (file, max = 1000, quality = 0.8) =>
    new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Format non pris en charge'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture impossible'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image illisible'));
        img.onload = () => {
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  U.download = (filename, content, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  };

  U.toCsv = (rows) =>
    '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

  if (typeof module !== 'undefined' && module.exports) module.exports = U;
  else {
    root.WA = root.WA || {};
    root.WA.U = U;
  }
})(typeof window !== 'undefined' ? window : globalThis);
