import { h, S, all, get, put, create, remove, field, textInput, select, btn, tabs, orderedScenes, totalWords, fmt, progressBar, today, acts } from '../lib.js';
import { rerender } from '../app.js';

let tab = 'timeline';
const COLORS = ['#c0392b', '#2f6fc4', '#2f9e5b', '#b8862b', '#7c5cbf', '#d6336c', '#0a9396', '#e8890c'];
export async function render() {
  const root = h('div', { class: 'stack' }, h('h1', {}, 'Plot tracker'),
    tabs([['timeline', 'Timeline'], ['threads', 'Threads'], ['setups', 'Setups & payoffs'], ['words', 'Word goals']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ timeline, threads, setups, words })[tab]());
  return root;
}

function threads() {
  const list = all('thread');
  const scenes = orderedScenes();
  return h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'A thread is a storyline: main plot, a subplot, a mystery, a relationship arc, a theme. Assign scenes to threads from the scene editor or the timeline grid.'),
    btn('+ New thread', () => { create('thread', { name: 'New thread', color: COLORS[list.length % COLORS.length], desc: '' }); rerender(); }, 'primary'),
    list.map((t) => h('div', { class: 'card stack' },
      h('div', { class: 'row' }, h('input', { type: 'color', value: t.color, style: { width: '44px', height: '40px', border: 0, background: 'none' }, onInput: (e) => { t.color = e.target.value; put(t); } }), h('div', { class: 'grow' }, textInput(t, 'name')),
        btn('✕', () => { if (confirm('Delete this thread?')) { scenes.forEach((s) => { if (s.threads?.includes(t.id)) { s.threads = s.threads.filter((x) => x !== t.id); put(s, true); } }); remove(t); rerender(); } }, 'ghost')),
      textInput(t, 'desc', { multi: true, placeholder: 'What is this thread about? How does it begin, turn and resolve?' }),
      h('small', {}, `${scenes.filter((s) => s.threads?.includes(t.id)).length} scenes`))));
}

function timeline() {
  const th = all('thread'), scenes = orderedScenes();
  if (!scenes.length) return h('p', { class: 'muted' }, 'Add scenes on the Storyboard first.');
  if (!th.length) return h('p', { class: 'muted' }, 'Create threads in the Threads tab, then tap cells here to place them on scenes.');
  const A = acts();
  const tbl = h('table', {}, h('thead', {},
    h('tr', {}, h('th', { class: 'rowh' }, 'Thread'), scenes.map((s, i) => h('th', { title: s.title }, s.chapter || String(i + 1)))),
    h('tr', {}, h('th', { class: 'rowh' }, 'Act'), scenes.map((s) => h('th', { style: { fontSize: '.6rem', color: 'var(--muted)' } }, (A[Math.min(s.act || 0, A.length - 1)] || '').replace(/^\w+\s*/, ''))))),
    h('tbody', {}, th.map((t) => h('tr', {}, h('th', { class: 'rowh', style: { borderLeft: `5px solid ${t.color}` } }, t.name),
      scenes.map((s) => { const on = s.threads?.includes(t.id); const td = h('td', { class: on ? 'on' : '', style: on ? { background: t.color } : {} }, h('button', { title: s.title, onClick: () => { s.threads = on ? s.threads.filter((x) => x !== t.id) : [...(s.threads || []), t.id]; put(s, true); rerender(); } }, on ? '●' : '')); return td; })))));
  return h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Columns are scenes in board order (chapter numbers if set). Tap a cell to add or remove a thread from a scene.'), h('div', { class: 'matrix card' }, tbl));
}

function setups() {
  const list = all('setup'), scenes = orderedScenes();
  const opts = [['', '—'], ...scenes.map((s, i) => [s.id, `${s.chapter ? s.chapter + '. ' : ''}${s.title}`])];
  const done = list.filter((x) => x.paid).length;
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Every promise the story makes (a gun on the wall, a question, a wound) needs a payoff. Track them here.'),
    h('div', { class: 'row sb' }, btn('+ Setup', () => { create('setup', { setup: '', payoff: '', setupScene: '', payoffScene: '', planted: false, paid: false }); rerender(); }, 'primary'), h('span', { class: 'chip' }, `${done}/${list.length} paid off`)),
    list.map((x) => h('div', { class: 'card stack' },
      field('Setup (what is planted or promised)', textInput(x, 'setup', { multi: true })), field('Payoff', textInput(x, 'payoff', { multi: true })),
      h('div', { class: 'fields' }, field('Setup scene', select(x, 'setupScene', opts)), field('Payoff scene', select(x, 'payoffScene', opts))),
      h('div', { class: 'row sb' }, h('div', { class: 'row' },
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: x.planted, onChange: (e) => { x.planted = e.target.checked; put(x, true); } }), 'Planted'),
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: x.paid, onChange: (e) => { x.paid = e.target.checked; put(x, true); rerender(); } }), 'Paid off')),
        btn('Delete', () => { remove(x); rerender(); }, 'sm danger')))));
}

function words() {
  const p = S.project, total = totalWords(), scenes = orderedScenes(), A = acts();
  const days = p.deadline ? Math.ceil((new Date(p.deadline) - new Date(today())) / 864e5) : null;
  const left = Math.max(0, (p.goalWords || 0) - total);
  const logs = all('wordlog').sort((a, b) => a.date.localeCompare(b.date));
  const last14 = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const l = logs.find((x) => x.date === k); last14.push([k.slice(8), l ? Math.max(0, l.total - l.start) : 0]); }
  const max = Math.max(1, ...last14.map((x) => x[1]));
  const targets = scenes.reduce((n, s) => n + (s.target || 0), 0);
  return h('div', { class: 'stack' },
    h('div', { class: 'card stack' }, h('b', {}, 'Overall'), progressBar(total, p.goalWords, `${fmt(total)} / ${fmt(p.goalWords || 0)} words`),
      h('div', { class: 'row' }, days != null ? h('span', { class: 'chip' }, days >= 0 ? `${days} days left` : `${-days} days overdue`) : h('span', { class: 'chip' }, 'No deadline set'),
        days > 0 && left ? h('span', { class: 'chip' }, `${fmt(Math.ceil(left / days))} words/day needed`) : null, targets ? h('span', { class: 'chip' }, `Scene targets sum to ${fmt(targets)}`) : null),
      h('div', { class: 'fields' }, field('Word goal', textInput(p, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })), field('Deadline', textInput(p, 'deadline', { type: 'date' })))),
    h('div', { class: 'card stack' }, h('b', {}, 'By act'), A.map((a, i) => { const ss = scenes.filter((s) => Math.min(s.act || 0, A.length - 1) === i); const w = ss.reduce((n, s) => n + (s.words || 0), 0), t = ss.reduce((n, s) => n + (s.target || 0), 0); return h('div', {}, h('small', {}, `${a}: ${ss.length} scenes`), progressBar(w, t || Math.max(w, 1), `${fmt(w)}${t ? ' / ' + fmt(t) : ''}`)); })),
    h('div', { class: 'card' }, h('b', {}, 'Words written per day (last 14 days)'), h('div', { class: 'bars', style: { marginBottom: '22px', marginTop: '10px' } }, last14.map(([d, n]) => h('div', { style: { height: (n / max) * 100 + '%' }, title: `${n} words` }, h('small', {}, d))))),
    h('div', { class: 'card' }, h('b', {}, 'Status'), h('div', {}, ['idea', 'outlined', 'drafted', 'revised', 'polished'].map((st) => h('span', { class: 'chip' }, `${st}: ${scenes.filter((s) => s.status === st).length}`)))));
}
