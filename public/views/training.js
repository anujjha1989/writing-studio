import { h, S, all, get, create, put, btn, field, tabs, pageHead, toast, req, modal, confirmDlg, when, wordCount, uid } from '../lib.js';
import { go } from '../app.js';
import { COURSES, LESSONS } from '../content/academy.js';
import { GENRES, THEMES, TROPES, STRUCTURES, BUILD_FIELDS } from '../content/storycraft.js';
import { nextPractice, practiceEvidence, storyExport } from '../academy-tools.js';
import { AUTHORS } from './styles.js';
import { diffText } from '../text.js';

const link=(text,path,cls='btn')=>h('a',{href:'#/training/'+path,class:cls},text);
const attempts=()=>all('training').filter(r=>r.kind==='attempt');
const settings=()=>get('academy-plan') || {id:'academy-plan',type:'training',project:'',kind:'plan',priorities:[]};
const section=(title,...body)=>h('section',{class:'stack'},h('h2',{},title),...body);
const paras=text=>h('div',{class:'prose academy-prose'},String(text || '').split('\n').filter(Boolean).map(p=>h('p',{},p)));
export async function render([page,id]) {
 if(page==='lesson') return lessonView(LESSONS.find(l=>l.id===id));
 if(page==='attempt') return attemptView(get(id));
 if(page==='labs') return labsView();
 if(page==='library') return libraryView();
 if(page==='builder') return builderView();
 if(page==='notebook') return notebookView();
 if(page==='plan') return planView();
 return overview();
}
function heading(title,sub) { return h('div',{class:'stack'},link('← Training Studio','', 'small'),pageHead(title,sub)); }
async function saveForAction(record) {
 await put(record,true);
 const deadline=Date.now()+12000;
 while(S.pending.has(record.id)) {
  if(S.offline || Date.now()>deadline)throw new Error('The latest work has not saved on the Pi yet. Keep this page open and retry when Saved on Pi appears. No export or paid coach request was made.');
  await new Promise(resolve=>setTimeout(resolve,100));
 }
}
function currentWorkbook() {
 const book=S.project?.id || '';
 let builder=all('training').find(r=>r.kind==='builder' && r.book===book);
 if(!builder && book){builder=all('training').find(r=>r.kind==='builder' && !r.book && !r.exported);if(builder){builder.book=book;put(builder,true);}}
 return builder;
}
function overview() {
 const list=attempts(), next=nextPractice(list,settings().priorities);
 return h('div',{class:'stack-lg'},pageHead('Training Studio','Learn a technique, attempt it, review the evidence, revise, then try it in a new situation. Lessons and self-review need no paid AI.'),
 h('div',{class:'row'},link('Practice notebook','notebook'),link('Personal practice plan','plan'),link('Author technique labs','labs'),link('Genre, theme & trope library','library'),link('Build my story while I learn','builder','btn primary')),
 section('Your next practice',h('p',{},`${next.courseTitle}: ${next.title}`),link('Open lesson','lesson/'+next.id,'btn primary')),
 h('div',{class:'academy-courses'},COURSES.map(c=>{
 const evidence=practiceEvidence(list,c.id);
 return h('section',{class:'academy-course stack'},h('h2',{},c.title),h('p',{class:'muted'},c.description),h('p',{class:'small'},`${evidence.attempts} attempts · ${evidence.revisions} saved revisions · ${evidence.completed} self-reviewed completions`),c.lessons.map(l=>link(`${l.level}. ${l.title}`,'lesson/'+l.id,'academy-lesson-link')));
 })),h('p',{class:'muted small'},'Completion records practice, not mastery. Examples are original teaching examples, not passages copied from the selected authors.'));
}
function lessonView(l) {
 if(!l) return h('div',{},heading('Lesson not found'),link('Browse courses',''));
 return h('div',{class:'stack-lg narrow'},heading(l.title,`${l.courseTitle} · practice ${l.level}`),
 section('Learn',paras(l.teach)),section('Worked example',paras(l.example)),section('Diagnose a weak example',paras(l.weak),h('details',{class:'fold'},h('summary',{},'Reveal the diagnosis'),paras(l.diagnosis))),
 section('Your exercise',paras(l.exercise),btn('Start a saved attempt',()=>startAttempt(l),'primary')),
 section('Revision checklist',h('ul',{},l.checks.map(x=>h('li',{},x)))),section('Transfer the skill',paras(l.transfer),btn('Start a transfer attempt',()=>startAttempt(l,true))),
 l.build ? section('Use this in your story',h('p',{},'This lesson contributes to your story-building workbook. Use your own premise and move the useful results into its fields.'),link('Open story workbook','builder')) : null,
 section('Earlier attempts',attempts().filter(r=>r.lesson===l.id).map(r=>link(`${r.transfer?'Transfer':'Attempt'} · ${when(r.created)}`,'attempt/'+r.id,'academy-lesson-link'))));
}
function startAttempt(l,transfer=false,lab) {
 const r=create('training',{kind:'attempt',course:l.course || 'labs',lesson:l.id,title:l.title,exercise:transfer?l.transfer:l.exercise,teach:l.teach || '',checks:l.checks || [],transfer,lab:lab || null,text:'',reflection:'',versions:[],review:{},complete:false});
 go('training/attempt/'+r.id);
}
function attemptView(r) {
 if(!r || r.type!=='training' || r.kind!=='attempt') return h('div',{},heading('Attempt not found'),link('Open notebook','notebook'));
 const ta=h('textarea',{class:'in academy-draft',rows:14,value:r.text || '',placeholder:'Write your own attempt here.', 'aria-label':'Practice draft'});
 const counter=h('p',{class:'small muted'},`${wordCount(r.text)} words`);
 const reflection=h('textarea',{class:'in',rows:3,value:r.reflection || '', 'aria-label':'Reflection',placeholder:'What did you change, why, and what still feels difficult?'});
 ta.addEventListener('input',()=>{r.text=ta.value;r.complete=false;put(r);counter.textContent=`${wordCount(r.text)} words`;});
 reflection.addEventListener('input',()=>{r.reflection=reflection.value;r.complete=false;put(r);});
 const history=h('div',{class:'stack'}), feedback=h('div',{class:'stack'});
 const drawHistory=()=>history.replaceChildren(...(r.versions || []).slice().reverse().map((v,i)=>h('div',{class:'academy-version'},h('p',{},`Version ${(r.versions || []).length-i} · ${when(v.at)} · ${wordCount(v.text)} words`),btn('Read',()=>modal('Saved version',paras(v.text),[['Close',()=>{}]]),'sm'),btn('Compare with current',()=>compareVersions(v.text,ta.value),'sm'))));
 const drawFeedback=()=>feedback.replaceChildren(...all('training').filter(f=>f.kind==='coach-result' && f.attemptId===r.id).sort((a,b)=>b.at-a.at).map(f=>h('details',{class:'fold',open:true},h('summary',{},`${f.previous?'Revision feedback':'Coach feedback'} · ${when(f.at)}`),paras(f.text),f.truncated?h('p',{class:'form-error'},'Feedback reached the response limit. No automatic continuation was charged.'):null,h('p',{class:'muted small'},f.costUSD==null?'Usage cost unavailable':`Token charge: $${f.costUSD.toFixed(6)} USD before taxes. ${f.input} input / ${f.output} output tokens. Applies to the saved draft sent at this time.`),btn('Read submitted draft',()=>modal('Draft sent to coach',paras(f.draft),[['Close',()=>{}]]),'sm'))));
 drawHistory();drawFeedback();
 const saveVersion=()=>{if(!ta.value.trim()) return toast('Write an attempt first.');r.versions ||= [];r.versions.push({id:uid(),at:Date.now(),text:ta.value,reflection:reflection.value});r.text=ta.value;put(r,true);drawHistory();toast('Version saved. Earlier versions are preserved.');};
 const root=h('div',{class:'stack-lg narrow'},heading(r.title,r.transfer?'Transfer practice: apply the skill to a new situation.':'Your practice notebook. Drafts keep a local recovery copy and save on the Pi.'),
 section('The task',paras(r.exercise),r.teach? h('details',{class:'fold',open:true},h('summary',{},'Lesson reference'),paras(r.teach)):null,r.lab? h('p',{class:'small muted'},`Technique lab selected from ${r.lab.author}. Practise broad craft decisions; do not reproduce their distinctive voice.`):null),
 section('Your attempt',ta,counter,h('div',{class:'row'},btn('Save a version',saveVersion,'primary'),btn('Use in story workbook',()=>useAttempt(r,ta.value)),btn('Coach this attempt',()=>coach(r,ta.value,null,feedback,drawFeedback)),btn('Review my revision',()=>{
 const previous=(r.versions || []).filter(v=>v.text!==ta.value).at(-1);
 if(!previous) return toast('Save your first draft as a version, then revise it before requesting a comparison.');
 coach(r,ta.value,previous.text,feedback,drawFeedback);
 }))),
 section('Self-review',h('p',{class:'muted'},'Tick only when you can point to evidence in the draft. Completion does not certify skill.'),r.checks.map((q,i)=>h('label',{class:'check'},h('input',{type:'checkbox',checked:!!r.review?.[i],onChange:e=>{r.review ||= {};r.review[i]=e.target.checked;r.complete=false;put(r);}}),q)),field('Reflection',reflection),btn('Mark self-review complete',()=>{if(!r.text?.trim() || !r.checks.every((_,i)=>r.review?.[i]) || !r.reflection?.trim()) return toast('Write the attempt, review every criterion and add a reflection first.');saveVersion();r.complete=true;put(r,true);toast('Self-review recorded. Try a transfer exercise to test the skill.');})),
 section('Coach notes',feedback,h('p',{class:'muted small'},'AI notes are suggestions, not a judgement of talent. You decide which advice serves the story. No API request runs without cost approval.')),
 section('Saved versions',history),
 h('div',{class:'row'},r.lesson && LESSONS.some(l=>l.id===r.lesson)?link('Back to lesson','lesson/'+r.lesson):r.lab?link('More author labs','labs'):link('Browse courses',''),link('Practice plan','plan'),link('Story workbook','builder')));
 return root;
}
function useAttempt(attempt,text) {
 if(!text.trim())return toast('Write the attempt first.');
 const suggested=LESSONS.find(l=>l.id===attempt.lesson)?.build || ({genre:'premise',structure:'acts',conflict:'conflict',characters:'character',themes:'theme',tropes:'tropes',scenes:'beats',endings:'ending'})[attempt.course] || 'beats';
 const target=h('select',{class:'in','aria-label':'Workbook destination'},BUILD_FIELDS.map(([id,title])=>h('option',{value:id,selected:id===suggested},title)));
 modal('Use your attempt in the story workbook',h('div',{class:'stack'},h('p',{},'Append a copy to the selected workbook field. Existing work and the original practice attempt are preserved.'),field('Destination',target)),[['Cancel',()=>{}],['Add to workbook',()=>{
 let builder=currentWorkbook();
 if(!builder)builder=create('training',{kind:'builder',book:S.project?.id || '',fields:{},genre:GENRES[0].id,structure:'three'});
 builder.fields ||= {};builder.fields[target.value]=[builder.fields[target.value],text].filter(Boolean).join('\n\n');put(builder,true);toast('Attempt copied into the workbook.');
 },'primary']]);
}
function compareVersions(before,after) {
 const diff=diffText(before,after);
 modal('Revision comparison',h('div',{class:'stack'},h('p',{class:'muted'},'Changed paragraphs are shown as Earlier and Current. Unchanged paragraphs appear once. Explain the effect of a change in your reflection.'),diff.map(b=>b.type==='same'?paras(b.text):h('div',{class:'academy-compare'},h('div',{},h('h3',{},'Earlier'),paras(b.type==='del'?b.text:b.a?.map(x=>x[1]).join('') || '')),h('div',{},h('h3',{},'Current'),paras(b.type==='add'?b.text:b.b?.map(x=>x[1]).join('') || ''))))),[['Close',()=>{}]],null,{wide:true});
}
async function coach(r,draft,previous,output,draw) {
 if(!draft.trim()) return toast('Write an attempt first.');
 if(draft.length>24000 || (previous || '').length>24000) return toast('Coach reviews are limited to 24,000 characters per draft. Use a shorter practice passage.');
 try {
 await saveForAction(r);
 const quote=await req('POST','api/training/quote',{attemptId:r.id,draft,previous:previous || '',task:r.exercise,checks:r.checks,reflection:r.reflection || ''});
 const approved=await confirmDlg('Approve paid coaching?',`Send this draft${previous?' and the earlier version':''}, task, checklist and reflection to Anthropic using your saved key? ${quote.model}. Conservative token-cost allowance: $${quote.allowanceUSD.toFixed(4)} USD before tax. Typical use can be lower. This is a conservative allowance, not an exact quote. Rates checked ${quote.ratesDate}. No automatic retries.`, 'Approve coaching','primary');
 if(!approved) return;
 output.append(h('p',{class:'muted'},'Coach is reading the submitted draft…'));
 const result=await req('POST','api/training/feedback',{quoteId:quote.id});
 S.recs.set(result.id,result);draw();
 } catch(e) {draw();output.append(h('p',{class:'form-error',role:'alert'},e.message),h('a',{href:'#/settings',class:'small'},'API settings'));}
}
function notebookView() {
 const root=h('div',{class:'stack-lg'},heading('Practice notebook','Your attempts, reflections, coach notes and revisions stay together across books.'));
 const search=h('input',{class:'in',type:'search',placeholder:'Find an attempt', 'aria-label':'Find an attempt'}),list=h('div',{class:'rows'});
 const draw=()=>{const q=search.value.toLowerCase();const rows=attempts().filter(r=>`${r.title} ${r.text} ${r.reflection}`.toLowerCase().includes(q)).sort((a,b)=>b.created-a.created);list.replaceChildren(...rows.map(r=>h('a',{class:'rowitem',href:'#/training/attempt/'+r.id},h('span',{class:'grow'},h('b',{},r.title),h('small',{},`${when(r.created)} · ${r.transfer?'Transfer':'Practice'} · ${wordCount(r.text)} words · ${r.versions?.length || 0} versions`)),h('small',{},r.complete?'Self-reviewed':'In progress'))));if(!rows.length)list.append(h('p',{class:'pad muted'},'No attempts match. Start a lesson or author technique lab.'));};
 search.addEventListener('input',draw);draw();root.append(search,list,link('Choose a lesson',''));return root;
}
function planView() {
 const plan=settings(),list=attempts();
 const root=h('div',{class:'stack-lg narrow'},heading('Personal practice plan','Choose recurring difficulties from your own work. Suggestions favour unfinished lessons in these areas; they do not infer a talent score.'));
 root.append(section('Focus areas',COURSES.map(c=>h('label',{class:'check'},h('input',{type:'checkbox',checked:plan.priorities.includes(c.id),onChange:e=>{plan.priorities=e.target.checked?[...new Set([...plan.priorities,c.id])]:plan.priorities.filter(x=>x!==c.id);put(plan,true);}}),c.title))));
 const notes=h('textarea',{class:'in',rows:3,value:plan.notes || '',placeholder:'What keeps appearing in feedback or your own revisions?', 'aria-label':'Practice plan notes',onInput:e=>{plan.notes=e.target.value;put(plan);}});
 root.append(field('Evidence behind your priorities',notes),btn('Show my next exercise',()=>go('training/lesson/'+nextPractice(list,plan.priorities).id),'primary'),section('Evidence of practice',h('div',{class:'rows'},COURSES.map(c=>{const e=practiceEvidence(list,c.id);return h('div',{class:'rowitem'},h('span',{class:'grow'},c.title),h('small',{},`${e.attempts} attempts / ${e.revisions} revisions / ${e.completed} self-reviews`));}))),section('Weekly routine',h('ol',{},h('li',{},'One lesson and first attempt.'),h('li',{},'One revision with a stated purpose.'),h('li',{},'One new situation testing the same skill.'),h('li',{},'Reflect on evidence and adjust the next focus area.'))));return root;
}
function labsView() {
 const eligible=AUTHORS.filter(a=>a.plotcraft || a.pacing || a.dialogue || a.rhythm || a.themecraft),select=h('select',{class:'in', 'aria-label':'Lab author'},eligible.map(a=>h('option',{value:a.id},a.name))),body=h('div',{class:'stack-lg'});
 const techniques=[['plotcraft','Plot construction','Plan five causal beats and explain how each changes the next choice.'],['pacing','Pacing','Write a 400-word scene. Expand a consequential moment and compress an uneventful interval. Explain the allocation of space.'],['dialogue','Dialogue','Write a 300-word conversation with conflicting wants. Make the tactics distinct without borrowing recognisable phrasing.'],['rhythm','Sentence rhythm','Write 150 words, then revise the sentence and paragraph patterns to change emphasis. Explain the turn.'],['themecraft','Theme','Frame a thematic question and plan three choices that test different answers.']];
 const draw=()=>{const a=eligible.find(x=>x.id===select.value);body.replaceChildren(...techniques.filter(([key])=>a?.[key]).map(([key,title,exercise])=>section(title,paras(a[key]),h('ol',{},h('li',{},'Notice: identify one broad technique in this guide.'),h('li',{},'Explain: describe what effect it has and when you would use it.'),h('li',{},'Practise: apply it to an original situation.')),paras(exercise),btn('Start this lab',()=>startAttempt({id:'lab-'+a.id+'-'+key,course:'labs',title:`${a.name}: ${title}`,exercise:`First explain one broad technique from this guide in your own words. Then: ${exercise}`,teach:a[key],checks:['Can I explain the technique’s effect?','Does the attempt apply that technique?','Are the situation and wording my own?']},false,{author:a.name,technique:key}),'primary'))));};select.addEventListener('change',draw);draw();return h('div',{class:'stack-lg narrow'},heading('Author technique labs','Notice it, explain it, practise it. These labs study broad craft choices, not imitation of a distinctive author voice.'),field('Choose an author with a technique guide',select),body);
}
function libraryView() {
 let mode='genres';const body=h('div',{class:'stack-lg'});
 const draw=()=>{body.replaceChildren(...(mode==='genres'?GENRES.map(g=>section(g.title,h('p',{class:'prose'},g.question),paras(g.principles),h('p',{},`Useful turn: ${g.turn}`),h('p',{class:'muted'},`Watch for: ${g.pitfall}`),btn('Start '+g.title.toLowerCase()+' plot lab',()=>startAttempt({id:'genre-lab-'+g.id,course:'genre',title:g.title+' plot lab',teach:g.principles,exercise:`Answer: ${g.question} Write a premise and five beats: commitment, pursuit, complication, decisive response and consequence. Include this type of turn: ${g.turn} Explain how your ending honours the reader promise.`,checks:['Is the genre’s central question clear?','Does the turn change a character’s next action?','Does the ending address the promise?','Have I avoided this failure mode: '+g.pitfall]}),'primary'))):mode==='themes'?THEMES.map(t=>section(t.title,paras(t.question),h('p',{},t.exercise),btn('Practise this theme',()=>startAttempt({id:'theme-lab-'+t.title,course:'themes',title:t.title+' theme lab',teach:t.question,exercise:`Use this situation: ${t.exercise} Give three characters competing answers to the question “${t.question}” and plan a consequential choice testing each.`,checks:['Are competing answers plausible?','Do actions test the question?','Does the story allow consequences rather than a lecture?']})))):TROPES.map(t=>section(t.title,h('p',{},`Appeal: ${t.appeal}`),paras(t.practice),btn('Practise this trope',()=>startAttempt({id:'trope-lab-'+t.title,course:'tropes',title:t.title+' variation lab',teach:`Appeal: ${t.appeal}. ${t.practice}`,exercise:`Build an original premise using ${t.title.toLowerCase()}. Identify the expectation you retain, one variation and three setups needed to earn the payoff. Audit who gets agency.`,checks:['Is the familiar appeal retained or thoughtfully replaced?','Is the variation planted?','Have I checked agency and stereotypes?']}))))));};const navigation=h('div');const drawTabs=()=>navigation.replaceChildren(tabs([['genres','Genres'],['themes','Themes'],['tropes','Tropes']],mode,t=>{mode=t;draw();drawTabs();}));draw();drawTabs();return h('div',{class:'stack-lg narrow'},heading('Genre, theme & trope library','Starting points, not an exhaustive taxonomy or rules every story must follow.'),navigation,body);
}
function builderView() {
 let builder=currentWorkbook();
 const root=h('div',{class:'stack-lg narrow'},heading('Build my story while I learn',S.project?`Workbook for ${S.project.title}. Entries become your premise, conflict map, dossier and scene outline.`:'You can practise without a book. Start a book on the Desk when you are ready to export.'));
 if(!builder){const id=uid();builder={id,type:'training',project:'',created:Date.now(),kind:'builder',book:S.project?.id || '',fields:{},genre:GENRES[0].id,structure:'three'};}
 const save=()=>put(builder);
 const genre=h('select',{class:'in','aria-label':'Story genre',onChange:e=>{builder.genre=e.target.value;save();}},GENRES.map(g=>h('option',{value:g.id,selected:g.id===builder.genre},g.title)));
 const structure=h('select',{class:'in','aria-label':'Story structure',onChange:e=>{builder.structure=e.target.value;save();drawStructure();}},STRUCTURES.map(s=>h('option',{value:s.id,selected:s.id===builder.structure},s.title)));
 const structureHelp=h('div',{class:'stack'});const drawStructure=()=>{const s=STRUCTURES.find(x=>x.id===builder.structure);structureHelp.replaceChildren(h('ol',{},s.parts.map(p=>h('li',{},p))),btn('Add structure prompts to act outline',async()=>{if(builder.fields.acts && !await confirmDlg('Replace act outline?','This replaces only the workbook act-outline field. Your exported scene cards are untouched.','Replace','primary'))return;builder.fields.acts=s.parts.map(p=>p+': ').join('\n');save();actInput.value=builder.fields.acts;}));};
 let actInput;const fields=BUILD_FIELDS.map(([key,label,hint])=>{const input=h('textarea',{class:'in',rows:key==='beats'?8:4,value:builder.fields[key] || '', 'aria-label':label,onInput:e=>{builder.fields[key]=e.target.value;save();}});if(key==='acts')actInput=input;return field(label,input,hint);});drawStructure();
 root.append(field('Genre',genre),field('Structure',structure),structureHelp,...fields,btn('Export workbook to this book',async()=>{
 if(!S.project)return toast('Start or open a book on the Desk first.');
 const planned=storyExport(builder,S.project.id,[...S.recs.values()]);
 if(planned.alreadyExported || builder.exported)return toast('This workbook was already exported. Edit its scene cards and bible dossier directly; export does not overwrite them.');
 if(!planned.scenes.length)return toast('Add at least one line to the scene plan first.');
 if(!await confirmDlg('Add this story plan?',`Add ${planned.scenes.length} outlined scenes and ${planned.character?'one character dossier':'no character dossier'} to ${S.project.title}? Existing drafts stay intact. The workbook is retained.`,'Add plan','primary'))return;
 try {
 await saveForAction(builder);
 const result=await req('POST','api/academy-export',{builderId:builder.id,projectId:S.project.id});
 for(const record of result.records) S.recs.set(record.id,record);
 S.project=S.recs.get(S.project.id);builder=S.recs.get(builder.id);
 toast('Plan added. Scene cards and the character dossier are ready to develop.');
 } catch(e) {toast(e.message);}
 },'primary'),h('p',{class:'muted small'},'Export adds outlined scene cards with empty drafts and keeps the character dossier in the story bible. Use [act number] in a scene-plan line to place its card. Existing book act labels are retained; a blank storyboard adopts the selected structure. It never writes the story for you. Repeated export is blocked to prevent duplicates.'),h('div',{class:'row'},h('a',{href:'#/story',class:'btn'},'Open storyboard'),h('a',{href:'#/bible',class:'btn'},'Open story bible')));return root;
}
