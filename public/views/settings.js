import { h, S, btn, field, req, toast, confirmDlg, pageHead, modal, loadProjects, openProject, icon } from '../lib.js';
import { rerender, THEMES, setTheme, getTheme } from '../app.js';
import { newProject, projectSettings, cover } from './home.js';

export async function render() {
  const [st, projects] = await Promise.all([req('GET', '/api/settings'), loadProjects()]);
  const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } } };

  // --- Claude key ---
  const key = h('input', { class: 'in', type: 'password', autocomplete: 'off', placeholder: st.hasKey ? 'A key is saved. Paste a new one to replace it.' : 'Paste your key (starts with sk-ant-)', 'aria-label': 'Anthropic API key' });
  const model = h('select', { class: 'in', 'aria-label': 'Model' }, [...new Set([st.model, ...st.models])].map((m) => h('option', { value: m, selected: m === st.model }, m)));
  const keyNote = h('p', { class: 'muted small' }, st.hasKey ? 'A key is saved on the Pi. It is never sent back to this screen.' : 'No key saved yet. Feedback on scenes is off until you add one.');
  const saveKey = async () => { const body = { model: model.value }; if (key.value.trim()) body.apiKey = key.value.trim(); await req('PUT', '/api/settings', body); key.value = ''; toast('Saved.'); rerender(); };
  const testKey = async (e) => {
    const b = e.currentTarget; b.disabled = true; keyNote.textContent = 'Asking Claude for a one-word reply.';
    try { const r = await req('POST', '/api/ai', { system: 'Reply with the single word: ready', prompt: 'Are you there?', max_tokens: 10 }); keyNote.textContent = `It works. ${r.model || st.model} answered “${r.text.trim().slice(0, 40)}”.`; } catch (err) { keyNote.textContent = `That did not work: ${err.message}`; }
    b.disabled = false;
  };

  // --- passphrase ---
  const cur = h('input', { class: 'in', type: 'password', autocomplete: 'current-password' }), next = h('input', { class: 'in', type: 'password', autocomplete: 'new-password' });
  const passErr = h('p', { class: 'form-error', role: 'alert' });
  const setPass = async (remove) => {
    passErr.textContent = '';
    try { await req('POST', '/api/auth/set', { current: cur.value, next: remove ? '' : next.value }); toast(remove ? 'Passphrase removed.' : 'Passphrase set. Other devices will be asked for it.'); rerender(); } catch (e) { passErr.textContent = e.message; }
  };

  // --- backup ---
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const text = await f.text();
    modal('Restore from a backup file', h('p', {}, `“${f.name}” can be added to what is here, or replace everything. Replacing makes a backup on the Pi first.`), [
      ['Cancel', () => {}],
      ['Add to what is here', () => doImport(text, 'merge')],
      ['Replace everything', async () => { if (await confirmDlg('Replace everything?', 'All books currently on the Pi are replaced by the contents of this file.', 'Replace everything')) doImport(text, 'replace'); }, 'danger']]);
    e.target.value = '';
  } });
  const doImport = async (text, mode) => {
    const r = await fetch(`/api/import?mode=${mode}`, { method: 'POST', body: text });
    if (!r.ok) return toast('That file could not be restored: ' + ((await r.json().catch(() => ({}))).error || r.statusText));
    try { localStorage.removeItem('ws.project'); localStorage.removeItem('ws.outbox'); } catch { /* private mode */ }
    location.hash = '#/'; location.reload();
  };

  return h('div', { class: 'stack-lg narrow settings' }, pageHead('Settings'),
    h('section', {}, h('h2', {}, 'Feedback from Claude'),
      h('p', { class: 'muted' }, 'Paste your own Anthropic API key to get editor’s notes on a scene from the Feedback tab in the editor. The key is stored on the Pi only.'),
      h('div', { class: 'fields' }, field('Anthropic API key', key), field('Model', model)), keyNote,
      h('div', { class: 'row' }, btn('Save', saveKey, 'primary'), st.hasKey ? btn('Test the key', testKey) : null, st.hasKey ? btn('Remove key', async () => { await req('PUT', '/api/settings', { apiKey: '' }); rerender(); }, 'ghost') : null)),

    h('section', {}, h('h2', {}, 'Appearance'),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Theme' }, THEMES.map(([t, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': getTheme() === t, class: getTheme() === t ? 'on' : '', onClick: () => { setTheme(t); rerender(); } }, l))),
      h('p', { class: 'muted small' }, 'Saved on this device only, so the phone and the Mac can differ.')),

    h('section', {}, h('h2', {}, 'Books'),
      h('div', { class: 'rows' }, projects.map((p) => h('div', { class: 'rowitem static' }, cover(p, 'xs'), h('span', { class: 'grow' }, h('span', { class: 'rowitem-title' }, p.title), h('small', {}, p.kind === 'nonfiction' ? 'Non-fiction' : 'Fiction')),
        p.id === S.project?.id ? h('small', {}, 'Open now') : btn('Open', async () => { await openProject(p.id); rerender(); }, 'sm'), btn('Settings', () => projectSettings(S.recs.get(p.id) || p), 'sm')))),
      h('div', { style: { marginTop: '12px' } }, btn('New book', () => newProject(), '', 'plus'))),

    h('section', {}, h('h2', {}, 'Passphrase'),
      h('p', { class: 'muted' }, st.passphrase ? 'A passphrase protects this app. Each device asks once and stays unlocked for 90 days.' : 'Without a passphrase, anyone who can reach the Pi can read and change your books. Set one before opening the app to the internet.'),
      h('div', { class: 'fields' }, st.passphrase ? field('Current passphrase', cur) : null, field(st.passphrase ? 'New passphrase' : 'Passphrase', next, 'At least 6 characters.')), passErr,
      h('div', { class: 'row' }, btn(st.passphrase ? 'Change passphrase' : 'Set passphrase', () => setPass(false), 'primary', 'lock'), st.passphrase ? btn('Remove passphrase', () => setPass(true), 'ghost') : null,
        st.passphrase ? btn('Lock this device', async () => { await req('POST', '/api/auth/logout'); location.reload(); }, 'ghost') : null)),

    h('section', {}, h('h2', {}, 'Backups'),
      h('p', { class: 'muted' }, st.backups ? `The Pi keeps a copy every night. ${st.backups} saved, the latest is ${st.lastBackup.replace('writing-studio-', '').replace('.json.gz', '')}.` : 'The Pi makes a copy every night after 3 am. None yet.'),
      h('p', { class: 'muted small' }, `Kept in ${st.backupDir}`),
      h('div', { class: 'row' }, btn('Back up now', async () => { const r = await req('POST', '/api/backup'); toast(`Saved ${r.file}.`); rerender(); }, '', 'cloud'), h('a', { class: 'btn', href: '/api/export', download: '' }, icon('download', 18), 'Download a copy'), btn('Restore from a file', () => file.click()), file)),

    h('section', {}, h('h2', {}, 'Working away from home'),
      h('p', { class: 'muted' }, isSecureContext ? ('serviceWorker' in navigator ? 'This address is secure, so the app also opens with no connection. Edits made offline are kept on this device and sent when the Pi is reachable again.' : 'This browser does not support opening the app offline.') : 'On this plain home address the app needs the Pi to open. If the connection drops while you write, edits are kept on this device and sent when it returns. Opening the app through a secure (https) address adds full offline use.'),
      store.get('ws.outbox', '') ? h('p', { class: 'form-error' }, 'Some edits on this device are still waiting to be sent to the Pi.') : null),

    h('p', { class: 'muted small' }, `Writing Studio, version ${st.version}.`));
}
