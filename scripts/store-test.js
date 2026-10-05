// Exercise the real store with controlled browser storage and network responses.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const storage = new Map(), status = { dataset: {} };
let failStorage = false, failNetwork = false;
const element = () => ({ append() {}, setAttribute() {}, addEventListener() {}, remove() {}, nodeType: 1 });
const context = vm.createContext({
  console, Date, Math, Map, Set, JSON, Number, String, Error, Promise,
  setTimeout: () => 1, clearTimeout() {}, setInterval() {}, addEventListener() {},
  navigator: { onLine: true },
  CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options.detail; } },
  document: { hidden: false, addEventListener() {}, dispatchEvent() {}, getElementById: () => status, querySelector: () => null, createElement: element, createTextNode: element, body: { append() {} } },
  localStorage: { setItem(k, v) { if (failStorage) throw new Error('quota'); storage.set(k, v); }, getItem: (k) => storage.get(k), removeItem(k) { if (failStorage) throw new Error('quota'); storage.delete(k); } },
  fetch: async () => { if (failNetwork) throw new Error('network unavailable'); return { ok: true, status: 200, json: async () => ({ updated_at: Date.now() }) }; },
});
const dependencies = {
  './icons.js': { icon() {} },
  './text.js': { wordCount: (s = '') => s.split(/\s+/).filter(Boolean).length },
  './manuscript.js': { defaultActs: () => [], orderScenes: (_, scenes) => scenes },
};
const mod = new vm.SourceTextModule(fs.readFileSync(new URL('../public/lib.js', import.meta.url), 'utf8'), { context });
await mod.link((name) => { const exports = dependencies[name]; return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }); });
await mod.evaluate();
const { put, remove, S } = mod.namespace;
const scene = { id: 's1', type: 'scene', project: 'p1', draft: 'first edit' };
put(scene);
assert.equal(JSON.parse(storage.get('ws.outbox'))[0].draft, 'first edit', 'recovery is durable before the debounce fires');
scene.draft = 'latest edit'; put(scene);
assert.equal(JSON.parse(storage.get('ws.outbox'))[0].draft, 'latest edit');
await put(scene, true);
assert.equal(storage.has('ws.outbox'), false);
assert.equal(status.textContent, 'Saved on Pi');
failNetwork = true; scene.draft = 'offline edit'; await put(scene, true);
assert.equal(JSON.parse(storage.get('ws.outbox'))[0].draft, 'offline edit');
await assert.rejects(remove(scene), /Unsaved edits/);
assert.equal(S.recs.get(scene.id), scene, 'failed deletion retains the local item');
failStorage = true; put(scene);
assert.match(status.textContent, /Local recovery failed/);
failStorage = false; failNetwork = false; await put(scene, true);
failNetwork = true;
await assert.rejects(remove(scene), /network/);
assert.equal(S.recs.get(scene.id), scene);
console.log('store recovery tests passed');
