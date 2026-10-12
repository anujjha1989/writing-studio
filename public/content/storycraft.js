export const GENRES = [
 ['mystery','Mystery','Who caused the crime, how, and why?','Plant observable clues; distinguish evidence from interpretation; give suspects motives and opportunities; let the investigator earn the solution.','A clue changes the meaning of an earlier fact.','A culprit introduced at the end or a solution requiring information readers could never access.'],
 ['romance','Romance','Can these people build a viable relationship?','Give both people agency, attraction and a credible barrier; show trust through choices; resolve the central relationship with an emotionally satisfying, optimistic ending for genre romance.','A vulnerability changes the relationship’s terms.','A misunderstanding that one ordinary conversation would solve, without a credible reason to avoid it.'],
 ['thriller','Thriller','Can the protagonist stop the danger in time?','Establish a threat and deadline; make opposition capable; escalate through failed strategies; let the final response use planted skills at a cost.','An apparent success reveals a larger or more personal danger.','Repeated danger with no change in strategy or stakes.'],
 ['horror','Horror','What threatens our safety, identity or understanding?','Establish ordinary boundaries; break them progressively; control what is seen; make dread meaningful to the character. Endings can defeat, survive or reveal the threat’s reach.','The assumed refuge becomes unsafe.','An arbitrary monster without a relationship to the story’s fears.'],
 ['fantasy','Fantasy','What must be chosen in a world whose possibilities differ from ours?','Show world rules through consequences; establish limits on power; tie discovery to pursuit; make the climax a decision rather than a new magical exception.','A power solves one problem but creates a cost.','Worldbuilding that postpones action or magic that can solve anything.'],
 ['science-fiction','Science fiction','What changes when a speculative possibility becomes real?','Define one consequential premise; explore its social and personal effects; let characters disagree about its use; make the resolution follow established possibilities.','A benefit exposes an unexpected systemic consequence.','Technology as decoration, or unsupported technical explanations standing in for character decisions.'],
 ['literary','Literary fiction','What changes in a person’s understanding or relationships?','Make attention, contradiction and consequence specific; allow ambiguity while keeping practical events legible; develop thematic pressure through choices.','An ordinary detail recontextualises the character’s self-understanding.','Vagueness mistaken for depth or reflection that never changes perception or action.'],
 ['historical','Historical fiction','How do people pursue lives within a particular historical situation?','Research constraints and varied perspectives; separate invented events from documented ones; let period institutions shape available choices.','A historical constraint makes a personal strategy untenable.','Modern assumptions projected unexamined onto every character or factual exposition replacing scenes.'],
 ['adventure','Adventure','Can a pursuit be completed across consequential obstacles?','Give the journey a purpose; vary obstacles; make relationships and skills evolve; let success or failure follow accumulated choices.','An obstacle changes the route and the group’s loyalties.','A string of interchangeable encounters with no accumulating consequence.'],
 ['coming-of-age','Coming of age','What must be understood, relinquished or accepted to grow?','Give the young protagonist agency; connect social pressure to personal discovery; let growth appear in choices, not only narration.','An admired adult’s limitation changes the protagonist’s belief.','A single speech fixes everything or growth is equated only with becoming cynical.']
].map(([id,title,question,principles,turn,pitfall])=>({id,title,question,principles,turn,pitfall}));
export const THEMES = [
 ['Belonging','What must someone surrender to belong—and should they?','A newcomer earns acceptance by excluding someone else.'],
 ['Power','When does protection become control?','A leader withholds information to keep a community safe.'],
 ['Justice','Can a fair outcome require an unfair act?','A witness must expose a friend to clear a stranger.'],
 ['Identity','Who are we when the role that defined us disappears?','A retired performer is recognised for an act they regret.'],
 ['Love and loyalty','When does loyalty require disagreement?','Two siblings must decide whether to reveal a family secret.'],
 ['Mortality','What becomes urgent when time is limited?','A character must choose between repairing a relationship and completing a legacy.'],
 ['Freedom and duty','Which obligations are chosen and which imposed?','A caretaker receives an opportunity that requires leaving.'],
 ['Truth and memory','Who benefits from the accepted account of the past?','Two witnesses remember the same event differently.'],
 ['Ambition','What is success worth if its pursuit changes the seeker?','A promotion requires denying credit to a mentor.'],
 ['Home and exile','Can returning restore what was lost?','A traveller finds the family home occupied by people who also need it.'],
 ['Nature and progress','Whose cost is hidden in an improvement?','An invention saves labour but changes a community’s landscape.'],
 ['Faith and doubt','What sustains commitment when certainty fails?','A trusted ritual no longer produces the expected comfort.']
].map(([title,question,exercise])=>({title,question,exercise}));
export const TROPES = [
 ['Reluctant allies','Friction becoming earned cooperation','Give each ally an independent goal and a credible reason to cooperate.'],
 ['Enemies to lovers','A relationship transformed through understanding','Change the underlying disagreement; attraction alone does not resolve harmful behaviour.'],
 ['Found family','Belonging built through chosen obligations','Show mutual responsibility and differences rather than instant unconditional harmony.'],
 ['The chosen one','Responsibility attached to unusual capacity','Ask who assigned the role and who bears the cost; preserve agency.'],
 ['The quest','Pursuit revealing both world and seeker','Make each obstacle alter the pursuit, not merely delay it.'],
 ['The return','A familiar place revealing personal change','Give those who stayed their own histories and agency.'],
 ['The double','Identity examined through a mirror or rival','Make the contrast consequential to decisions.'],
 ['Forbidden knowledge','Discovery testing an ethical boundary','Specify why it is forbidden and avoid treating curiosity as inherently evil.'],
 ['Unreliable narrator','A gap between account and evidence','Plant discrepancies; do not confuse withholding all evidence with ambiguity.'],
 ['The locked room','An apparently impossible event','Establish the relevant physical conditions fairly.'],
 ['Betrayal','Trust creating vulnerability','Plant motives and opportunities; explain why trust existed.'],
 ['Redemption','Accountability and changed conduct','Show restitution and accept that forgiveness is not owed.'],
 ['Rags to riches','Transformation through aspiration','Explore what success costs and whose labour enables it.'],
 ['The mentor','Knowledge transferred across unequal experience','Give the mentor limitations and let the learner make independent decisions.'],
 ['Sacrifice','A value made visible through cost','Ensure the sacrificed person has agency; do not use identity as shorthand for expendability.'],
 ['Mistaken identity','Assumptions producing escalating consequences','Make mistakes credible and resolution earned.']
].map(([title,appeal,practice])=>({title,appeal,practice}));
export const STRUCTURES = [
 {id:'three',title:'Three acts',parts:['Act I — pursuit and commitment','Act II — tests, reversal and crisis','Act III — decisive choice and consequence']},
 {id:'five',title:'Five acts',parts:['Act I — establish the situation','Act II — rising action','Act III — major reversal','Act IV — crisis and response','Act V — resolution and aftermath']},
 {id:'seven',title:'Seven-point structure',parts:['Setup','First turn','First pressure point','Midpoint shift','Second pressure point','Final turn','Resolution']},
 {id:'kishotenketsu',title:'Kishotenketsu',parts:['Ki — introduction','Sho — development','Ten — recontextualising turn','Ketsu — connection and conclusion']}
];
export const BUILD_FIELDS = [
 ['premise','Premise and central question','Who pursues what, why now, and what question carries the story?'],
 ['conflict','Conflict and stakes','Opposing wants, shared value, deadline, internal cost, then four choices with consequences.'],
 ['characterName','Character name','Name the person whose dossier you are developing. Add further cast members in the story bible after export.'],
 ['character','Character dossier','Name; want; fear; value; contradiction; strength that causes trouble; blind spot; relationships; three tests of belief.'],
 ['theme','Theme and motif','A thematic question, competing answers, consequential choices and a motif whose meaning changes.'],
 ['tropes','Tropes and variation','Patterns used, their appeal, expectations retained, variations and an agency/stereotype audit.'],
 ['acts','Act outline','Describe the commitment, changed strategies, major turns and final response.'],
 ['beats','Scene plan','One scene per line: [act number] Title | goal | conflict | outcome. Example: [2] The wrong key | enter the archive | guard refuses | ask a rival for help. Omit the number to use the first act. Link scenes causally.'],
 ['subplot','Subplot','Three movements and two intersections that change the central pursuit.'],
 ['ending','Climax and aftermath','The decisive choice, its cost, setups paid off and the new situation.']
];
