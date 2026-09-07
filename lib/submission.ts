import { createHash, createHmac } from 'node:crypto';
import { calculate, questions, scales, type Answers } from './assessment.ts';

export const VERSION='digital-hub-2';
export type Submission={submissionId:string;candidate:{name:string;group:string;email:string};consent:true;answers:Answers};
export const headers=['ID отправки','Контрольная сумма','Дата UTC','Версия опроса','Имя и фамилия','Группа','Email','Согласие на передачу','Профиль',...scales.map(s=>s.label), 'Часы в неделю','Формат команды','Готовность к дедлайнам','Расписание','Стиль общения','Интересующее направление','Рекомендуемые роли','Следующие шаги',...questions.map((q,i)=>`${i+1}. ${q.text}`)];
function object(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function field(value:unknown,max:number,min=1){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Проверь имя, группу и email.');return value.trim();}
export function validateSubmission(input:unknown):Submission {
 if(!object(input)||!object(input.candidate)||!object(input.answers))throw new Error('Некорректный формат отправки.');
 if(input.website!==undefined&&input.website!=='')throw new Error('Отправка отклонена.');
 if(input.consent!==true)throw new Error('Нужно согласие на передачу данных куратору.');
 if(typeof input.submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId))throw new Error('Некорректный номер отправки.');
 const candidate={name:field(input.candidate.name,100,2),group:field(input.candidate.group,80),email:field(input.candidate.email,160).toLowerCase()};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email))throw new Error('Проверь email.');
 if(Object.keys(input.answers).length!==questions.length)throw new Error('Ответь на все 30 вопросов.');
 const answers:Answers={};
 for(const q of questions){const v=input.answers[q.id];if(typeof v!=='number'||!Number.isInteger(v)||v<0||v>=(q.options?.length||5))throw new Error('Ответь на все 30 вопросов.');answers[q.id]=v;}
 return {submissionId:input.submissionId.toLowerCase(),candidate,consent:true,answers};
}
const agree=['Совсем не про меня','Скорее не про меня','Зависит от ситуации','Скорее про меня','Точно про меня'];
export function prepareRow(s:Submission,now=new Date()) {
 const result=calculate(s.answers);
 const answer=(id:string)=>{const q=questions.find(q=>q.id===id)!;return (q.options||agree)[s.answers[id]];};
 const hash=createHash('sha256').update(JSON.stringify({version:VERSION,candidate:s.candidate,answers:s.answers,consent:s.consent})).digest('hex');
 return {submissionId:s.submissionId,hash,version:VERSION,headers,row:[s.submissionId,hash,now.toISOString(),VERSION,s.candidate.name,s.candidate.group,s.candidate.email,'Да',result.title,...scales.map(x=>result.scores[x.key]),result.hours,result.team,result.commitment,answer('schedule'),answer('style'),answer('interest'),result.roles.map(r=>r.title).join('; '),result.tips.join('\n'),...questions.map(q=>answer(q.id))]};
}
export function signedEnvelope(s:Submission,secret:string,now=new Date()){
 const payload=JSON.stringify({...prepareRow(s,now),signedAt:now.getTime()});
 return {payload,signature:createHmac('sha256',secret).update(payload).digest('hex')};
}
export type IntegrationConfig={url?:string;secret?:string};
export async function writeSubmission(s:Submission,config:IntegrationConfig,fetcher:typeof fetch=fetch){
 if(!config.url||!config.secret||config.secret.length<32)throw new Error('NOT_CONFIGURED');
 const url=new URL(config.url);
 if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)||url.search)throw new Error('NOT_CONFIGURED');
 const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(signedEnvelope(s,config.secret)),redirect:'follow',signal:AbortSignal.timeout(22000),cache:'no-store'});
 if(!response.ok)throw new Error('UPSTREAM_FAILED');
 const data=await response.json();
 if(data?.ok!==true||data?.submissionId!==s.submissionId){if(data?.code==='ID_CONFLICT')throw new Error('ID_CONFLICT');throw new Error('UPSTREAM_FAILED');}
 return {saved:true,submissionId:s.submissionId};
}
