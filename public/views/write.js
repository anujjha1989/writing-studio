import { h, S, all, get, put, create, remove, btn, iconBtn, icon, orderedScenes, wordCount, fmt, logWords, acts, modal, tabs, toast, when, req, confirmDlg, askText, pageHead, empty, uid, svg } from '../lib.js';
import { rerender, go } from '../app.js';
import { sceneFields, newScene } from './story.js';
import { analyse, segments, diffText, nameMatcher, mentions } from '../text.js';
import { STATUS, STATUS_COLORS, CRAFT_GUIDES } from '../content/craft.js';
import { AUTHORS } from './styles.js';
import { bibleEntries, entrySummary } from './bible.js';

const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
let sprint = null; // { end, minutes, startWords, sceneId, timer }

export async function render([raw]) {
  const [id, query] = (raw || '').split('?');
  const scenes = orderedScenes();
  if (!id) return sceneList(scenes);
  const s = get(id);
  if (!s || s.type !== 'scene') return empty('That scene is gone', 'It may have been deleted on another device.', h('a', { class: 'btn primary', href: '#/write' }, 'All scenes'));
  const sprintMin = Number(new URLSearchParams(query || '').get('sprint'));
  return editor(s, scenes, sprintMin);
}

function sceneList(scenes) {
  const A = acts();
  const root = h('div', { class: 'stack-lg' }, pageHead('Write', scenes.length ? 'Pick a scene. Drafts are saved as you type and counted towards the book.' : 'Scenes you add appear here, ready to draft.', btn('New scene', () => { const s = newSceneQuiet(); go('write/' + s.id); }, 'primary', 'plus')));
  if (!scenes.length) { root.append(empty('No scenes yet', 'Add one here, or plan a few on the Storyboard first.', h('a', { class: 'btn', href: '#/story' }, 'Open the Storyboard'))); return root; }
  A.forEach((name, ai) => {
    const list = scenes.filter((s) => Math.min(s.act ?? 0, A.length - 1) === ai);
    if (!list.length) return;
    root.append(h('section', {}, h('h2', {}, name), h('div', { class: 'rows' }, list.map((s) => h('a', { class: 'rowitem', href: '#/write/' + s.id },
      h('i', { class: 'dot', style: { background: STATUS_COLORS[s.status || 'idea'] }, title: s.status || 'idea' }),
      h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, `${s.chapter ? s.chapter + '. ' : ''}${s.title || 'Untitled scene'}`), s.goal && h('small', {}, s.goal.slice(0, 110))),
      h('small', { class: 'num' }, s.words ? `${fmt(s.words)} words` : 'Not started'))))));
  });
  return root;
}
function newSceneQuiet() { const scenes = orderedScenes(); return create('scene', { act: 0, order: scenes.length + 1, title: 'Untitled scene', status: 'idea', tension: 5, threads: [], draft: '', words: 0, chapter: '' }); }

