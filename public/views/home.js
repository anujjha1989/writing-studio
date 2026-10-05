import { h, S, all, put, remove, openProject, loadProjects, field, textInput, select, btn, modal, orderedScenes, totalWords, fmt, progressBar, today, dayKey, acts, icon, wordsByDay, streak, dailyTarget, CLOTHS, applyCloth, confirmDlg, svg } from '../lib.js';
import { rerender, go } from '../app.js';
import { WRITING_PROMPTS, STATUS, STATUS_COLORS } from '../content/craft.js';
import { PLOTS } from '../content/plots.js';
import { scenesFromStructure } from './plots.js';

export async function render() {
  const projects = await loadProjects();
  if (!S.project) return welcome();
  const p = S.project, scenes = orderedScenes(), total = totalWords();
  const days = wordsByDay(), todayWords = days.get(today()) || 0, target = dailyTarget(), run = streak(days);
  const last = [...scenes].filter((s) => (s.draft || '').trim()).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))[0] || scenes[0];
  const left = Math.max(0, (p.goalWords || 0) - total);
  const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline) - new Date(today())) / 864e5) : null;
  const pace = daysLeft > 0 && left ? `${fmt(Math.ceil(left / daysLeft))} words a day reaches the goal by ${new Date(p.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`
    : daysLeft != null && daysLeft <= 0 && left ? 'The deadline has passed. Set a new one in book settings.' : p.goalWords && left ? `${fmt(left)} words to go.` : p.goalWords ? 'Word goal reached.' : '';

  const hero = h('section', { class: 'hero' },
    cover(p, 'lg'),
    h('div', { class: 'hero-body' },
      h('h1', { class: 'hero-title' }, p.title),
      h('p', { class: 'lede' }, [p.author && `by ${p.author}`, scenes.length ? `${fmt(scenes.length)} scenes` : 'No scenes yet'].filter(Boolean).join(', ')),
      progressBar(total, p.goalWords, `${fmt(total)}${p.goalWords ? ` of ${fmt(p.goalWords)}` : ''} words`),
      pace && h('p', { class: 'muted small' }, pace),
      h('div', { class: 'row' },
        last ? h('a', { class: 'btn primary', href: '#/write/' + last.id }, icon('pen', 18), (last.draft || '').trim() ? `Continue “${trim(last.title, 28)}”` : 'Start writing') : h('a', { class: 'btn primary', href: '#/story' }, icon('board', 18), 'Plan the first scenes'),
        h('a', { class: 'btn', href: '#/ms' }, icon('book', 18), 'Read manuscript'),
        btn('Book settings', () => projectSettings(p), 'ghost', 'gear'))));

  const todayBox = h('section', { class: 'today' },
    h('div', { class: 'today-ring' }, ring(todayWords, target)),
    h('div', { class: 'today-text' },
      h('h2', {}, todayWords >= target ? 'Today’s target is done' : todayWords ? `${fmt(target - todayWords)} words left today` : 'Nothing written yet today'),
      h('p', { class: 'muted' }, `${fmt(todayWords)} of ${fmt(target)} words. `, run ? h('span', { class: 'streak' }, icon('flame', 16), ` ${run}-day run`) : 'Write today to start a run.')),
    last && h('a', { class: 'btn', href: `#/write/${last.id}?sprint=25` }, icon('timer', 18), 'Start a 25-minute sprint'));

  const counts = STATUS.map((st) => [st, scenes.filter((s) => (s.status || 'idea') === st).length]);
  const standing = scenes.length ? h('section', {}, h('h2', {}, 'Where the draft stands'),
    h('div', { class: 'statusbar', role: 'img', 'aria-label': counts.map(([s, n]) => `${n} ${s}`).join(', ') }, counts.filter(([, n]) => n).map(([st, n]) => h('span', { style: { flex: n, background: STATUS_COLORS[st] }, title: `${n} ${st}` }))),
    h('div', { class: 'legend' }, counts.map(([st, n]) => h('span', {}, h('i', { style: { background: STATUS_COLORS[st] } }), `${n} ${st}`)))) : null;

  const shelf = h('section', {}, h('h2', {}, 'Your shelf'),
    h('div', { class: 'shelf' }, projects.map((x) => h('button', { class: `shelf-item ${x.id === p.id ? 'on' : ''}`, type: 'button', onClick: async () => { if (x.id !== p.id) { await openProject(x.id); rerender(); } } },
      cover(x, 'sm'), h('span', { class: 'shelf-name' }, x.title), h('small', {}, x.id === p.id ? 'Open now' : x.kind === 'nonfiction' ? 'Non-fiction' : 'Fiction'))),
    h('button', { class: 'shelf-item', type: 'button', onClick: () => newProject() }, h('span', { class: 'cover sm blank' }, icon('plus', 22)), h('span', { class: 'shelf-name' }, 'New book'), h('small', {}, 'Start another'))));
  const prompt = WRITING_PROMPTS[new Date().getDate() % WRITING_PROMPTS.length];
  return h('div', { class: 'desk' }, hero, todayBox,
    h('div', { class: 'two' }, h('section', {}, h('h2', {}, 'Writing days'), calendar(days, target), h('p', { class: 'muted small' }, 'Each square is a day. Darker means more words; an outlined square met the daily target.')), h('div', { class: 'stack-lg' }, standing, h('section', { class: 'prompt' }, h('h2', {}, 'A prompt for a slow day'), h('p', { class: 'prose' }, prompt)))),
    shelf);
}

