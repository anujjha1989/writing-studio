// Writing Studio server: zero dependencies. Node >= 22.13 (built-in node:sqlite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { buildManuscript, toMarkdown, toPlainText } from '../public/manuscript.js';
import { toDocx, toEpub } from './exporters.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.NS_DATA_DIR || path.join(ROOT, 'data');
const BACKUP_DIR = process.env.WS_BACKUP_DIR || path.join(DATA_DIR, 'backups');
const KEEP_BACKUPS = Number(process.env.WS_KEEP_BACKUPS || 30);
const PORT = Number(process.env.PORT || 3080);
const HOST = process.env.HOST || '0.0.0.0';
const VERSION = (() => { try { return fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim(); } catch { return 'dev'; } })();
const MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-4-5-20251001'];

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'writing-studio.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    project TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_records_type_project ON records(type, project);
  CREATE TABLE IF NOT EXISTS tombs (id TEXT PRIMARY KEY, project TEXT NOT NULL DEFAULT '', deleted_at INTEGER NOT NULL);
`);

const COLS = 'id,type,project,data,updated_at';
const q = {
  listAll: db.prepare(`SELECT ${COLS} FROM records ORDER BY updated_at`),
  byType: db.prepare(`SELECT ${COLS} FROM records WHERE type=? ORDER BY updated_at`),
  byTypeProject: db.prepare(`SELECT ${COLS} FROM records WHERE type=? AND project=? ORDER BY updated_at`),
  byProjectOrGlobal: db.prepare(`SELECT ${COLS} FROM records WHERE project=? OR project='' ORDER BY updated_at`),
  changed: db.prepare(`SELECT ${COLS} FROM records WHERE (project=? OR project='') AND updated_at>? ORDER BY updated_at`),
  tombsSince: db.prepare('SELECT id FROM tombs WHERE deleted_at>?'),
  one: db.prepare(`SELECT ${COLS} FROM records WHERE id=?`),
  upsert: db.prepare(`INSERT INTO records(id,type,project,data,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET type=excluded.type, project=excluded.project, data=excluded.data, updated_at=excluded.updated_at`),
  del: db.prepare('DELETE FROM records WHERE id=?'),
  idsOfProject: db.prepare('SELECT id FROM records WHERE project=?'),
  delProject: db.prepare('DELETE FROM records WHERE project=?'),
  tomb: db.prepare('INSERT OR REPLACE INTO tombs(id,project,deleted_at) VALUES(?,?,?)'),
  untomb: db.prepare('DELETE FROM tombs WHERE id=?'),
  clear: db.prepare('DELETE FROM records'),
};
const row = (r) => ({ ...JSON.parse(r.data), id: r.id, type: r.type, project: r.project, updated_at: r.updated_at });
const TYPES = /^[a-z][a-z0-9_-]{0,30}$/;

// ---------- secrets (API key, passphrase hash, sessions): never sent to the browser ----------
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
let secrets = { apiKey: '', model: MODELS[0], auth: null, sessions: {} };
try { secrets = { ...secrets, ...JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) }; } catch { /* first run */ }
const saveSecrets = () => { fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets), { mode: 0o600 }); };
const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
const SESSION_DAYS = 90;
const fails = [];

function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0])); }
function authed(req) {
  if (!secrets.auth) return true;
  const exp = secrets.sessions[cookies(req).ws_s];
  return !!exp && exp > Date.now();
}
function sessionCookie(req, token, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `ws_s=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function newSession(req) {
  const token = crypto.randomBytes(24).toString('hex');
  for (const [t, exp] of Object.entries(secrets.sessions)) if (exp < Date.now()) delete secrets.sessions[t];
  secrets.sessions[token] = Date.now() + SESSION_DAYS * 864e5;
  saveSecrets();
  return sessionCookie(req, token, SESSION_DAYS * 86400);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, limit = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const exportAll = () => ({ app: 'writing-studio', version: 2, exported_at: Date.now(), records: q.listAll.all().map((r) => ({ id: r.id, type: r.type, project: r.project, updated_at: r.updated_at, data: JSON.parse(r.data) })) });

// ---------- backups ----------
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function listBackups() { try { return fs.readdirSync(BACKUP_DIR).filter((f) => /^writing-studio-.*\.json\.gz$/.test(f)).sort(); } catch { return []; } }
function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `writing-studio-${day()}.json.gz`);
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(exportAll())));
  const all = listBackups();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP_BACKUPS))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  return file;
}
function backupTick() {
  try {
    const hasData = q.listAll.all().length > 0;
    if (hasData && new Date().getHours() >= 3 && !listBackups().some((f) => f.includes(day()))) runBackup();
  } catch (e) { console.error('backup failed:', e.message); }
}
setInterval(backupTick, 30 * 60 * 1000).unref();
setTimeout(backupTick, 60 * 1000).unref();

