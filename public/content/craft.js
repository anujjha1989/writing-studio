export const CRAFT_GUIDES = [
  { id: 'show-tell', title: 'Show vs. tell', body: [
    'Show when the moment matters: a turning point, a first impression, an emotion the reader should feel rather than be informed about. Tell when the information is minor, the time passes or you need to move on.',
    'Telling is not a sin. "Fortunately, the war ended in 1918" is better than a dramatised scene. Showing too much everywhere makes books sag.',
    'Show through specific action, sensory detail, subtext in dialogue, and choices under pressure. Replace "She was angry" with the thing she does that angry people do in her particular way.',
  ], test: ['Is this a key emotional beat? If so, dramatise it.', 'Could a camera see it? If not, find the action or object that reveals it.', 'Does a "tell" give context faster than a scene would?'], before: 'Mara was nervous about the meeting.', after: 'Mara straightened the folder three times, then moved it to the other side of the table.' },
  { id: 'dialogue', title: 'Dialogue', body: [
    'Dialogue should do at least two jobs at once: reveal character, advance plot, shift power, or carry subtext.',
    'People rarely answer the question asked. They deflect, interrupt and avoid. Leave out hellos, small talk and information both parties already know.',
    'Use "said" invisibly; use action beats instead of adverbs; give each speaker distinct vocabulary, rhythm and obsession.',
    'Read it aloud. If you can swap the speakers\' lines without losing anything, you have not given them distinct voices.',
  ], test: ['What does each character want in this exchange?', 'What are they not saying?', 'Where does the power shift?', 'Can I cut the first and last lines?'] },
  { id: 'scene-summary', title: 'Scene vs. summary', body: [
    'A scene is real-time, specific, in a place, with a goal and a conflict; summary compresses time and handles transitions.',
    'Use scenes for what matters most; summary for travel, backstory or repetition. A good ratio varies with genre; thrillers lean scene, sagas use more summary.',
    'Every scene needs a goal, a conflict and an outcome that changes the situation (often for the worse). Sequels (reaction, dilemma, decision) give characters room to feel and choose.',
    'Enter late, leave early.',
  ], test: ['What changes between the first and last line of the scene?', 'Is it in the right scene-summary mix for the effect?'] },
  { id: 'plot-theme-novel', title: 'Plot and theme in a novel', body: [
    'A novel has room for a main plot, subplots and a change that takes time. Start from a person who wants something concrete and an opposing force with reasons of its own. The plot is the series of attempts and reversals; each should cost more than the last and close off a way back.',
    'Give the book a spine question the reader can state in a sentence (will she keep the farm, who killed him, can he forgive his father). Every major scene should move that question. Subplots earn their place by echoing or contradicting the main line: one marriage forms as another fails.',
    'Theme is what the plot proves. Do not start by stating it. Put two values in conflict (loyalty and honesty, safety and freedom), give each a character who believes in it, and let the ending show the cost of choosing. Then go back and plant an object or image that can change meaning as the book goes on.',
    'Writers on your shelf do this differently. Planners such as Sanderson, Follett and Grisham outline from the ending. Explorers such as King, Murakami and Lee Child start with a situation and follow it. Either way the revision is the same: check each scene changes something and each promise is paid.',
  ], test: ['Can I state the spine question in one sentence?', 'Does each subplot comment on the main plot?', 'Which two values are in conflict, and who stands for each?', 'What image or object changes meaning by the end?'] },
  { id: 'plot-theme-story', title: 'Plot and theme in a short story', body: [
    'A short story has room for one thing: one character, one situation, one change. Begin as close to the turn as you can. Chekhov cut the beginning and the end; Carver stopped on an image; Munro folded decades into a single evening by moving through time instead of adding events.',
    'There are two reliable shapes. The turn story (Maupassant, O. Henry, Dahl, Archer) sets up an expectation and reverses it with a fact planted early. The recognition story (Joyce, Chekhov, Munro, Trevor) ends when a character, or only the reader, sees the situation differently. Decide which you are writing before you draft the ending.',
    'Theme in a story is carried by one object or act and is never explained. O’Connor takes away the thing a proud character is attached to. Hemingway leaves out the subject the couple cannot discuss. Lahiri lets a household ritual change its meaning. Pick the single detail that will hold it and cut any sentence that tells the reader what to think.',
    'Compression is the craft: one setting if possible, a short span of time, two or three people, and a last line that changes the first.',
  ], test: ['What is the one change?', 'Is this a turn story or a recognition story?', 'Which single object or act carries the theme?', 'Can I start a page later and stop a paragraph sooner?'] },
  { id: 'pov', title: 'Point of view & tense', body: [
    'First person gives intimacy and voice; limited third gives intimacy with flexibility; omniscient gives breadth and a storyteller\'s voice; second person is rare and demanding.',
    'Choose by asking whose knowledge you need and whose blind spots create tension.',
    'Do not slip POV mid-scene unless you control it. Keep to what the POV character can perceive.',
    'Past tense is the default; present tense creates immediacy and can feel claustrophobic over a long book.',
  ], test: ['Whose head is this? How do I know?', 'Is anything in the scene that the POV character could not know?'] },
  { id: 'pacing', title: 'Pacing & tension', body: [
    'Tension comes from desire plus obstacle plus consequences. Raise stakes by making failure more costly, or the goal more dear.',
    'Vary tempo: follow high-tension scenes with a breather where the characters process, and give the reader something to anticipate.',
    'Chapter endings: close on a question, a turn or a decision rather than a summary.',
  ], test: ['What does the reader want to know at the end of this chapter?', 'Where does the middle sag?'] },
  { id: 'openings', title: 'Openings & endings', body: [
    'Open with a person in a situation with a problem, in a voice the reader will trust. Avoid waking up, weather, long backstory.',
    'Endings should answer the story question in a way that is surprising yet inevitable. Echo the opening.',
  ], test: ['What question does page one pose?', 'Does the ending answer it with an image or action?'] },
  { id: 'description', title: 'Description & setting', body: [
    'Select three telling details instead of an inventory. Use the point-of-view character\'s attention: what they notice shows who they are.',
    'Appeal to more than sight. Smell and sound anchor memory.',
    'Weave description into action instead of stopping the story.',
  ], test: ['Can I cut every adjective that does not earn its place?', 'Does the setting add pressure?'] },
  { id: 'revision', title: 'Revision strategy', body: [
    'Revise from big to small: structure and story, then scenes, then paragraphs, then sentences, then proofreading.',
    'Let the draft rest. Print or change the font to see it fresh. Read aloud.',
    'Keep a revision log so you do not re-fix the same issues.',
  ], test: [] },
];