// Pixel offset of the caret from the top of a textarea (mirror technique).
function caretTop(ta) {
  const cs = getComputedStyle(ta);
  const m = document.createElement('div');
  for (const p of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth', 'boxSizing', 'whiteSpace', 'wordBreak', 'overflowWrap', 'fontVariationSettings', 'fontOpticalSizing']) m.style[p] = cs[p];
  m.style.cssText += ';position:absolute;visibility:hidden;white-space:pre-wrap;top:0;left:-9999px;width:' + ta.clientWidth + 'px';
  m.textContent = ta.value.slice(0, ta.selectionStart);
  const mark = document.createElement('span'); mark.textContent = '​'; m.append(mark);
  document.body.append(m); const y = mark.offsetTop; m.remove();
  return y;
}

function editor(s, scenes, sprintMin) {
  const idx = scenes.findIndex((x) => x.id === s.id);
  document.body.classList.add('writing');
  const count = h('span', { class: 'num' }), bookCount = h('span', { class: 'num muted' });
  const paintCounts = () => { count.textContent = `${fmt(s.words || 0)}${s.target ? ' / ' + fmt(s.target) : ''} words`; bookCount.textContent = `Book ${fmt(orderedScenes().reduce((n, x) => n + (x.words || 0), 0))}${S.project.goalWords ? ' / ' + fmt(S.project.goalWords) : ''}`; };
  const ta = h('textarea', { class: 'editor', placeholder: 'Begin here. Put *asterisks* around words for italics.', spellcheck: true, autocapitalize: 'sentences', 'aria-label': 'Scene text', value: s.draft || '' });
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight + 4, innerHeight * 0.55) + 'px'; };
  const typewriter = () => { if (!document.body.classList.contains('focus') || store.get('ws.typewriter', '1') !== '1') return; const y = ta.getBoundingClientRect().top + caretTop(ta); const want = innerHeight * 0.42; if (Math.abs(y - want) > 24) scrollBy({ top: y - want, behavior: 'smooth' }); };
  ta.addEventListener('input', () => {
    const prev = s.words || 0;
    s.draft = ta.value; s.words = wordCount(ta.value);
    if ((s.status || 'idea') === 'idea' || s.status === 'outlined') { s.status = 'drafted'; statusSel.value = 'drafted'; }
    paintCounts(); grow(); put(s); logWords(s.words - prev); typewriter(); paintSprint();
  });
  ta.addEventListener('keyup', (e) => { if (/Arrow|Enter|Page/.test(e.key)) typewriter(); });
  setTimeout(grow, 30); addEventListener('resize', grow, { passive: true });

  const title = h('input', { class: 'title-in', value: s.title || '', placeholder: 'Scene title', 'aria-label': 'Scene title', onInput: (e) => { s.title = e.target.value; put(s); } });
  const statusSel = h('select', { class: 'in auto', 'aria-label': 'Status', onChange: (e) => { s.status = e.target.value; put(s, true); } }, STATUS.map((o) => h('option', { value: o, selected: (s.status || 'idea') === o }, o[0].toUpperCase() + o.slice(1))));
  const nav = (d) => { const t = scenes[idx + d]; if (t) go('write/' + t.id); };

  // ----- sprint -----
  const sprintEl = h('button', { class: 'btn sm', type: 'button', title: 'Timed sprint', onClick: () => sprintMenu() });
  function paintSprint() {
    if (!sprint || sprint.sceneId !== s.id) { sprintEl.replaceChildren(icon('timer', 16), h('span', { class: 'lbl' }, 'Sprint')); sprintEl.classList.remove('live'); return; }
    const left = Math.max(0, sprint.end - Date.now());
    const total = orderedScenes().reduce((n, x) => n + (x.words || 0), 0);
    sprintEl.replaceChildren(icon('timer', 16), `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`, h('span', { class: 'muted' }, ` +${fmt(Math.max(0, total - sprint.startWords))}`));
    sprintEl.classList.add('live');
    if (left <= 0) endSprint(true);
  }
  function startSprint(min) {
    endSprint(false);
    sprint = { end: Date.now() + min * 60000, minutes: min, startWords: orderedScenes().reduce((n, x) => n + (x.words || 0), 0), sceneId: s.id, timer: setInterval(() => (document.body.contains(sprintEl) ? paintSprint() : endSprint(true)), 1000) };
    paintSprint(); ta.focus();
  }
  function endSprint(report) {
    if (!sprint) return;
    clearInterval(sprint.timer);
    const words = Math.max(0, orderedScenes().reduce((n, x) => n + (x.words || 0), 0) - sprint.startWords);
    if (report) { create('sprint', { date: new Date().toISOString(), minutes: sprint.minutes, words }); toast(`Sprint done: ${fmt(words)} words in ${sprint.minutes} minutes.`); }
    sprint = null; paintSprint();
  }
  function sprintMenu() {
    if (sprint && sprint.sceneId === s.id) { modal('Sprint running', h('p', {}, 'Stop the sprint now? The words so far are logged.'), [['Keep going', () => {}], ['Stop sprint', () => endSprint(true), 'primary']]); return; }
    modal('Timed sprint', h('p', {}, 'Write without stopping until the timer ends. The count beside the clock is what you add during the sprint.'), [[10, 15, 25, 45].map((m) => [`${m} min`, () => startSprint(m), m === 25 ? 'primary' : '']), []].flat().filter((x) => x.length));
  }
  paintSprint();
  if (sprintMin > 0 && !sprint) setTimeout(() => { startSprint(sprintMin); history.replaceState(null, '', '#/write/' + s.id); }, 300);

  // ----- panel -----
  const PANELS = [['plan', 'Plan'], ['bible', 'Bible'], ['guide', 'Guides'], ['versions', 'Versions'], ['check', 'Check'], ['notes', 'Feedback']];
  let open = store.get('ws.panel', innerWidth >= 1100 ? 'plan' : '');
  if (innerWidth < 1100) open = '';
  const panel = h('aside', { class: 'panel', 'aria-label': 'Reference panel' });
  const wrap = h('div', { class: 'writer' });
  const builders = { plan: () => sceneFields(s, { compact: true }), bible: () => biblePanel(s), guide: () => guidePanel(), versions: () => versionsPanel(s, ta, () => { grow(); paintCounts(); }), check: () => checkPanel(s), notes: () => notesPanel(s) };
  function paintPanel() {
    wrap.classList.toggle('split', !!open);
    store.set('ws.panel', open);
    if (!open) { panel.replaceChildren(); return; }
    panel.replaceChildren(h('div', { class: 'panel-head' }, tabs(PANELS, open, (t) => { open = t; paintPanel(); }), iconBtn('x', 'Close panel', () => { open = ''; paintPanel(); }, 'ghost')), h('div', { class: 'panel-body' }, builders[open]()));
  }
  const focusOn = () => { document.body.classList.add('focus'); ta.focus(); typewriter(); };
  const bar = h('div', { class: 'writer-bar hide-focus' },
    h('a', { class: 'btn icon ghost', href: '#/write', title: 'All scenes', 'aria-label': 'All scenes' }, icon('left')),
    h('div', { class: 'writer-tools' }, iconBtn('left', 'Previous scene', () => nav(-1), `sm step ${idx <= 0 ? 'off' : ''}`), iconBtn('right', 'Next scene', () => nav(1), `sm step ${idx >= scenes.length - 1 ? 'off' : ''}`), statusSel, sprintEl,
      h('button', { class: 'btn sm', type: 'button', title: 'Focus mode', onClick: focusOn }, icon('focus', 18), h('span', { class: 'lbl' }, 'Focus')),
      h('button', { class: 'btn sm', type: 'button', title: 'Reference panel', 'aria-label': 'Panel', onClick: () => { open = open ? '' : store.get('ws.lastpanel', 'plan'); paintPanel(); } }, icon('split', 18), h('span', { class: 'lbl' }, 'Panel'))));
  panel.addEventListener('click', () => { if (open) store.set('ws.lastpanel', open); });
  const main = h('div', { class: 'writer-main' }, bar, h('div', { class: 'sheet' }, h('div', { class: 'hide-focus' }, title, h('div', { class: 'row counts' }, count, bookCount)), ta),
    h('div', { class: 'focus-bar' }, h('span', { class: 'num' }, count.cloneNode(true)), btn('Typewriter scroll', (e) => { const on = store.get('ws.typewriter', '1') !== '1'; store.set('ws.typewriter', on ? '1' : '0'); e.currentTarget.classList.toggle('on', on); }, `sm ghost ${store.get('ws.typewriter', '1') === '1' ? 'on' : ''}`), btn('Leave focus', () => document.body.classList.remove('focus'), 'sm')));
  // keep the focus-mode counter live
  const focusCount = main.querySelector('.focus-bar .num');
  ta.addEventListener('input', () => { focusCount.textContent = count.textContent; });
  paintCounts(); focusCount.textContent = count.textContent;
  document.addEventListener('keydown', function esc(e) { if (!document.body.contains(ta)) return document.removeEventListener('keydown', esc); if (e.key === 'Escape' && document.body.classList.contains('focus') && !document.querySelector('.modal-back')) document.body.classList.remove('focus'); });
  wrap.append(main, panel); paintPanel();
  return wrap;
}

