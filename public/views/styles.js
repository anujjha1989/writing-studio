import { h, S, all, get, put, create, field, autoGrow, btn, uid } from '../lib.js';
import { rerender } from '../app.js';
import { AUTHORS_1 } from '../content/authors1.js';
import { AUTHORS_2 } from '../content/authors2.js';

export const AUTHORS = [...AUTHORS_1, ...AUTHORS_2];
let q = '';
const SECTIONS = [['voice', 'Voice'], ['rhythm', 'Sentence rhythm'], ['structure', 'Structure'], ['pov', 'Point of view'], ['pacing', 'Pacing'], ['world', 'Worldbuilding & setting'], ['dialogue', 'Dialogue habits'], ['themes', 'Themes']];

export async function render([id]) {
  if (id) return detail(AUTHORS.find((a) => a.id === id));
  const cards = AUTHORS.map((a) => ({ a, el: h('a', { class: 'card link', href: `#/styles/${a.id}` }, h('h3', {}, a.name), h('span', { class: 'chip' }, a.kind), h('p', { class: 'muted', style: { fontSize: '.85rem' } }, a.known)) }));
  const apply = () => cards.forEach(({ a, el }) => { el.style.display = (a.name + a.kind + a.known).toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
  const search = h('input', { class: 'in', type: 'search', placeholder: 'Search authors…', value: q, onInput: (e) => { q = e.target.value; apply(); } });
  apply();
  return h('div', { class: 'stack' }, h('h1', {}, 'Author style guides'),
    h('p', { class: 'muted' }, `${AUTHORS.length} guides. Each is an original analysis of technique in plain words, with practice exercises. No passages are reproduced. Add your own observations from your library on each page.`),
    search, h('div', { class: 'grid' }, cards.map((c) => c.el)));
}

function detail(a) {
  if (!a) return h('p', {}, 'Not found.');
  const noteId = `an-${a.id}`;
  const note = get(noteId) || { id: noteId, type: 'authnote', project: '', text: '' };
  const root = h('div', { class: 'stack' }, h('a', { href: '#/styles' }, '← Author styles'), h('h1', {}, a.name), h('span', { class: 'chip' }, a.kind),
    h('p', { class: 'muted' }, 'Known for: ' + a.known),
    ...SECTIONS.map(([k, label]) => h('div', { class: 'card' }, h('h3', {}, label), h('p', { class: 'prose' }, a[k]))),
    h('div', { class: 'card' }, h('h3', {}, 'Techniques to borrow'), h('ul', {}, a.borrow.map((x) => h('li', {}, x)))),
    h('div', { class: 'card' }, h('h3', {}, 'Pitfalls of imitation'), h('ul', {}, a.avoid.map((x) => h('li', {}, x)))),
    h('h2', {}, 'Practice exercises'));
  a.exercises.forEach((ex, i) => {
    const pid = `pr-${a.id}-${i}`;
    const rec = get(pid) || { id: pid, type: 'practice', project: '', text: '', done: false };
    const ta = h('textarea', { class: 'in', rows: 4, placeholder: 'Write your attempt here…', value: rec.text, onInput: (e) => { rec.text = e.target.value; put(rec); } }); autoGrow(ta);
    root.append(h('div', { class: 'card stack' }, h('div', {}, h('b', {}, `Exercise ${i + 1}. `), ex), ta,
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: rec.done, onChange: (e) => { rec.done = e.target.checked; put(rec, true); } }), 'Completed')));
  });
  const nt = h('textarea', { class: 'in', rows: 5, placeholder: `Your own notes on ${a.name}: favourite books, passages to study (in your own library), quirks you noticed…`, value: note.text, onInput: (e) => { note.text = e.target.value; put(note); } }); autoGrow(nt);
  root.append(h('h2', {}, 'Your notes'), nt);
  return root;
}
