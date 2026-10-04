import { h, all, get, put, create, remove, field, textInput, select, btn, iconBtn, tabs, autoGrow, orderedScenes, confirmDlg, pageHead, empty, toast, icon, svg, fmt } from '../lib.js';
import { rerender, go } from '../app.js';
import { ARCHETYPES, ARCS, SHEET_FIELDS, CHARACTER_PROMPTS, REL_TYPES } from '../content/characters.js';
import { nameMatcher, mentions } from '../text.js';

export const KINDS = [['place', 'Place', 'pin'], ['object', 'Object', 'cube'], ['group', 'Group or faction', 'people'], ['lore', 'Rule or lore', 'scroll']];
const kindLabel = (k) => (KINDS.find((x) => x[0] === k) || KINDS[0])[1];
const short = (s, n = 140) => ((s || '').length > n ? s.slice(0, n - 1) + '…' : s || '');

// Characters and other entries in one shape, for name-linking and the editor panel.
export function bibleEntries() {
  return [
    ...all('char').map((c) => ({ id: c.id, name: c.name || '', aliases: c.vals?.aka || '', kind: 'character', kindLabel: 'Character', brief: [c.vals?.role, c.vals?.want && `wants ${c.vals.want}`, c.vals?.look, c.vals?.voice, c.vals?.secret && `secret: ${c.vals.secret}`].filter(Boolean).join('; '), rec: c })),
    ...all('entry').map((e) => ({ id: e.id, name: e.name || '', aliases: e.aliases || '', kind: e.kind || 'place', kindLabel: kindLabel(e.kind), brief: [e.desc, e.notes].filter(Boolean).join(' '), rec: e })),
  ].filter((e) => e.name.trim());
}
export function entrySummary(e) {
  if (e.kind !== 'character') return h('p', { class: 'small' }, short(e.brief, 400) || 'No description yet.');
  const v = e.rec.vals || {};
  const rows = [['Role', v.role], ['Wants', v.want], ['Needs', v.need], ['Looks', v.look], ['Speaks', v.voice], ['Habits', v.habits], ['Fear', v.fear], ['Secret', v.secret]].filter((r) => r[1]);
  return rows.length ? h('dl', { class: 'kv small' }, rows.flatMap(([k, val]) => [h('dt', {}, k), h('dd', {}, short(val, 220))])) : h('p', { class: 'small muted' }, 'The sheet is empty so far.');
}
// scenes that mention an entry: [{ scene, n }]
export function appearances(entry) {
  const m = nameMatcher([entry]);
  return orderedScenes().map((s) => ({ scene: s, n: (mentions(`${s.draft || ''}`, m).get(entry.id) || 0) + (entry.kind === 'character' && s.pov && entry.name && s.pov.toLowerCase() === entry.name.toLowerCase() ? 1 : 0) })).filter((x) => x.n);
}

let tab = 'cast';
export async function render([id]) {
  if (id) { const r = get(id); return r?.type === 'char' ? sheet(r) : r?.type === 'entry' ? entryPage(r) : empty('That entry is gone', 'It may have been deleted on another device.', h('a', { class: 'btn primary', href: '#/bible' }, 'Back to the story bible')); }
  const root = h('div', { class: 'stack-lg' }, pageHead('Story bible', 'Who and what is in the book. Names you record here are linked wherever they appear in the manuscript.'),
    tabs([['cast', 'Characters'], ['world', 'Places and things'], ['map', 'Relationships'], ['arch', 'Archetypes'], ['arcs', 'Arcs'], ['prompts', 'Interview']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ cast, world, map, arch, arcs, prompts })[tab]());
  return root;
}

function cast() {
  const chars = all('char').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const add = btn('New character', () => { const c = create('char', { name: '', vals: {} }); go('bible/' + c.id); }, 'primary', 'plus');
  if (!chars.length) return empty('No characters yet', 'Start with the person the story happens to. A sheet takes a minute and saves hours of checking eye colours later.', add);
  const matcher = nameMatcher(bibleEntries());
  const seen = new Map();
  orderedScenes().forEach((s) => mentions(`${s.draft || ''} ${s.pov || ''}`, matcher).forEach((n, cid) => seen.set(cid, (seen.get(cid) || 0) + 1)));
  return h('div', { class: 'stack' }, h('div', {}, add),
    h('div', { class: 'rows' }, chars.map((c) => h('a', { class: 'rowitem', href: '#/bible/' + c.id },
      h('span', { class: 'avatar' }, (c.name || '?').trim().slice(0, 1).toUpperCase() || '?'),
      h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, c.name || 'Unnamed character'), h('small', {}, short([c.vals?.role, c.vals?.archetype, c.vals?.want && `wants ${c.vals.want}`].filter(Boolean).join(', '), 120) || 'Sheet not filled in')),
      h('small', { class: 'num' }, seen.get(c.id) ? `${seen.get(c.id)} scene${seen.get(c.id) === 1 ? '' : 's'}` : '')))));
}