const trim = (s, n) => ((s || 'Untitled').length > n ? (s || '').slice(0, n - 1) + '…' : s || 'Untitled');

export function cover(p, size = 'lg') {
  return h('div', { class: `cover ${size}`, style: { '--cloth': p.cloth || CLOTHS[0][1] } }, h('span', { class: 'cover-title' }, p.title || 'Untitled'), size === 'lg' && h('span', { class: 'cover-author' }, p.author || ''));
}

function ring(value, max) {
  const r = 34, c = 2 * Math.PI * r, pct = Math.min(1, max ? value / max : 0);
  return svg('svg', { viewBox: '0 0 84 84', width: 84, height: 84, role: 'img', 'aria-label': `${Math.round(pct * 100)}% of today’s target` },
    svg('circle', { cx: 42, cy: 42, r, fill: 'none', stroke: 'var(--rule)', 'stroke-width': 7 }),
    svg('circle', { cx: 42, cy: 42, r, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': `${c * pct} ${c}`, transform: 'rotate(-90 42 42)' }),
    svg('text', { x: 42, y: 47, 'text-anchor': 'middle', class: 'ring-text' }, `${Math.round(pct * 100)}%`));
}

export function calendar(days, target, weeks = 18) {
  const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const max = Math.max(target, ...days.values(), 1);
  const cols = [];
  const d = new Date(start);
  while (d <= end) {
    const col = h('div', { class: 'cal-col' });
    for (let i = 0; i < 7 && d <= end; i++) {
      const n = days.get(dayKey(d)) || 0;
      const lvl = n ? Math.min(4, 1 + Math.floor((n / max) * 3.999)) : 0;
      col.append(h('i', { class: `cal-day l${lvl} ${n >= target ? 'hit' : ''}`, title: `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${fmt(n)} words` }));
      d.setDate(d.getDate() + 1);
    }
    cols.push(col);
  }
  return h('div', { class: 'cal', role: 'img', 'aria-label': `Words written per day over the last ${weeks} weeks` }, cols);
}

function welcome() {
  return h('div', { class: 'welcome' },
    h('div', { class: 'cover lg' }, h('span', { class: 'cover-title' }, 'Your book'), h('span', { class: 'cover-author' }, 'starts here')),
    h('div', {}, h('h1', {}, 'A desk for the whole book'),
      h('p', { class: 'lede' }, 'Plan scenes on a storyboard, write them in a quiet editor, keep characters and places straight, and read it back as one manuscript. Everything is stored on your own Pi.'),
      h('div', { class: 'row' }, btn('Start a book', () => newProject(), 'primary', 'plus'), h('a', { class: 'btn', href: '#/plots' }, 'Browse plot structures'), h('a', { class: 'btn', href: '#/styles' }, 'Read author styles'))));
}

function clothPicker(rec) {
  const wrap = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Cover cloth' });
  const draw = () => wrap.replaceChildren(...CLOTHS.map(([name, hex]) => h('button', { type: 'button', class: `swatch ${(rec.cloth || CLOTHS[0][1]) === hex ? 'on' : ''}`, style: { background: hex }, title: name, 'aria-label': name, role: 'radio', 'aria-checked': (rec.cloth || CLOTHS[0][1]) === hex, onClick: () => { rec.cloth = hex; if (rec.id) { put(rec, true); applyCloth(); } draw(); } })));
  draw();
  return wrap;
}

export function newProject() {
  const rec = { premise: '', title: '', author: (all('project').at(-1) || {}).author || '', kind: 'fiction', goalWords: 80000, dailyTarget: 500, deadline: '', structure: '', cloth: CLOTHS[all('project').length % CLOTHS.length][1] };
  const err = h('p', { class: 'form-error', role: 'alert' });
  const options = h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'These targets and structure are optional. You can change them later.'),
    field('Author name', textInput(rec, 'author')),
    h('div', { class: 'fields' }, field('Word goal', textInput(rec, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })), field('Daily target', textInput(rec, 'dailyTarget', { type: 'number', number: true, inputMode: 'numeric' })), field('Deadline', textInput(rec, 'deadline', { type: 'date' }), 'Optional')),
    field('Start the storyboard from a structure', select(rec, 'structure', [['', 'Blank storyboard'], ...PLOTS.map((p) => [p.id, p.name])]), 'Adds one scene card per beat. You can change everything later.'),
    field('Cover cloth', clothPicker(rec)));
  const basics = h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Start with an idea. A working title is enough.'),
    field('Kind', select(rec, 'kind', [['fiction', 'Fiction'], ['nonfiction', 'Non-fiction']])),
    field('Working title', textInput(rec, 'title', { placeholder: 'You can rename it later' })),
    field('What is this book about?', textInput(rec, 'premise', { multi: true, rows: 3, placeholder: 'A character and their problem, or the question your book explores' }), 'Optional; saved with your book.'));
  let step = 1;
  const body = h('div', {}, basics, err);
  modal('Start a book', body, [['Cancel', () => {}], ['Back', () => { if (step === 2) { step = 1; body.replaceChildren(basics, err); body.closest('.modal').querySelector('.modal-f .primary').textContent = 'Next'; } return false; }], ['Next', async () => {
    if (!rec.title.trim()) { err.textContent = 'Give the book a title, even a temporary one.'; return false; }
    if (step === 1) { step = 2; body.replaceChildren(options, err); body.closest('.modal').querySelector('.modal-f .primary').textContent = 'Create book'; return false; }
    const p = { id: 'p' + Date.now().toString(36), type: 'project', project: '', created: Date.now(), title: rec.title.trim(), premise: rec.premise.trim(), author: rec.author.trim(), kind: rec.kind, goalWords: rec.goalWords, dailyTarget: rec.dailyTarget || 500, deadline: rec.deadline, cloth: rec.cloth };
    await put(p, true);
    await openProject(p.id);
    if (rec.structure) scenesFromStructure(PLOTS.find((x) => x.id === rec.structure), p);
    rec.structure ? go('story') : rerender();
  }, 'primary']]);
}

