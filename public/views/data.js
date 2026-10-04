import { h, S, btn, download, openProject, loadProjects } from '../lib.js';
import { rerender } from '../app.js';

export async function render() {
  const file = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const mode = confirm('OK = REPLACE everything with this file.\nCancel = MERGE into existing data.') ? 'replace' : 'merge';
    if (mode === 'replace' && !confirm('This erases all current data first. Continue?')) return;
    const r = await fetch(`/api/import?mode=${mode}`, { method: 'POST', body: await f.text() });
    alert(r.ok ? 'Import complete. Reloading.' : 'Import failed: ' + (await r.text()));
    if (r.ok) { localStorage.removeItem('ws.project'); location.href = '#/'; location.reload(); }
  } });
  return h('div', { class: 'stack' }, h('h1', {}, 'Backup & restore'),
    h('p', { class: 'muted' }, 'Your data lives in a SQLite file on the Pi. Export a JSON copy regularly; import to restore or move to another machine.'),
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '/api/export', download: true }, 'Export all data (JSON)'), btn('Import JSON…', () => file.click()), file),
    h('p', { class: 'muted' }, 'Writing Studio v1 · single user · no accounts.'));
}