// ---------- panel: story bible ----------
function biblePanel(s) {
  const entries = bibleEntries();
  if (!entries.length) return empty('The story bible is empty', 'Add characters and places there and they show up here whenever a scene mentions them.', h('a', { class: 'btn', href: '#/bible' }, 'Open the story bible'));
  const found = mentions(`${s.draft || ''} ${s.pov || ''} ${s.setting || ''}`, nameMatcher(entries));
  const box = h('div', { class: 'stack' });
  const search = h('input', { class: 'in', type: 'search', placeholder: 'Find a character, place or thing', 'aria-label': 'Search the story bible' });
  const draw = () => {
    const qv = search.value.trim().toLowerCase();
    const list = entries.filter((e) => (qv ? `${e.name} ${e.aliases || ''}`.toLowerCase().includes(qv) : true)).sort((a, b) => (found.get(b.id) || 0) - (found.get(a.id) || 0) || a.name.localeCompare(b.name));
    box.replaceChildren(...list.slice(0, 40).map((e) => h('details', { class: 'fold', open: !qv && found.has(e.id) && found.size <= 3 }, h('summary', {}, h('span', { class: 'grow' }, e.name || 'Unnamed'), found.has(e.id) ? h('small', { class: 'num' }, `${found.get(e.id)}× here`) : h('small', {}, e.kindLabel)), entrySummary(e), h('a', { class: 'small', href: '#/bible/' + e.id }, 'Open full entry'))));
  };
  search.addEventListener('input', draw); draw();
  return h('div', { class: 'stack' }, search, h('p', { class: 'muted small' }, found.size ? 'Mentioned in this scene first.' : 'Nothing from the bible is named in this scene yet.'), box);
}

