import { h, S, all, create, put, remove, openProject, loadProjects, field, textInput, select, btn, modal, orderedScenes, totalWords, fmt, progressBar, today, acts } from '../lib.js';
import { rerender, go } from '../app.js';
import { WRITING_PROMPTS } from '../content/craft.js';
import { PLOTS } from '../content/plots.js';
import { scenesFromStructure } from './plots.js';

export async function render() {
  const projects = (await loadProjects());
  const root = h('div', { class: 'stack' });
  root.append(h('h1', {}, 'Writing Studio'), h('p', { class: 'muted' }, 'Plot, character, storyboard, tracker, style guides, non-fiction and craft — all in one place, stored on your own Pi.'));

  if (S.project) root.append(dashboard());
  root.append(h('div', { class: 'row sb' }, h('h2', { style: { margin: 0 } }, 'Projects'), btn('+ New project', () => newProject(), 'primary')));
  root.append(h('div', { class: 'grid' }, projects.map((p) => h('div', { class: 'card' },
    h('h3', {}, p.title), h('span', { class: 'chip' }, p.kind === 'nonfiction' ? 'Non-fiction' : 'Fiction'), p.goalWords ? h('span', { class: 'chip' }, `Goal ${fmt(p.goalWords)} words`) : null,
    h('div', { class: 'row', style: { marginTop: '8px' } },
      p.id === S.project?.id ? h('span', { class: 'chip' }, '● open') : btn('Open', async () => { await openProject(p.id); rerender(); }, 'sm'),
      btn('Settings', () => projectSettings(p), 'sm'))))));
  if (!projects.length) root.append(h('div', { class: 'card' }, h('p', {}, 'No projects yet. Create one to start planning. The Plot library, Author styles and Craft toolkit are usable without one.')));

  root.append(h('h2', {}, 'Explore'), h('div', { class: 'grid' }, [
    ['plots', '🧭 Plot library', `${PLOTS.length} structures with fill-in templates`], ['chars', '🎭 Characters', 'Archetypes, arcs, sheets, relationship map'],
    ['story', '🗂 Storyboard', 'Scene cards by act, drag to reorder'], ['track', '📈 Plot tracker', 'Threads, timeline, setups/payoffs, word goals'],
    ['styles', '✒️ Author styles', '22 original style guides and exercises'], ['nonfic', '📚 Non-fiction', 'Proposal, argument map, sources'],
    ['craft', '🛠 Craft toolkit', 'Guides, checklists, prompts'], ['write', '✍️ Write', 'Distraction-free drafting editor'],
  ].map(([s, t, d]) => h('a', { class: 'card link', href: '#/' + s }, h('h3', {}, t), h('small', {}, d)))));
  const prompt = WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
  root.append(h('div', { class: 'card' }, h('b', {}, 'Prompt'), h('p', { class: 'prose' }, prompt), btn('Another', rerender, 'sm')));
  return root;
}

function dashboard() {
  const total = totalWords(), p = S.project, scenes = orderedScenes();
  const done = scenes.filter((s) => ['revised', 'polished'].includes(s.status)).length;
  const wl = all('wordlog').find((r) => r.date === today());
  const card = h('div', { class: 'card stack' }, h('b', {}, p.title),
    progressBar(total, p.goalWords, `${fmt(total)}${p.goalWords ? ' / ' + fmt(p.goalWords) : ''} words`),
    h('div', { class: 'row' }, h('span', { class: 'chip' }, `${scenes.length} scenes`), h('span', { class: 'chip' }, `${done} revised+`), h('span', { class: 'chip' }, `${all('thread').length} threads`), wl ? h('span', { class: 'chip' }, `Today +${fmt(wl.total - wl.start)}`) : null));
  return card;
}

function newProject() {
  const rec = { title: '', kind: 'fiction', goalWords: 80000, deadline: '', structure: '' };
  const body = h('div', { class: 'stack' },
    field('Title', textInput(rec, 'title', { placeholder: 'Working title' })),
    field('Type', select(rec, 'kind', [['fiction', 'Fiction'], ['nonfiction', 'Non-fiction']])),
    field('Word goal', textInput(rec, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })),
    field('Deadline (optional)', textInput(rec, 'deadline', { type: 'date' })),
    field('Pre-fill storyboard from a structure', select(rec, 'structure', [['', 'None'], ...PLOTS.map((p) => [p.id, p.name])])));
  modal('New project', body, [['Create', () => {
    if (!rec.title.trim()) return false;
    const p = { id: 'p' + Date.now().toString(36), type: 'project', project: '', created: Date.now(), title: rec.title.trim(), kind: rec.kind, goalWords: rec.goalWords, deadline: rec.deadline };
    put(p, true);
    setTimeout(async () => {
      await openProject(p.id);
      if (rec.structure) scenesFromStructure(PLOTS.find((x) => x.id === rec.structure), p);
      rerender();
    }, 150);
  }, 'primary']]);
}

function projectSettings(p) {
  const actsRec = { acts: (p.acts?.length ? p.acts : acts()).join(', ') };
  const body = h('div', { class: 'stack' },
    field('Title', textInput(p, 'title')), field('Word goal', textInput(p, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })),
    field('Deadline', textInput(p, 'deadline', { type: 'date' })),
    field('Acts / parts (comma-separated)', textInput(actsRec, 'acts')),
    btn('Delete project…', () => {
      if (confirm(`Delete "${p.title}" and ALL its scenes, characters and notes? This cannot be undone. Export a backup first.`)) {
        remove(p).then(async () => { localStorage.removeItem('ws.project'); S.ready = false; S.project = null; location.hash = '#/'; location.reload(); });
      }
    }, 'danger'));
  modal('Project settings', body, [['Save', () => { p.acts = actsRec.acts.split(',').map((s) => s.trim()).filter(Boolean); put(p, true); setTimeout(rerender, 100); }, 'primary']]);
}
