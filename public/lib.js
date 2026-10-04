// Shared helpers: DOM builder, store (API-backed, in-memory cache), utilities.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
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
export const wordCount = (t) => (t.trim().match(/\S+/g) || []).length;
export const fmt = (n) => Number(n || 0).toLocaleString();
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function debounce(fn, ms = 600) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.flush = () => { clearTimeout(t); }; return f; }

// ---------- store ----------
const GLOBAL_TYPES = new Set(['project', 'practice', 'authnote']);
export const S = { project: null, recs: new Map(), pending: new Map(), ready: false };
const statusEl = () => document.getElementById('savestatus');
function setStatus(t) { const e = statusEl(); if (e) e.textContent = t; }

async function req(method, url, body, opts = {}) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, ...opts });
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

export async function loadProjects() {
  const list = await req('GET', '/api/records?type=project');
  return list.sort((a, b) => a.created - b.created);
}
export async function openProject(id) {
  S.recs.clear();
  S.project = null;
  const rows = await req('GET', `/api/records?project=${encodeURIComponent(id)}`);
  const globals = await req('GET', '/api/records?type=project');
  for (const r of [...rows, ...globals]) S.recs.set(r.id, r);
  S.project = S.recs.get(id) || null;
  const [prac, notes] = await Promise.all([req('GET', '/api/records?type=practice'), req('GET', '/api/records?type=authnote')]);
  for (const r of [...prac, ...notes]) S.recs.set(r.id, r);
  S.ready = true;
  localStorage.setItem('ws.project', id);
}
export const all = (type) => [...S.recs.values()].filter((r) => r.type === type && (GLOBAL_TYPES.has(type) || r.project === S.project?.id));
export const get = (id) => S.recs.get(id);
export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

export function create(type, data = {}) {
  const rec = { id: uid(), type, project: GLOBAL_TYPES.has(type) ? '' : S.project.id, created: Date.now(), ...data };
  S.recs.set(rec.id, rec);
  put(rec, true);
  return rec;
}
function send(rec) {
  setStatus('Saving…');
  return req('PUT', `/api/records/${rec.id}`, rec).then(() => setStatus('Saved'), () => setStatus('⚠ Not saved'));
}
const timers = new Map();
export function put(rec, now = false) {
  if (!rec.id || !rec.type) return; // transient form objects (e.g. new-project dialog) are never persisted
  S.recs.set(rec.id, rec);
  S.pending.set(rec.id, rec);
  clearTimeout(timers.get(rec.id));
  const run = () => { S.pending.delete(rec.id); return send(rec); };
  if (now) return run();
  timers.set(rec.id, setTimeout(run, 500));
  setStatus('…');
}
export function patch(rec, fields, now = false) { Object.assign(rec, fields); return put(rec, now); }
export function remove(rec) {
  S.recs.delete(rec.id); S.pending.delete(rec.id); clearTimeout(timers.get(rec.id));
  return req('DELETE', `/api/records/${rec.id}${rec.type === 'project' ? '?cascade=project' : ''}`).then(() => { if (rec.type === 'project') for (const r of [...S.recs.values()]) if (r.project === rec.id) S.recs.delete(r.id); });
}
export function flush() {
  for (const rec of S.pending.values()) { clearTimeout(timers.get(rec.id)); fetch(`/api/records/${rec.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec), keepalive: true }); }
  S.pending.clear();
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

// ---------- project-level helpers ----------
export const acts = () => S.project?.acts?.length ? S.project.acts : S.project?.kind === 'nonfiction' ? ['Part I', 'Part II', 'Part III'] : ['Act I', 'Act II', 'Act III'];
export function orderedScenes() {
  const a = acts();
  return all('scene').sort((x, y) => (Math.min(x.act ?? 0, a.length - 1) - Math.min(y.act ?? 0, a.length - 1)) || byOrder(x, y));
}
export const totalWords = () => all('scene').reduce((n, s) => n + (s.words || 0), 0);
export function logWords(delta = 0) {
  const id = `wl-${S.project.id}-${today()}`;
  const rec = S.recs.get(id) || { id, type: 'wordlog', project: S.project.id, date: today(), start: Math.max(0, totalWords() - delta) };
  rec.total = totalWords();
  put(rec);
}

// ---------- UI atoms ----------
export function field(label, input, hint) { return h('label', { class: 'field' }, h('span', { class: 'flabel' }, label), input, hint && h('small', {}, hint)); }
export function textInput(rec, key, opts = {}) {
  const tag = opts.multi ? 'textarea' : 'input';
  const el = h(tag, { class: 'in', value: rec[key] ?? '', placeholder: opts.placeholder || '', rows: opts.rows || 3, type: opts.type || 'text', inputMode: opts.inputMode, onInput: (e) => { rec[key] = opts.number ? Number(e.target.value) || 0 : e.target.value; put(rec); opts.onChange?.(rec); } });
  if (opts.multi) autoGrow(el);
  return el;
}
export function autoGrow(ta) { const g = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 600) + 'px'; }; ta.addEventListener('input', g); requestAnimationFrame(g); setTimeout(g, 50); }
export function select(rec, key, options, onChange) {
  return h('select', { class: 'in', onChange: (e) => { rec[key] = e.target.value; put(rec, true); onChange?.(rec); } },
    options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(rec[key] ?? '') === String(v) }, l); }));
}
export function btn(label, onClick, cls = '') { return h('button', { class: `btn ${cls}`, type: 'button', onClick }, label); }
export function confirmBox(msg) { return window.confirm(msg); }
export function modal(title, body, actions = [], onClose) {
  const close = () => { back.remove(); onClose?.(); };
  const back = h('div', { class: 'modal-back', onClick: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'modal' }, h('div', { class: 'modal-h' }, h('b', {}, title), h('button', { class: 'btn ghost', onClick: close }, '✕')), h('div', { class: 'modal-b' }, body), h('div', { class: 'modal-f' }, actions.map(([l, f, c]) => btn(l, () => { if (f() !== false) close(); }, c)))));
  document.body.append(back);
  return close;
}
export function download(name, text, type = 'text/plain') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click(); a.remove();
}
export const rel = (...parts) => h('div', { class: 'stack' }, parts);
export function tabs(items, active, onPick) {
  return h('div', { class: 'tabs' }, items.map(([id, label]) => h('button', { class: `tab ${id === active ? 'on' : ''}`, onClick: () => onPick(id) }, label)));
}
export function progressBar(value, max, label) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return h('div', { class: 'progress', title: `${pct}%` }, h('div', { class: 'bar', style: { width: pct + '%' } }), label && h('span', {}, label));
}
export const md = (t) => t; // content is plain text; rendered with textContent
