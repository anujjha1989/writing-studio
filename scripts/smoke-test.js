// Boots the server on a temp dir and exercises the API: CRUD, conflicts, sync, exports, backup, passphrase.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
const port = 3300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], { env: { ...process.env, NS_DATA_DIR: dir, WS_BACKUP_DIR: path.join(dir, 'bk'), PORT: String(port), HOST: '127.0.0.1' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
let cookie = '';
const f = (u, o = {}) => fetch(base + u, { ...o, headers: { ...(o.headers || {}), ...(cookie ? { cookie } : {}) } });
const j = (u, o) => f(u, o).then((r) => r.json());
const put = (id, body, qs = '') => f(`/api/records/${id}${qs}`, { method: 'PUT', body: JSON.stringify(body) });
try {
  for (let i = 0; i < 30; i++) { try { await j('/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  await put('p1', { type: 'project', project: '', title: 'Test Book', author: 'A. Writer' });
  const first = await (await put('s1', { type: 'scene', project: 'p1', title: 'Scene', chapter: '1', order: 0, draft: 'héllo *world*\n\nSecond paragraph.', words: 4 })).json();
  assert.equal((await j('/api/records?type=scene&project=p1')).length, 1);
  assert.equal((await j('/api/records?project=p1')).length, 2); // project + scene

  // conflict: a stale base with different content is refused; force wins
  const stale = await put('s1', { type: 'scene', project: 'p1', title: 'Scene', draft: 'other device' }, '?base=1');
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.draft, 'héllo *world*\n\nSecond paragraph.');
  assert.equal((await put('s1', { type: 'scene', project: 'p1', title: 'Scene', chapter: '1', draft: 'héllo *world*\n\nSecond paragraph.', words: 4 }, `?base=${first.updated_at}`)).status, 200);
  assert.equal((await put('s1', { type: 'scene', project: 'p1', title: 'Scene', chapter: '1', draft: 'héllo *world*\n\nSecond paragraph.', words: 4 }, '?base=1&force=1')).status, 200);

  // sync: changes and deletions since a point in time
  const t0 = Date.now() - 1;
  await put('s2', { type: 'scene', project: 'p1', title: 'Two', draft: '' });
  await f('/api/records/s2', { method: 'DELETE' });
  const ch = await j(`/api/changes?project=p1&since=${t0}`);
  assert.ok(ch.deleted.includes('s2'));

  // manuscript exports are valid zip containers
  for (const fmt of ['docx', 'epub']) {
    const buf = Buffer.from(await (await f(`/api/manuscript/p1/${fmt}`)).arrayBuffer());
    assert.equal(buf.readUInt32LE(0), 0x04034b50, `${fmt} is a zip`);
    const file = path.join(dir, `out.${fmt}`); fs.writeFileSync(file, buf);
    try { execFileSync('unzip', ['-tq', file], { stdio: 'pipe' }); } catch (e) { if (e.code !== 'ENOENT') throw new Error(`${fmt} failed zip test: ${e.stdout}`); }
  }
  assert.match(await (await f('/api/manuscript/p1/md')).text(), /## Chapter 1/);
  assert.match(await (await f('/api/manuscript/p1/txt')).text(), /héllo world/);

  // backup + export/import round-trip
  assert.match((await j('/api/backup', { method: 'POST' })).file, /\.json\.gz$/);
  const exp = await (await f('/api/export')).text();
  await f('/api/records/s1', { method: 'DELETE' });
  assert.equal((await j('/api/records?type=scene&project=p1')).length, 0);
  await j('/api/import?mode=replace', { method: 'POST', body: exp });
  assert.equal((await j('/api/records?type=scene&project=p1'))[0].title, 'Scene');
  assert.equal((await f('/api/import', { method: 'POST', body: '{"app":"other"}' })).status, 400);

  // AI without a key explains itself; settings never return the key
  assert.equal((await f('/api/ai', { method: 'POST', body: JSON.stringify({ prompt: 'hi' }) })).status, 400);
  const st = await j('/api/settings', { method: 'PUT', body: JSON.stringify({ apiKey: 'test-value' }) });
  assert.equal(st.hasKey, true); assert.ok(!JSON.stringify(st).includes('test-value'));

  // passphrase locks the API until login
  const set = await f('/api/auth/set', { method: 'POST', body: JSON.stringify({ next: 'open sesame' }) });
  assert.equal(set.status, 200);
  assert.equal((await fetch(base + '/api/records?type=project')).status, 401);
  assert.equal((await fetch(base + '/api/auth/login', { method: 'POST', body: JSON.stringify({ passphrase: 'wrong' }) })).status, 401);
  const login = await fetch(base + '/api/auth/login', { method: 'POST', body: JSON.stringify({ passphrase: 'open sesame' }) });
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await f('/api/records?type=project')).status, 200);
  assert.equal((await fetch(base + '/')).status, 200);
  console.log('smoke test passed');
} finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