function world() {
  const list = all('entry').sort((a, b) => (a.kind || '').localeCompare(b.kind || '') || (a.name || '').localeCompare(b.name || ''));
  const add = h('div', { class: 'row' }, KINDS.map(([k, l, ic]) => btn(l, () => { const e = create('entry', { kind: k, name: '', aliases: '', desc: '', notes: '' }); go('bible/' + e.id); }, '', ic)));
  if (!list.length) return empty('Nothing recorded yet', 'Record the places, objects, groups and rules the story depends on, so they stay consistent from chapter 1 to the end.', add);
  return h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Add a new entry:'), add,
    h('div', { class: 'rows' }, list.map((e) => h('a', { class: 'rowitem', href: '#/bible/' + e.id }, h('span', { class: 'avatar sq' }, icon((KINDS.find((k) => k[0] === e.kind) || KINDS[0])[2], 18)),
      h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, e.name || 'Unnamed'), h('small', {}, short(e.desc, 120) || kindLabel(e.kind))), h('small', {}, kindLabel(e.kind))))));
}

function appearsIn(entry) {
  const list = appearances(entry);
  return h('section', {}, h('h2', {}, 'Appears in'), list.length
    ? h('div', { class: 'rows' }, list.map(({ scene, n }) => h('a', { class: 'rowitem', href: '#/write/' + scene.id }, h('span', { class: 'grow rowitem-title' }, `${scene.chapter ? scene.chapter + '. ' : ''}${scene.title || 'Untitled scene'}`), h('small', { class: 'num' }, `${n}×`))))
    : h('p', { class: 'muted' }, entry.name ? `No scene mentions “${entry.name}” yet. Add other names it goes by so they are found too.` : 'Give this entry a name and scenes that mention it are listed here.'));
}

function entryPage(e) {
  return h('div', { class: 'stack-lg narrow' }, h('a', { class: 'back', href: '#/bible' }, icon('left', 16), 'Story bible'),
    h('input', { class: 'title-in big', value: e.name || '', placeholder: `Name of this ${kindLabel(e.kind).toLowerCase()}`, 'aria-label': 'Name', onInput: (ev) => { e.name = ev.target.value; put(e); } }),
    h('div', { class: 'fields' }, field('Kind', select(e, 'kind', KINDS.map(([k, l]) => [k, l]))), field('Also called', textInput(e, 'aliases', { placeholder: 'Other names, separated by commas' }), 'These are linked in the manuscript too.')),
    field('Description', textInput(e, 'desc', { multi: true, rows: 4, placeholder: 'What it looks, sounds and smells like. What makes it specific.' })),
    field('Facts to keep consistent', textInput(e, 'notes', { multi: true, rows: 4, placeholder: 'Distances, dates, rules, who knows about it' })),
    appearsIn({ id: e.id, name: e.name, aliases: e.aliases, kind: e.kind }),
    h('div', { class: 'danger-zone' }, btn('Delete entry', async () => { if (await confirmDlg(`Delete “${e.name || 'this entry'}”?`, 'The entry is removed from the story bible. Scenes are not changed.')) { remove(e); go('bible'); } }, 'danger', 'trash')));
}

function sheet(c) {
  c.vals ||= {};
  const root = h('div', { class: 'stack-lg narrow' }, h('a', { class: 'back', href: '#/bible' }, icon('left', 16), 'Story bible'),
    h('input', { class: 'title-in big', value: c.name || '', placeholder: 'Character name', 'aria-label': 'Character name', onInput: (e) => { c.name = e.target.value; c.vals.name = e.target.value; put(c); } }));
  for (const [section, fields] of SHEET_FIELDS) {
    const grid = h('div', { class: 'fields' });
    for (const [k, label] of fields) {
      if (k === 'name') continue;
      let input;
      if (k === 'archetype') input = h('select', { class: 'in', onChange: (e) => { c.vals[k] = e.target.value; put(c, true); } }, ['', ...ARCHETYPES.map((a) => a.name)].map((o) => h('option', { selected: c.vals[k] === o }, o)));
      else if (k === 'arc') input = h('select', { class: 'in', onChange: (e) => { c.vals[k] = e.target.value; put(c, true); } }, ['', ...ARCS.map((a) => a.name)].map((o) => h('option', { selected: c.vals[k] === o }, o)));
      else {
        const long = !['age', 'role', 'occupation', 'aka'].includes(k);
        input = long ? h('textarea', { class: 'in', rows: 2, value: c.vals[k] || '', onInput: (e) => { c.vals[k] = e.target.value; put(c); } }) : h('input', { class: 'in', value: c.vals[k] || '', onInput: (e) => { c.vals[k] = e.target.value; put(c); } });
        if (long) autoGrow(input);
      }
      grid.append(h('label', { class: 'field' + (['backstory', 'notes', 'arcnotes', 'relationships'].includes(k) ? ' wide' : '') }, h('span', { class: 'flabel' }, label), input));
    }
    root.append(h('section', {}, h('h2', {}, section), grid));
  }
  root.append(appearsIn({ id: c.id, name: c.name, aliases: c.vals.aka, kind: 'character' }),
    h('div', { class: 'danger-zone' }, btn('Delete character', async () => { if (await confirmDlg(`Delete ${c.name || 'this character'}?`, 'The sheet and this character’s relationships are deleted. Scenes are not changed.')) { all('rel').filter((r) => r.a === c.id || r.b === c.id).forEach(remove); remove(c); go('bible'); } }, 'danger', 'trash')));
  return root;
}