export function projectSettings(p) {
  const actsRec = { acts: acts().join(', ') };
  const body = h('div', { class: 'stack' },
    field('Title', textInput(p, 'title')), field('Premise', textInput(p, 'premise', { multi: true })), field('Author name', textInput(p, 'author'), 'Shown on the cover and in exported files.'),
    h('div', { class: 'fields' }, field('Word goal', textInput(p, 'goalWords', { type: 'number', number: true, inputMode: 'numeric' })), field('Daily target', textInput(p, 'dailyTarget', { type: 'number', number: true, inputMode: 'numeric' })), field('Deadline', textInput(p, 'deadline', { type: 'date' }))),
    field('Acts or parts, separated by commas', textInput(actsRec, 'acts')),
    field('Cover cloth', clothPicker(p)),
    h('div', { class: 'danger-zone' }, btn('Delete this book', async () => {
      if (await confirmDlg(`Delete “${p.title}”?`, 'Every scene, character and note in this book is deleted. Export a backup in Settings first if you might want it back.', 'Delete book')) {
        await remove(p); try { localStorage.removeItem('ws.project'); } catch { /* private mode */ } S.ready = false; S.project = null; location.hash = '#/'; location.reload();
      }
    }, 'danger', 'trash')));
  modal('Book settings', body, [['Done', () => { p.acts = actsRec.acts.split(',').map((s) => s.trim()).filter(Boolean); put(p, true); }, 'primary']], () => setTimeout(rerender, 150));
}
