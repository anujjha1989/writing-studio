import { h, S, get, put, autoGrow, btn, download, confirmDlg, pageHead, icon, toast } from '../lib.js';
import { go } from '../app.js';
import { PLOTS, GENRE_NOTES } from '../content/plots.js';

export function scenesFromStructure(plot, project = S.project, notes = {}) {
  const n = (project.acts?.length || 3);
  plot.beats.forEach((b, i) => {
    const act = Math.min(n - 1, Math.floor((b.at / 100.01) * n));
    const id = 'sc' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 5);
    // tension follows a rough rising shape so the Tracker has a curve to start from
    const tension = Math.max(2, Math.min(10, Math.round(3 + (b.at / 100) * 6 + (b.at > 85 ? -3 : 0))));
    put({ id, type: 'scene', project: project.id, created: Date.now() + i, act, order: i, chapter: '', title: b.name, pov: '', setting: '', goal: notes[i] || '', conflict: '', outcome: '', status: 'idea', tension, threads: [], draft: '', words: 0, beat: plot.id }, true);
  });
}

export async function render([id]) {
  if (id) return detail(PLOTS.find((p) => p.id === id));
  const fams = [...new Set(PLOTS.map((p) => p.family))];
  return h('div', { class: 'stack-lg' }, pageHead('Plot library', 'Story structures, beat by beat. Open one to read it, answer its questions for your book, and turn the beats into storyboard cards.'),
    fams.map((f) => h('section', {}, h('h2', {}, f), h('div', { class: 'rows' }, PLOTS.filter((p) => p.family === f).map((p) =>
      h('a', { class: 'rowitem tall', href: `#/plots/${p.id}` }, h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, p.name), h('small', {}, p.summary.length > 150 ? p.summary.slice(0, 148) + '…' : p.summary)), h('small', { class: 'num' }, `${p.beats.length} beats`)))))),
    h('section', {}, h('h2', {}, 'What each genre promises the reader'), h('dl', { class: 'kv' }, GENRE_NOTES.flatMap(([g, d]) => [h('dt', {}, g), h('dd', {}, d)]))));
}

function detail(plot) {
  if (!plot) return h('p', {}, 'That structure is not in the library.');
  const noteId = S.project ? `pn-${S.project.id}-${plot.id}` : null;
  const rec = (noteId && get(noteId)) || (noteId ? { id: noteId, type: 'plotnote', project: S.project.id, vals: {} } : { vals: {} });
  const root = h('div', { class: 'stack-lg narrow' },
    h('a', { class: 'back', href: '#/plots' }, icon('left', 16), 'Plot library'),
    h('header', {}, h('h1', {}, plot.name), h('p', { class: 'lede' }, plot.summary)),
    h('dl', { class: 'kv' }, h('dt', {}, 'Best for'), h('dd', {}, plot.bestFor), h('dt', {}, 'Watch for'), h('dd', {}, plot.pitfalls)),
    h('div', { class: 'beatline', role: 'img', 'aria-label': 'Where each beat falls in the book' }, plot.beats.map((b) => h('i', { style: { left: b.at + '%' }, title: `${b.name}, about ${b.at}% in` }))),
    h('h2', {}, 'The beats'),
    h('p', { class: 'muted' }, S.project ? `Your answers are saved for “${S.project.title}”.` : 'Start a book on the Desk to save answers here.'));
  const list = h('ol', { class: 'beats' });
  plot.beats.forEach((b, i) => {
    const ta = h('textarea', { class: 'in', rows: 2, value: rec.vals?.[i] || '', placeholder: b.prompt, disabled: !S.project, 'aria-label': `Your notes for ${b.name}`, onInput: (e) => { (rec.vals ||= {})[i] = e.target.value; put(rec); } });
    autoGrow(ta);
    list.append(h('li', {}, h('div', { class: 'row sb' }, h('h3', {}, b.name), h('small', { class: 'num' }, `about ${b.at}% in`)), h('p', {}, b.what), ta));
  });
  root.append(list);
  if (S.project) root.append(h('div', { class: 'row' },
    btn('Make storyboard cards from these beats', async () => { if (await confirmDlg(`Add ${plot.beats.length} scene cards?`, `One card per beat is added to “${S.project.title}”. Your answers become each card’s goal.`, 'Add cards', 'primary')) { scenesFromStructure(plot, S.project, rec.vals || {}); toast('Cards added.'); setTimeout(() => go('story'), 250); } }, 'primary', 'board'),
    btn('Download as Markdown', () => download(`${plot.id}.md`, `# ${plot.name}: ${S.project.title}\n\n` + plot.beats.map((b, i) => `## ${i + 1}. ${b.name} (about ${b.at}%)\n${b.what}\n\n${rec.vals?.[i] || '_(blank)_'}\n`).join('\n')), '', 'download')));
  return root;
}
