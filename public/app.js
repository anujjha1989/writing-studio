import { h, $, S, icon, openProject, loadProjects, flush, on, req, btn, field, all, orderedScenes, applyCloth, toast, AuthError, restoreOutbox } from './lib.js';
import './viewport.js';

// [route, icon, label, group]
const NAV = [
  ['', 'desk', 'Desk', 0], ['story', 'board', 'Storyboard', 0], ['write', 'pen', 'Write', 0], ['ms', 'book', 'Manuscript', 0], ['bible', 'people', 'Story bible', 0], ['track', 'chart', 'Tracker', 0],
  ['plots', 'compass', 'Plot library', 1], ['styles', 'quill', 'Author styles', 1], ['craft', 'tools', 'Craft toolkit', 1], ['nonfic', 'library', 'Non-fiction', 1],
  ['settings', 'gear', 'Settings', 2],
];
const BOTTOM = [['', 'desk', 'Desk'], ['story', 'board', 'Board'], ['write', 'pen', 'Write'], ['ms', 'book', 'Read'], ['menu', 'menu', 'More']];
const ALIAS = { chars: 'bible', data: 'settings', manuscript: 'ms' };
const NO_PROJECT_OK = ['', 'settings', 'plots', 'styles', 'craft'];
const loaders = {
  '': () => import('./views/home.js'), plots: () => import('./views/plots.js'), bible: () => import('./views/bible.js'),
  story: () => import('./views/story.js'), track: () => import('./views/track.js'), styles: () => import('./views/styles.js'),
  nonfic: () => import('./views/nonfic.js'), craft: () => import('./views/craft.js'), write: () => import('./views/write.js'),
  ms: () => import('./views/manuscript.js'), settings: () => import('./views/settings.js'),
};

const app = $('#app'), spine = $('#spine');
let seq = 0, current = '';
export const parts = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
export const go = (path) => { location.hash = '#/' + path; };
export function rerender() { return route(true); }

// ---------- theme ----------
export const THEMES = [['auto', 'Match device'], ['light', 'Paper'], ['sepia', 'Sepia'], ['dark', 'Night']];
export function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('ws.theme', t); } catch { /* private mode */ } }
export const getTheme = () => document.documentElement.dataset.theme || 'auto';

async function route(keepScroll) {
  const my = ++seq;
  let [section = '', ...rest] = parts();
  section = ALIAS[section] || section;
  closeDrawer();
  if (!keepScroll || section !== 'write' || !rest[0]) document.body.classList.remove('focus', 'writing');
  const y = scrollY;
  try {
    if (!S.ready) {
      const list = await loadProjects();
      let want = null; try { want = localStorage.getItem('ws.project'); } catch { /* private mode */ }
      const pick = list.find((p) => p.id === want) || list[0];
      if (pick) await openProject(pick.id); else { const notes = await req('GET', 'api/records?type=authnote'); notes.forEach((r) => S.recs.set(r.id, r)); const practice = await req('GET', 'api/records?type=practice'); practice.forEach((r) => S.recs.set(r.id, r)); restoreOutbox(); S.ready = true; applyCloth(); }
    }
    const mod = await (loaders[section] || loaders[''])();
    if (my !== seq) return;
    const node = !NO_PROJECT_OK.includes(section) && !S.project
      ? h('div', { class: 'empty' }, h('h3', {}, 'Start a book first'), h('p', {}, 'This section belongs to a book. Create one on the Desk and it will open here.'), h('a', { class: 'btn primary', href: '#/' }, 'Go to the Desk'))
      : await mod.render(rest);
    if (my !== seq) return;
    app.dataset.section = section || 'desk';
    app.replaceChildren(node);
    current = section;
    paintChrome(section);
    if (keepScroll) scrollTo(0, y); else scrollTo(0, 0);
  } catch (e) {
    if (e instanceof AuthError) return;
    console.error(e);
    app.replaceChildren(h('div', { class: 'empty' }, h('h3', {}, 'This page could not open'), h('p', {}, navigator.onLine === false ? 'The Pi is not reachable. Check you are on your home Wi-Fi, then try again.' : String(e.message || e)), btn('Try again', () => route(), 'primary')));
  }
}

