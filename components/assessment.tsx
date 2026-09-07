'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Clock3, Download, Leaf, RotateCcw, Users, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { questions, scales, calculate, type Answers } from '@/lib/assessment';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
const sections = ['Мотивация и рост', 'В команде', 'От идеи до результата', 'Твой ритм'];
const agree = ['Совсем не про меня', 'Скорее не про меня', 'Зависит от ситуации', 'Скорее про меня', 'Точно про меня'];
export default function Assessment({collectionReady}:{collectionReady:boolean}) {
 const [started,setStarted]=useState(false);
 const [candidate,setCandidate]=useState({name:'',group:'',email:''});
 const [consent,setConsent]=useState(false);
 const [website,setWebsite]=useState('');
 const [sending,setSending]=useState(false);
 const [saved,setSaved]=useState(false);
 const [sendError,setSendError]=useState('');
 const submissionId=useRef('');
 const sendingRef=useRef(false);
 const [answers, setAnswers] = useState<Answers>({});
 const [step, setStep] = useState(0);
 const [done, setDone] = useState(false);
 const title = useRef<HTMLHeadingElement>(null);
 const q = questions[step];
 const count = Object.keys(answers).length;
 const result = done ? calculate(answers) : null;
 useEffect(() => { title.current?.focus(); }, [step, done, started]);
 function updateCandidate(key:'name'|'group'|'email',value:string){submissionId.current='';setCandidate(previous=>({...previous,[key]:value}));}
 function move(next: number) { setStep(next); window.scrollTo({ top: 0, behavior: 'instant' }); }
 async function sendResult(){
  if(sendingRef.current||saved)return;
  if(!collectionReady){setSendError('Приём результатов пока не подключён. Сохрани профиль и передай его куратору.');return;}
  if(!submissionId.current)submissionId.current=crypto.randomUUID();
  sendingRef.current=true;setSending(true);setSendError('');
  try {
   const response=await fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId:submissionId.current,candidate,consent,answers,website}),signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!response.ok||data.saved!==true)throw new Error(data.error||'Не удалось подтвердить запись. Повтори отправку.');
   setSaved(true);
  }catch(error){setSendError(error instanceof Error&&error.name==='TimeoutError'?'Подтверждение не пришло вовремя. Повтори отправку — повторная строка не появится.':error instanceof Error?error.message:'Сеть недоступна. Повтори отправку.');}
  finally{sendingRef.current=false;setSending(false);}
 }
 function download() {
  const data = calculate(answers);
  const blob = new Blob([`DIGITAL HUB — МОЙ ПРОФИЛЬ\n${candidate.name} · ${candidate.group}\n\n${data.title}\n${data.summary}\n\n${scales.map(s => `${s.label}: ${data.scores[s.key]}/100`).join('\n')}\n\nНагрузка: ${data.hours}\n${data.capacity}\nКоманда: ${data.team}\nОбязательства: ${data.commitment}\n\nРоли:\n${data.roles.map(r => `${r.title}: ${r.text}`).join('\n')}\n\nПлан развития:\n${data.tips.join('\n')}\n\nСамооценка, не психологическая диагностика и не решение о приёме.\n${saved?'Запись подтверждена. Номер: '+submissionId.current:'Запись в таблицу не подтверждена.'}`], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'digital-hub-profile.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <div className="site-shell">
 <header className="site-header"><a className="brand" href="/" aria-label="Digital Hub — главная"><span className="brand-icon">dh<span>↗</span></span><span>digital hub<span className="brand-caption">УНИВЕРСИТЕТСКОЕ СООБЩЕСТВО</span></span></a><span className="cohort"><span/> Первые резиденты</span></header>
 {!started ? <main className="onboarding-wrap"><div><Link href="/">← О Digital Hub</Link><div className="eyebrow">ШАГ 1 · ЗНАКОМСТВО</div><h1>Давай познакомимся.</h1><p>Профиль поможет обсудить, какая роль и нагрузка тебе подходят. Сначала — несколько слов о тебе, затем 30 вопросов.</p><div className="meta"><span><Clock3 size={16}/> 7–10 минут</span><span>Можно вернуться к ответам</span></div></div><form className="panel candidate-form" onSubmit={e=>{e.preventDefault();if(consent){setStarted(true);window.scrollTo(0,0);}}}>
  <h2>Как к тебе обращаться?</h2><label>Имя и фамилия<input name="name" autoComplete="name" required minLength={2} maxLength={100} value={candidate.name} onChange={e=>updateCandidate('name',e.target.value)} placeholder="Например, Айдана Серикова"/></label><label>Учебная группа<input name="group" required maxLength={80} value={candidate.group} onChange={e=>updateCandidate('group',e.target.value)} placeholder="Например, ИС-24-1"/></label><label>Email для связи<input name="email" type="email" autoComplete="email" required maxLength={160} value={candidate.email} onChange={e=>updateCandidate('email',e.target.value)} placeholder="you@example.com"/></label>
  <div className="honeypot" aria-hidden="true"><label>Ваш сайт<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
  <label className="consent-row"><Checkbox checked={consent} onCheckedChange={v=>setConsent(Boolean(v))}/><span>Согласен передать имя, группу, email, ответы и профиль в Google Таблицу Digital Hub для знакомства с куратором. <Link href="/privacy" target="_blank">Как используются данные ↗</Link></span></label>
  {!collectionReady&&<p className="collection-warning" role="status">Приём в таблицу ещё не подключён. Можно пройти опрос и скачать профиль, но запись куратору пока недоступна.</p>}
  <button type="submit" className="primary-button" disabled={!consent}>Перейти к вопросам <ArrowRight size={18}/></button><p className="muted">Черновик хранится в этой вкладке. При обновлении страницы он сбросится.</p>
 </form></main> : <main className={done ? 'results-wrap' : 'assessment-wrap'}>
 {!done ? <>
 <aside className="intro"><div className="eyebrow">ЗНАКОМСТВО С DIGITAL HUB</div><h1>Большие идеи. <br/>Разные люди.<br/><em>Твоё место в команде.</em></h1><p>Расскажи, как ты учишься, работаешь с людьми и воплощаешь идеи. В конце — твой профиль и роли, которые стоит попробовать.</p><div className="meta"><span><Clock3 size={16}/> 7–10 минут</span><span>30 вопросов</span></div><ol className="section-list">{sections.map((s,i)=><li key={s} className={q.section===i?'active':q.section>i?'complete':''}><span>{q.section>i?<Check size={16}/>:String(i+1).padStart(2,'0')}</span>{s}{q.section===i && <span className="current-dot"/>}</li>)}</ol><div className="gentle-note"><Leaf size={20}/><p>Здесь нет идеальных ответов.<br/>Ориентируйся на последние 2–3 месяца.</p></div></aside>
 <section className="question-area" aria-label="Опросник"><button className="back-button" type="button" onClick={()=>setStarted(false)}>← Мои данные</button><div className="progress-top"><span>{sections[q.section]}</span><span>{count} / {questions.length}</span></div><Progress value={count/questions.length*100} aria-label="Прогресс опросника"/>
 <form className="question-card" onSubmit={e=>{e.preventDefault(); if(answers[q.id]===undefined)return; if(step===questions.length-1){setDone(true);window.scrollTo(0,0);void sendResult();}else move(step+1);}}>
 <div className="question-kicker"><span>ВОПРОС {String(step+1).padStart(2,'0')}</span><span>{q.options?'Выбери один вариант':'Как это похоже на тебя?'}</span></div>
 <h2 ref={title} tabIndex={-1} id="question-title">{q.text}</h2><p className="question-hint">{q.hint || 'Выбери ответ, который ближе к тому, как ты обычно поступаешь.'}</p>
 <RadioGroup key={q.id} aria-labelledby="question-title" value={answers[q.id]===undefined?null:String(answers[q.id])} onValueChange={v=>{submissionId.current='';setAnswers(a=>({...a,[q.id]:Number(v)}));}} className="answer-list">{(q.options||agree).map((label,i)=><label key={label} className={`answer-option ${answers[q.id]===i?'selected':''}`}><RadioGroupItem value={String(i)} aria-label={label}/><span>{label}</span><span className="answer-number" aria-hidden="true">{i+1}</span></label>)}</RadioGroup>
 <div className="question-actions"><button type="button" className="back-button" disabled={step===0} onClick={()=>move(step-1)}><ArrowLeft size={18}/> Назад</button><button className="primary-button" disabled={answers[q.id]===undefined} type="submit">{step===questions.length-1?'Мой результат':'Дальше'}<ArrowRight size={18}/></button></div>
 </form><p className="privacy-note"><CheckCheck size={16}/> После последнего вопроса ответы и профиль будут отправлены куратору.<br/><Link href="/privacy">Как используются данные</Link></p>
 </section>
 </> : result && <>
 <div className="result-heading"><span className="result-check"><Check size={26}/></span><div className="eyebrow">ТВОЙ ПРОФИЛЬ DIGITAL HUB</div><h1 ref={title} tabIndex={-1}>{result.title}</h1><p>{result.summary}</p><span className="result-tag">30 из 30 · Знакомство завершено</span></div>
 <section className={`submission-status ${saved?'saved':''}`} aria-live="polite"><strong>{saved?'Результат записан':sending?'Сохраняем результат…':'Запись пока не подтверждена'}</strong><p>{saved?`Куратор сможет увидеть твой профиль. Номер отправки: ${submissionId.current}`:sending?'Подождём подтверждения Google Таблицы. Не закрывай эту вкладку.':sendError||'Отправь результат, чтобы он появился у куратора.'}</p>{!saved&&!sending&&<button className="primary-button" onClick={()=>void sendResult()} disabled={!collectionReady}>Повторить отправку</button>}</section>
 <div className="results-grid"><section className="panel scale-panel"><div className="panel-heading"><h2>Твои командные качества</h2><span>Самооценка / 100</span></div><p className="muted">Баллы отражают твои ответы сейчас, а не сравнение с другими студентами.</p>{scales.map(s=><div className="scale-row" key={s.key}><div><strong>{s.label}</strong><span>{result.scores[s.key]} <small>/ 100</small></span></div><Progress value={result.scores[s.key]} aria-label={s.label}/><p>{result.scores[s.key]>=70?s.high:result.scores[s.key]>=40?s.mid:s.low}</p></div>)}</section>
 <div className="result-sidebar"><section className="panel capacity-panel"><Clock3 size={24}/><h2>Твой рабочий ритм</h2><strong className="hours">{result.hours}</strong><p>{result.capacity}</p><hr/><p><strong>Команда:</strong> {result.team}</p><p><strong>Обязательства:</strong> {result.commitment}</p></section><section className="panel"><Users size={24}/><h2>Роли, которые стоит попробовать</h2>{result.roles.map((r,i)=><div className="role" key={r.title}><span>0{i+1}</span><div><h3>{r.title}</h3><p>{r.text}</p></div></div>)}<p className="muted">Это гипотезы для пробной задачи. Навыки и интерес к конкретной области стоит обсудить с куратором.</p></section></div></div>
 <section className="panel growth-panel"><div><Sparkles size={24}/><h2>Твои следующие шаги</h2><p className="muted">Небольшой план на первые две недели.</p></div><ol>{result.tips.map(t=><li key={t}>{t}</li>)}</ol></section>
 <section className="result-disclaimer"><h3>Профиль — повод для разговора</h3><p>Это авторский опросник самооценки, а не валидированная психологическая методика. Он не ставит диагнозов и не определяет, примут ли тебя в Digital Hub. Высокие баллы не гарантируют результат, а низкие помогают выбрать поддержку.</p></section>
 <div className="result-actions"><button className="primary-button" onClick={download}><Download size={18}/> Скачать профиль</button>{!saved&&<button className="back-button" disabled={sending} onClick={()=>{setDone(false);move(0);}}><ArrowLeft size={18}/> Изменить ответы</button>}<button className="back-button" disabled={sending} onClick={()=>{submissionId.current='';setSaved(false);setSendError('');setStarted(false);setConsent(false);setAnswers({});setDone(false);move(0);}}><RotateCcw size={16}/> Пройти заново</button></div>
 </>}
 </main>}<footer><span>digital hub <span className="footer-star">✳</span> Создаём вместе.</span><Link href="/privacy">Об использовании данных</Link></footer>
 </div>;
}