export const CHECKLISTS = [
  { id: 'rev-structure', title: 'Revision: structure', items: ['The protagonist\'s want and need are clear by the end of Act 1', 'The inciting incident happens early enough', 'The midpoint changes the nature of the conflict', 'Stakes rise in each act', 'The low point costs the hero something real', 'The climax is caused by the hero\'s choice', 'Subplots resolve or deliberately don\'t', 'Every setup has a payoff, every payoff a setup'] },
  { id: 'rev-scene', title: 'Revision: scenes', items: ['Each scene has a goal, conflict and outcome', 'Each scene changes something', 'Scenes start late and end early', 'POV is clear and consistent', 'Setting is established in the first lines', 'No scene exists only for exposition', 'Chapter ends pull the reader forward'] },
  { id: 'rev-character', title: 'Revision: character', items: ['Each major character wants something specific', 'Characters\' choices come from their traits, not plot convenience', 'The antagonist is credible and sympathetic in some way', 'Voices are distinguishable without tags', 'Arcs are visible through action', 'Names are distinct (different first letters, syllables)'] },
  { id: 'rev-prose', title: 'Revision: prose line edit', items: ['Cut filler words (just, really, very, that, began to)', 'Replace weak verbs + adverbs with strong verbs', 'Vary sentence length and openings', 'Check repeated words and pet phrases', 'Remove clichés and stock gestures (sighing, nodding, shrugging)', 'Dialogue tags are mostly "said" or action beats', 'Check tense consistency', 'Read the whole thing aloud'] },
  { id: 'rev-nonfiction', title: 'Revision: non-fiction', items: ['Each chapter has one clear claim and takeaway', 'The opening promise is delivered', 'Evidence is sourced and current', 'Counter-arguments are addressed', 'Anecdotes illustrate, not decorate', 'Jargon is defined', 'Quotes are accurate and permissions cleared', 'Chapter transitions are explicit'] },
  { id: 'submit', title: 'Ready to submit', items: ['Manuscript formatted to the target\'s guidelines', 'Query letter / proposal drafted', 'Synopsis written', 'Comps researched', 'Beta readers\' feedback addressed', 'Final proofread complete'] },
];

export const PROMPT_PARTS = {
  character: ['a retired locksmith', 'a translator who hates silence', 'a failed magician', 'a twelve-year-old night-shift cleaner', 'a lighthouse keeper\'s daughter', 'a disgraced mathematician', 'an ex-spy running a bakery', 'a widow who collects other people\'s keys', 'a nervous auctioneer', 'a ferry pilot afraid of water'],
  want: ['wants to return something they stole', 'must deliver a message before dawn', 'is hiding an illness', 'wants to be forgiven by someone who has died', 'needs to win one last argument', 'is searching for the origin of a rumour', 'has to choose between two loves', 'wants to be believed'],
  obstacle: ['but the bridge is closed', 'but a stranger knows their secret', 'but the only witness has forgotten', 'but the storm cuts the power', 'but a rival wants the same thing', 'but their own lie has become public', 'but time is running out', 'but a child is watching'],
  setting: ['a night train', 'a flooded village', 'a hotel off-season', 'a hospital car park', 'a crowded wedding', 'a closed border post', 'a library after hours', 'a monsoon market'],
};

export const WRITING_PROMPTS = [
  'Write a scene in which two people talk about the weather and the conversation is really about a broken promise.',
  'A letter arrives twenty years late. Who wrote it and who reads it?',
  'Describe a house by listing what has been left behind by each of its owners.',
  'Write the same moment from the point of view of the person who is leaving and the person who is left.',
  'Begin with: "Nobody told us the river would change its mind."',
  'Write an apology that is also an accusation.',
  'A character has to carry something fragile across a crowded place. What is it and what goes wrong?',
  'Write about a meal where someone realises it is the last time they will eat with this group.',
  'Write the first page of a book narrated by someone who is lying to us for a good reason.',
  'Describe a city only through its sounds.',
  'Non-fiction: explain something you know deeply to a ten-year-old using one analogy and one story.',
  'Non-fiction: write the opening scene of a chapter about a discovery that changed an industry.',
  'Non-fiction: take a strong opinion you hold and write the best argument against it.',
  'A character receives an inheritance with a condition. What is it?',
  'Write a scene that takes place entirely in a lift.',
  'A rumour starts in a small village. Trace it through five people.',
  'Describe a smell and the memory it unlocks without naming either directly.',
  'Write a story in exactly 100 words that has a twist.',
  'A character finds a door in their house that was not there yesterday.',
  'Write a scene where the antagonist is right.',
];

export const STATUS = ['idea', 'outlined', 'drafted', 'revised', 'polished'];
export const STATUS_COLORS = { idea: '#9aa0a6', outlined: '#c9a227', drafted: '#3b82c4', revised: '#7c5cbf', polished: '#2f9e5b' };
