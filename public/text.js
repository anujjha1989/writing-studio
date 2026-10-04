// Prose analysis, version diff and name detection. Pure functions, no DOM.

export const wordCount = (t) => (String(t || '').trim().match(/\S+/g) || []).length;

const STOP = new Set('a an the and or but if then so of to in on at by for from with without into onto over under up down out off as is are was were be been being am do does did done have has had having i you he she it we they me him her us them my your his its our their this that these those there here what which who whom whose when where why how not no nor yes all any some one two more most much many few very just only also too than can could would should will shall may might must said say says like about after before again back still even now well got get go went came come know knew see saw look looked made make take took thing things way time little own other another through because while each every such both between around upon'.split(' '));
const NOT_ADVERB = new Set('only early family holy july likely lonely lovely ugly belly bully fly rely reply supply apply ally jelly silly chilly hilly daily elderly friendly lily wholly anomaly assembly butterfly monopoly italy'.split(' '));
const FILTER = /\b(saw|see|sees|seeing|heard|hear|hears|felt|feel|feels|noticed|notice|notices|realised|realized|realise|realize|seemed|seem|seems|watched|wondered|thought|decided|knew|looked|appeared|began to|started to)\b/gi;
const WEAK = /\b(very|really|just|quite|rather|somewhat|suddenly|actually|basically|literally|simply|almost|slightly|a bit|kind of|sort of)\b/gi;
const IRREG = 'been|done|gone|seen|taken|given|known|made|said|told|found|left|held|kept|brought|bought|caught|taught|thought|written|driven|eaten|fallen|forgotten|hidden|broken|chosen|spoken|stolen|thrown|worn|torn|born|built|sent|spent|lost|paid|sold|shot|hit|cut|put|set|shut|hurt|led|read|heard|felt|meant|met|won|drawn|shown|grown|beaten|bitten|frozen|ridden|risen|shaken|woken|struck|hung|sung|sunk|swept|laid|buried';
const PASSIVE = new RegExp(`\\b(?:am|is|are|was|were|be|been|being|got|gets|get)\\s+(?:\\w+ly\\s+)?(?:\\w{3,}ed|${IRREG})\\b`, 'gi');
const SENT = /[^.!?…\n]+(?:[.!?…]+["”’')\]]*|$)/g;
const WORD = /[A-Za-z][A-Za-z'’-]*/g;

// -> { words, sentences:[{start,end,n}], marks:[{start,end,kind,note}], stats }
export function analyse(text) {
  const t = String(text || '');
  const marks = [];
  const push = (re, kind, note) => { re.lastIndex = 0; let m; while ((m = re.exec(t))) { marks.push({ start: m.index, end: m.index + m[0].length, kind, note }); if (!m[0].length) re.lastIndex++; } };
  push(PASSIVE, 'passive', 'Passive construction');
  push(FILTER, 'filter', 'Filter word: puts the narrator between reader and event');
  push(WEAK, 'weak', 'Weak modifier');
  const words = [];
  WORD.lastIndex = 0; let m;
  while ((m = WORD.exec(t))) words.push({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  const counts = new Map();
  let adverbs = 0;
  words.forEach((x, i) => {
    if (x.w.length > 4 && x.w.endsWith('ly') && !NOT_ADVERB.has(x.w)) { adverbs++; marks.push({ start: x.start, end: x.end, kind: 'adverb', note: 'Adverb' }); }
    if (x.w.length > 3 && !STOP.has(x.w)) {
      counts.set(x.w, (counts.get(x.w) || 0) + 1);
      for (let j = i - 1; j >= 0 && j >= i - 40; j--) if (words[j].w === x.w) { marks.push({ start: x.start, end: x.end, kind: 'echo', note: `“${x.w}” repeats within ${i - j} words` }); break; }
    }
  });
  const sentences = [];
  SENT.lastIndex = 0;
  while ((m = SENT.exec(t))) { const n = (m[0].match(WORD) || []).length; if (n) sentences.push({ start: m.index, end: m.index + m[0].length, n }); if (!m[0].length) SENT.lastIndex++; }
  sentences.filter((s) => s.n >= 40).forEach((s) => marks.push({ start: s.start, end: s.end, kind: 'long', note: `Long sentence: ${s.n} words` }));
  let dlg = 0;
  for (const q of t.matchAll(/“[^”]{1,2000}”|"[^"\n]{1,2000}"/g)) dlg += (q[0].match(WORD) || []).length;
  const lens = sentences.map((s) => s.n);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const sd = lens.length ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) : 0;
  const n = words.length || 1;
  const by = (k) => marks.filter((x) => x.kind === k).length;
  const repeated = [...counts.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 12);
  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  return {
    sentences, marks, repeated,
    stats: {
      words: words.length, sentences: sentences.length, meanSentence: mean, sdSentence: sd, longest: Math.max(0, ...lens),
      dialoguePct: (100 * dlg) / n, adverbsPer1000: (1000 * adverbs) / n, passivePer1000: (1000 * by('passive')) / n,
      filterPer1000: (1000 * by('filter')) / n, weakPer1000: (1000 * by('weak')) / n, echoes: by('echo'),
      paragraphs: t.split(/\n+/).filter((p) => p.trim()).length, readMinutes: words.length / 250,
    },
  };
}

// Split text into [{text, kinds:[...], note}] segments for highlighted rendering. `on` = Set of kinds to show.
export function segments(text, marks, on) {
  const pts = new Set([0, text.length]);
  const act = marks.filter((m) => on.has(m.kind));
  act.forEach((m) => { pts.add(m.start); pts.add(m.end); });
  const cuts = [...pts].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = cuts[i], e = cuts[i + 1];
    const hit = act.filter((m) => m.start <= s && m.end >= e);
    out.push({ text: text.slice(s, e), kinds: [...new Set(hit.map((m) => m.kind))], note: hit.map((m) => m.note).join('; ') });
  }
  return out;
}

// ---------- diff ----------
function lcs(a, b, eq = (x, y) => x === y) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) { ops.push(['=', a[i], b[j]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['-', a[i++]]); else ops.push(['+', b[j++]]);
  }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);
  return ops;
}
const toks = (p) => p.match(/\s+|[^\s]+/g) || [];
// -> [{ type: 'same'|'del'|'add'|'change', a?: [[op,tok]], b?: [[op,tok]], text? }]
export function diffText(oldText, newText) {
  const A = String(oldText || '').split(/\n+/).filter((p) => p.trim()), B = String(newText || '').split(/\n+/).filter((p) => p.trim());
  const ops = lcs(A, B);
  const out = [];
  for (let k = 0; k < ops.length; k++) {
    const [op, v] = ops[k];
    if (op === '=') { out.push({ type: 'same', text: v }); continue; }
    // pair a run of deletions with the following run of additions as "changed" paragraphs
    const dels = [], adds = [];
    while (k < ops.length && ops[k][0] !== '=') { (ops[k][0] === '-' ? dels : adds).push(ops[k][1]); k++; }
    k--;
    const pairs = Math.min(dels.length, adds.length);
    for (let p = 0; p < pairs; p++) {
      const ta = toks(dels[p]), tb = toks(adds[p]);
      if (ta.length * tb.length > 4e6) { out.push({ type: 'del', text: dels[p] }, { type: 'add', text: adds[p] }); continue; }
      const w = lcs(ta, tb);
      const same = w.filter((o) => o[0] === '=').length;
      if (same < Math.min(ta.length, tb.length) * 0.3) out.push({ type: 'del', text: dels[p] }, { type: 'add', text: adds[p] });
      else out.push({ type: 'change', a: w.filter((o) => o[0] !== '+').map((o) => [o[0], o[1]]), b: w.filter((o) => o[0] !== '-').map((o) => [o[0], o[0] === '=' ? o[2] : o[1]]) });
    }
    dels.slice(pairs).forEach((t) => out.push({ type: 'del', text: t }));
    adds.slice(pairs).forEach((t) => out.push({ type: 'add', text: t }));
  }
  return out;
}

// ---------- story-bible names ----------
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// entries: [{ id, name, aliases }] -> regex matcher + lookup (longest names first so "Mira Vale" beats "Mira")
export function nameMatcher(entries) {
  const map = new Map();
  for (const e of entries) for (const n of [e.name, ...String(e.aliases || '').split(',')]) { const k = (n || '').trim(); if (k.length >= 2 && !/^new (character|place|entry|object)/i.test(k)) map.set(k.toLowerCase(), e.id); }
  const names = [...map.keys()].sort((a, b) => b.length - a.length);
  if (!names.length) return null;
  return { re: new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'giu'), idOf: (s) => map.get(s.toLowerCase()) };
}
export function mentions(text, matcher) {
  const ids = new Map();
  if (!matcher || !text) return ids;
  matcher.re.lastIndex = 0;
  let m;
  while ((m = matcher.re.exec(text))) { const id = matcher.idOf(m[1]); ids.set(id, (ids.get(id) || 0) + 1); }
  return ids;
}
// -> [{ text, id? }]
export function linkify(text, matcher) {
  if (!matcher) return [{ text }];
  const out = []; let last = 0, m;
  matcher.re.lastIndex = 0;
  while ((m = matcher.re.exec(text))) { if (m.index > last) out.push({ text: text.slice(last, m.index) }); out.push({ text: m[1], id: matcher.idOf(m[1]) }); last = m.index + m[1].length; }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
