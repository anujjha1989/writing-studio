import { h, S, all, get, put, autoGrow, tabs, pageHead, icon, fmt, orderedScenes } from '../lib.js';
import { rerender } from '../app.js';
import { AUTHORS_1 } from '../content/authors1.js';
import { AUTHORS_2 } from '../content/authors2.js';
import { AUTHORS_MORE } from '../content/authors-more.js';
import { METRICS, METRIC_KEYS } from '../content/metrics.js';
import { PLOTCRAFT } from '../content/plotcraft.js';

// Which library collection each full guide was measured from.
const LIB_OF = { naipaul: 'V.S. Naipaul', rushdie: 'Salman Rushdie', lahiri: 'Jhumpa Lahiri', coetzee: 'J. M. Coetzee', king: 'Stephen King', martin: 'A Song of Ice and Fire', sanderson: 'Mistborn', herbert: 'Dune', tolkien: 'JRR Tolkein', barnes: 'Julian Barnes', andersen: 'Hans Christian Andersen', murakami: 'Haruki Murakami', steel: 'Danielle Steel', baldacci: 'David Baldacci', koontz: 'Dean Koontz', lessing: 'Doris Lessing', angelou: 'Maya Angelou', crichton: 'Michael Crichton', carey: 'Peter Carey', durant: 'Will Durant', dahl: 'Roald Dahl' };
const LIB_NOTE = { martin: 'Measured from A Song of Ice and Fire.', sanderson: 'Measured from the Mistborn books.', herbert: 'Measured from your merged Dune edition, which includes the later books by other hands.' };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const surname = (n) => n.replace(/\s*\(.*\)$/, '').split(' ').pop();

const full = [...AUTHORS_1, ...AUTHORS_2].map((a) => ({ ...a, lib: LIB_OF[a.id], full: true }));
const taken = new Set([...full.map((a) => a.lib), ...AUTHORS_MORE.map((a) => a.lib)].filter(Boolean));
const measuredOnly = Object.keys(METRICS).filter((k) => !taken.has(k)).map((k) => ({ id: slug(k), name: k, lib: k }));
export const AUTHORS = [...full, ...AUTHORS_MORE, ...measuredOnly].map((a) => ({ ...a, plotcraft: PLOTCRAFT[a.name]?.[0], themecraft: PLOTCRAFT[a.name]?.[1] })).sort((a, b) => surname(a.name).localeCompare(surname(b.name)));

// ---------- numbers ----------
const idx = Object.fromEntries(METRIC_KEYS.map((k, i) => [k, i]));
const val = (lib, k) => METRICS[lib]?.[idx[k]];
// [key, label, format, what a high value means]
const ROWS = [
  ['sent_mean', 'Words per sentence', (v) => v.toFixed(1)], ['short', 'Sentences of 6 words or fewer', (v) => v.toFixed(0) + '%'], ['long', 'Sentences of 35 words or more', (v) => v.toFixed(0) + '%'],
  ['para_mean', 'Words per paragraph', (v) => v.toFixed(0)], ['dlg_para', 'Paragraphs that open with speech', (v) => v.toFixed(0) + '%'], ['said', 'Dialogue tags that are a plain “said”', (v) => v.toFixed(0) + '%'],
  ['ly', 'Adverbs ending -ly, per 1,000 words', (v) => v.toFixed(1)], ['comma', 'Commas per sentence', (v) => v.toFixed(2)], ['semi', 'Semicolons per 1,000 words', (v) => v.toFixed(1)], ['dash', 'Dashes per 1,000 words', (v) => v.toFixed(1)],
  ['ques', 'Questions per 100 sentences', (v) => v.toFixed(1)], ['excl', 'Exclamations per 100 sentences', (v) => v.toFixed(1)], ['first', 'I, me, my per 1,000 words', (v) => v.toFixed(0)],
];
const DIST = ['sent_mean', 'short', 'long', 'para_mean', 'dlg_para', 'ly', 'first', 'comma', 'semi', 'dash', 'ques', 'excl', 'said'];
const column = (k) => Object.values(METRICS).map((r) => r[idx[k]]).filter((v) => v != null && !(k === 'para_mean' && v > 300)).sort((a, b) => a - b);
const cols = Object.fromEntries(METRIC_KEYS.map((k) => [k, column(k)]));
const pct = (k, v) => { const c = cols[k]; let n = 0; while (n < c.length && c[n] < v) n++; return Math.round((100 * n) / c.length); };
const stats = Object.fromEntries(DIST.map((k) => { const c = cols[k], m = c.reduce((a, b) => a + b, 0) / c.length; return [k, [m, Math.sqrt(c.reduce((a, b) => a + (b - m) ** 2, 0) / c.length) || 1]]; }));
const zvec = (get) => DIST.map((k) => { const v = get(k); return v == null ? 0 : Math.max(-3, Math.min(3, (v - stats[k][0]) / stats[k][1])); });
function nearest(vec, skipLib, n = 4) {
  return AUTHORS.filter((a) => a.lib && a.lib !== skipLib && METRICS[a.lib]).map((a) => { const o = zvec((k) => val(a.lib, k)); return [a, Math.hypot(...o.map((x, i) => x - vec[i]))]; }).sort((x, y) => x[1] - y[1]).slice(0, n).map((x) => x[0]);
}

