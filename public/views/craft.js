import { h, S, get, put, btn, tabs, pageHead, empty } from '../lib.js';
import { rerender } from '../app.js';
import { CRAFT_GUIDES, CHECKLISTS, PROMPT_PARTS, WRITING_PROMPTS } from '../content/craft.js';

let tab = 'guides', gen = null, openGuide = null;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export async function render([id]) {
  if (id && CRAFT_GUIDES.some((g) => g.id === id)) { tab = 'guides'; openGuide = id; }
  const root = h('div', { class: 'stack-lg narrow' }, pageHead('Craft toolkit', 'Short, practical guides, revision checklists and prompts.'),
    tabs([['guides', 'Guides'], ['checklists', 'Revision checklists'], ['prompts', 'Prompts']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ guides, checklists, prompts })[tab]());
  return root;
}
function guides() {
  return h('div', { class: 'folds' }, CRAFT_GUIDES.map((g) => h('details', { class: 'fold big', open: openGuide === g.id, onToggle: (e) => { if (e.target.open) openGuide = g.id; } }, h('summary', {}, g.title),
    h('div', { class: 'prose' }, g.body.map((p) => h('p', {}, p))),
    g.before ? h('div', { class: 'pair' }, h('div', {}, h('h3', {}, 'Told'), h('p', { class: 'prose' }, g.before)), h('div', {}, h('h3', {}, 'Shown'), h('p', { class: 'prose' }, g.after))) : null,
    g.test.length ? h('div', {}, h('h3', {}, 'Ask of your draft'), h('ul', {}, g.test.map((t) => h('li', {}, t)))) : null)));
}
function checklists() {
  if (!S.project) return empty('Start a book to keep checklists', 'Ticks are saved per book, so each manuscript has its own revision record.', h('a', { class: 'btn primary', href: '#/' }, 'Go to the Desk'));
  return h('div', { class: 'stack-lg' }, CHECKLISTS.map((c) => {
    const id = `chk-${S.project.id}-${c.id}`;
    const rec = get(id) || { id, type: 'check', project: S.project.id, done: {} };
    const n = () => Object.values(rec.done).filter(Boolean).length;
    const count = h('small', { class: 'num' }, `${n()} of ${c.items.length}`);
    return h('section', {}, h('div', { class: 'row sb' }, h('h2', {}, c.title.replace(/^Revision: /, '').replace(/^./, (x) => x.toUpperCase())), h('div', { class: 'row' }, count, btn('Clear', () => { rec.done = {}; put(rec, true); rerender(); }, 'sm ghost'))),
      h('div', { class: 'checks' }, c.items.map((it, i) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!rec.done[i], onChange: (e) => { rec.done[i] = e.target.checked; put(rec, true); count.textContent = `${n()} of ${c.items.length}`; } }), h('span', {}, it)))));
  }));
}
function prompts() {
  gen ||= make();
  return h('div', { class: 'stack-lg' },
    h('section', { class: 'spark' }, h('h2', {}, 'A story to start'), h('p', { class: 'prose big' }, gen), btn('Deal another', () => { gen = make(); rerender(); }, 'primary')),
    h('section', {}, h('h2', {}, 'Prompts'), h('ol', { class: 'prose spaced' }, WRITING_PROMPTS.map((p) => h('li', {}, p)))));
}
const make = () => `${pick(PROMPT_PARTS.character)} ${pick(PROMPT_PARTS.want)}, ${pick(PROMPT_PARTS.obstacle)}. Setting: ${pick(PROMPT_PARTS.setting)}.`.replace(/^./, (c) => c.toUpperCase());
