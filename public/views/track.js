import { h, S, all, put, create, remove, field, textInput, select, btn, iconBtn, tabs, orderedScenes, totalWords, fmt, progressBar, today, dayKey, acts, confirmDlg, pageHead, empty, svg, wordsByDay, streak, dailyTarget, icon, when } from '../lib.js';
import { rerender } from '../app.js';
import { editScene } from './story.js';
import { calendar } from './home.js';
import { bibleEntries } from './bible.js';
import { nameMatcher, mentions } from '../text.js';
import { STATUS, STATUS_COLORS } from '../content/craft.js';

let tab = 'pacing';
const COLORS = ['#c0392b', '#2f6fc4', '#2f9e5b', '#b8862b', '#7c5cbf', '#d6336c', '#0a9396', '#e8890c'];
const label = (s, i) => s.chapter || String(i + 1);
const actOf = (s, A) => Math.min(s.act ?? 0, A.length - 1);

export async function render() {
  const root = h('div', { class: 'stack-lg' }, pageHead('Tracker', 'The shape of the book: where tension rises, who carries each stretch, which promises are still open, and how the writing is going.'),
    tabs([['pacing', 'Pacing'], ['timeline', 'Threads'], ['setups', 'Setups and payoffs'], ['words', 'Progress']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ pacing, timeline, setups, words })[tab]());
  return root;
}

// ---------- pacing ----------
function pacing() {
  const scenes = orderedScenes(), A = acts();
  if (scenes.length < 2) return empty('Not enough scenes to draw a shape', 'Add scenes on the Storyboard and set a tension level on each card. The curve, the viewpoint strip and the cast grid appear here.', h('a', { class: 'btn primary', href: '#/story' }, 'Open the Storyboard'));
  const W = Math.max(640, scenes.length * 44), H = 220, padL = 28, padR = 14, padT = 14, padB = 30;
  const x = (i) => padL + (i * (W - padL - padR)) / (scenes.length - 1), y = (t) => padT + ((10 - t) * (H - padT - padB)) / 9;
  const pts = scenes.map((s, i) => [x(i), y(s.tension ?? 5)]);
  const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'curve', style: `min-width:${W}px`, role: 'img', 'aria-label': 'Tension by scene' });
  [1, 4, 7, 10].forEach((t) => g.append(svg('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), class: 'grid' }), svg('text', { x: padL - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'axis' }, t)));
  scenes.forEach((s, i) => { if (i && actOf(s, A) !== actOf(scenes[i - 1], A)) { const xx = (x(i) + x(i - 1)) / 2; g.append(svg('line', { x1: xx, x2: xx, y1: padT, y2: H - padB, class: 'actline' }), svg('text', { x: xx + 5, y: padT + 10, class: 'axis' }, A[actOf(s, A)])); } });
  g.append(svg('path', { d: `M${pts[0][0]},${H - padB} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${pts.at(-1)[0]},${H - padB} Z`, class: 'area' }), svg('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), class: 'line' }));
  scenes.forEach((s, i) => {
    const dot = svg('circle', { cx: pts[i][0], cy: pts[i][1], r: 6, class: 'pt', tabindex: 0, role: 'button' }, svg('title', {}, `${s.title || 'Untitled'}: tension ${s.tension ?? 5}. Click to edit.`));
    dot.addEventListener('click', () => editScene(s)); dot.addEventListener('keydown', (e) => { if (e.key === 'Enter') editScene(s); });
    g.append(dot, svg('text', { x: pts[i][0], y: H - 10, 'text-anchor': 'middle', class: 'axis' }, label(s, i)));
  });
  const flat = scenes.every((s) => (s.tension ?? 5) === (scenes[0].tension ?? 5));

  // viewpoint strip
  const povs = [...new Set(scenes.map((s) => (s.pov || '').trim()).filter(Boolean))];
  const pcol = (p) => (p ? COLORS[povs.indexOf(p) % COLORS.length] : 'var(--rule)');
  const total = scenes.reduce((n, s) => n + (s.words || 0), 0);
  const share = (p) => { const w = scenes.filter((s) => (s.pov || '').trim() === p).reduce((n, s) => n + (total ? s.words || 0 : 1), 0); return Math.round((100 * w) / (total || scenes.length)); };
  const strip = h('div', { class: 'strip', role: 'img', 'aria-label': 'Viewpoint character by scene' }, scenes.map((s, i) => h('span', { style: { flex: total ? Math.max(s.words || 0, total / 200) : 1, background: pcol((s.pov || '').trim()) }, title: `${label(s, i)}. ${s.title || 'Untitled'}: ${s.pov || 'no viewpoint set'}` })));

  // cast grid
  const entries = bibleEntries().filter((e) => e.kind === 'character');
  const matcher = nameMatcher(entries);
  const hits = scenes.map((s) => mentions(`${s.draft || ''} ${s.pov || ''}`, matcher));
  const grid = entries.length ? h('div', { class: 'matrix' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'rowh' }, 'Character'), scenes.map((s, i) => h('th', { title: s.title }, label(s, i))))),
    h('tbody', {}, entries.map((e) => h('tr', {}, h('th', { class: 'rowh' }, e.name), scenes.map((s, i) => { const n = hits[i].get(e.id) || 0; return h('td', { class: n ? 'on' : '', style: n ? { '--o': Math.min(1, 0.35 + n / 12) } : {}, title: n ? `${e.name}: ${n} mention${n === 1 ? '' : 's'} in “${s.title}”` : '' }); })))))) : h('p', { class: 'muted' }, 'Add characters to the story bible to see who is on stage in each scene.');

  return h('div', { class: 'stack-lg' },
    h('section', {}, h('h2', {}, 'Tension'), h('div', { class: 'scroll-x' }, g), h('p', { class: 'muted small' }, flat ? 'Every scene is at the same level. Open a scene (click a point) and set its tension from 1 to 10 to see the curve.' : 'Click a point to open that scene. Look for long flat stretches, and for a peak that comes too early.')),
    h('section', {}, h('h2', {}, 'Viewpoint'), strip, povs.length ? h('div', { class: 'legend' }, povs.map((p) => h('span', {}, h('i', { style: { background: pcol(p) } }), `${p} ${share(p)}%`))) : h('p', { class: 'muted small' }, 'Set a point of view on scene cards to see who carries each stretch of the book. Widths follow word counts.')),
    h('section', {}, h('h2', {}, 'Who is on stage'), grid, entries.length ? h('p', { class: 'muted small' }, 'Filled where a character is named in the scene text or is its viewpoint. Darker means more mentions.') : ''));
}

