import {sameOrigin} from '@/lib/origin';
import {read,write} from '@/lib/db';
import {askOllama} from '@/lib/ollama';
import {SYSTEM_PROMPT} from '@/lib/prompt';
import {isDate,shiftDate,validBlocks,analysis,type WeekPlan} from '@/lib/weekly';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Недопустимый источник'},{status:403});
 try{
 const {week,input,now,timezone}=await req.json();if(!isDate(week)||new Date(week).getUTCDay()!==1||typeof input!=='string'||!input.trim()||input.length>20000)return Response.json({error:'Выберите понедельник и опишите обязательства (до 20 000 символов).'},{status:400});
 const {data,revision}=read();
 const context={now,timezone,week,end:shiftDate(week,6),input,settings:data.settings,tasks:data.tasks.filter(t=>t.date<=shiftDate(week,6)&&!t.done),events:data.events.filter(e=>e.date>=shiftDate(week,-1)&&e.date<=shiftDate(week,7)),diary:data.entries.filter(e=>e.date<week).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30),previousPlans:(data.weekPlans||[]).filter(p=>p.week<week).slice(-4)};
 const answer=await askOllama([{role:'system',content:SYSTEM_PROMPT+`\nТы планируешь неделю с понедельника. Верни JSON без markdown: {"explanation":"почему так распределено и какие закономерности дневника учтены", "warnings":["перегрузка, неопределённости или короткие вопросы"], "blocks":[{"id":"уникальный", "title":"дело", "category":"Политех|QA / IT|Права|Спорт|Работа|Личное", "date":"YYYY-MM-DD", "start":"HH:mm", "endDate":"YYYY-MM-DD", "end":"HH:mm", "kind":"fixed|flexible|rest", "reason":"основание"}]}. Категория — одно значение, не список. План не более 60 блоков. Не дублируй события существующего календаря: они уже заняты. Точные обязательства из input фиксированы. Неизвестные дни/часы не выдумывай: спроси в warnings, оставь незапланированными. Расписание студента переменное, не копируй пары прошлой недели. У ночной смены endDate следующий день, после неё резервируй непрерывный сон по settings.sleep, дорогу и восстановление. Добавляй отдельные rest-блоки сна (в том числе ночного), еды и отдыха, дорогу с category Личное. Не размещай гибкие задачи в сон. Учитывай воскресную смену предыдущей недели и последствия смены в следующее воскресенье. Необязательные дела при перегрузке убирай и объясняй. Сравни предыдущие планы и actual: отсутствие actual не означает провал. Не делай выводов по одной записи, при устойчивой усталости снижай нагрузку. Никаких изменений календаря, это только черновик.`},{role:'user',content:JSON.stringify(context)}],{json:true});
 let result;try{result=JSON.parse(answer)}catch{return Response.json({error:'Модель вернула некорректный JSON. Календарь не изменён. Уточните ввод и повторите.'},{status:502})}
 if(!result||typeof result.explanation!=='string'||result.explanation.length>20000||!Array.isArray(result.warnings)||result.warnings.length>100||!result.warnings.every((x:unknown)=>typeof x==='string'&&x.length<=1000)||!validBlocks(result.blocks,week))return Response.json({error:'Модель вернула некорректные даты или блоки. Календарь не изменён; попробуйте уточнить обязательства.'},{status:502});
 result.blocks=result.blocks.map((b:Record<string,unknown>,i:number)=>({...b,id:String(i)}));
 const plan:WeekPlan={id:crypto.randomUUID(),week,input,createdAt:new Date().toISOString(),explanation:result.explanation,warnings:result.warnings,blocks:result.blocks,actual:{},baseline:{tasks:structuredClone(data.tasks.filter(t=>t.date>=week&&t.date<=shiftDate(week,6))),events:structuredClone(context.events)}};
 plan.warnings=[...plan.warnings,...analysis(plan,data).warnings];
 const next={...data,weekPlans:[...(data.weekPlans||[]),plan]};if(!write(next,revision))return Response.json({error:'Данные изменились во время генерации. Повторите запрос.'},{status:409});return Response.json({data:next,revision:revision+1});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Не удалось составить неделю'},{status:503})}
}
