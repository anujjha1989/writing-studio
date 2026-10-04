import { h, S, all, get, put, create, remove, field, textInput, select, btn, modal, tabs, uid, autoGrow } from '../lib.js';
import { rerender } from '../app.js';
import { ARCHETYPES, ARCS, SHEET_FIELDS, CHARACTER_PROMPTS, REL_TYPES } from '../content/characters.js';

let tab = 'sheets';
export async function render([id]) {
  if (id) return sheet(get(id));
  const root = h('div', { class: 'stack' }, h('h1', {}, 'Characters'),
    tabs([['sheets', 'My characters'], ['map', 'Relationship map'], ['arch', 'Archetypes'], ['arcs', 'Arc types'], ['prompts', 'Prompts']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ sheets, map, arch, arcs, prompts })[tab]());
  return root;
}

function sheets() {
  const chars = all('char').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return h('div', { class: 'stack' }, btn('+ New character', () => { const c = create('char', { name: 'New character', vals: {} }); location.hash = '#/chars/' + c.id; }, 'primary'),
    h('div', { class: 'grid' }, chars.map((c) => h('a', { class: 'card link', href: '#/chars/' + c.id }, h('h3', {}, c.name || 'Unnamed'), h('small', {}, [c.vals?.role, c.vals?.archetype].filter(Boolean).join(' · ')), h('p', {}, (c.vals?.want || '').slice(0, 90))))),
    !chars.length && h('p', { class: 'muted' }, 'No characters yet.'));
}

function sheet(c) {
  if (!c) return h('p', {}, 'Not found.');
  c.vals ||= {};
  const arcOpts = ['', ...ARCS.map((a) => a.name)];
  const root = h('div', { class: 'stack' }, h('a', { href: '#/chars' }, '← Characters'), h('h1', {}, c.name || 'Character'));
  for (const [section, fields] of SHEET_FIELDS) {
    const box = h('div', { class: 'card' }, h('h3', {}, section), h('div', { class: 'fields' }));
    for (const [k, label] of fields) {
      let input;
      if (k === 'archetype') input = h('select', { class: 'in', onChange: (e) => { c.vals[k] = e.target.value; put(c, true); } }, ['', ...ARCHETYPES.map((a) => a.name)].map((o) => h('option', { selected: c.vals[k] === o }, o)));
      else if (k === 'arc') input = h('select', { class: 'in', onChange: (e) => { c.vals[k] = e.target.value; put(c, true); } }, arcOpts.map((o) => h('option', { selected: c.vals[k] === o }, o)));
      else {
        const long = !['name', 'age', 'role', 'occupation', 'aka'].includes(k);
        input = h(long ? 'textarea' : 'input', { class: 'in', rows: 2, value: c.vals[k] || '', onInput: (e) => { c.vals[k] = e.target.value; if (k === 'name') c.name = e.target.value; put(c); } });
        if (long) autoGrow(input);
      }
      box.lastChild.append(h('label', { class: 'field' + (['backstory', 'notes', 'arcnotes', 'relationships'].includes(k) ? ' wide' : '') }, h('span', { class: 'flabel' }, label), input));
    }
    root.append(box);
  }
  root.append(btn('Delete character', () => { if (confirm('Delete this character and its relationships?')) { all('rel').filter((r) => r.a === c.id || r.b === c.id).forEach(remove); remove(c); location.hash = '#/chars'; } }, 'danger'));
  return root;
}

function map() {
  const chars = all('char'), rels = all('rel');
  const root = h('div', { class: 'stack' });
  if (chars.length < 2) return h('p', { class: 'muted' }, 'Add at least two characters to map relationships.');
  const W = 600, H = 460, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 60;
  const pos = Object.fromEntries(chars.map((c, i) => { const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2; return [c.id, [cx + R * Math.cos(a), cy + R * Math.sin(a)]]; }));
  const col = { family: '#2f9e5b', friend: '#3b82c4', lover: '#d6336c', rival: '#e8890c', enemy: '#c0392b', mentor: '#7c5cbf', ally: '#0a9396', employer: '#6f6a60', secret: '#999', other: '#6f6a60' };
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, ...k) => { const e = document.createElementNS(NS, t); for (const [x, y] of Object.entries(a)) e.setAttribute(x, y); k.forEach((c) => e.append(c)); return e; };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map' });
  rels.forEach((r) => {
    if (!pos[r.a] || !pos[r.b]) return;
    const [x1, y1] = pos[r.a], [x2, y2] = pos[r.b];
    svg.append(el('line', { x1, y1, x2, y2, stroke: col[r.type] || '#999', 'stroke-width': 2.5, 'stroke-dasharray': r.type === 'secret' ? '5 4' : '' }));
    const t = el('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 4, 'text-anchor': 'middle', 'font-size': 11, fill: 'currentColor', style: 'paint-order:stroke;stroke:var(--card);stroke-width:4px' }); t.textContent = r.label || r.type; svg.append(t);
  });
  chars.forEach((c) => {
    const [x, y] = pos[c.id];
    const g = el('g', { style: 'cursor:pointer' }, el('circle', { cx: x, cy: y, r: 26, fill: 'var(--accent)' }), (() => { const t = el('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff' }); t.textContent = (c.name || '?').split(' ')[0].slice(0, 9); return t; })());
    g.addEventListener('click', () => { location.hash = '#/chars/' + c.id; });
    svg.append(g);
  });
  root.append(svg, relForm(chars));
  root.append(h('div', { class: 'card' }, h('b', {}, 'Relationships'), rels.map((r) => h('div', { class: 'row sb', style: { padding: '6px 0' } },
    h('span', {}, `${get(r.a)?.name || '?'} — ${r.label || r.type} → ${get(r.b)?.name || '?'}`), btn('✕', () => { remove(r); rerender(); }, 'sm ghost')))));
  return root;
}
function relForm(chars) {
  const r = { a: chars[0].id, b: chars[1].id, type: 'friend', label: '' };
  const opts = chars.map((c) => [c.id, c.name]);
  return h('div', { class: 'card stack' }, h('b', {}, 'Add relationship'),
    h('div', { class: 'fields' }, field('From', select(r, 'a', opts)), field('To', select(r, 'b', opts)), field('Type', select(r, 'type', REL_TYPES)), field('Label (e.g. “owes a debt to”)', textInput(r, 'label'))),
    btn('Add', () => { if (r.a === r.b) return alert('Pick two different characters'); create('rel', { a: r.a, b: r.b, type: r.type, label: r.label }); rerender(); }, 'primary'));
}

function arch() {
  return h('div', { class: 'grid' }, ARCHETYPES.map((a) => h('div', { class: 'card' }, h('h3', {}, a.name), h('span', { class: 'chip' }, a.role), h('p', {}, a.desc), h('p', {}, h('b', {}, 'Trap: '), a.traps), h('p', { class: 'muted' }, '? ' + a.ask))));
}
function arcs() {
  return h('div', { class: 'stack' }, ARCS.map((a) => h('div', { class: 'card' }, h('h3', {}, a.name), h('p', {}, a.desc), h('ol', {}, a.steps.map((s) => h('li', {}, s))))));
}
function prompts() {
  return h('div', { class: 'card' }, h('b', {}, 'Interview your character'), h('ul', {}, CHARACTER_PROMPTS.map((p) => h('li', {}, p))));
}