// ---------- threads ----------
function timeline() {
  const th = all('thread'), scenes = orderedScenes(), A = acts();
  const addBtn = btn('New thread', () => { create('thread', { name: '', color: COLORS[th.length % COLORS.length], desc: '' }); rerender(); }, 'primary', 'plus');
  const list = h('section', {}, h('div', { class: 'row sb' }, h('h2', {}, 'Threads'), addBtn),
    th.length ? h('div', { class: 'stack' }, th.map((t) => h('div', { class: 'thread' },
      h('input', { type: 'color', value: t.color, 'aria-label': 'Thread colour', class: 'color', onInput: (e) => { t.color = e.target.value; put(t); } }),
      h('div', { class: 'grow stack-sm' }, textInput(t, 'name', { placeholder: 'Thread name, such as “The missing ledger”' }), textInput(t, 'desc', { multi: true, rows: 1, placeholder: 'How it begins, turns and resolves' }), h('small', {}, `${scenes.filter((s) => s.threads?.includes(t.id)).length} scenes`)),
      iconBtn('trash', 'Delete thread', async () => { if (await confirmDlg(`Delete “${t.name || 'this thread'}”?`, 'It is removed from every scene it is attached to.')) { scenes.forEach((s) => { if (s.threads?.includes(t.id)) { s.threads = s.threads.filter((x) => x !== t.id); put(s, true); } }); remove(t); rerender(); } }, 'ghost'))))
      : h('p', { class: 'muted' }, 'A thread is one storyline: the main plot, a subplot, a mystery, a relationship. Create one, then mark the scenes it runs through.'));
  if (!scenes.length || !th.length) return h('div', { class: 'stack-lg' }, list);
  const tbl = h('table', {}, h('thead', {},
    h('tr', {}, h('th', { class: 'rowh' }, 'Thread'), scenes.map((s, i) => h('th', { title: s.title }, label(s, i)))),
    h('tr', { class: 'sub' }, h('th', { class: 'rowh' }, 'Act'), scenes.map((s, i) => h('th', {}, i === 0 || actOf(s, A) !== actOf(scenes[i - 1], A) ? actOf(s, A) + 1 : '')))),
  h('tbody', {}, th.map((t) => h('tr', {}, h('th', { class: 'rowh' }, h('i', { class: 'thread-dot', style: { background: t.color } }), t.name || 'Unnamed'),
    scenes.map((s) => { const on = s.threads?.includes(t.id); return h('td', { class: on ? 'on' : '', style: on ? { '--c': t.color } : {} }, h('button', { type: 'button', 'aria-pressed': !!on, title: `${t.name || 'Thread'} in “${s.title}”`, onClick: () => { s.threads = on ? s.threads.filter((x) => x !== t.id) : [...(s.threads || []), t.id]; put(s, true); rerender(); } })); })))));
  return h('div', { class: 'stack-lg' }, h('section', {}, h('h2', {}, 'Where each thread runs'), h('div', { class: 'matrix' }, tbl), h('p', { class: 'muted small' }, 'Columns are scenes in board order. Tap a cell to add or remove a thread. A thread that vanishes for many scenes is one readers forget.')), list);
}

