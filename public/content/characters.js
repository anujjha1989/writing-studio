export const ARCHETYPES = [
  // Jungian / Vogler / Schmidt-style functional archetypes
  { name: 'The Hero', role: 'Protagonist', desc: 'Carries the reader through the story, willing to sacrifice for something beyond self. Needs a flaw and a growing awareness.', traps: 'Perfection and passivity.', ask: 'What is the hero willing to lose, and what do they refuse to give up?' },
  { name: 'The Mentor', role: 'Guide', desc: 'Offers wisdom, tools or training. Often wounded or limited; must step aside so the hero acts alone.', traps: 'The all-knowing oracle who solves the plot.', ask: 'What does the mentor withhold, and why?' },
  { name: 'The Threshold Guardian', role: 'Obstacle', desc: 'Tests whether the hero deserves to proceed. Can be an ally in disguise.', traps: 'A generic gatekeeper with no personality.', ask: 'What does passing this test prove?' },
  { name: 'The Herald', role: 'Catalyst', desc: 'Announces change, delivers the call to adventure.', traps: 'Convenient exposition dumps.', ask: 'What news do they bring and who sent them?' },
  { name: 'The Shapeshifter', role: 'Uncertain ally', desc: 'Loyalty is unclear; creates doubt and suspense. Love interests and double agents often play this role.', traps: 'Twist with no earlier hints.', ask: 'What does each side believe about them?' },
  { name: 'The Shadow', role: 'Antagonist', desc: 'Represents the hero\'s dark potential or opposing values. Best villains believe they are right and mirror the hero.', traps: 'Mustache-twirling evil.', ask: 'What does the antagonist want that is reasonable?' },
  { name: 'The Trickster', role: 'Comic / disruptor', desc: 'Punctures pomposity, brings humour, exposes hypocrisy. Can be fool or genius.', traps: 'Comic relief without function.', ask: 'What truth does the trickster expose?' },
  { name: 'The Ally / Sidekick', role: 'Companion', desc: 'Offers support, skills and a foil to the hero\'s traits; gives the hero someone to talk to.', traps: 'Existing only to admire the hero.', ask: 'What does the sidekick want that is not the hero\'s goal?' },
  { name: 'The Innocent', role: 'Stakes', desc: 'Embodies what is at risk: purity, hope or the vulnerable.', traps: 'Victim without agency.', ask: 'What does the Innocent protect or teach?' },
  { name: 'The Outcast / Rebel', role: 'Outsider', desc: 'Operates outside norms, sees clearly because they are outside.', traps: 'Rebel without a cause.', ask: 'What does society cost them?' },
  { name: 'The Caregiver', role: 'Support', desc: 'Nurtures others, often at their own expense.', traps: 'Martyr stereotype.', ask: 'What do they want for themselves?' },
  { name: 'The Sage / Seeker', role: 'Knowledge', desc: 'Pursues truth; can be cold, can be obsessive; often the narrator in literary fiction.', traps: 'Passive observer.', ask: 'What truth will cost them most?' },
];

export const ARCS = [
  { id: 'positive', name: 'Positive change arc', desc: 'The protagonist begins believing a Lie (a false belief about self or world), is confronted by the Truth through plot pressure, and finally chooses the Truth, becoming more whole. Ends in a better state.',
    steps: ['Lie believed (the wound it comes from)', 'The Want (conscious goal)', 'The Need (what they must understand)', 'First crack in the Lie', 'Midpoint: partial truth or false victory', 'Lie doubles down at a cost', 'Crisis: lowest moment with the Lie exposed', 'Choice of Truth in the climax', 'New state'] },
  { id: 'flat', name: 'Flat (testing) arc', desc: 'The protagonist already holds the Truth and does not change; instead they change the world around them and are tested by it. Their steadfastness is the story. (Sherlock Holmes, many mentors, Atticus Finch.)',
    steps: ['The Truth they hold', 'A world that believes a Lie', 'Challenge to the Truth', 'Cost of holding it', 'Allies and enemies are changed by their example', 'Temptation to abandon it', 'Final affirmation', 'World is changed'] },
  { id: 'negative-disillusion', name: 'Negative arc: disillusionment', desc: 'The protagonist starts with a naive truth or hope, which the world proves wrong. They end wiser but sadder.', steps: ['Innocent belief', 'Test that fails', 'Evidence against belief', 'Denial', 'Collapse', 'Bitter acceptance'] },
  { id: 'negative-fall', name: 'Negative arc: fall (tragic)', desc: 'The protagonist accepts a Lie or temptation and is destroyed by it. Macbeth, Gatsby, Michael Corleone.', steps: ['Flaw', 'Temptation', 'First compromise', 'Rationalisation', 'Point of no return', 'Consequences', 'Fall'] },
  { id: 'negative-corruption', name: 'Negative arc: corruption', desc: 'The protagonist starts with a Truth and abandons it for a Lie, becoming worse but possibly happier or more powerful. Corrupted anti-heroes.', steps: ['Initial virtue', 'Offer of power', 'Compromise', 'Escalation', 'Loses the good', 'Embraces the Lie'] },
  { id: 'transformation', name: 'Redemption / growth arc', desc: 'A morally flawed character moves toward goodness, usually through sacrifice. Scrooge, Jean Valjean.', steps: ['Flawed state', 'Catalyst moment', 'Resistance', 'Sacrifice', 'Redemption'] },
];

export const SHEET_FIELDS = [
  ['Basics', [['name', 'Name'], ['aka', 'Nicknames / aliases'], ['age', 'Age'], ['role', 'Story role (protagonist, antagonist, ally…)'], ['archetype', 'Archetype'], ['occupation', 'Occupation']]],
  ['Appearance & voice', [['look', 'Appearance (3 telling details)'], ['voice', 'How they speak (diction, rhythm, verbal tic)'], ['habits', 'Habits & mannerisms']]],
  ['Inner life', [['want', 'External want (goal)'], ['need', 'Internal need'], ['lie', 'Lie they believe'], ['wound', 'Wound / ghost (past event)'], ['fear', 'Greatest fear'], ['values', 'Values & principles'], ['flaw', 'Flaws / blind spots'], ['strength', 'Strengths / skills'], ['secret', 'Secret']]],
  ['Arc', [['arc', 'Arc type'], ['arcnotes', 'Arc notes: where they begin, where they end']]],
  ['History', [['backstory', 'Backstory'], ['family', 'Family & upbringing'], ['relationships', 'Key relationships']]],
  ['Notes', [['notes', 'Notes']]],
];

export const CHARACTER_PROMPTS = [
  'What does this character do when they believe nobody is watching?',
  'What is the one thing they would never say aloud, and who would they most want to say it to?',
  'What object do they carry that reveals more than they intend?',
  'What would make them lie, and what lie do they tell most often?',
  'Describe their worst day, and how they get through it.',
  'What do they want so badly that they would betray a principle for it?',
  'What do other characters get wrong about them?',
  'What do they do with their hands when nervous?',
  'Which small rule do they follow absolutely?',
  'What is their first memory of being afraid?',
];

export const REL_TYPES = ['family', 'friend', 'lover', 'rival', 'enemy', 'mentor', 'ally', 'employer', 'secret', 'other'];
