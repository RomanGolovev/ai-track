import {sameOrigin} from '@/lib/origin';
import {read,write} from '@/lib/db';
import {validate} from '@/lib/model';
import {applyProposal} from '@/lib/assistant';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Недопустимый источник'},{status:403});
 try{const {messageId,decision,revision}=await req.json();if(typeof messageId!=='string'||!['accept','reject'].includes(decision)||!Number.isInteger(revision))return Response.json({error:'Некорректное подтверждение'},{status:400});
 const current=read();if(current.revision!==revision)return Response.json({error:'Данные изменились. Обновите страницу и проверьте предложение.'},{status:409});
 const m=current.data.messages.find(m=>m.id===messageId&&m.role==='assistant');if(!m?.proposal||m.proposal.status!=='pending')return Response.json({error:'Предложение уже обработано или не найдено'},{status:409});
 const next=decision==='accept'?applyProposal(current.data,m):{...current.data,messages:current.data.messages.map(x=>x.id===m.id?{...x,proposal:{...x.proposal!,status:'rejected' as const}}:x)};
 if(!validate(next))return Response.json({error:'Предложение некорректно. Ничего не изменено.'},{status:400});
 if(!write(next,revision))return Response.json({error:'Конфликт записи. Обновите страницу.'},{status:409});return Response.json({data:next,revision:revision+1});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Не удалось применить предложение'},{status:400});}
}