// ---------- panel: guides ----------
function guidePanel() {
  let pick = store.get('ws.guide', 'craft:' + CRAFT_GUIDES[0].id);
  const body = h('div', { class: 'stack' });
  const sel = h('select', { class: 'in', 'aria-label': 'Guide', onChange: (e) => { pick = e.target.value; store.set('ws.guide', pick); draw(); } },
    h('optgroup', { label: 'Craft' }, CRAFT_GUIDES.map((g) => h('option', { value: 'craft:' + g.id, selected: pick === 'craft:' + g.id }, g.title))),
    h('optgroup', { label: 'Author styles' }, AUTHORS.map((a) => h('option', { value: 'author:' + a.id, selected: pick === 'author:' + a.id }, a.name))));
  const draw = () => {
    const [kind, id] = pick.split(':');
    if (kind === 'craft') { const g = CRAFT_GUIDES.find((x) => x.id === id) || CRAFT_GUIDES[0]; body.replaceChildren(h('div', { class: 'prose' }, g.body.map((p) => h('p', {}, p))), g.test.length ? h('div', {}, h('h3', {}, 'Ask of this scene'), h('ul', {}, g.test.map((t) => h('li', {}, t)))) : ''); }
    else { const a = AUTHORS.find((x) => x.id === id) || AUTHORS[0]; body.replaceChildren(...[['Voice', a.voice], ['How the plots are built', a.plotcraft], ['How the themes are worked in', a.themecraft], ['Sentence rhythm', a.rhythm], ['Pacing', a.pacing], ['Dialogue', a.dialogue]].filter((x) => x[1]).map(([k, v]) => h('div', {}, h('h3', {}, k), h('p', { class: 'prose' }, v))), a.borrow?.length ? h('div', {}, h('h3', {}, 'Techniques to borrow'), h('ul', {}, a.borrow.map((x) => h('li', {}, x)))) : '', h('a', { class: 'small', href: '#/styles/' + a.id }, 'Open the full guide')); }
  };
  draw();
  return h('div', { class: 'stack' }, sel, body);
}

