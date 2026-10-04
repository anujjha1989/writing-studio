import { h, S, all, get, put, create, remove, field, textInput, select, btn, iconBtn, tabs, autoGrow, confirmDlg, pageHead, empty } from '../lib.js';
import { rerender } from '../app.js';
import { PROPOSAL_SECTIONS, ARGUMENT_HELP, CHAPTER_TEMPLATES, SOURCE_KINDS, SOURCE_STATUS, NARRATIVE_TECHNIQUES, RESEARCH_METHOD } from '../content/nonfiction.js';

let tab = 'proposal';
export async function render() {
  const root = h('div', { class: 'stack-lg narrow' }, pageHead('Non-fiction', 'Build the proposal, map the argument, shape chapters and keep sources straight.'),
    tabs([['proposal', 'Proposal'], ['argument', 'Argument map'], ['chapters', 'Chapter shapes'], ['sources', 'Sources'], ['narrative', 'Narrative techniques']], tab, (t) => { tab = t; rerender(); }));
  root.append(({ proposal, argument, chapters, sources, narrative })[tab]());
  return root;
}

function proposal() {
  const id = `prop-${S.project.id}`;
  const rec = get(id) || { id, type: 'proposal', project: S.project.id, vals: {} };
  return h('ol', { class: 'beats' }, PROPOSAL_SECTIONS.map(([t, d], i) => { const ta = h('textarea', { class: 'in', rows: 3, value: rec.vals[i] || '', 'aria-label': t, onInput: (e) => { rec.vals[i] = e.target.value; put(rec); } }); autoGrow(ta); return h('li', {}, h('h3', {}, t), h('p', { class: 'muted' }, d), ta); }));
}

function argument() {
  const nodes = all('arg');
  const kids = (pid) => nodes.filter((n) => (n.parent || '') === pid).sort((a, b) => (a.created || 0) - (b.created || 0));
  const add = (n, kind) => btn(`Add ${kind}`, () => { create('arg', { kind, parent: n.id, text: '' }); rerender(); }, 'sm');
  const del = async (n) => { if (await confirmDlg('Delete this point?', 'Everything nested under it is deleted too.')) { const rm = (x) => { kids(x.id).forEach(rm); remove(x); }; rm(n); rerender(); } };
  const build = (n) => h('div', { class: 'node' },
    h('span', { class: `nk kind-${n.kind}` }, n.kind),
    textInput(n, 'text', { multi: true, rows: 1, placeholder: n.kind === 'claim' ? 'What you are arguing' : n.kind === 'evidence' ? 'The fact, study or example, with its source' : '' }),
    h('div', { class: 'row' }, n.kind === 'claim' ? [add(n, 'reason'), add(n, 'objection')] : null, n.kind === 'reason' ? [add(n, 'evidence'), add(n, 'objection')] : null, n.kind === 'objection' ? add(n, 'rebuttal') : null, iconBtn('trash', 'Delete', () => del(n), 'ghost sm')),
    kids(n.id).length ? h('div', { class: 'tree' }, kids(n.id).map(build)) : null);
  const roots = kids('');
  return h('div', { class: 'stack-lg' },
    h('details', { class: 'fold' }, h('summary', {}, 'How an argument map works'), h('ul', {}, ARGUMENT_HELP.parts.map(([k, v]) => h('li', {}, h('b', {}, k + '. '), v)), ARGUMENT_HELP.tips.map((t) => h('li', {}, t)))),
    h('div', {}, btn('New claim', () => { create('arg', { kind: 'claim', parent: '', text: '' }); rerender(); }, 'primary', 'plus')),
    roots.length ? roots.map((r) => h('div', { class: 'card' }, build(r))) : h('p', { class: 'muted' }, 'Start with the one claim the book exists to make. Add the reasons under it, the evidence under each reason, and the strongest objections.'));
}

function chapters() {
  return h('div', { class: 'ref-grid' }, CHAPTER_TEMPLATES.map((t) => h('article', { class: 'ref' }, h('h3', {}, t.name), h('ol', {}, t.steps.map((s) => h('li', {}, s))))));
}

function sources() {
  const list = all('source');
  return h('div', { class: 'stack-lg' },
    h('details', { class: 'fold' }, h('summary', {}, 'Research habits worth keeping'), h('ul', {}, RESEARCH_METHOD.map((r) => h('li', {}, r)))),
    h('div', {}, btn('New source', () => { create('source', { title: '', author: '', kind: 'book', url: '', status: 'to read', chapter: '', notes: '' }); rerender(); }, 'primary', 'plus')),
    list.length ? list.map((s) => h('div', { class: 'card stack' },
      h('div', { class: 'fields' }, field('Title', textInput(s, 'title')), field('Author or origin', textInput(s, 'author')), field('Kind', select(s, 'kind', SOURCE_KINDS)), field('Status', select(s, 'status', SOURCE_STATUS)),
        field('Link or location', textInput(s, 'url')), field('Used in chapters', textInput(s, 'chapter'))),
      field('Notes and quotes, with page numbers', textInput(s, 'notes', { multi: true })), h('div', {}, btn('Delete source', async () => { if (await confirmDlg('Delete this source?', 'Its notes are deleted with it.')) { remove(s); rerender(); } }, 'sm danger'))))
      : h('p', { class: 'muted' }, 'Log every source as you meet it, with page numbers. Future you, checking a quote at midnight, will be grateful.'));
}

function narrative() {
  return h('div', { class: 'ref-grid' }, NARRATIVE_TECHNIQUES.map((t) => h('article', { class: 'ref' }, h('h3', {}, t.name), h('p', {}, t.body))));
}
