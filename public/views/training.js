import { h, S, all, get, create, put, btn, field, tabs, pageHead, toast, req, modal, confirmDlg, when, wordCount, uid } from '../lib.js';
import { go } from '../app.js';
import { COURSES, LESSONS } from '../content/academy.js';
import { GENRES, THEMES, TROPES, STRUCTURES, BUILD_FIELDS } from '../content/storycraft.js';
import { nextPractice, practiceEvidence, storyExport, workbookScenes } from '../academy-tools.js';
import { AUTHORS } from './styles.js';
import { diffText } from '../text.js';

const link=(text,path,cls='btn')=>h('a',{href:'#/training/'+path,class:cls},text);
const attempts=()=>all('training').filter(r=>r.kind==='attempt');
const settings=()=>get('academy-plan') || {id:'academy-plan',type:'training',project:'',kind:'plan',priorities:[]};
const section=(title,...body)=>h('section',{class:'stack'},h('h2',{},title),...body);
const paras=text=>h('div',{class:'prose academy-prose'},String(text || '').split('\n').filter(Boolean).map(p=>h('p',{},p)));
export async function render([page,id,step]) {
 if(page==='lesson') return lessonView(LESSONS.find(l=>l.id===id),step);
 if(page==='attempt') return attemptView(get(id));
 if(page==='labs') return labsView();
 if(page==='library') return libraryView();
 if(page==='builder') return builderView(id);
 if(page==='notebook') return notebookView();
 if(page==='plan') return planView();
 return overview();
}
function heading(title,sub) { return h('div',{class:'stack'},link('‹ Learn','', 'academy-back'),pageHead(title,sub)); }
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
function learningRow(title,detail,path) {
 return h('a',{href:'#/training/'+path,class:'learning-row'},h('span',{class:'grow'},h('b',{},title),detail?h('small',{},detail):null),h('span',{'aria-hidden':true},'›'));
}
function overview() {
 const list=attempts(),next=nextPractice(list,settings().priorities);
 const unfinished=list.filter(r=>!r.complete).sort((a,b)=>(b.updated_at || b.created)-(a.updated_at || a.created))[0];
 const visited=all('training').filter(r=>r.kind==='lesson-state').sort((a,b)=>b.visited-a.visited)[0];
 const resume=unfinished?{title:unfinished.title,detail:'Your saved practice is ready to continue.',path:'attempt/'+unfinished.id}:visited?{title:LESSONS.find(l=>l.id===visited.lesson)?.title || next.title,detail:'Pick up where you left off.',path:'lesson/'+visited.lesson+'/'+visited.step}:{title:next.title,detail:next.courseTitle,path:'lesson/'+next.id};
 const totalDone=new Set(list.filter(r=>r.complete).map(r=>r.lesson)).size;
 return h('div',{class:'learning-home stack-lg'},pageHead('Learn','A little practice. A stronger story.'),
 h('section',{class:'learning-continue stack'},h('p',{class:'eyebrow'},'Continue learning'),h('h2',{},resume.title),h('p',{class:'muted'},resume.detail),link('Continue',resume.path,'btn primary'),h('p',{class:'small muted'},'Lessons and self-review are free. AI coaching is optional.')),
 h('div',{class:'learning-group'},learningRow('Practice plan',totalDone?`${totalDone} self-reviewed exercises · choose your next focus`:'Choose a skill to develop','plan'),learningRow('Story workbook','Turn your practice into a story plan','builder')),
 section('Courses',h('p',{class:'muted'},'Choose a subject. Open a course to see its lessons.'),h('div',{class:'learning-group'},COURSES.map(c=>{
 const e=practiceEvidence(list,c.id);
 return h('details',{class:'learning-course'},h('summary',{},h('span',{class:'grow'},h('b',{},c.title),h('small',{},e.attempts?`${e.attempts} ${e.attempts===1?'attempt':'attempts'} · ${e.revisions} ${e.revisions===1?'revision':'revisions'}`:`${c.lessons.length} lessons`))),h('div',{class:'learning-course-body'},h('p',{class:'muted'},c.description),c.lessons.map(l=>learningRow(l.title,list.some(r=>r.lesson===l.id&&r.complete)?'Self-reviewed':'Lesson '+l.level,'lesson/'+l.id))));
 }))),h('p',{class:'small muted'},'Progress records practice, not mastery. Examples are original teaching material.'));
}
function lessonView(l,requested) {
 if(!l)return h('div',{},heading('Lesson not found'),link('Browse courses',''));
 const steps=['learn','example','practise','review'],index=Math.max(0,steps.indexOf(requested || 'learn'));
 const state=get('academy-lesson-'+l.id) || {id:'academy-lesson-'+l.id,type:'training',project:'',kind:'lesson-state',lesson:l.id};
 const move=i=>{state.step=steps[i];state.visited=Date.now();put(state,true);go('training/lesson/'+l.id+'/'+steps[i]);};
 const root=h('div',{class:'stack-lg narrow learning-lesson'},heading(l.title,l.courseTitle),
 h('nav',{class:'learning-steps','aria-label':'Lesson steps'},steps.map((step,i)=>h('button',{type:'button',class:i===index?'current':'','aria-current':i===index?'step':null,onClick:()=>move(i)},h('span',{'aria-hidden':true},i+1),['Learn','Example','Practise','Review'][i]))),
 h('p',{class:'small muted',role:'status'},`Step ${index+1} of 4`));
 const existing=attempts().filter(r=>r.lesson===l.id && !r.transfer).sort((a,b)=>b.created-a.created)[0];
 if(index===0)root.append(section('The technique',paras(l.teach)));
 if(index===1)root.append(section('Worked example',paras(l.example)),section('What would you change?',paras(l.weak),h('details',{class:'fold'},h('summary',{},'Reveal the diagnosis'),paras(l.diagnosis))));
 if(index===2)root.append(section('Your exercise',paras(l.exercise),h('div',{class:'learning-group'},learningRow(existing?'Resume your attempt':'Your practice notebook',existing?'Your draft is saved.':'Start below; drafts save as you type.',existing?'attempt/'+existing.id:'notebook'))));
 if(index===3)root.append(section('Review your choices',h('ul',{},l.checks.map(q=>h('li',{},q))),existing?link('Review my attempt','attempt/'+existing.id,'btn primary'):h('p',{class:'muted'},'Write your attempt in Practise, then review it against these questions.')),section('Try a new situation',paras(l.transfer),btn('Start transfer exercise',()=>startAttempt(l,true),'ghost')),l.build?learningRow('Use this in your story','Keep the useful results in your workbook','builder'):null,
 h('details',{class:'fold'},h('summary',{},'Earlier attempts'),attempts().filter(r=>r.lesson===l.id).map(r=>learningRow(r.transfer?'Transfer attempt':'Practice attempt',when(r.created),'attempt/'+r.id))));
 root.append(h('div',{class:'learning-step-actions'},index>0?btn('Previous',()=>move(index-1),'ghost'):null,index===2?btn(existing?'Continue attempt':'Start practice',()=>existing?go('training/attempt/'+existing.id):startAttempt(l),'primary'):index<3?btn('Continue',()=>move(index+1),'primary'):link('All courses','', 'btn ghost')));
 return root;
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
 section('The task',paras(r.exercise),r.teach? h('details',{class:'fold'},h('summary',{},'Lesson reference'),paras(r.teach)):null,r.lab? h('p',{class:'small muted'},`Technique lab selected from ${r.lab.author}. Practise broad craft decisions; do not reproduce their distinctive voice.`):null),
 section('Your attempt',ta,counter,h('div',{class:'row'},btn('Save a version',saveVersion,'primary'),btn('Use in story workbook',()=>useAttempt(r,ta.value),'ghost'),btn('Coach this attempt',()=>coach(r,ta.value,null,feedback,drawFeedback),'ghost'),btn('Review my revision',()=>{
 const previous=(r.versions || []).filter(v=>v.text!==ta.value).at(-1);
 if(!previous) return toast('Save your first draft as a version, then revise it before requesting a comparison.');
 coach(r,ta.value,previous.text,feedback,drawFeedback);
 }))),
 section('Self-review',h('p',{class:'muted'},'Tick only when you can point to evidence in the draft. Completion does not certify skill.'),r.checks.map((q,i)=>h('label',{class:'check'},h('input',{type:'checkbox',checked:!!r.review?.[i],onChange:e=>{r.review ||= {};r.review[i]=e.target.checked;r.complete=false;put(r);}}),q)),field('Reflection',reflection),btn('Mark self-review complete',()=>{if(!r.text?.trim() || !r.checks.every((_,i)=>r.review?.[i]) || !r.reflection?.trim()) return toast('Write the attempt, review every criterion and add a reflection first.');saveVersion();r.complete=true;put(r,true);toast('Self-review recorded. Try a transfer exercise to test the skill.');})),
 section('Coach notes',feedback,h('p',{class:'muted small'},'AI notes are suggestions, not a judgement of talent. You decide which advice serves the story. No API request runs without cost approval.')),
 h('details',{class:'fold'},h('summary',{},'Saved versions'),history),
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
 builder.fields ||= {};if(target.value==='beats'){builder.scenes=[...workbookScenes(builder),{id:uid(),act:0,title:attempt.title,goal:text,conflict:'',outcome:''}];}else{builder.fields[target.value]=[builder.fields[target.value],text].filter(Boolean).join('\n\n');}put(builder,true);toast('Attempt copied into the workbook.');
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
 const draw=()=>{const a=eligible.find(x=>x.id===select.value);body.replaceChildren(...techniques.filter(([key])=>a?.[key]).map(([key,title,exercise])=>section(title,paras(a[key]),h('ol',{},h('li',{},'Notice: identify one broad technique in this guide.'),h('li',{},'Explain: describe what effect it has and when you would use it.'),h('li',{},'Practise: apply it to an original situation.')),paras(exercise),btn('Start this lab',()=>startAttempt({id:'lab-'+a.id+'-'+key,course:'labs',title:`${a.name}: ${title}`,exercise:`First explain one broad technique from this guide in your own words. Then: ${exercise}`,teach:a[key],checks:['Can I explain the technique’s effect?','Does the attempt apply that technique?','Are the situation and wording my own?']},false,{author:a.name,technique:key}),'ghost'))));};select.addEventListener('change',draw);draw();return h('div',{class:'stack-lg narrow'},heading('Author technique labs','Notice it, explain it, practise it. These labs study broad craft choices, not imitation of a distinctive author voice.'),field('Choose an author with a technique guide',select),body);
}
function libraryView() {
 let mode='genres';const body=h('div',{class:'stack-lg'});
 const draw=()=>{body.replaceChildren(...(mode==='genres'?GENRES.map(g=>section(g.title,h('p',{class:'prose'},g.question),paras(g.principles),h('p',{},`Useful turn: ${g.turn}`),h('p',{class:'muted'},`Watch for: ${g.pitfall}`),btn('Start '+g.title.toLowerCase()+' plot lab',()=>startAttempt({id:'genre-lab-'+g.id,course:'genre',title:g.title+' plot lab',teach:g.principles,exercise:`Answer: ${g.question} Write a premise and five beats: commitment, pursuit, complication, decisive response and consequence. Include this type of turn: ${g.turn} Explain how your ending honours the reader promise.`,checks:['Is the genre’s central question clear?','Does the turn change a character’s next action?','Does the ending address the promise?','Have I avoided this failure mode: '+g.pitfall]}),'ghost'))):mode==='themes'?THEMES.map(t=>section(t.title,paras(t.question),h('p',{},t.exercise),btn('Practise this theme',()=>startAttempt({id:'theme-lab-'+t.title,course:'themes',title:t.title+' theme lab',teach:t.question,exercise:`Use this situation: ${t.exercise} Give three characters competing answers to the question “${t.question}” and plan a consequential choice testing each.`,checks:['Are competing answers plausible?','Do actions test the question?','Does the story allow consequences rather than a lecture?']})))):TROPES.map(t=>section(t.title,h('p',{},`Appeal: ${t.appeal}`),paras(t.practice),btn('Practise this trope',()=>startAttempt({id:'trope-lab-'+t.title,course:'tropes',title:t.title+' variation lab',teach:`Appeal: ${t.appeal}. ${t.practice}`,exercise:`Build an original premise using ${t.title.toLowerCase()}. Identify the expectation you retain, one variation and three setups needed to earn the payoff. Audit who gets agency.`,checks:['Is the familiar appeal retained or thoughtfully replaced?','Is the variation planted?','Have I checked agency and stereotypes?']}))))));};const navigation=h('div');const drawTabs=()=>navigation.replaceChildren(tabs([['genres','Genres'],['themes','Themes'],['tropes','Tropes']],mode,t=>{mode=t;draw();drawTabs();}));draw();drawTabs();return h('div',{class:'stack-lg narrow'},heading('Genre, theme & trope library','Starting points, not an exhaustive taxonomy or rules every story must follow.'),h('details',{class:'fold'},h('summary',{},'More library tools'),learningRow('Author technique labs','Study broad craft choices','labs'),h('a',{class:'learning-row',href:'#/plots'},'Plot structures ›'),h('a',{class:'learning-row',href:'#/craft'},'Craft reference ›')),navigation,body);
}
function builderView(requested) {
 let builder=currentWorkbook();
 if(!builder)builder={id:uid(),type:'training',project:'',created:Date.now(),kind:'builder',book:S.project?.id || '',fields:{},genre:GENRES[0].id,structure:'three'};
 builder.fields ||= {};
 const stages=[['premise','Premise'],['characters','Characters'],['conflict','Conflict'],['structure','Structure'],['scenes','Scenes'],['review','Review']];
 const selected=stages.some(([key])=>key===requested)?requested:builder.step || 'premise';
 const index=Math.max(0,stages.findIndex(([key])=>key===selected));
 const save=()=>put(builder);
 const move=i=>{builder.step=stages[i][0];save();go('training/builder/'+stages[i][0]);};
 const root=h('div',{class:'stack-lg narrow learning-workbook'},heading('Story workbook',S.project?`For ${S.project.title || 'Untitled book'}. Build it one decision at a time.`:'Start with an idea. You can connect a book when you are ready.'),
 h('nav',{class:'learning-steps workbook-steps','aria-label':'Workbook steps'},stages.map(([key,title],i)=>h('button',{type:'button',class:i===index?'current':'','aria-current':i===index?'step':null,onClick:()=>move(i)},h('span',{'aria-hidden':true},i+1),title))),h('p',{class:'small muted',role:'status'},`Step ${index+1} of ${stages.length} · changes save as you type`));
 const structure=()=>STRUCTURES.find(s=>s.id===builder.structure) || STRUCTURES[0];
 const inputField=key=>{
  const [,label,hint]=BUILD_FIELDS.find(f=>f[0]===key);
  return field(label,h('textarea',{class:'in',rows:key==='characterName'?1:4,value:builder.fields[key] || '', 'aria-label':label,onInput:e=>{builder.fields[key]=e.target.value;save();}}),hint);
 };
 if(index===0)root.append(section('What story are you exploring?',h('p',{class:'muted'},'Choose the reader experience and the question that will carry the story.'),field('Genre',h('select',{class:'in','aria-label':'Story genre',onChange:e=>{builder.genre=e.target.value;save();}},GENRES.map(g=>h('option',{value:g.id,selected:g.id===builder.genre},g.title)))),inputField('premise')),learningRow('Need a starting point?','Practise a genre premise','lesson/genre-1'));
 if(index===1)root.append(section('Who drives the story?',inputField('characterName'),inputField('character')),learningRow('Develop a rounded character','Desire, values and contradiction','lesson/characters-1'));
 if(index===2)root.append(section('What makes the choices difficult?',inputField('conflict')),h('details',{class:'fold',open:!!builder.fields.theme},h('summary',{},'Theme and motif'),inputField('theme')),h('details',{class:'fold',open:!!builder.fields.tropes},h('summary',{},'Tropes and variation'),inputField('tropes')),learningRow('Build meaningful opposition','Opposing wants','lesson/conflict-1'));
 if(index===3){
  const help=h('div',{class:'stack'});
  const draw=()=>help.replaceChildren(h('ol',{},structure().parts.map(p=>h('li',{},p))),h('p',{class:'muted small'},'A structure is a guide, not a required formula. Existing scene assignments stay intact; review them if you change the number of acts.'));
  root.append(section('Choose the shape',field('Structure',h('select',{class:'in','aria-label':'Story structure',onChange:e=>{builder.structure=e.target.value;save();draw();}},STRUCTURES.map(s=>h('option',{value:s.id,selected:s.id===structure().id},s.title)))),help,
  btn('Use these act prompts',async()=>{if(builder.fields.acts && !await confirmDlg('Replace act notes?','Only these workbook notes change. Your scene cards stay intact.','Replace','primary'))return;builder.fields.acts=structure().parts.map(p=>p+': ').join('\n');save();actNotes.value=builder.fields.acts;},'ghost')));
  const actNotes=h('textarea',{class:'in',rows:6,value:builder.fields.acts || '', 'aria-label':'Act outline',onInput:e=>{builder.fields.acts=e.target.value;save();}});
  root.append(field('Act outline',actNotes,'Describe the choices that carry the story across each turn.'),h('details',{class:'fold',open:!!builder.fields.subplot},h('summary',{},'Subplot'),inputField('subplot')));draw();
 }
 if(index===4){
  const cards=h('div',{class:'stack-lg'});
  const draw=()=>{
   const scenes=workbookScenes(builder);
   cards.replaceChildren(...scenes.map((scene,i)=>{
    const edit=(key,value)=>{builder.scenes=workbookScenes(builder).map((s,n)=>n===i?{...s,[key]:value}:s);save();};
    const reorder=delta=>{const items=[...workbookScenes(builder)];[items[i],items[i+delta]]=[items[i+delta],items[i]];builder.scenes=items;save();draw();};
    const row=h('section',{class:'learning-scene stack','aria-label':`Scene ${i+1}`},h('h2',{},`Scene ${i+1}`));
    const choices=structure().parts.map((title,n)=>h('option',{value:n,selected:Number(scene.act)===n},title));
    if(Number(scene.act)>=choices.length)choices.unshift(h('option',{value:scene.act,selected:true},'Previous act '+(Number(scene.act)+1)+' — choose an act'));
    row.append(field('Title',h('input',{class:'in',value:scene.title,'aria-label':`Scene ${i+1} title`,onInput:e=>edit('title',e.target.value)})),field('Act',h('select',{class:'in','aria-label':`Scene ${i+1} act`,onChange:e=>edit('act',Number(e.target.value))},choices)),
    ...[['goal','Goal','What does the character want here?'],['conflict','Resistance','What prevents the easy outcome?'],['outcome','Turn and consequence','What changes, and what must happen next?']].map(([key,title,hint])=>field(title,h('textarea',{class:'in',rows:2,value:scene[key] || '', 'aria-label':`Scene ${i+1} ${title.toLowerCase()}`,onInput:e=>edit(key,e.target.value)}),hint)),
    h('div',{class:'row'},btn('Move up',()=>reorder(-1),'ghost sm'),btn('Move down',()=>reorder(1),'ghost sm'),btn('Remove',()=>{const items=[...workbookScenes(builder)],removed=items.splice(i,1)[0];builder.scenes=items;save();draw();toast('Scene removed from the workbook.',['Undo',()=>{const restored=[...workbookScenes(builder)];restored.splice(i,0,removed);builder.scenes=restored;save();draw();}]);},'ghost sm')));
    const buttons=row.querySelectorAll('button');buttons[0].disabled=i===0;buttons[1].disabled=i===scenes.length-1;
    if(scene.legacy)row.append(h('details',{class:'fold'},h('summary',{},'Original scene-plan line'),paras(scene.legacy)));
    return row;
   }));
   if(!scenes.length)cards.append(h('div',{class:'learning-empty'},h('h2',{},'Plan your first scene'),h('p',{class:'muted'},'Give it a goal, resistance and a turn. Add details as you learn.')));
  };
  root.append(section('Turn the outline into scenes',h('p',{class:'muted'},'Each scene has its own fields. Use the act picker to place it in your story.'),cards,btn('Add scene',()=>{builder.scenes=[...workbookScenes(builder),{id:uid(),act:0,title:'',goal:'',conflict:'',outcome:''}];save();draw();},'ghost')));draw();
  if(builder.fields.beats)root.append(h('details',{class:'fold'},h('summary',{},'Original scene-plan notes'),paras(builder.fields.beats)));
 }
 if(index===5)root.append(section('Make the ending earn its place',inputField('ending')),section('Your plan',h('dl',{class:'learning-summary'},h('dt',{},'Genre'),h('dd',{},GENRES.find(g=>g.id===builder.genre)?.title || 'Not selected'),h('dt',{},'Structure'),h('dd',{},structure().title),h('dt',{},'Scenes'),h('dd',{},workbookScenes(builder).length),h('dt',{},'Character'),h('dd',{},builder.fields.characterName || 'Not named'))),
 builder.exported?h('div',{class:'learning-group'},h('p',{},'Plan already added. Edit the exported cards in your storyboard.'),h('a',{href:'#/story',class:'learning-row'},'Open storyboard ›')):btn('Add plan to book',async()=>{
  if(!S.project)return toast('Open a book in Books, then return to this workbook.');
  const planned=storyExport(builder,S.project.id,[...S.recs.values()]);
  if(planned.alreadyExported || builder.exported)return toast('This plan is already in the book. Your existing cards stay intact.');
  if(!planned.scenes.length)return toast('Add a scene in the Scenes step first.');
  if(workbookScenes(builder).some(s=>Number(s.act)>=structure().parts.length))return toast('Choose a valid act for each scene in the Scenes step.');
  if(!await confirmDlg('Add this plan?',`Add ${planned.scenes.length} outlined scenes${planned.character?' and a character dossier':''} to ${S.project.title || 'Untitled book'}? Existing drafts stay intact.`,'Add plan','primary'))return;
  try{await saveForAction(builder);const result=await req('POST','api/academy-export',{builderId:builder.id,projectId:S.project.id});for(const record of result.records)S.recs.set(record.id,record);S.project=S.recs.get(S.project.id);builder=S.recs.get(builder.id);toast('Plan added to the book.');go('story');}catch(e){toast(e.message);}
 },'primary'),h('p',{class:'small muted'},'Adds outlined cards with empty drafts and your character dossier. Existing cards remain unchanged. A blank storyboard adopts your structure; an existing board keeps its act labels.'),h('div',{class:'row'},h('a',{href:'#/story',class:'btn ghost'},'Storyboard'),h('a',{href:'#/bible',class:'btn ghost'},'Story bible')));
 root.append(h('div',{class:'learning-step-actions'},index>0?btn('Previous',()=>move(index-1),'ghost'):null,index<stages.length-1?btn('Continue',()=>move(index+1),'primary'):null));
 return root;
}
