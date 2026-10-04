import { h, S, all, get, put, create, btn, orderedScenes, wordCount, fmt, field, select, logWords, textInput } from '../lib.js';
import { rerender, go } from '../app.js';
import { editScene } from './story.js';

let sessionStart = null;
export async function render([id]) {
  const scenes = orderedScenes();
  if (!id) {
    return h('div', { class: 'stack' }, h('h1', {}, 'Write'), h('p', { class: 'muted' }, 'Pick a scene to draft. Drafts live on the scene card and update the word counts automatically.'),
      btn('+ New scene', () => { const s = create('scene', { act: 0, order: 9999, title: 'New scene', status: 'idea', threads: [], draft: '', words: 0, chapter: '' }); go('write/' + s.id); }, 'primary'),
      scenes.map((s) => h('a', { class: 'card link', href: '#/write/' + s.id }, h('b', {}, `${s.chapter ? s.chapter + '. ' : ''}${s.title}`), h('div', { class: 'muted' }, `${s.status} · ${fmt(s.words || 0)} words`))));
  }
  const s = get(id); if (!s) return h('p', {}, 'Scene not found.');
  const idx = scenes.findIndex((x) => x.id === id);
  sessionStart = sessionStart ?? null;
  let base = s.words || 0, written = 0;
  const count = h('span', { class: 'chip' }, `${fmt(base)} words`);
  const total = h('span', { class: 'chip' });
  const upd = () => { total.textContent = `Total ${fmt(scenes.reduce((n, x) => n + (x.words || 0), 0))}${S.project.goalWords ? ' / ' + fmt(S.project.goalWords) : ''}`; };
  upd();
  const ta = h('textarea', { class: 'editor', placeholder: 'Start writing…', spellcheck: true, autocapitalize: 'sentences', value: s.draft || '' });
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, innerHeight * 0.6) + 'px'; };
  ta.addEventListener('input', () => {
    const prev = s.words || 0;
    s.draft = ta.value; s.words = wordCount(ta.value);
    if (s.status === 'idea' || s.status === 'outlined') s.status = 'drafted';
    count.textContent = `${fmt(s.words)} words`; upd(); grow();
    put(s);
    logWords(s.words - prev);
  });
  setTimeout(grow, 30);
  const nav = (d) => { const t = scenes[idx + d]; if (t) go('write/' + t.id); };
  const side = h('details', { class: 'card hide-focus' }, h('summary', {}, 'Scene plan'),
    h('dl', { class: 'kv' }, [['POV', s.pov], ['Setting', s.setting], ['Goal', s.goal], ['Conflict', s.conflict], ['Outcome', s.outcome], ['Notes', s.notes]].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v || '—')])),
    btn('Edit scene card', () => editScene(s), 'sm'));
  const focusBtn = btn('Focus mode', () => { document.body.classList.add('focus'); ta.focus(); }, 'sm');
  return h('div', { class: 'editor-wrap' },
    h('a', { class: 'hide-focus', href: '#/write' }, '← All scenes'),
    h('div', { class: 'row sb hide-focus' }, h('h2', { style: { margin: 0 } }, `${s.chapter ? s.chapter + '. ' : ''}${s.title}`), h('div', { class: 'row' }, count, total)),
    h('div', { class: 'row hide-focus' }, btn('◀ Prev', () => nav(-1), 'sm'), btn('Next ▶', () => nav(1), 'sm'), focusBtn,
      h('select', { class: 'in', style: { width: 'auto' }, onChange: (e) => { s.status = e.target.value; put(s, true); } }, ['idea', 'outlined', 'drafted', 'revised', 'polished'].map((o) => h('option', { selected: s.status === o }, o)))),
    side, ta,
    h('button', { class: 'btn focus-exit', onClick: () => document.body.classList.remove('focus') }, 'Exit focus'));
}