// ---------- chrome ----------
function paintChrome(section) {
  $('#brand').textContent = S.project ? S.project.title : 'Writing Studio';
  document.title = S.project ? `${S.project.title} · Writing Studio` : 'Writing Studio';
  document.querySelectorAll('#spine a[data-s], #bottombar a[data-s]').forEach((a) => { const hit = a.dataset.s === section; a.classList.toggle('on', hit); hit ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  $('#spine .spine-title').textContent = S.project ? S.project.title : 'Writing Studio';
  $('#spine .spine-sub').textContent = S.project ? (S.project.author || (S.project.kind === 'nonfiction' ? 'Non-fiction' : 'A novel in progress')) : 'No book open yet';
}
function buildChrome() {
  const groups = [0, 1, 2].map((g) => h('div', { class: 'spine-group' }, NAV.filter((n) => n[3] === g).map(([s, i, l]) => h('a', { href: '#/' + s, 'data-s': s }, icon(i), h('span', {}, l)))));
  spine.replaceChildren(
    h('a', { class: 'spine-head', href: '#/' }, h('span', { class: 'spine-title' }), h('span', { class: 'spine-sub' })),
    h('button', { class: 'spine-search', type: 'button', onClick: () => openPalette() }, icon('search', 18), h('span', {}, 'Search'), h('kbd', {}, /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K')),
    h('nav', { class: 'spine-nav' }, groups),
    h('div', { class: 'spine-foot' }, 'Writing Studio'));
  $('#bottombar').replaceChildren(...BOTTOM.map(([s, i, l]) => s === 'menu'
    ? h('a', { href: '#', onClick: (e) => { e.preventDefault(); document.body.classList.toggle('drawer'); } }, icon(i, 22), l)
    : h('a', { href: '#/' + s, 'data-s': s }, icon(i, 22), l)));
  $('#menubtn').append(icon('menu')); $('#searchbtn').append(icon('search'));
  $('#menubtn').addEventListener('click', () => document.body.classList.toggle('drawer'));
  $('#searchbtn').addEventListener('click', () => openPalette());
  document.addEventListener('click', (e) => { if (document.body.classList.contains('drawer') && !e.target.closest('#spine,#menubtn,#bottombar')) closeDrawer(); });
}
function closeDrawer() { document.body.classList.remove('drawer'); }

// ---------- search / command palette ----------
let paletteOpen = false;
async function openPalette() {
  if (paletteOpen) return; paletteOpen = true; closeDrawer();
  const [{ PLOTS }, { AUTHORS }, { CRAFT_GUIDES }] = await Promise.all([import('./content/plots.js'), import('./views/styles.js'), import('./content/craft.js')]);
  const base = [
    ...NAV.map(([s, i, l]) => ({ ic: i, label: l, kind: 'Go to', run: () => go(s) })),
    ...(S.project ? [
      { ic: 'plus', label: 'New scene', kind: 'Action', run: async () => { const m = await import('./views/story.js'); m.newScene(); } },
      { ic: 'download', label: 'Export manuscript', kind: 'Action', run: () => go('ms') },
      ...orderedScenes().map((s) => ({ ic: 'pen', label: `${s.chapter ? s.chapter + '. ' : ''}${s.title || 'Untitled'}`, kind: 'Scene', text: s.draft || '', run: () => go('write/' + s.id) })),
      ...all('char').map((c) => ({ ic: 'people', label: c.name || 'Unnamed', kind: 'Character', text: Object.values(c.vals || {}).join(' '), run: () => go('bible/' + c.id) })),
      ...all('entry').map((c) => ({ ic: c.kind === 'place' ? 'pin' : 'cube', label: c.name || 'Unnamed', kind: c.kind || 'Entry', text: `${c.desc || ''} ${c.notes || ''}`, run: () => go('bible/' + c.id) })),
    ] : []),
    ...PLOTS.map((p) => ({ ic: 'compass', label: p.name, kind: 'Plot structure', run: () => go('plots/' + p.id) })),
    ...AUTHORS.map((a) => ({ ic: 'quill', label: a.name, kind: 'Author style', run: () => go('styles/' + a.id) })),
    ...CRAFT_GUIDES.map((g) => ({ ic: 'tools', label: g.title, kind: 'Craft guide', run: () => go('craft/' + g.id) })),
    ...THEMES.map(([t, l]) => ({ ic: 'moon', label: `Theme: ${l}`, kind: 'Action', run: () => setTheme(t) })),
  ];
  let sel = 0, shown = [];
  const list = h('div', { class: 'pal-list', role: 'listbox' });
  const input = h('input', { class: 'pal-in', type: 'search', placeholder: 'Search scenes, characters, guides, or jump to a section', 'aria-label': 'Search', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
  const close = () => { back.remove(); paletteOpen = false; };
  const pick = (it) => { close(); it.run(); };
  const draw = () => {
    const qv = input.value.trim().toLowerCase();
    shown = !qv ? base.filter((b) => b.kind === 'Go to' || b.kind === 'Action').slice(0, 14) : base.map((b) => {
      const li = b.label.toLowerCase().indexOf(qv);
      if (li >= 0) return { ...b, score: li === 0 ? 0 : 1 };
      if (qv.length >= 3 && b.text) { const ti = b.text.toLowerCase().indexOf(qv); if (ti >= 0) return { ...b, score: 2, snip: (ti > 30 ? '…' : '') + b.text.slice(Math.max(0, ti - 30), ti + 60).replace(/\s+/g, ' ') + '…' }; }
      return null;
    }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 40);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.replaceChildren(...(shown.length ? shown.map((it, i) => h('button', { class: `pal-item ${i === sel ? 'sel' : ''}`, type: 'button', role: 'option', onClick: () => pick(it) }, icon(it.ic, 18), h('span', { class: 'grow' }, h('span', {}, it.label), it.snip && h('small', {}, it.snip)), h('small', { class: 'pal-kind' }, it.kind)))
      : [h('p', { class: 'muted pad' }, 'Nothing matches. Try a character name or a phrase from a scene.')]));
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && shown[sel]) pick(shown[sel]);
    else if (e.key === 'Escape') close();
  });
  const back = h('div', { class: 'pal-back', onClick: (e) => { if (e.target === back) close(); } }, h('div', { class: 'pal', role: 'dialog', 'aria-label': 'Search' }, h('div', { class: 'pal-top' }, icon('search'), input, btn('Close', close, 'sm ghost')), list));
  document.body.append(back); draw(); input.focus();
}
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) { e.preventDefault(); openPalette(); }
});

// ---------- login ----------
let loginShown = false;
on('ws:login', () => {
  if (loginShown) return; loginShown = true;
  const err = h('p', { class: 'form-error', role: 'alert' });
  const inp = h('input', { class: 'in', type: 'password', autocomplete: 'current-password', placeholder: 'Passphrase' });
  const submit = async (e) => {
    e.preventDefault(); err.textContent = '';
    const r = await fetch('api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: inp.value }) }).catch(() => null);
    if (r?.ok) { location.reload(); return; }
    err.textContent = r ? (await r.json().catch(() => ({}))).error || 'That did not work.' : 'The Pi is not reachable.';
    inp.select();
  };
  document.body.append(h('div', { class: 'login' }, h('form', { class: 'login-card', onSubmit: submit }, h('div', { class: 'cover mini' }, h('span', { class: 'cover-title' }, 'Writing Studio')), h('h1', {}, 'Unlock your desk'), field('Passphrase', inp), err, h('button', { class: 'btn primary', type: 'submit' }, 'Unlock'))));
  inp.focus();
});

on('ws:changed', (ids) => {
  const typing = /TEXTAREA|INPUT/.test(document.activeElement?.tagName || '');
  if (typing || document.querySelector('.modal-back')) { if (current === 'write') toast('This book was updated from another device.', ['Refresh', () => rerender()]); return; }
  rerender();
});

// A local change finished late (for example a delete that had to wait for a save): redraw quietly.
on('ws:local', () => { if (!/TEXTAREA|INPUT/.test(document.activeElement?.tagName || '') && !document.querySelector('.modal-back')) rerender(); });

addEventListener('hashchange', () => { flush(); route(); });
buildChrome();
route();
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
