// Shared helpers: DOM builder, store (API-backed cache with conflict checks and an offline outbox), UI atoms.
import { icon } from './icons.js';
import { wordCount } from './text.js';
import { defaultActs, orderScenes } from './manuscript.js';
export { icon, wordCount };

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val); }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k in el && k !== 'list' && k !== 'form' && k !== 'type') { try { el[k] = v; } catch { el.setAttribute(k, v === true ? '' : v); } }
    else if (k === 'type' && tag === 'textarea') continue; // textarea.type is read-only
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8); // randomUUID needs HTTPS; the Pi serves HTTP
export const fmt = (n) => Number(n || 0).toLocaleString();
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => dayKey();
export const when = (ts) => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export function debounce(fn, ms = 600) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => document.addEventListener(name, (e) => fn(e.detail));

// ---------- store ----------
const GLOBAL_TYPES = new Set(['project', 'practice', 'authnote']);
export const S = { project: null, recs: new Map(), pending: new Map(), ready: false, offline: false, syncAt: 0, logs: [] };
function setStatus(state, text) { const e = document.getElementById('savestatus'); if (e) { e.textContent = text; e.dataset.state = state; } }

export class AuthError extends Error {}
export async function req(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { const j = await r.json().catch(() => ({})); if (j.error === 'login required') { emit('ws:login'); throw new AuthError('login required'); } throw new Error(j.error || 'Not allowed'); }
  if (!r.ok) { const j = await r.json().catch(() => null); throw new Error(j?.error || r.statusText); }
  return r.json();
}

export async function loadProjects() {
  const list = await req('GET', '/api/records?type=project');
  return list.sort((a, b) => a.created - b.created);
}
export async function openProject(id) {
  const started = Date.now();
  const [rows, logs] = await Promise.all([req('GET', `/api/records?project=${encodeURIComponent(id)}`), req('GET', '/api/records?type=wordlog')]);
  S.recs.clear();
  for (const r of rows) S.recs.set(r.id, r);
  restoreOutbox();
  S.logs = logs;
  S.project = S.recs.get(id) || null;
  S.ready = true; S.syncAt = started - 5000;
  try { localStorage.setItem('ws.project', id); } catch { /* private mode */ }
  applyCloth();
}
export const CLOTHS = [['Viridian', '#17453f'], ['Oxblood', '#6b1f2a'], ['Indigo', '#27315f'], ['Moss', '#33492a'], ['Plum', '#4a2545'], ['Slate', '#33424c'], ['Rust', '#86401f'], ['Ink', '#1d2430']];
export function applyCloth() { document.documentElement.style.setProperty('--cloth', S.project?.cloth || CLOTHS[0][1]); }

export const all = (type) => [...S.recs.values()].filter((r) => r.type === type && (GLOBAL_TYPES.has(type) || r.project === S.project?.id));
export const get = (id) => S.recs.get(id);
export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

export function create(type, data = {}) {
  const rec = { id: uid(), type, project: GLOBAL_TYPES.has(type) ? '' : S.project.id, created: Date.now(), ...data };
  S.recs.set(rec.id, rec);
  put(rec, true);
  return rec;
}

