import {sameOrigin} from '@/lib/origin';
import {read,write} from '@/lib/db';
import {validate} from '@/lib/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(read());}
export async function PUT(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Недопустимый источник'},{status:403});
 const raw=await req.text();if(raw.length>5_000_000)return Response.json({error:'Файл слишком большой'},{status:413});
 try{const {data,revision}=JSON.parse(raw);if(!validate(data)||!Number.isInteger(revision))return Response.json({error:'Неверный формат данных'},{status:400});if(!write(data,revision))return Response.json({error:'Данные изменились в другой вкладке. Обновите страницу.'},{status:409});return Response.json({revision:revision+1});}catch{return Response.json({error:'Не удалось прочитать данные'},{status:400});}
}
