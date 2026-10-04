// Writing Studio server: zero dependencies. Node >= 22.13 (built-in node:sqlite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.NS_DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3080);
const HOST = process.env.HOST || '0.0.0.0';

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
`);

const q = {
  listAll: db.prepare('SELECT id,type,project,data,updated_at FROM records ORDER BY updated_at'),
  byType: db.prepare('SELECT id,type,project,data,updated_at FROM records WHERE type=? ORDER BY updated_at'),
  byTypeProject: db.prepare('SELECT id,type,project,data,updated_at FROM records WHERE type=? AND project=? ORDER BY updated_at'),
  byProjectOrGlobal: db.prepare("SELECT id,type,project,data,updated_at FROM records WHERE project=? OR project='' ORDER BY updated_at"),
  upsert: db.prepare(`INSERT INTO records(id,type,project,data,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET type=excluded.type, project=excluded.project, data=excluded.data, updated_at=excluded.updated_at`),
  del: db.prepare('DELETE FROM records WHERE id=?'),
  delProject: db.prepare('DELETE FROM records WHERE project=?'),
  clear: db.prepare('DELETE FROM records'),
};
const row = (r) => ({ id: r.id, type: r.type, project: r.project, updated_at: r.updated_at, ...JSON.parse(r.data) });
const TYPES = /^[a-z][a-z0-9_-]{0,30}$/;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain', 'Cache-Control': 'no-store', ...headers });
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

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  const [a, b] = parts;
  try {
    if (a === 'health') return send(res, 200, { ok: true });
    if (a === 'export' && req.method === 'GET') {
      const out = { app: 'writing-studio', version: 1, exported_at: Date.now(), records: q.listAll.all().map((r) => ({ id: r.id, type: r.type, project: r.project, updated_at: r.updated_at, data: JSON.parse(r.data) })) };
      return send(res, 200, JSON.stringify(out, null, 2), {
        'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="writing-studio-${new Date().toISOString().slice(0, 10)}.json"`,
      });
    }
    if (a === 'import' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      if (body.app !== 'writing-studio' || !Array.isArray(body.records)) return send(res, 400, { error: 'Not a Writing Studio export' });
      const replace = url.searchParams.get('mode') === 'replace';
      db.exec('BEGIN');
      try {
        if (replace) q.clear.run();
        for (const r of body.records) {
          if (!r.id || !TYPES.test(r.type || '')) continue;
          q.upsert.run(String(r.id), r.type, String(r.project || ''), JSON.stringify(r.data || {}), Number(r.updated_at) || Date.now());
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      return send(res, 200, { ok: true, count: body.records.length });
    }
    if (a === 'records') {
      if (req.method === 'GET') {
        const type = url.searchParams.get('type'); const project = url.searchParams.get('project');
        if (type && !TYPES.test(type)) return send(res, 400, { error: 'bad type' });
        if (!type && project === null) return send(res, 400, { error: 'type or project required' });
        // no type: everything for the project plus global ('') records
        const rows = !type ? q.byProjectOrGlobal.all(project) : project === null ? q.byType.all(type) : q.byTypeProject.all(type, project);
        return send(res, 200, rows.map(row));
      }
      if (req.method === 'PUT' && b) {
        const body = JSON.parse(await readBody(req));
        const { id: _i, type, project, updated_at: _u, ...data } = body;
        if (!TYPES.test(type || '')) return send(res, 400, { error: 'bad type' });
        const now = Date.now();
        q.upsert.run(b, type, String(project || ''), JSON.stringify(data), now);
        return send(res, 200, { ok: true, updated_at: now });
      }
      if (req.method === 'DELETE' && b) {
        if (url.searchParams.get('cascade') === 'project') q.delProject.run(b);
        q.del.run(b);
        return send(res, 200, { ok: true });
      }
    }
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  return serveStatic(req, res, url);
});
server.listen(PORT, HOST, () => console.log(`Writing Studio listening on http://${HOST}:${PORT} (data: ${DATA_DIR})`));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { server.close(); db.close(); process.exit(0); });