const timers = new Map(), inflight = new Set(), dirty = new Set();
let retryTimer = null;
function saveOutbox() { try { S.pending.size ? localStorage.setItem('ws.outbox', JSON.stringify([...S.pending.values()])) : localStorage.removeItem('ws.outbox'); } catch { /* quota */ } }
function restoreOutbox() {
  try { for (const r of JSON.parse(localStorage.getItem('ws.outbox') || '[]')) { if (!r?.id) continue; S.recs.set(r.id, r); S.pending.set(r.id, r); } } catch { /* ignore */ }
  if (S.pending.size) retrySoon(500);
}
function retrySoon(ms = 8000) { clearTimeout(retryTimer); retryTimer = setTimeout(() => { for (const rec of [...S.pending.values()]) push(rec); }, ms); }
function settle() {
  saveOutbox();
  if (S.pending.size) return;
  if (S.offline) { S.offline = false; emit('ws:online'); }
  setStatus('ok', 'Saved');
}
async function push(rec, force = false) {
  if (inflight.has(rec.id)) { dirty.add(rec.id); return; }
  inflight.add(rec.id);
  setStatus('busy', 'Saving');
  try {
    const r = await fetch(`/api/records/${encodeURIComponent(rec.id)}?base=${rec.updated_at || 0}${force ? '&force=1' : ''}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
    if (r.status === 409) {
      const { current } = await r.json();
      inflight.delete(rec.id);
      return resolveConflict(rec, current);
    }
    if (r.status === 401) { emit('ws:login'); throw new Error('login'); }
    if (!r.ok) throw new Error(await r.text());
    rec.updated_at = (await r.json()).updated_at;
    if (!dirty.has(rec.id)) S.pending.delete(rec.id);
    settle();
  } catch (e) {
    S.offline = true;
    saveOutbox();
    setStatus('off', navigator.onLine === false || /fetch|network|load/i.test(String(e.message)) ? 'Offline, kept on this device' : 'Not saved yet');
    retrySoon();
  } finally {
    inflight.delete(rec.id);
    if (dirty.delete(rec.id)) push(rec);
  }
}
function resolveConflict(mine, theirs) {
  const textual = mine.type === 'scene' && (mine.draft || '') !== (theirs.draft || '');
  if (!textual) { mine.updated_at = theirs.updated_at; return push(mine, true); }
  const keepSnap = (src, label) => { const s = { id: uid(), type: 'snap', project: mine.project, created: Date.now(), scene: mine.id, label, text: src.draft || '', words: wordCount(src.draft) }; S.recs.set(s.id, s); push(s, true); };
  modal('This scene changed on another device', h('div', { class: 'stack' },
    h('p', {}, `“${mine.title || 'Untitled'}” was edited somewhere else since this device loaded it.`),
    h('p', { class: 'muted' }, `This device has ${fmt(wordCount(mine.draft))} words. The other version has ${fmt(wordCount(theirs.draft))} words, saved ${when(theirs.updated_at)}. Whichever you choose, the other is kept under Versions.`)),
  [['Use the other version', () => { keepSnap(mine, 'This device, before sync'); S.pending.delete(mine.id); Object.keys(mine).forEach((k) => delete mine[k]); Object.assign(mine, theirs); settle(); emit('ws:changed', [mine.id]); }],
    ['Keep this device’s version', () => { keepSnap(theirs, 'Other device'); mine.updated_at = theirs.updated_at; push(mine, true); }, 'primary']], null, { sticky: true });
}
export function put(rec, now = false) {
  if (!rec.id || !rec.type) return; // transient form objects are never persisted
  S.recs.set(rec.id, rec);
  S.pending.set(rec.id, rec);
  clearTimeout(timers.get(rec.id));
  if (now) return push(rec);
  timers.set(rec.id, setTimeout(() => push(rec), 700));
  setStatus('busy', 'Editing');
}
export function remove(rec) {
  S.recs.delete(rec.id); S.pending.delete(rec.id); clearTimeout(timers.get(rec.id)); saveOutbox();
  return req('DELETE', `/api/records/${encodeURIComponent(rec.id)}${rec.type === 'project' ? '?cascade=project' : ''}`).then(() => { if (rec.type === 'project') for (const r of [...S.recs.values()]) if (r.project === rec.id) S.recs.delete(r.id); });
}
export function flush() {
  for (const rec of S.pending.values()) { if (inflight.has(rec.id)) continue; clearTimeout(timers.get(rec.id)); push(rec); }
  saveOutbox();
}
// Pull what other devices changed since the last look.
export async function sync() {
  if (!S.project || document.hidden) return;
  try {
    const r = await req('GET', `/api/changes?project=${encodeURIComponent(S.project.id)}&since=${S.syncAt}`);
    const changed = [];
    for (const row of r.rows) {
      if (S.pending.has(row.id)) continue;
      const cur = S.recs.get(row.id);
      if (cur && cur.updated_at >= row.updated_at) continue;
      if (cur) { Object.keys(cur).forEach((k) => delete cur[k]); Object.assign(cur, row); } else S.recs.set(row.id, row);
      changed.push(row.id);
    }
    for (const id of r.deleted) if (S.recs.has(id) && !S.pending.has(id)) { S.recs.delete(id); changed.push(id); }
    S.syncAt = r.now - 2000;
    if (S.offline && !S.pending.size) { S.offline = false; setStatus('ok', 'Saved'); }
    if (changed.length) { S.project = S.recs.get(S.project.id) || S.project; emit('ws:changed', changed); }
  } catch { /* offline: the outbox handles it */ }
}
addEventListener('pagehide', flush);
addEventListener('online', () => { retrySoon(200); sync(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else sync(); });
setInterval(sync, 60000);

// ---------- project-level helpers ----------
export const acts = () => defaultActs(S.project);
export const orderedScenes = () => orderScenes(S.project, all('scene'));
export const totalWords = () => all('scene').reduce((n, s) => n + (s.words || 0), 0);
export function logWords(delta = 0) {
  const id = `wl-${S.project.id}-${today()}`;
  let rec = S.recs.get(id);
  if (!rec) { rec = { id, type: 'wordlog', project: S.project.id, date: today(), start: Math.max(0, totalWords() - delta) }; S.logs.push(rec); }
  rec.total = totalWords();
  put(rec);
}
// words written per day across every project: Map(dayKey -> words)
export function wordsByDay() {
  const m = new Map();
  const seen = new Set();
  for (const l of [...all('wordlog'), ...S.logs]) { if (seen.has(l.id)) continue; seen.add(l.id); m.set(l.date, (m.get(l.date) || 0) + Math.max(0, (l.total || 0) - (l.start || 0))); }
  return m;
}
export function streak(map = wordsByDay()) {
  let n = 0; const d = new Date();
  if (!(map.get(dayKey(d)) > 0)) d.setDate(d.getDate() - 1); // today not written yet does not break the run
  while (map.get(dayKey(d)) > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export const dailyTarget = () => S.project?.dailyTarget || 500;

// ---------- UI atoms ----------
export function field(label, input, hint) { return h('label', { class: 'field' }, h('span', { class: 'flabel' }, label), input, hint && h('small', { class: 'hint' }, hint)); }
export function textInput(rec, key, opts = {}) {
  const common = { class: 'in', value: rec[key] ?? '', placeholder: opts.placeholder || '', onInput: (e) => { rec[key] = opts.number ? Number(e.target.value) || 0 : e.target.value; put(rec); opts.onChange?.(rec); } };
  const el = opts.multi ? h('textarea', { ...common, rows: opts.rows || 3 }) : h('input', { ...common, type: opts.type || 'text', inputMode: opts.inputMode });
  if (opts.multi) autoGrow(el);
  return el;
}
export function autoGrow(ta, max = 600) { const g = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, max) + 'px'; }; ta.addEventListener('input', g); requestAnimationFrame(g); setTimeout(g, 60); }
export function select(rec, key, options, onChange) {
  return h('select', { class: 'in', onChange: (e) => { rec[key] = e.target.value; put(rec, true); onChange?.(rec); } },
    options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(rec[key] ?? '') === String(v) }, l); }));
}
export function btn(label, onClick, cls = '', ic) { return h('button', { class: `btn ${cls}`, type: 'button', onClick }, ic && icon(ic, 18), label); }
export function iconBtn(ic, title, onClick, cls = '') { return h('button', { class: `btn icon ${cls}`, type: 'button', title, 'aria-label': title, onClick }, icon(ic)); }

export function modal(title, body, actions = [], onClose, opts = {}) {
  const close = () => { back.remove(); document.removeEventListener('keydown', key); onClose?.(); };
  const key = (e) => { if (e.key === 'Escape' && !opts.sticky) close(); };
  const back = h('div', { class: 'modal-back', onClick: (e) => { if (e.target === back && !opts.sticky) close(); } },
    h('div', { class: `modal ${opts.wide ? 'wide' : ''}`, role: 'dialog', 'aria-label': title },
      h('div', { class: 'modal-h' }, h('h2', {}, title), !opts.sticky && iconBtn('x', 'Close', close, 'ghost')),
      h('div', { class: 'modal-b' }, body),
      actions.length ? h('div', { class: 'modal-f' }, actions.map(([l, f, c]) => btn(l, async () => { if ((await f()) !== false) close(); }, c))) : null));
  document.body.append(back);
  document.addEventListener('keydown', key);
  back.querySelector('input,textarea,select')?.focus({ preventScroll: true });
  return close;
}
export const confirmDlg = (title, text, okLabel = 'Delete', cls = 'danger') => new Promise((res) => { let done = false; modal(title, h('p', {}, text), [['Cancel', () => {}], [okLabel, () => { done = true; res(true); }, cls]], () => { if (!done) res(false); }); });
export const askText = (title, label, value = '', okLabel = 'Save') => new Promise((res) => {
  let done = false; const inp = h('input', { class: 'in', value, onKeydown: (e) => { if (e.key === 'Enter') { done = true; res(inp.value.trim()); close(); } } });
  const close = modal(title, field(label, inp), [['Cancel', () => {}], [okLabel, () => { done = true; res(inp.value.trim()); }, 'primary']], () => { if (!done) res(null); });
});
let toastTimer;
export function toast(text, action) {
  document.querySelector('.toast')?.remove(); clearTimeout(toastTimer);
  const t = h('div', { class: 'toast', role: 'status' }, text, action && btn(action[0], () => { t.remove(); action[1](); }, 'sm ghost'));
  document.body.append(t); toastTimer = setTimeout(() => t.remove(), action ? 7000 : 3200);
}
export function download(name, text, type = 'text/plain') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click(); a.remove();
}
export function tabs(items, active, onPick) {
  return h('div', { class: 'tabs', role: 'tablist' }, items.map(([id, label]) => h('button', { class: `tab ${id === active ? 'on' : ''}`, role: 'tab', 'aria-selected': id === active, onClick: () => onPick(id) }, label)));
}
export function progressBar(value, max, label) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return h('div', { class: 'meter' }, h('div', { class: 'meter-track', title: `${pct}%` }, h('div', { class: 'meter-fill', style: { width: pct + '%' } })), label && h('span', { class: 'meter-label' }, label));
}
export const pageHead = (title, sub, ...actions) => h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, title), sub && h('p', { class: 'lede' }, sub)), actions.length ? h('div', { class: 'row' }, actions) : null);
export const empty = (title, text, action) => h('div', { class: 'empty' }, h('h3', {}, title), h('p', {}, text), action);
export const svg = (tag, attrs = {}, ...kids) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
