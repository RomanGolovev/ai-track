import {sameOrigin} from '@/lib/origin';
import {askOllama} from '@/lib/ollama';
import {read,write} from '@/lib/db';
import {SYSTEM_PROMPT} from '@/lib/prompt';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Недопустимый источник'},{status:403});
 try{
 const {message,mode,now,timezone}=await req.json();if(typeof message!=='string'||!message.trim()||message.length>8000)return Response.json({error:'Введите сообщение до 8000 символов'},{status:400});
 const {data,revision}=read();
 const context={now,timezone,mode,settings:data.settings,tasks:data.tasks,events:data.events,entries:data.entries.slice(-30),weekPlans:(data.weekPlans||[]).slice(-4)};
 const answer=await askOllama([{role:'system',content:SYSTEM_PROMPT},{role:'user',content:'Актуальный контекст из базы: '+JSON.stringify(context)},...data.messages.slice(-20).map(m=>({role:m.role,content:m.content})),{role:'user',content:message}]);
 const messages=[...data.messages,{id:crypto.randomUUID(),role:'user' as const,content:message,date:new Date().toISOString()},{id:crypto.randomUUID(),role:'assistant' as const,content:answer,date:new Date().toISOString()}];
 if(!write({...data,messages},revision))return Response.json({error:'Данные изменились во время ответа. Повторите запрос.'},{status:409});
 return Response.json({data:{...data,messages},revision:revision+1});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Не удалось получить ответ локальной модели. Ваши данные сохранены.'},{status:503});}
}
