// Shared by the browser (Manuscript view) and the server (DOCX / EPUB export).
// Pure functions only: no DOM, no Node APIs.

export const defaultActs = (project) => (project?.acts?.length ? project.acts : project?.kind === 'nonfiction' ? ['Part I', 'Part II', 'Part III'] : ['Act I', 'Act II', 'Act III']);

export function orderScenes(project, scenes) {
  const n = defaultActs(project).length;
  const act = (s) => Math.min(s.act ?? 0, n - 1);
  return [...scenes].sort((a, b) => act(a) - act(b) || (a.order ?? 0) - (b.order ?? 0) || (a.created ?? 0) - (b.created ?? 0));
}

export const paragraphs = (text) => String(text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

// *italic* or _italic_ -> runs
export function runs(par) {
  const out = [];
  const re = /\*([^*\n]+)\*|\b_([^_\n]+)_\b/g;
  let last = 0, m;
  while ((m = re.exec(par))) {
    if (m.index > last) out.push({ t: par.slice(last, m.index) });
    out.push({ t: m[1] || m[2], i: true });
    last = m.index + m[0].length;
  }
  if (last < par.length) out.push({ t: par.slice(last) });
  return out;
}

const chapterTitle = (c) => (/^\d+$/.test(c) ? `Chapter ${c}` : c);

// -> { title, author, chapters: [{ title, scenes: [{ id, title, paras: [string] }], words }] }
export function buildManuscript(project, scenes, { includeEmpty = false } = {}) {
  const ordered = orderScenes(project, scenes).filter((s) => includeEmpty || (s.draft || '').trim());
  const numbered = ordered.some((s) => String(s.chapter || '').trim());
  const chapters = [];
  let cur = null, curKey = null;
  for (const s of ordered) {
    const key = String(s.chapter || '').trim();
    if (!numbered) { cur = { title: s.title || 'Untitled', scenes: [], words: 0 }; chapters.push(cur); }
    else if (!cur || (key && key !== curKey)) { cur = { title: key ? chapterTitle(key) : '', scenes: [], words: 0 }; chapters.push(cur); curKey = key; }
    cur.scenes.push({ id: s.id, title: s.title || '', paras: paragraphs(s.draft) });
    cur.words += s.words || 0;
  }
  return { title: project?.title || 'Untitled', author: project?.author || '', chapters };
}

export function toMarkdown(ms) {
  let out = `# ${ms.title}\n\n${ms.author ? `*${ms.author}*\n\n` : ''}`;
  for (const c of ms.chapters) {
    if (c.title) out += `## ${c.title}\n\n`;
    out += c.scenes.map((s) => s.paras.join('\n\n')).join('\n\n* * *\n\n') + '\n\n';
  }
  return out;
}
export function toPlainText(ms) {
  let out = `${ms.title.toUpperCase()}\n${ms.author ? ms.author + '\n' : ''}\n\n`;
  for (const c of ms.chapters) {
    if (c.title) out += `${c.title}\n\n`;
    out += c.scenes.map((s) => s.paras.map((p) => p.replace(/\*([^*\n]+)\*/g, '$1')).join('\n\n')).join('\n\n#\n\n') + '\n\n\n';
  }
  return out;
}