// ---------- setups ----------
function setups() {
  const list = all('setup'), scenes = orderedScenes();
  const opts = [['', 'Not placed'], ...scenes.map((s, i) => [s.id, `${label(s, i)}. ${s.title || 'Untitled'}`])];
  const open = list.filter((x) => !x.paid).length;
  const add = btn('New setup', () => { create('setup', { setup: '', payoff: '', setupScene: '', payoffScene: '', planted: false, paid: false }); rerender(); }, 'primary', 'plus');
  if (!list.length) return empty('No promises tracked yet', 'Everything the story plants (a gun on the wall, a question, an old wound) needs paying off. List each one here so none is left hanging.', add);
  return h('div', { class: 'stack' }, h('div', { class: 'row sb' }, add, h('span', { class: 'muted' }, open ? `${open} still open` : 'Every setup is paid off')),
    list.map((x) => h('div', { class: `setup ${x.paid ? 'paid' : ''}` },
      h('div', { class: 'fields' }, field('What is planted or promised', textInput(x, 'setup', { multi: true, rows: 2 })), field('How it pays off', textInput(x, 'payoff', { multi: true, rows: 2 }))),
      h('div', { class: 'fields' }, field('Planted in', select(x, 'setupScene', opts)), field('Paid off in', select(x, 'payoffScene', opts))),
      h('div', { class: 'row sb' }, h('div', { class: 'row' },
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: x.planted, onChange: (e) => { x.planted = e.target.checked; put(x, true); } }), 'Planted'),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: x.paid, onChange: (e) => { x.paid = e.target.checked; put(x, true); rerender(); } }), 'Paid off')),
        iconBtn('trash', 'Delete setup', () => { remove(x); rerender(); }, 'ghost')))));
}

// ---------- progress ----------
function words() {
  const p = S.project, total = totalWords(), scenes = orderedScenes(), A = acts();
  const days = wordsByDay(), target = dailyTarget(), run = streak(days), todayN = days.get(today()) || 0;
  const left = Math.max(0, (p.goalWords || 0) - total);
  const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date(today())) / 864e5) : null;
  const last14 = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last14.push([d, days.get(dayKey(d)) || 0]); }
  const max = Math.max(target, ...last14.map((x) => x[1]), 1);
  const written = [...days.values()].filter((n) => n > 0);
  const sprints = all('sprint').sort((a, b) => b.created - a.created).slice(0, 6);
  const fact = (v, l) => h('div', { class: 'fact' }, h('span', { class: 'fact-v num' }, v), h('span', { class: 'fact-l' }, l));
  return h('div', { class: 'stack-lg' },
    h('section', {}, h('h2', {}, 'The book'), progressBar(total, p.goalWords, `${fmt(total)}${p.goalWords ? ` of ${fmt(p.goalWords)}` : ''} words`),
      h('p', { class: 'muted' }, daysLeft == null ? 'No deadline set.' : daysLeft > 0 ? `${daysLeft} days to the deadline.${left ? ` ${fmt(Math.ceil(left / daysLeft))} words a day gets there.` : ''}` : 'The deadline has passed.'),
      h('div', { class: 'fields' }, field('Word goal', textInput(p, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })), field('Daily target', textInput(p, 'dailyTarget', { type: 'number', number: true, inputMode: 'numeric' })), field('Deadline', textInput(p, 'deadline', { type: 'date' })))),
    h('section', {}, h('h2', {}, 'The habit'),
      h('div', { class: 'facts' }, fact(fmt(todayN), `of ${fmt(target)} today`), fact(run, run === 1 ? 'day run' : 'day run'), fact(written.length, 'writing days'), fact(written.length ? fmt(Math.round(written.reduce((a, b) => a + b, 0) / written.length)) : 0, 'words on a writing day')),
      calendar(days, target, 26),
      h('h3', {}, 'Last 14 days'),
      h('div', { class: 'bars', role: 'img', 'aria-label': 'Words written on each of the last 14 days' }, h('i', { class: 'target', style: { bottom: (target / max) * 100 + '%' }, title: `Daily target ${fmt(target)}` }), last14.map(([d, n]) => h('div', { class: 'bar-col', title: `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${fmt(n)} words` }, h('span', { class: `bar ${n >= target ? 'hit' : ''}`, style: { height: (n / max) * 100 + '%' } }), h('small', {}, d.getDate()))))),
    h('section', {}, h('h2', {}, 'By act'), h('div', { class: 'stack' }, A.map((a, i) => { const ss = scenes.filter((s) => actOf(s, A) === i); const w = ss.reduce((n, s) => n + (s.words || 0), 0), t = ss.reduce((n, s) => n + (s.target || 0), 0); return h('div', {}, h('div', { class: 'row sb small' }, h('span', {}, a), h('span', { class: 'muted' }, `${ss.length} scenes`)), progressBar(w, t || Math.max(total, 1), `${fmt(w)}${t ? ` of ${fmt(t)}` : ''} words`)); }))),
    h('section', {}, h('h2', {}, 'By status'), h('div', { class: 'legend' }, STATUS.map((st) => h('span', {}, h('i', { style: { background: STATUS_COLORS[st] } }), `${scenes.filter((s) => (s.status || 'idea') === st).length} ${st}`)))),
    sprints.length ? h('section', {}, h('h2', {}, 'Recent sprints'), h('div', { class: 'rows' }, sprints.map((s) => h('div', { class: 'rowitem static' }, icon('timer', 18), h('span', { class: 'grow' }, `${fmt(s.words)} words in ${s.minutes} minutes`), h('small', {}, when(s.created))))) ) : '');
}
