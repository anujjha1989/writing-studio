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
export function storyExport(builder, project, existing = []) {
 const fields=builder.fields || {}, lines=(fields.beats || '').split('\n').map(x=>x.trim()).filter(Boolean);
 const source=`academy:${builder.id}`;
 const structure=STRUCTURES.find(s=>s.id===builder.structure) || STRUCTURES[0];
 const scenes=lines.map((line,i)=>{
  const stage=line.match(/^\[(\d+)\]\s*/);const details=line.replace(/^\[\d+\]\s*/,'').split('|').map(x=>x.trim());
  return {type:'scene',project,academySource:source,academyIndex:i,order:i+1,act:Math.max(0,Math.min(structure.parts.length-1,(Number(stage?.[1]) || 1)-1)),title:details[0].slice(0,100),goal:details[1] || details[0],conflict:details[2] || '',outcome:details[3] || '',draft:'',words:0,status:'outlined',threads:[]};
 });
 const character=fields.character?.trim() ? {type:'char',project,name:fields.characterName?.trim() || 'Training character dossier',vals:{role:'Dossier developed in Training Studio',notes:fields.character,arcnotes:fields.theme || ''},academySource:source} : null;
 return {source,scenes,character,acts:structure.parts,alreadyExported:existing.some(r=>r.academySource===source)};
}
