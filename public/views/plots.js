import { h, S, all, get, put, create, field, autoGrow, btn, download, byOrder, acts, tabs } from '../lib.js';
import { rerender, go } from '../app.js';
import { PLOTS, GENRE_NOTES } from '../content/plots.js';

export function scenesFromStructure(plot, project = S.project, notes = {}) {
  const n = (project.acts?.length || 3);
  plot.beats.forEach((b, i) => {
    const act = Math.min(n - 1, Math.floor((b.at / 100.01) * n));
    const id = 'sc' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 5);
    put({ id, type: 'scene', project: project.id, created: Date.now(), act, order: i, chapter: '', title: b.name, pov: '', setting: '', goal: notes[i] || '', conflict: '', outcome: '', status: 'idea', threads: [], draft: '', words: 0, beat: plot.id }, true);
  });
}

export async function render([id]) {
  if (id) return detail(PLOTS.find((p) => p.id === id));
  const fams = [...new Set(PLOTS.map((p) => p.family))];
  return h('div', { class: 'stack' }, h('h1', {}, 'Plot library'),
    h('p', { class: 'muted' }, 'Detailed guides to story structures. Open one to read its beats and fill in the template for your project.'),
    fams.map((f) => h('div', {}, h('h2', {}, f), h('div', { class: 'grid' }, PLOTS.filter((p) => p.family === f).map((p) =>
      h('a', { class: 'card link', href: `#/plots/${p.id}` }, h('h3', {}, p.name), h('small', {}, `${p.beats.length} beats`), h('p', {}, p.summary.slice(0, 120) + '…')))))),
    h('h2', {}, 'Genre promises'), h('div', { class: 'card' }, h('dl', { class: 'kv' }, GENRE_NOTES.flatMap(([g, d]) => [h('dt', {}, g), h('dd', {}, d)]))));
}

function detail(plot) {
  if (!plot) return h('p', {}, 'Not found.');
  const noteId = S.project ? `pn-${S.project.id}-${plot.id}` : null;
  const rec = (noteId && get(noteId)) || (noteId ? { id: noteId, type: 'plotnote', project: S.project.id, vals: {} } : { vals: {} });
  const root = h('div', { class: 'stack' },
    h('a', { href: '#/plots' }, '← Plot library'), h('h1', {}, plot.name), h('span', { class: 'chip' }, plot.family),
    h('div', { class: 'card prose' }, h('p', {}, plot.summary), h('p', {}, h('b', {}, 'Best for: '), plot.bestFor), h('p', {}, h('b', {}, 'Watch out: '), plot.pitfalls)),
    h('h2', {}, 'Beats & your template'),
    S.project ? h('p', { class: 'muted' }, `Filling in for “${S.project.title}”. Saved automatically.`) : h('p', { class: 'muted' }, 'Create a project on Home to save your answers.'));
  plot.beats.forEach((b, i) => {
    const ta = h('textarea', { class: 'in', rows: 2, value: rec.vals?.[i] || '', placeholder: b.prompt, disabled: !S.project, onInput: (e) => { (rec.vals ||= {})[i] = e.target.value; put(rec); } });
    autoGrow(ta);
    root.append(h('div', { class: 'beat' }, h('b', {}, `${i + 1}. ${b.name}`), h('span', { class: 'at' }, `  ~${b.at}%`), h('p', { style: { margin: '4px 0 8px' } }, b.what), ta));
  });
  if (S.project) root.append(h('div', { class: 'row' },
    btn('Create storyboard scenes from beats', () => { if (confirm(`Add ${plot.beats.length} scene cards to “${S.project.title}”?`)) { scenesFromStructure(plot, S.project, rec.vals || {}); setTimeout(() => go('story'), 200); } }, 'primary'),
    btn('Download filled template (.md)', () => download(`${plot.id}.md`, `# ${plot.name} — ${S.project.title}\n\n` + plot.beats.map((b, i) => `## ${i + 1}. ${b.name} (~${b.at}%)\n${b.what}\n\n${rec.vals?.[i] || '_(blank)_'}\n`).join('\n')))));
  return root;
}