// ---------- API ----------
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent); // after "api"
  const [a, b, c] = parts;
  const M = req.method;
  try {
    if (a === 'health') return send(res, 200, { ok: true, version: VERSION });

    if (a === 'auth') {
      if (b === 'status') return send(res, 200, { required: !!secrets.auth, authed: authed(req) });
      if (b === 'login' && M === 'POST') {
        const now = Date.now();
        while (fails.length && fails[0] < now - 10 * 60e3) fails.shift();
        if (fails.length >= 8) return send(res, 429, { error: 'Too many attempts. Wait ten minutes.' });
        const { passphrase = '' } = JSON.parse(await readBody(req, 1e4) || '{}');
        if (!secrets.auth) return send(res, 200, { ok: true });
        const ok = crypto.timingSafeEqual(Buffer.from(hashPass(String(passphrase), secrets.auth.salt)), Buffer.from(secrets.auth.hash));
        if (!ok) { fails.push(now); return send(res, 401, { error: 'That passphrase is not right.' }); }
        return send(res, 200, { ok: true }, { 'Set-Cookie': newSession(req) });
      }
      if (!authed(req)) return send(res, 401, { error: 'login required' });
      if (b === 'logout' && M === 'POST') { delete secrets.sessions[cookies(req).ws_s]; saveSecrets(); return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) }); }
      if (b === 'set' && M === 'POST') {
        const { current = '', next = '' } = JSON.parse(await readBody(req, 1e4) || '{}');
        if (secrets.auth && hashPass(String(current), secrets.auth.salt) !== secrets.auth.hash) return send(res, 403, { error: 'Current passphrase is not right.' });
        if (!next) { secrets.auth = null; secrets.sessions = {}; saveSecrets(); return send(res, 200, { ok: true, required: false }); }
        if (String(next).length < 6) return send(res, 400, { error: 'Use at least 6 characters.' });
        const salt = crypto.randomBytes(16).toString('hex');
        secrets.auth = { salt, hash: hashPass(String(next), salt) }; secrets.sessions = {};
        return send(res, 200, { ok: true, required: true }, { 'Set-Cookie': newSession(req) });
      }
      return send(res, 404, { error: 'not found' });
    }

    if (!authed(req)) return send(res, 401, { error: 'login required' });

    if (a === 'export' && M === 'GET') {
      return send(res, 200, JSON.stringify(exportAll(), null, 2), { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="writing-studio-${day()}.json"` });
    }
    if (a === 'import' && M === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (body.app !== 'writing-studio' || !Array.isArray(body.records)) return send(res, 400, { error: 'Not a Writing Studio export' });
      const replace = url.searchParams.get('mode') === 'replace';
      if (replace) { try { runBackup(); } catch { /* best effort */ } }
      db.exec('BEGIN');
      try {
        if (replace) q.clear.run();
        const now = Date.now();
        for (const r of body.records) {
          if (!r.id || !TYPES.test(r.type || '')) continue;
          q.upsert.run(String(r.id), r.type, String(r.project || ''), JSON.stringify(r.data || {}), now);
          q.untomb.run(String(r.id));
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      return send(res, 200, { ok: true, count: body.records.length });
    }

    if (a === 'changes' && M === 'GET') {
      const since = Number(url.searchParams.get('since')) || 0;
      return send(res, 200, { now: Date.now(), rows: q.changed.all(url.searchParams.get('project') || '', since).map(row), deleted: q.tombsSince.all(since).map((t) => t.id) });
    }

    if (a === 'records') {
      if (M === 'GET') {
        const type = url.searchParams.get('type'); const project = url.searchParams.get('project');
        if (type && !TYPES.test(type)) return send(res, 400, { error: 'bad type' });
        if (!type && project === null) return send(res, 400, { error: 'type or project required' });
        const rows = !type ? q.byProjectOrGlobal.all(project) : project === null ? q.byType.all(type) : q.byTypeProject.all(type, project);
        return send(res, 200, rows.map(row));
      }
      if (M === 'PUT' && b) {
        const body = JSON.parse(await readBody(req));
        const { id: _i, type, project, updated_at: _u, ...data } = body;
        if (!TYPES.test(type || '')) return send(res, 400, { error: 'bad type' });
        const json = JSON.stringify(data);
        const cur = q.one.get(b);
        const base = Number(url.searchParams.get('base')) || 0;
        if (cur && url.searchParams.has('base') && !url.searchParams.has('force') && cur.updated_at > base && cur.data !== json) {
          return send(res, 409, { conflict: true, current: row(cur) });
        }
        const now = Math.max(Date.now(), (cur?.updated_at || 0) + 1);
        q.upsert.run(b, type, String(project || ''), json, now);
        q.untomb.run(b);
        return send(res, 200, { ok: true, updated_at: now });
      }
      if (M === 'DELETE' && b) {
        const now = Date.now();
        if (url.searchParams.get('cascade') === 'project') { for (const r of q.idsOfProject.all(b)) q.tomb.run(r.id, b, now); q.delProject.run(b); }
        const cur = q.one.get(b);
        q.del.run(b); q.tomb.run(b, cur?.project || '', now);
        return send(res, 200, { ok: true });
      }
    }

    if (a === 'manuscript' && M === 'GET' && b && c) {
      const project = q.one.get(b);
      if (!project) return send(res, 404, { error: 'No such project' });
      const ms = buildManuscript(row(project), q.byTypeProject.all('scene', b).map(row));
      const safe = (ms.title || 'manuscript').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'manuscript';
      const out = { docx: [() => toDocx(ms), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], epub: [() => toEpub(ms, b), 'application/epub+zip'], md: [() => toMarkdown(ms), 'text/markdown; charset=utf-8'], txt: [() => toPlainText(ms), 'text/plain; charset=utf-8'] }[c];
      if (!out) return send(res, 400, { error: 'Unknown format' });
      return send(res, 200, Buffer.from(out[0]()), { 'Content-Type': out[1], 'Content-Disposition': `attachment; filename="${safe}.${c}"` });
    }

    if (a === 'settings') {
      if (M === 'PUT') {
        const body = JSON.parse(await readBody(req, 1e5));
        if (typeof body.apiKey === 'string') secrets.apiKey = body.apiKey.trim();
        if (typeof body.model === 'string' && /^claude-[\w.-]{3,60}$/.test(body.model)) secrets.model = body.model;
        saveSecrets();
      }
      const backups = listBackups();
      return send(res, 200, { hasKey: !!secrets.apiKey, model: secrets.model, models: MODELS, passphrase: !!secrets.auth, version: VERSION, backupDir: BACKUP_DIR, backups: backups.length, lastBackup: backups.at(-1) || '' });
    }
    if (a === 'backup' && M === 'POST') return send(res, 200, { ok: true, file: path.basename(runBackup()) });

    if (a === 'ai' && M === 'POST') {
      if (!secrets.apiKey) return send(res, 400, { error: 'Add your Anthropic API key in Settings first.' });
      const { system = '', prompt = '', max_tokens = 1500 } = JSON.parse(await readBody(req, 4 * 1024 * 1024));
      if (!prompt) return send(res, 400, { error: 'Nothing to send.' });
      let r;
      try {
        r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: AbortSignal.timeout(120000),
          headers: { 'content-type': 'application/json', 'x-api-key': secrets.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: secrets.model, max_tokens: Math.min(4000, Number(max_tokens) || 1500), system, messages: [{ role: 'user', content: prompt }] }),
        });
      } catch (e) { return send(res, 502, { error: `Could not reach Anthropic from the Pi (${e.name === 'TimeoutError' ? 'timed out' : e.message}).` }); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return send(res, 502, { error: j?.error?.message || `Anthropic returned ${r.status}` });
      return send(res, 200, { text: (j.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n'), model: j.model });
    }
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}

function serveStatic(req, res, url) {
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'bad path'); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    const tag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'no-cache', ETag: tag, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    if (req.headers['if-none-match'] === tag) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  return serveStatic(req, res, url);
});
server.listen(PORT, HOST, () => console.log(`Writing Studio ${VERSION} listening on http://${HOST}:${PORT} (data: ${DATA_DIR}, backups: ${BACKUP_DIR})`));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { server.close(); db.close(); process.exit(0); });