// ---------- panel: versions ----------
function versionsPanel(s, ta, after) {
  const box = h('div', { class: 'stack' });
  const save = async (label) => { create('snap', { scene: s.id, label: label || '', text: s.draft || '', words: s.words || 0 }); draw(); toast('Version saved.'); };
  const draw = () => {
    const snaps = all('snap').filter((x) => x.scene === s.id).sort((a, b) => b.created - a.created);
    box.replaceChildren(
      h('div', { class: 'row' }, btn('Save a version now', () => save(''), 'primary', 'history'), btn('Save with a name', async () => { const l = await askText('Name this version', 'For example “before cutting the flashback”'); if (l !== null) save(l); })),
      snaps.length ? h('div', { class: 'rows' }, snaps.map((v) => h('div', { class: 'rowitem static' },
        h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, v.label || when(v.created)), h('small', {}, `${v.label ? when(v.created) + ', ' : ''}${fmt(v.words)} words`)),
        btn('Compare', () => compare(v, s), 'sm'),
        btn('Restore', async () => { if (await confirmDlg('Restore this version?', 'The current text is saved as a version first, so nothing is lost.', 'Restore', 'primary')) { create('snap', { scene: s.id, label: 'Before restore', text: s.draft || '', words: s.words || 0 }); s.draft = v.text; s.words = wordCount(v.text); ta.value = v.text; put(s, true); after(); draw(); } }, 'sm'),
        iconBtn('trash', 'Delete version', async () => { if (await confirmDlg('Delete this version?', 'This cannot be undone.')) { remove(v); draw(); } }, 'ghost sm'))))
        : h('p', { class: 'muted' }, 'Save a version before a risky rewrite. You can compare it with the current text and restore it at any time.'));
  };
  draw();
  return box;
}
function compare(v, s) {
  const blocks = diffText(v.text, s.draft || '');
  const changed = blocks.filter((b) => b.type !== 'same').length;
  const tok = (list, mark) => list.map(([op, t]) => (op === '=' ? t : h(mark, {}, t)));
  const rows = blocks.map((b) => {
    if (b.type === 'same') return h('div', { class: 'diff-row same' }, h('p', {}, b.text), h('p', {}, b.text));
    if (b.type === 'del') return h('div', { class: 'diff-row' }, h('p', {}, h('del', {}, b.text)), h('p', { class: 'void' }));
    if (b.type === 'add') return h('div', { class: 'diff-row' }, h('p', { class: 'void' }), h('p', {}, h('ins', {}, b.text)));
    return h('div', { class: 'diff-row' }, h('p', {}, tok(b.a, 'del')), h('p', {}, tok(b.b, 'ins')));
  });
  let onlyChanges = false;
  const grid = h('div', { class: 'diff' }, h('div', { class: 'diff-row diff-head' }, h('p', {}, v.label || when(v.created)), h('p', {}, 'Current text')), rows);
  modal('Compare versions', h('div', { class: 'stack' }, h('div', { class: 'row sb' }, h('p', { class: 'muted' }, changed ? `${changed} paragraph${changed === 1 ? '' : 's'} differ.` : 'The texts are identical.'), changed ? btn('Show only changes', (e) => { onlyChanges = !onlyChanges; grid.classList.toggle('only', onlyChanges); e.currentTarget.textContent = onlyChanges ? 'Show everything' : 'Show only changes'; }, 'sm') : null), grid), [['Close', () => {}, 'primary']], null, { wide: true });
}