// The same measurements, taken from the open book's own scenes.
const W = /[A-Za-z][A-Za-z'’-]*/g;
const TAGS = new Set('said asked replied answered whispered shouted cried muttered murmured exclaimed added continued remarked observed declared demanded called yelled snapped growled sighed laughed began interrupted insisted agreed admitted'.split(' '));
export function draftMetrics() {
  if (!S.project) return null;
  const paras = orderedScenes().flatMap((s) => (s.draft || '').split(/\n+/)).map((p) => p.trim()).filter((p) => (p.match(W) || []).length >= 2);
  const m = { words: 0, sent: 0, short: 0, long: 0, dlg: 0, ly: 0, first: 0, comma: 0, semi: 0, dash: 0, ques: 0, excl: 0, said: 0, tags: 0 };
  for (const p of paras) {
    const ws = (p.match(W) || []).map((w) => w.toLowerCase());
    m.words += ws.length;
    if ('"“‘\'—-«'.includes(p[0])) m.dlg++;
    m.comma += (p.match(/,/g) || []).length; m.semi += (p.match(/;/g) || []).length; m.dash += (p.match(/—| – |--/g) || []).length; m.ques += (p.match(/\?/g) || []).length; m.excl += (p.match(/!/g) || []).length;
    for (const w of ws) { if (w.length > 4 && w.endsWith('ly')) m.ly++; if (['i', 'me', 'my', 'mine', 'myself'].includes(w)) m.first++; if (TAGS.has(w)) { m.tags++; if (w === 'said') m.said++; } }
    for (const s of p.match(/[^.!?…]+[.!?…]+["”’')\]]*|[^.!?…]+$/g) || []) { const k = (s.match(W) || []).length; if (!k) continue; m.sent++; if (k <= 6) m.short++; if (k >= 35) m.long++; }
  }
  if (m.words < 1500 || !m.sent) return null;
  return { words: m.words, sent_mean: m.words / m.sent, short: (100 * m.short) / m.sent, long: (100 * m.long) / m.sent, para_mean: m.words / paras.length, dlg_para: (100 * m.dlg) / paras.length, ly: (1000 * m.ly) / m.words, first: (1000 * m.first) / m.words, comma: m.comma / m.sent, semi: (1000 * m.semi) / m.words, dash: (1000 * m.dash) / m.words, ques: (100 * m.ques) / m.sent, excl: (100 * m.excl) / m.sent, said: m.tags ? (100 * m.said) / m.tags : null };
}

function reading(a) {
  const v = (k) => val(a.lib, k), p = (k) => pct(k, v(k));
  const out = [];
  const sm = v('sent_mean');
  out.push(p('sent_mean') <= 20 ? `Sentences run short, ${sm.toFixed(1)} words on average, shorter than most of your library.` : p('sent_mean') >= 80 ? `Sentences run long, ${sm.toFixed(1)} words on average, longer than most of your library.` : `Sentences average ${sm.toFixed(1)} words, near the middle of your library.`);
  if (p('short') >= 60 && p('long') >= 60) out.push(`The length swings widely: ${v('short').toFixed(0)}% of sentences are six words or fewer and ${v('long').toFixed(0)}% run past thirty-five.`);
  out.push(p('dlg_para') >= 75 ? `Dialogue drives the page: ${v('dlg_para').toFixed(0)}% of paragraphs open with speech.` : p('dlg_para') <= 20 ? `Narration carries it; only ${v('dlg_para').toFixed(0)}% of paragraphs open with speech.` : `Speech opens ${v('dlg_para').toFixed(0)}% of paragraphs, a balanced mix of talk and narration.`);
  if (p('said') >= 80) out.push(`Dialogue is tagged with a plain “said” ${v('said').toFixed(0)}% of the time.`); else if (p('said') <= 15) out.push(`Plain “said” is rare (${v('said').toFixed(0)}% of tags); speech is tagged with other verbs or not at all.`);
  if (p('ly') >= 85) out.push(`Adverbs are frequent, ${v('ly').toFixed(1)} per thousand words.`); else if (p('ly') <= 15) out.push(`Adverbs are scarce, ${v('ly').toFixed(1)} per thousand words.`);
  if (p('semi') >= 85) out.push('Semicolons do a lot of work.'); else if (p('dash') >= 88) out.push('Dashes are a signature.');
  if (v('first') >= 33) out.push('Much of it is told in the first person.');
  if (p('excl') >= 90) out.push('Exclamation marks are common.');
  return out.join(' ');
}

let tab = 'guides', q = '', sortKey = 'sent_mean', sortDir = -1;
export async function render([id]) {
  if (id) return detail(AUTHORS.find((a) => a.id === id));
  const draft = draftMetrics();
  const root = h('div', { class: 'stack-lg' }, pageHead('Author styles', `${AUTHORS.length} writers from your Complete Works shelf. Each page covers how they write, how they build plots and how they work their themes in, with numbers measured from your own copies of their books.`),
    draft ? h('p', { class: 'reading' }, `By the numbers, “${S.project.title}” currently reads closest to `, nearest(zvec((k) => draft[k]), null, 3).flatMap((a, i, arr) => [h('a', { href: '#/styles/' + a.id }, a.name), i < arr.length - 2 ? ', ' : i === arr.length - 2 ? ' and ' : '.'])) : null,
    tabs([['guides', 'Writers'], ['numbers', 'Compare by the numbers']], tab, (t) => { tab = t; rerender(); }));
  root.append(tab === 'guides' ? list() : table(draft));
  return root;
}

function list() {
  const rows = AUTHORS.map((a) => ({ a, el: h('a', { class: 'author-row', href: `#/styles/${a.id}` }, h('b', {}, a.name), h('small', {}, a.kind ? a.kind.split(' / ')[0] : 'Numbers only')) }));
  const none = h('p', { class: 'muted' }, 'No writer matches that.');
  const apply = () => { let n = 0; rows.forEach(({ a, el }) => { const hit = `${a.name} ${a.kind || ''} ${a.known || ''}`.toLowerCase().includes(q.toLowerCase()); el.hidden = !hit; if (hit) n++; }); none.hidden = n > 0; };
  const search = h('input', { class: 'in', type: 'search', placeholder: 'Find a writer, a genre or a title', 'aria-label': 'Search writers', value: q, onInput: (e) => { q = e.target.value; apply(); } });
  apply();
  return h('div', { class: 'stack' }, h('div', { class: 'narrow' }, search), none, h('div', { class: 'authors' }, rows.map((r) => r.el)));
}

function table(draft) {
  const colsShown = [['sent_mean', 'Words per sentence'], ['short', 'Short sentences %'], ['long', 'Long sentences %'], ['dlg_para', 'Speech-led paragraphs %'], ['said', 'Plain “said” %'], ['ly', 'Adverbs / 1,000'], ['semi', 'Semicolons / 1,000'], ['first', 'First person / 1,000']];
  const data = AUTHORS.filter((a) => METRICS[a.lib]).map((a) => ({ a, get: (k) => val(a.lib, k) }));
  if (draft) data.push({ a: { name: `Your draft: ${S.project.title}`, mine: true }, get: (k) => draft[k] });
  data.sort((x, y) => ((x.get(sortKey) ?? -1) - (y.get(sortKey) ?? -1)) * sortDir);
  return h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Tap a column heading to sort. Measured across every book in each collection, so translated writers reflect their translators too.'),
    h('div', { class: 'scroll-x' }, h('table', { class: 'stat-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Writer'), colsShown.map(([k, l]) => h('th', { 'aria-sort': sortKey === k ? (sortDir < 0 ? 'descending' : 'ascending') : 'none' }, h('button', { class: 'btn ghost sm', type: 'button', onClick: () => { sortDir = sortKey === k ? -sortDir : -1; sortKey = k; rerender(); } }, l, sortKey === k ? (sortDir < 0 ? ' ↓' : ' ↑') : ''))))),
      h('tbody', {}, data.map(({ a, get }) => h('tr', { style: a.mine ? { background: 'color-mix(in srgb, var(--warn), transparent 85%)' } : {} }, h('th', {}, a.mine ? h('b', {}, a.name) : h('a', { href: '#/styles/' + a.id }, a.name)), colsShown.map(([k]) => h('td', { class: 'num' }, get(k) == null ? '' : get(k).toFixed(k === 'sent_mean' || k === 'ly' || k === 'semi' ? 1 : 0)))))))));
}

const SECTIONS = [['voice', 'Voice'], ['plotcraft', 'How the plots are built'], ['themecraft', 'How the themes are worked in'], ['rhythm', 'Sentence rhythm'], ['structure', 'Structure'], ['pov', 'Point of view'], ['pacing', 'Pacing'], ['world', 'World and setting'], ['dialogue', 'Dialogue'], ['themes', 'Recurring themes']];
function detail(a) {
  if (!a) return h('p', {}, 'That writer is not in the library.');
  const draft = draftMetrics();
  const root = h('div', { class: 'stack-lg narrow' }, h('a', { class: 'back', href: '#/styles' }, icon('left', 16), 'Author styles'),
    h('header', {}, h('h1', {}, a.name), (a.kind || a.known) && h('p', { class: 'lede' }, [a.kind, a.known && `Known for ${a.known}`].filter(Boolean).join('. ') + '.')));

  if (a.lib && METRICS[a.lib]) {
    const near = nearest(zvec((k) => val(a.lib, k)), a.lib);
    root.append(h('section', {}, h('h2', {}, 'By the numbers'), h('p', { class: 'reading' }, reading(a)),
      h('div', { class: 'scroll-x' }, h('table', { class: 'stat-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Measure'), h('th', {}, a.name.split(' ').pop()), draft && h('th', {}, 'Your draft'), h('th', {}, 'Against your library'))),
        h('tbody', {}, ROWS.filter(([k]) => val(a.lib, k) != null && !(k === 'para_mean' && val(a.lib, k) > 300)).map(([k, label, f]) => h('tr', {}, h('th', {}, label), h('td', { class: 'num' }, f(val(a.lib, k))), draft && h('td', { class: 'num' }, draft[k] == null ? '' : f(draft[k])),
          h('td', {}, h('div', { class: 'gauge', title: `Higher than ${pct(k, val(a.lib, k))}% of the library` }, h('i', { style: { left: `calc(${pct(k, val(a.lib, k))}% - 1px)` } }), draft && draft[k] != null ? h('b', { style: { left: pct(k, draft[k]) + '%' }, title: 'Your draft' }) : null))))))),
      h('p', { class: 'muted small' }, `Measured from ${fmt(val(a.lib, 'words'))} words in your library. ${LIB_NOTE[a.id] || ''} The bar shows where this writer sits among the ${Object.keys(METRICS).length} collections${draft ? '; the ring is your draft' : ''}.`),
      h('p', {}, 'Nearest on these measures: ', near.flatMap((n, i) => [h('a', { href: '#/styles/' + n.id }, n.name), i < near.length - 1 ? ', ' : '.']))));
  }
  for (const [k, label] of SECTIONS) if (a[k]) root.append(h('section', {}, h('h2', {}, label), h('p', { class: 'prose' }, a[k])));
  if (a.borrow?.length) root.append(h('section', {}, h('h2', {}, 'Techniques to borrow'), h('ul', { class: 'prose' }, a.borrow.map((x) => h('li', {}, x)))));
  if (a.avoid?.length) root.append(h('section', {}, h('h2', {}, 'Where imitation goes wrong'), h('ul', { class: 'prose' }, a.avoid.map((x) => h('li', {}, x)))));
  const exercises = a.exercises?.length ? a.exercises : a.lib && METRICS[a.lib] ? [`Write 250 words of a scene from your book that match this writer’s numbers: sentences averaging about ${val(a.lib, 'sent_mean').toFixed(0)} words, with roughly ${val(a.lib, 'dlg_para').toFixed(0)}% of paragraphs opening on speech. Then check it in the editor’s Check panel.`] : [];
  if (exercises.length) {
    const sec = h('section', {}, h('h2', {}, 'Practice'));
    exercises.forEach((ex, i) => {
      const pid = `pr-${a.id}-${i}`;
      const rec = get(pid) || { id: pid, type: 'practice', project: '', text: '', done: false };
      const ta = h('textarea', { class: 'in', rows: 4, placeholder: 'Write your attempt here', 'aria-label': `Attempt at exercise ${i + 1}`, value: rec.text, onInput: (e) => { rec.text = e.target.value; put(rec); } }); autoGrow(ta);
      sec.append(h('div', { class: 'stack', style: { marginBottom: '1.6rem' } }, h('p', { class: 'prose' }, ex), ta, h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: rec.done, onChange: (e) => { rec.done = e.target.checked; put(rec, true); } }), 'Done')));
    });
    root.append(sec);
  }
  const noteId = `an-${a.id}`;
  const note = get(noteId) || { id: noteId, type: 'authnote', project: '', text: '' };
  const nt = h('textarea', { class: 'in', rows: 4, placeholder: `What you notice when you read ${a.name}: books to study, habits, things to try`, 'aria-label': 'Your notes', value: note.text, onInput: (e) => { note.text = e.target.value; put(note); } }); autoGrow(nt);
  root.append(h('section', {}, h('h2', {}, 'Your notes'), nt));
  return root;
}
