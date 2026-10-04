import { h, $, S, openProject, loadProjects, flush } from './lib.js';

const NAV = [
  ['', '🏠', 'Home'], ['plots', '🧭', 'Plot library'], ['chars', '🎭', 'Characters'], ['story', '🗂', 'Storyboard'],
  ['track', '📈', 'Plot tracker'], ['styles', '✒️', 'Author styles'], ['nonfic', '📚', 'Non-fiction'], ['craft', '🛠', 'Craft toolkit'], ['write', '✍️', 'Write'], ['data', '💾', 'Backup & projects'],
];
const BOTTOM = [['', '🏠', 'Home'], ['story', '🗂', 'Board'], ['write', '✍️', 'Write'], ['track', '📈', 'Track'], ['menu', '☰', 'More']];
const loaders = {
  '': () => import('./views/home.js'), plots: () => import('./views/plots.js'), chars: () => import('./views/chars.js'),
  story: () => import('./views/story.js'), track: () => import('./views/track.js'), styles: () => import('./views/styles.js'),
  nonfic: () => import('./views/nonfic.js'), craft: () => import('./views/craft.js'), write: () => import('./views/write.js'), data: () => import('./views/data.js'),
};

const app = $('#app'), drawer = $('#drawer');
let seq = 0;
export const parts = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
export const go = (path) => { location.hash = '#/' + path; };
export function rerender() { return route(true); }

async function route(keepScroll) {
  const my = ++seq;
  const [section = '', ...rest] = parts();
  drawer.hidden = true;
  document.body.classList.remove('focus');
  const y = scrollY;
  try {
    if (!S.ready) {
      const list = await loadProjects();
      const want = localStorage.getItem('ws.project');
      const pick = list.find((p) => p.id === want) || list[0];
      if (pick) await openProject(pick.id); else S.ready = true; // no project yet
    }
    const mod = await (loaders[section] || loaders[''])();
    if (my !== seq) return;
    $('#projname').textContent = S.project ? S.project.title : '';
    const needsProject = !['', 'data', 'plots', 'styles', 'craft'].includes(section) && !S.project;
    const node = needsProject ? h('div', { class: 'card' }, h('p', {}, 'Create a project first.'), h('a', { href: '#/' }, 'Go to Home')) : await mod.render(rest);
    if (my !== seq) return;
    app.replaceChildren(node);
    markNav(section);
    if (keepScroll) scrollTo(0, y); else scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    app.replaceChildren(h('div', { class: 'card' }, h('h3', {}, 'Something went wrong'), h('pre', { style: { whiteSpace: 'pre-wrap' } }, String(e.stack || e))));
  }
}
function markNav(section) {
  document.querySelectorAll('#drawer a, #bottombar a').forEach((a) => a.classList.toggle('on', a.dataset.s === section));
}
function buildNav() {
  drawer.replaceChildren(...NAV.map(([s, i, l]) => h('a', { href: '#/' + s, 'data-s': s }, `${i}  ${l}`)));
  $('#bottombar').replaceChildren(...BOTTOM.map(([s, i, l]) => s === 'menu'
    ? h('a', { href: '#', onClick: (e) => { e.preventDefault(); drawer.hidden = !drawer.hidden; } }, h('span', {}, i), l)
    : h('a', { href: '#/' + s, 'data-s': s }, h('span', {}, i), l)));
}
$('#menubtn').addEventListener('click', () => { drawer.hidden = !drawer.hidden; });
document.addEventListener('click', (e) => { if (!drawer.hidden && !e.target.closest('#drawer,#menubtn,#bottombar')) drawer.hidden = true; });
addEventListener('hashchange', () => { flush(); route(); });
buildNav();
route();
