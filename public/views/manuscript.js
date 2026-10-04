import { h, S, all, btn, icon, fmt, pageHead, empty, modal, orderedScenes } from '../lib.js';
import { buildManuscript, runs } from '../manuscript.js';
import { nameMatcher, linkify } from '../text.js';
import { bibleEntries, entrySummary } from './bible.js';

let linkNames = true;
export async function render() {
  const p = S.project, scenes = all('scene');
  const ms = buildManuscript(p, scenes);
  const words = ms.chapters.reduce((n, c) => n + c.words, 0);
  const unwritten = orderedScenes().filter((s) => !(s.draft || '').trim()).length;
  const head = pageHead('Manuscript', words ? `${fmt(words)} words, about ${Math.max(1, Math.round(words / 250))} minute${Math.round(words / 250) > 1 ? 's' : ''} of reading.${unwritten ? ` ${unwritten} scene${unwritten === 1 ? ' is' : 's are'} not written yet and left out.` : ''}` : 'The whole book in reading order, as the scenes are written.');
  if (!ms.chapters.length) return h('div', { class: 'stack-lg' }, head, empty('Nothing to read yet', 'Scenes appear here as soon as they have text. Chapters follow the chapter numbers on the scene cards.', h('a', { class: 'btn primary', href: '#/write' }, 'Write a scene')));

  const entries = bibleEntries();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const matcher = linkNames ? nameMatcher(entries) : null;
  const showEntry = (id) => { const e = byId.get(id); if (e) modal(e.name, h('div', { class: 'stack' }, h('p', { class: 'muted small' }, e.kindLabel), entrySummary(e)), [['Open full entry', () => { location.hash = '#/bible/' + e.id; }], ['Close', () => {}, 'primary']]); };
  const para = (text) => h('p', {}, runs(text).flatMap((r) => linkify(r.t, matcher).map((seg) => { const node = seg.id ? h('button', { class: 'name', type: 'button', onClick: () => showEntry(seg.id) }, seg.text) : seg.text; return r.i ? h('em', {}, node) : node; })));

  const fmts = [['docx', 'Word'], ['epub', 'EPUB'], ['md', 'Markdown'], ['txt', 'Plain text']];
  const tools = h('div', { class: 'row toolbar' },
    h('span', { class: 'muted small' }, 'Export as'), fmts.map(([f, l]) => h('a', { class: 'btn sm', href: `/api/manuscript/${encodeURIComponent(p.id)}/${f}`, download: '' }, f === 'docx' ? icon('download', 16) : null, l)),
    entries.length ? h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: linkNames, onChange: async (e) => { linkNames = e.target.checked; (await import('../app.js')).rerender(); } }), 'Link names to the story bible') : null);

  const toc = h('nav', { class: 'ms-toc', 'aria-label': 'Chapters' }, h('h2', {}, 'Chapters'), h('ol', {}, ms.chapters.map((c, i) => h('li', {}, h('a', { href: '#', onClick: (e) => { e.preventDefault(); document.getElementById('ch' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, h('span', {}, c.title || c.scenes[0]?.title || `Section ${i + 1}`), h('small', { class: 'num' }, fmt(c.words)))))));

  const book = h('article', { class: 'book' },
    h('header', { class: 'book-title' }, h('h1', {}, ms.title), ms.author && h('p', {}, ms.author)),
    ms.chapters.map((c, i) => h('section', { class: 'chapter', id: 'ch' + i },
      c.title && h('h2', {}, c.title),
      c.scenes.map((s, si) => h('div', { class: 'ms-scene' }, si ? h('p', { class: 'scene-break', 'aria-hidden': 'true' }, '⁂') : null,
        h('a', { class: 'ms-edit', href: '#/write/' + s.id, title: `Edit “${s.title}”` }, icon('pen', 14), h('span', {}, 'Edit')), s.paras.map(para))))));
  return h('div', { class: 'stack-lg' }, head, tools, h('div', { class: 'ms-layout' }, toc, book));
}
