// Boots the server on a temp dir and exercises the API: CRUD, export/import round-trip.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
const port = 3300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], { env: { ...process.env, NS_DATA_DIR: dir, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
const j = (u, o) => fetch(base + u, o).then((r) => r.json());
try {
  for (let i = 0; i < 30; i++) { try { await j('/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  await j('/api/records/p1', { method: 'PUT', body: JSON.stringify({ type: 'project', project: '', title: 'T' }) });
  await j('/api/records/s1', { method: 'PUT', body: JSON.stringify({ type: 'scene', project: 'p1', title: 'Scene', draft: 'héllo' }) });
  assert.equal((await j('/api/records?type=scene&project=p1')).length, 1);
  assert.equal((await j('/api/records?project=p1')).length, 2); // project + scene
  const exp = await (await fetch(base + '/api/export')).text();
  await j('/api/records/s1', { method: 'DELETE' });
  assert.equal((await j('/api/records?type=scene&project=p1')).length, 0);
  await j('/api/import?mode=replace', { method: 'POST', body: exp });
  const back = await j('/api/records?type=scene&project=p1');
  assert.equal(back[0].draft, 'héllo');
  const bad = await fetch(base + '/api/import', { method: 'POST', body: '{"app":"other"}' });
  assert.equal(bad.status, 400);
  const idx = await fetch(base + '/');
  assert.equal(idx.status, 200);
  console.log('smoke test passed');
} finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