// ---------- panel: prose check ----------
const KINDS = [['echo', 'Repeated words'], ['adverb', 'Adverbs'], ['passive', 'Passive voice'], ['filter', 'Filter words'], ['weak', 'Weak modifiers'], ['long', 'Long sentences']];
function checkPanel(s) {
  const text = s.draft || '';
  if (wordCount(text) < 20) return h('p', { class: 'muted' }, 'Write a little more and this panel will check rhythm, repetition, adverbs and passive voice. It runs on this device; nothing is sent anywhere.');
  const a = analyse(text), st = a.stats;
  let on = new Set((store.get('ws.checks', 'echo,adverb,passive') || '').split(',').filter(Boolean));
  const view = h('div', { class: 'marked prose' });
  const drawText = () => view.replaceChildren(...segments(text, a.marks, on).map((g) => (g.kinds.length ? h('mark', { class: g.kinds.map((k) => 'k-' + k).join(' '), title: g.note }, g.text) : g.text)));
  const chips = h('div', { class: 'chips' }, KINDS.map(([k, label]) => { const n = a.marks.filter((m) => m.kind === k).length; return h('button', { type: 'button', class: `chipbtn k-${k} ${on.has(k) ? 'on' : ''}`, 'aria-pressed': on.has(k), onClick: (e) => { on.has(k) ? on.delete(k) : on.add(k); e.currentTarget.classList.toggle('on'); e.currentTarget.setAttribute('aria-pressed', on.has(k)); store.set('ws.checks', [...on].join(',')); drawText(); } }, label, h('span', { class: 'num' }, n)); }));
  drawText();
  const max = Math.max(...a.sentences.map((x) => x.n), 1), W = Math.max(a.sentences.length * 5, 200);
  const rhythm = svg('svg', { viewBox: `0 0 ${W} 60`, class: 'rhythm', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Length of each sentence in order' }, a.sentences.map((x, i) => svg('rect', { x: i * 5, y: 60 - (x.n / max) * 58, width: 3.6, height: (x.n / max) * 58, class: x.n >= 40 ? 'hot' : x.n <= 6 ? 'cool' : '' }, svg('title', {}, `${x.n} words`))));
  const fact = (label, value, note) => h('div', { class: 'fact' }, h('span', { class: 'fact-v num' }, value), h('span', { class: 'fact-l' }, label), note && h('small', {}, note));
  return h('div', { class: 'stack' },
    h('div', { class: 'facts' }, fact('words', fmt(st.words), `${Math.max(1, Math.round(st.readMinutes))} min read`), fact('words per sentence', st.meanSentence.toFixed(1), `longest ${st.longest}`), fact('dialogue', `${Math.round(st.dialoguePct)}%`), fact('adverbs per 1,000', st.adverbsPer1000.toFixed(1))),
    h('div', {}, h('h3', {}, 'Sentence rhythm'), h('div', { class: 'rhythm-wrap' }, rhythm), h('p', { class: 'muted small' }, st.sdSentence < 5 ? 'Sentence lengths are very even. Vary them to change the pace.' : 'Each bar is a sentence, in order. A flat run reads as monotone; spikes are long sentences.')),
    a.repeated.length ? h('div', {}, h('h3', {}, 'Most repeated words'), h('p', { class: 'chips' }, a.repeated.map(([w, n]) => h('span', { class: 'chip' }, `${w} ${n}`)))) : '',
    h('div', {}, h('h3', {}, 'Marked text'), chips, view));
}

// ---------- panel: AI feedback ----------
const SYSTEM = 'You are an experienced fiction and non-fiction editor giving notes on one scene from a manuscript in progress. Give specific, concrete notes that point at particular lines; quote only a few words to locate a line. Do not rewrite the prose and do not draft replacement paragraphs unless the writer explicitly asks: the writing must stay theirs. Lead with the most important issue. Give at most six notes, then one thing that is working. Use plain text: short paragraphs or a simple dashed list, no headings and no preamble.';
function rich(text) {
  const out = []; let ul = null;
  const inline = (t) => t.split(/(\*\*[^*]+\*\*)/g).map((p) => (p.startsWith('**') && p.endsWith('**') ? h('strong', {}, p.slice(2, -2)) : p));
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) { if (!ul) { ul = h('ul', {}); out.push(ul); } ul.append(h('li', {}, inline(m[1]))); } else { ul = null; if (line.trim()) out.push(h('p', {}, inline(line.replace(/^#+\s*/, '')))); }
  }
  return out;
}
function notesPanel(s) {
  const chars = all('char'), entries = bibleEntries();
  const LENSES = [
    ['goal', 'Does the scene do its job?', () => `Judge this scene against its plan.\nGoal: ${s.goal || '(not set)'}\nConflict: ${s.conflict || '(not set)'}\nOutcome: ${s.outcome || '(not set)'}\nDoes the draft deliver the goal, conflict and outcome? Where does it drift or stall?`],
    ['show', 'Showing and telling', () => 'Find places where this scene tells the reader an emotion or a judgement that should be dramatised, and places where it dramatises something that could simply be told. Point to the lines.'],
    ['voice', 'Character voice', () => { const c = chars.find((x) => x.id === pickChar.value); return `Check the voice and behaviour of ${c?.name || 'the viewpoint character'} against this character sheet, and flag lines that feel out of character.\nCharacter sheet:\n${c ? Object.entries(c.vals || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') : '(none)'}`; }],
    ['author', 'Pacing, through an author’s eyes', () => { const a = AUTHORS.find((x) => x.id === pickAuthor.value) || AUTHORS[0]; return `Using this description of how ${a.name} handles pacing and scenes, say how that approach would treat this scene's pacing and what the writer could borrow. Do not imitate or reproduce ${a.name}'s prose.\nPlotting: ${a.plotcraft || ''}\nPacing: ${a.pacing || ''}\nSentence rhythm: ${a.rhythm || a.voice || ''}\nStructure: ${a.structure || ''}`; }],
    ['bible', 'Continuity against the story bible', () => `Check this scene for contradictions with the story bible below (names, traits, places, facts). List only real conflicts or likely slips.\nStory bible:\n${entries.map((e) => `${e.name} (${e.kindLabel}): ${e.brief}`).join('\n').slice(0, 12000) || '(empty)'}`],
    ['own', 'Ask your own question', () => ask.value.trim()],
  ];
  let lens = store.get('ws.lens', 'goal');
  const pickChar = h('select', { class: 'in' }, chars.map((c) => h('option', { value: c.id, selected: c.name === s.pov }, c.name || 'Unnamed')));
  const pickAuthor = h('select', { class: 'in' }, AUTHORS.map((a) => h('option', { value: a.id, selected: a.id === store.get('ws.lensAuthor', '') }, a.name)));
  pickAuthor.addEventListener('change', () => store.set('ws.lensAuthor', pickAuthor.value));
  const ask = h('textarea', { class: 'in', rows: 3, placeholder: 'For example: is the reveal too early?' });
  const extra = h('div', {});
  const out = h('div', { class: 'ai-out' });
  const drawExtra = () => extra.replaceChildren(lens === 'voice' ? (chars.length ? pickChar : h('p', { class: 'muted small' }, 'Add characters to the story bible to use this.')) : lens === 'author' ? pickAuthor : lens === 'own' ? ask : '');
  const saved = all('ainote').filter((n) => n.scene === s.id).sort((a, b) => b.created - a.created)[0];
  const show = (n) => out.replaceChildren(h('p', { class: 'muted small' }, `${LENSES.find((l) => l[0] === n.lens)?.[1] || 'Notes'}, ${when(n.created)}`), h('div', { class: 'prose' }, rich(n.text)));
  if (saved) show(saved);
  const run = btn('Get notes', async () => {
    const draft = (s.draft || '').trim();
    if (wordCount(draft) < 30) return toast('Write at least a few paragraphs first.');
    const question = LENSES.find((l) => l[0] === lens)[2]();
    if (!question) return toast('Type your question first.');
    run.disabled = true; out.replaceChildren(h('p', { class: 'muted' }, 'Reading the scene. This usually takes under a minute.'));
    try {
      const r = await req('POST', 'api/ai', { system: SYSTEM, max_tokens: 1400, prompt: `${question}\n\nBook: ${S.project.title} (${S.project.kind === 'nonfiction' ? 'non-fiction' : 'fiction'})\nScene title: ${s.title || 'Untitled'}\nPoint of view: ${s.pov || 'not set'}\n\nScene text:\n${draft.slice(0, 60000)}` });
      all('ainote').filter((n) => n.scene === s.id).forEach(remove);
      show(create('ainote', { scene: s.id, lens, text: r.text }));
    } catch (e) {
      out.replaceChildren(h('p', { class: 'form-error' }, e.message), /key/i.test(e.message) ? h('a', { class: 'btn sm', href: '#/settings' }, 'Open Settings') : '');
    } finally { run.disabled = false; }
  }, 'primary', 'spark');
  const lensSel = h('select', { class: 'in', 'aria-label': 'What to check', onChange: (e) => { lens = e.target.value; store.set('ws.lens', lens); drawExtra(); } }, LENSES.map(([k, l]) => h('option', { value: k, selected: k === lens }, l)));
  drawExtra();
  return h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Sends this scene to Claude with your own API key and returns editor’s notes. It comments; it does not rewrite.'), lensSel, extra, run, out);
}
