export const PROPOSAL_SECTIONS = [
  ['Title & subtitle', 'A working title that promises a result; a subtitle that names the audience or method.'],
  ['One-line pitch (hook)', 'One sentence: the book, for whom, and why now.'],
  ['Overview', '1–2 pages: the big idea, the problem, your unique angle, what the reader will gain.'],
  ['Target audience', 'Who exactly reads it? Size, habits, where they gather. Avoid "everyone".'],
  ['Why you (author platform & credentials)', 'Expertise, access, audience reach, media, speaking, newsletter size.'],
  ['Comparative titles', '5–8 recent books (last 5 years). What each does and how yours differs.'],
  ['Marketing & promotion', 'What you will do; channels, partnerships, events.'],
  ['Chapter-by-chapter outline', 'A paragraph per chapter: question, content, takeaway.'],
  ['Sample chapter', 'Usually chapter one or the strongest one.'],
  ['Format & timeline', 'Word count, illustrations, delivery date.'],
  ['About the author', 'Short bio, linking to credibility for this book.'],
];

export const ARGUMENT_HELP = {
  parts: [
    ['Claim', 'The proposition you want the reader to accept.'],
    ['Reasons', 'The "because" statements that directly support the claim.'],
    ['Evidence', 'Data, quotes, cases, studies that support each reason.'],
    ['Warrant', 'The principle connecting evidence to reason (often unstated). Make it visible if the reader might disagree.'],
    ['Counter-argument', 'The strongest objection, stated fairly.'],
    ['Rebuttal', 'Your answer, or an honest limitation.'],
  ],
  tips: ['Write the claim as a full sentence that could be false.', 'Give each chapter one claim and let the evidence arrive in order of strength or surprise.', 'Steelman the opposition: state their argument so well they would sign it.', 'Mark each piece of evidence as sourced / needs a source / anecdote.'],
};

export const CHAPTER_TEMPLATES = [
  { name: 'Problem–Solution chapter', steps: ['Hook anecdote showing the problem in a person\'s life', 'State the problem and its cost', 'Why common fixes fail', 'Your approach: the idea in one sentence', 'How it works (3 principles or steps)', 'Case study or proof', 'Objections and limits', 'Takeaway and exercise / next step'] },
  { name: 'Narrative-explanatory chapter', steps: ['Open in scene', 'Pose the question the scene raises', 'Zoom out: the research or history', 'Return to the scene with new meaning', 'Complicate: counter-evidence', 'Resolve with an insight', 'Bridge to the next chapter'] },
  { name: 'How-to chapter', steps: ['Promise: what you will be able to do by the end', 'Why it matters', 'Prerequisites / tools', 'Steps with examples', 'Common mistakes', 'Worked example start to finish', 'Checklist / summary'] },
  { name: 'Essay-style chapter', steps: ['Provocative thesis', 'Personal or observed anecdote', 'Context and counter-thesis', 'Evidence and reasoning', 'Turn: the deeper question', 'Conclusion that reframes'] },
  { name: 'Biography / profile chapter', steps: ['Telling scene from the subject\'s life', 'Origins and formative events', 'The central struggle or question', 'Turning point', 'Consequence and legacy', 'What the life reveals about the book\'s theme'] },
  { name: 'Whole-book structures', steps: ['Chronological (history, memoir)', 'Thematic (each chapter a facet)', 'Problem → causes → solutions', 'Myth-busting (each chapter busts a belief)', 'Framework (a memorable model with parts)', 'Case-driven (each chapter a case that teaches a principle)', 'Journey (author\'s quest with research woven through)'] },
];

export const SOURCE_KINDS = ['book', 'article', 'paper', 'interview', 'archive', 'website', 'report', 'video/audio', 'personal'];
export const SOURCE_STATUS = ['to read', 'reading', 'read', 'verified', 'permission needed'];

export const NARRATIVE_TECHNIQUES = [
  { name: 'Scene-setting', body: 'Place the reader physically inside an event with concrete sensory detail, then pull back to explain. Open chapters in scene, not summary.' },
  { name: 'Reconstructed dialogue', body: 'Use only what you can source (recordings, interviews, transcripts). If you reconstruct, say how in an author\'s note and keep the paraphrase honest.' },
  { name: 'The braided structure', body: 'Alternate a narrative strand (a person\'s story) with an expository strand (the research). Let each strand answer questions the other raises.' },
  { name: 'Character as guide', body: 'Pick a person with a stake in the topic and follow them. The reader meets ideas through their problems.' },
  { name: 'Compression and selection', body: 'You cannot include everything. Choose scenes that carry the most meaning; summarise the rest.' },
  { name: 'Voice and presence', body: 'Decide whether the author is visible (first person) or absent. Visible authors earn their place by being a participant, not a commentator.' },
  { name: 'Ethics of the real', body: 'Real people did not consent to being characters. Verify, offer a right of reply, protect those at risk, avoid invented thoughts, and label speculation.' },
  { name: 'Detail audit', body: 'Collect details by interviewing and observing; ask about smell, sound, objects, and what people did before and after.' },
  { name: 'Tension in fact', body: 'Frame a question or mystery the reader wants answered. Delay the answer through evidence, dead ends and reversals.' },
  { name: 'Endings', body: 'Return to your opening image changed, or conclude with the insight the whole book has built, plus a practical or emotional landing.' },
];

export const RESEARCH_METHOD = [
  'Keep a source log from day one: full citation, where you found it, a one-line summary and a trust rating.',
  'Prefer primary sources; mark secondary and tertiary ones clearly.',
  'Cross-check any surprising fact with two independent sources.',
  'Quote exactly; note page numbers. Keep a separate file for direct quotes with rights notes.',
  'Track permissions, image rights and interview consent.',
  'Fact-check pass before submission: names, dates, numbers, quotes.',
];