const REL_COLORS = { family: '#2f9e5b', friend: '#3b82c4', lover: '#d6336c', rival: '#e8890c', enemy: '#c0392b', mentor: '#7c5cbf', ally: '#0a9396', employer: '#7a756b', secret: '#999', other: '#7a756b' };
function map() {
  const chars = all('char').filter((c) => c.name), rels = all('rel');
  if (chars.length < 2) return empty('Add two characters first', 'The map draws the ties between people: who loves, owes, fears or is hiding something from whom.', h('a', { class: 'btn', href: '#/bible', onClick: () => { tab = 'cast'; } }, 'Go to characters'));
  const W = innerWidth < 700 ? 380 : 640, H = innerWidth < 700 ? 360 : 460, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 64;
  const pos = Object.fromEntries(chars.map((c, i) => { const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2; return [c.id, [cx + R * Math.cos(a), cy + R * Math.sin(a)]]; }));
  const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'relmap', role: 'img', 'aria-label': 'Relationship map' });
  rels.forEach((r) => {
    if (!pos[r.a] || !pos[r.b]) return;
    const [x1, y1] = pos[r.a], [x2, y2] = pos[r.b];
    g.append(svg('line', { x1, y1, x2, y2, stroke: REL_COLORS[r.type] || '#999', 'stroke-width': 2, 'stroke-dasharray': r.type === 'secret' ? '5 4' : null }), svg('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 5, 'text-anchor': 'middle', class: 'rel-label' }, r.label || r.type));
  });
  chars.forEach((c) => {
    const [x, y] = pos[c.id];
    const node = svg('g', { class: 'rel-node', tabindex: 0, role: 'link' }, svg('circle', { cx: x, cy: y, r: 24 }), svg('text', { x, y: y + 5, 'text-anchor': 'middle' }, c.name.trim().slice(0, 1).toUpperCase()), svg('text', { x, y: y + 42, 'text-anchor': 'middle', class: 'rel-name' }, c.name.split(' ')[0].slice(0, 12)));
    node.addEventListener('click', () => go('bible/' + c.id));
    g.append(node);
  });
  const r = { a: chars[0].id, b: chars[1].id, type: 'friend', label: '' };
  const opts = chars.map((c) => [c.id, c.name]);
  return h('div', { class: 'stack-lg' }, g,
    h('section', {}, h('h2', {}, 'Add a relationship'), h('div', { class: 'fields' }, field('From', select(r, 'a', opts)), field('To', select(r, 'b', opts)), field('Kind', select(r, 'type', REL_TYPES)), field('In a few words', textInput(r, 'label', { placeholder: 'owes a debt to' }))),
      h('div', { style: { marginTop: '12px' } }, btn('Add relationship', () => { if (r.a === r.b) return toast('Pick two different characters.'); create('rel', { a: r.a, b: r.b, type: r.type, label: r.label }); rerender(); }, 'primary'))),
    rels.length ? h('section', {}, h('h2', {}, 'Relationships'), h('div', { class: 'rows' }, rels.map((x) => h('div', { class: 'rowitem static' }, h('i', { class: 'dot', style: { background: REL_COLORS[x.type] } }), h('span', { class: 'grow' }, `${get(x.a)?.name || '?'} ${x.label || `(${x.type})`} ${get(x.b)?.name || '?'}`), iconBtn('trash', 'Remove', () => { remove(x); rerender(); }, 'ghost sm'))))) : '');
}

function arch() {
  return h('div', { class: 'ref-grid' }, ARCHETYPES.map((a) => h('article', { class: 'ref' }, h('h3', {}, a.name), h('p', { class: 'ref-tag' }, a.role), h('p', {}, a.desc), h('p', {}, h('b', {}, 'The trap. '), a.traps), h('p', { class: 'ask' }, a.ask))));
}
function arcs() {
  return h('div', { class: 'ref-grid' }, ARCS.map((a) => h('article', { class: 'ref' }, h('h3', {}, a.name), h('p', {}, a.desc), h('ol', {}, a.steps.map((s) => h('li', {}, s))))));
}
function prompts() {
  return h('section', { class: 'narrow' }, h('h2', {}, 'Interview your character'), h('p', { class: 'muted' }, 'Answer in their voice, not yours. The answers you resist are usually the useful ones.'), h('ol', { class: 'prose spaced' }, CHARACTER_PROMPTS.map((p) => h('li', {}, p))));
}
