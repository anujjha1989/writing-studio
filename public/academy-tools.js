import { STRUCTURES } from './content/storycraft.js';
import { LESSONS } from './content/academy.js';
export function nextPractice(records, priorities = []) {
 const done = new Set(records.filter(r=>r.complete && r.lesson).map(r=>r.lesson));
 const candidates = priorities.flatMap(id=>LESSONS.filter(l=>l.course===id && !done.has(l.id)));
 return candidates[0] || LESSONS.find(l=>!done.has(l.id)) || LESSONS[0];
}
export function practiceEvidence(records, course) {
 const attempts = records.filter(r=>r.course===course);
 return {attempts:attempts.length,revisions:attempts.reduce((n,r)=>n+Math.max(0,(r.versions?.length || 0)-1),0),completed:attempts.filter(r=>r.complete).length};
}
// Legacy scene-plan text remains untouched; the guided editor uses structured fields.
export function workbookScenes(builder) {
 if(Array.isArray(builder.scenes)) return builder.scenes;
 return String(builder.fields?.beats || '').split('\n').map(s=>s.trim()).filter(Boolean).map((line,i)=>{
  const stage=line.match(/^\[(\d+)\]\s*/);
  const parts=line.replace(/^\[\d+\]\s*/,'').split('|').map(s=>s.trim());
  return {id:`legacy-${i}`,act:Math.max(0,(Number(stage?.[1]) || 1)-1),title:parts[0],goal:parts[1] || parts[0],conflict:parts[2] || '',outcome:parts.slice(3).join(' | '),legacy:line};
 });
}
export function storyExport(builder, project, existing = []) {
 const fields=builder.fields || {}, planned=workbookScenes(builder).filter(s=>[s.title,s.goal,s.conflict,s.outcome].some(v=>String(v || '').trim()));
 const source=`academy:${builder.id}`;
 const structure=STRUCTURES.find(s=>s.id===builder.structure) || STRUCTURES[0];
 const scenes=planned.map((scene,i)=>({type:'scene',project,academySource:source,academyIndex:i,order:i+1,act:Math.max(0,Math.min(structure.parts.length-1,Number(scene.act) || 0)),title:String(scene.title || 'Untitled scene').slice(0,100),goal:scene.goal || '',conflict:scene.conflict || '',outcome:scene.outcome || '',draft:'',words:0,status:'outlined',threads:[]}));
 const character=fields.character?.trim() ? {type:'char',project,name:fields.characterName?.trim() || 'Training character dossier',vals:{role:'Dossier developed in Training Studio',notes:fields.character,arcnotes:fields.theme || ''},academySource:source} : null;
 return {source,scenes,character,acts:structure.parts,alreadyExported:existing.some(r=>r.academySource===source)};
}
