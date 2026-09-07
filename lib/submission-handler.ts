import { validateSubmission, writeSubmission, type IntegrationConfig, type Submission } from './submission.ts';
type Writer=(s:Submission,config:IntegrationConfig)=>Promise<{saved:boolean;submissionId:string}>;
export async function handleSubmission(request:Request,config:IntegrationConfig,writer:Writer=writeSubmission){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return json({error:'Отправка разрешена только с сайта Digital Hub.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Ожидается JSON.'},415);
 if(Number(request.headers.get('content-length'))>16000)return json({error:'Слишком большой запрос.'},413);
 let input:unknown;
 try {
  if(!request.body)return json({error:'Пустой запрос.'},400);
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16000){await reader.cancel();return json({error:'Слишком большой запрос.'},413);}chunks.push(value);}
  input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }catch{return json({error:'Некорректный запрос.'},400);}
 let submission:Submission;
 try{submission=validateSubmission(input);}catch(e){return json({error:e instanceof Error?e.message:'Проверь ответы.'},400);}
 try{return json(await writer(submission,config));}catch(e){
  const code=e instanceof Error?e.message:'';
  if(code==='NOT_CONFIGURED')return json({error:'Приём результатов пока не подключён. Скачай профиль и свяжись с куратором.'},503);
  if(code==='ID_CONFLICT')return json({error:'Этот номер уже записан с другими ответами. Начни новое прохождение для изменений.'},409);
  return json({error:'Не удалось подтвердить запись в таблицу. Повтори отправку — дубликат не создастся.'},502);
 }
}
