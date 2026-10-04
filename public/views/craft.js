import { h, S, all, get, put, btn, tabs, field, select, autoGrow } from '../lib.js';
import { rerender } from '../app.js';
import { CRAFT_GUIDES, CHECKLISTS, PROMPT_PARTS, WRITING_PROMPTS } from '../content/craft.js';

let tab = 'guides', gen = null, openGuide = null;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export async function render() {
  const root = h('div', { class: 'stack' }, h('h1', {}, 'Craft toolkit'),
    tabs([['guides', 'Guides'], ['checklists', 'Revision checklists'], ['prompts', 'Prompts']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ guides, checklists, prompts })[tab]());
  return root;
}
function guides() {
  return h('div', { class: 'stack' }, CRAFT_GUIDES.map((g) => h('details', { class: 'card', open: openGuide === g.id, onToggle: (e) => { if (e.target.open) openGuide = g.id; } }, h('summary', {}, h('b', {}, g.title)),
    g.body.map((p) => h('p', { class: 'prose' }, p)),
    g.before ? h('div', { class: 'row' }, h('div', { class: 'grow' }, h('small', {}, 'Tell'), h('p', {}, g.before)), h('div', { class: 'grow' }, h('small', {}, 'Show'), h('p', {}, g.after))) : null,
    g.test.length ? h('div', {}, h('b', {}, 'Ask of your draft'), h('ul', {}, g.test.map((t) => h('li', {}, t)))) : null)));
}
function checklists() {
  if (!S.project) return h('p', { class: 'muted' }, 'Create a project to save checklist progress.');
  return h('div', { class: 'stack' }, CHECKLISTS.map((c) => {
    const id = `chk-${S.project.id}-${c.id}`;
    const rec = get(id) || { id, type: 'check', project: S.project.id, done: {} };
    const n = () => Object.values(rec.done).filter(Boolean).length;
    const count = h('small', {}, `${n()}/${c.items.length}`);
    return h('div', { class: 'card' }, h('div', { class: 'row sb' }, h('b', {}, c.title), count),
      c.items.map((it, i) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!rec.done[i], onChange: (e) => { rec.done[i] = e.target.checked; put(rec, true); count.textContent = `${n()}/${c.items.length}`; e.target.parentNode.querySelector('span').classList.toggle('done', e.target.checked); } }), h('span', { class: rec.done[i] ? 'done' : '' }, it))),
      btn('Reset', () => { rec.done = {}; put(rec, true); rerender(); }, 'sm ghost'));
  }));
}
function prompts() {
  gen ||= make();
  return h('div', { class: 'stack' },
    h('div', { class: 'card stack' }, h('b', {}, 'Story spark'), h('p', { class: 'prose' }, gen), btn('Roll again', () => { gen = make(); rerender(); }, 'primary')),
    h('div', { class: 'card' }, h('b', {}, 'Writing prompts'), h('ol', {}, WRITING_PROMPTS.map((p) => h('li', { style: { margin: '8px 0' } }, p)))));
}
const make = () => `${pick(PROMPT_PARTS.character)} ${pick(PROMPT_PARTS.want)}, ${pick(PROMPT_PARTS.obstacle)}. Setting: ${pick(PROMPT_PARTS.setting)}.`.replace(/^./, (c) => c.toUpperCase());
