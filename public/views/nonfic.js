import { h, S, all, get, put, create, remove, field, textInput, select, btn, tabs, autoGrow } from '../lib.js';
import { rerender } from '../app.js';
import { PROPOSAL_SECTIONS, ARGUMENT_HELP, CHAPTER_TEMPLATES, SOURCE_KINDS, SOURCE_STATUS, NARRATIVE_TECHNIQUES, RESEARCH_METHOD } from '../content/nonfiction.js';

let tab = 'proposal';
export async function render() {
  const root = h('div', { class: 'stack' }, h('h1', {}, 'Non-fiction track'),
    tabs([['proposal', 'Proposal'], ['argument', 'Argument map'], ['chapters', 'Chapter templates'], ['sources', 'Sources'], ['narrative', 'Narrative techniques']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ proposal, argument, chapters, sources, narrative })[tab]());
  return root;
}

function proposal() {
  const id = `prop-${S.project.id}`;
  const rec = get(id) || { id, type: 'proposal', project: S.project.id, vals: {} };
  return h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Book proposal outline. Agents and editors expect most of these sections.'),
    PROPOSAL_SECTIONS.map(([t, d], i) => { const ta = h('textarea', { class: 'in', rows: 3, value: rec.vals[i] || '', onInput: (e) => { rec.vals[i] = e.target.value; put(rec); } }); autoGrow(ta); return h('div', { class: 'card stack' }, h('b', {}, `${i + 1}. ${t}`), h('small', {}, d), ta); }));
}

const KINDS = ['claim', 'reason', 'evidence', 'objection', 'rebuttal'];
function argument() {
  const nodes = all('arg');
  const kids = (pid) => nodes.filter((n) => (n.parent || '') === pid).sort((a, b) => (a.created || 0) - (b.created || 0));
  const roots = kids('');
  const build = (n) => h('div', { class: 'node' },
    h('div', { class: 'row', style: { alignItems: 'flex-start' } }, h('span', { class: `nk kind-${n.kind}` }, n.kind),
      h('div', { class: 'grow' }, textInput(n, 'text', { multi: true, rows: 1 }), h('div', { class: 'row', style: { marginTop: '4px' } },
        n.kind === 'claim' ? [add(n, 'reason'), add(n, 'objection')] : null, n.kind === 'reason' ? [add(n, 'evidence'), add(n, 'objection')] : null, n.kind === 'objection' ? add(n, 'rebuttal') : null,
        btn('✕', () => { del(n); }, 'sm ghost')))),
    h('div', { class: 'tree' }, kids(n.id).map(build)));
  const add = (n, kind) => btn('+ ' + kind, () => { create('arg', { kind, parent: n.id, text: '' }); rerender(); }, 'sm');
  const del = (n) => { if (confirm('Delete this node and everything under it?')) { const rm = (x) => { kids(x.id).forEach(rm); remove(x); }; rm(n); rerender(); } };
  return h('div', { class: 'stack' },
    h('div', { class: 'card' }, h('b', {}, 'How to use'), h('ul', {}, ARGUMENT_HELP.parts.map(([k, v]) => h('li', {}, h('b', {}, k + ': '), v)), ARGUMENT_HELP.tips.map((t) => h('li', { class: 'muted' }, t)))),
    btn('+ New claim', () => { create('arg', { kind: 'claim', parent: '', text: '' }); rerender(); }, 'primary'),
    roots.map((r) => h('div', { class: 'card' }, build(r))));
}

function chapters() {
  return h('div', { class: 'stack' }, CHAPTER_TEMPLATES.map((t) => h('div', { class: 'card' }, h('h3', {}, t.name), h('ol', {}, t.steps.map((s) => h('li', {}, s))))));
}

function sources() {
  const list = all('source');
  return h('div', { class: 'stack' },
    h('div', { class: 'card' }, h('b', {}, 'Research habits'), h('ul', {}, RESEARCH_METHOD.map((r) => h('li', {}, r)))),
    btn('+ Add source', () => { create('source', { title: '', author: '', kind: 'book', url: '', status: 'to read', chapter: '', notes: '' }); rerender(); }, 'primary'),
    list.map((s) => h('div', { class: 'card stack' },
      h('div', { class: 'fields' }, field('Title', textInput(s, 'title')), field('Author / origin', textInput(s, 'author')), field('Type', select(s, 'kind', SOURCE_KINDS)), field('Status', select(s, 'status', SOURCE_STATUS)),
        field('URL / location', textInput(s, 'url')), field('Chapter(s)', textInput(s, 'chapter'))),
      field('Notes, key quotes (with page numbers)', textInput(s, 'notes', { multi: true })), btn('Delete', () => { remove(s); rerender(); }, 'sm danger'))));
}

function narrative() {
  return h('div', { class: 'stack' }, NARRATIVE_TECHNIQUES.map((t) => h('div', { class: 'card' }, h('h3', {}, t.name), h('p', { class: 'prose' }, t.body))));
}
