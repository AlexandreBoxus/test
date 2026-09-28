/* Tests unitaires des utilitaires (récurrences, hachage). Lancer : node --test tests/ */
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const U = require('../assets/js/utils.js');

const dates = (ev, from, to) => U.expandOccurrences({ id: 'e', ...ev }, from, to).map((o) => o.occDate);

test('événement unique', () => {
  assert.deepStrictEqual(dates({ date: '2026-10-10' }, '2026-10-01', '2026-10-31'), ['2026-10-10']);
  assert.deepStrictEqual(dates({ date: '2026-10-10' }, '2026-11-01', '2026-11-30'), []);
});

test('événement sur plusieurs jours visible pendant toute sa durée', () => {
  const occ = U.expandOccurrences({ id: 'e', date: '2026-10-10', endDate: '2026-10-18' }, '2026-10-15', '2026-10-15');
  assert.strictEqual(occ.length, 1);
  assert.strictEqual(occ[0].occEndDate, '2026-10-18');
});

test('récurrence hebdomadaire avec date de fin et intervalle', () => {
  assert.deepStrictEqual(dates({ date: '2026-10-05', recurrence: { type: 'weekly', until: '2026-10-26' } }, '2026-10-01', '2026-12-31'), ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  assert.deepStrictEqual(dates({ date: '2026-10-05', recurrence: { type: 'weekly', interval: 2, until: '2026-11-02' } }, '2026-10-01', '2026-12-31'), ['2026-10-05', '2026-10-19', '2026-11-02']);
});

test('récurrence mensuelle : même jour de semaine (2e vendredi)', () => {
  assert.deepStrictEqual(dates({ date: '2026-10-09', recurrence: { type: 'monthly', monthlyMode: 'weekday', until: '2027-01-31' } }, '2026-10-01', '2027-01-31'), ['2026-10-09', '2026-11-13', '2026-12-11', '2027-01-08']);
});

test('récurrence mensuelle : même date, mois courts ignorés', () => {
  assert.deepStrictEqual(dates({ date: '2027-01-31', recurrence: { type: 'monthly', monthlyMode: 'date', until: '2027-05-31' } }, '2027-01-01', '2027-06-30'), ['2027-01-31', '2027-03-31', '2027-05-31']);
});

test('récurrence annuelle et exceptions', () => {
  assert.deepStrictEqual(dates({ date: '2026-12-05', recurrence: { type: 'yearly', until: '2029-12-31', exceptions: ['2027-12-05'] } }, '2026-01-01', '2030-01-01'), ['2026-12-05', '2028-12-05', '2029-12-05']);
});

test('sans date de fin : 12 mois générés au maximum', () => {
  const d = dates({ date: '2026-01-01', recurrence: { type: 'weekly' } }, '2026-01-01', '2030-01-01');
  assert.ok(d.length >= 52 && d.length <= 53);
  assert.ok(d[d.length - 1] <= '2027-01-01');
});

test('fenêtre de dates : seules les occurrences dans la période', () => {
  assert.deepStrictEqual(dates({ date: '2026-10-05', recurrence: { type: 'weekly' } }, '2026-11-01', '2026-11-15'), ['2026-11-02', '2026-11-09']);
});

test('sha256 conforme', () => {
  for (const s of ['', 'abc', 'Walhain2026!', 'éàü – ✓', 'x'.repeat(200)]) {
    assert.strictEqual(U.sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'));
  }
});

test('échappement HTML et URL sûres', () => {
  assert.strictEqual(U.esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
  assert.ok(!U.safeUrl('javascript:alert(1)').startsWith('javascript'));
  assert.strictEqual(U.safeUrl('walhain.be'), 'https://walhain.be/');
});
