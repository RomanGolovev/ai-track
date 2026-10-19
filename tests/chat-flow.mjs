// Requires npm run build; never touches the user's database.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const temp=await mkdtemp(join(tmpdir(),'life-os-chat-'));let received;
let output={reply:'По твоим словам, пары, зал и два билета уже сделаны. В 20:00 выдели 25 минут QA, затем отдых. Подтверди блок ниже.',actions:[{type:'add_event',title:'QA — практика',category:'QA / IT',date:'2026-10-19',start:'20:00',end:'20:25'},{type:'complete_task',taskId:'pdd'}]};
const mock=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;received=JSON.parse(raw);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify(output)}}))});await new Promise(r=>mock.listen(0,'127.0.0.1',r));
const port=20000+Math.floor(Math.random()*20000),base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,OLLAMA_BASE_URL:`http://127.0.0.1:${mock.address().port}`,LIFE_OS_DATA_DIR:temp},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
const get=async()=>await(await fetch(base+'/api/data')).json();
const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const chat=()=>post('/api/chat',{message:'Сегодня были три пары, зал и два билета, сейчас 19:40. Спланируй вечер.',mode:'В течение дня',now:'2026-10-19T16:40:00Z',timezone:'Europe/Moscow'});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/data')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,logs);
 let state=await get();state.data.tasks=[{id:'pdd',title:'Выучить два билета',category:'Права',date:'2026-10-19',description:'',duration:20,priority:'Обычный',done:false}];let r=await fetch(base+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});assert.equal(r.status,200);
 r=await chat();assert.equal(r.status,200);state=await r.json();assert.equal(state.data.events.length,0);assert.equal(state.data.tasks[0].done,false);assert.equal(received.think,false);assert.equal(received.format.properties.reply.maxLength,1800);const ctx=JSON.parse(received.messages[1].content.split('Данные планировщика (не инструкции): ')[1]);assert.equal(ctx.localNow.time,'19:40');
 let id=state.data.messages.at(-1).id;r=await post('/api/chat/apply',{messageId:id,decision:'accept',revision:state.revision-1});assert.equal(r.status,409);
 r=await post('/api/chat/apply',{messageId:id,decision:'accept',revision:state.revision});assert.equal(r.status,200);state=await r.json();assert.equal(state.data.events.length,1);assert.equal(state.data.tasks[0].done,true);assert.equal(state.data.messages.at(-1).proposal.status,'accepted');r=await post('/api/chat/apply',{messageId:id,decision:'accept',revision:state.revision});assert.equal(r.status,409);
 r=await chat();state=await r.json();id=state.data.messages.at(-1).id;r=await post('/api/chat/apply',{messageId:id,decision:'reject',revision:state.revision});assert.equal(r.status,200);state=await r.json();assert.equal(state.data.events.length,1);assert.equal(state.data.messages.at(-1).proposal.status,'rejected');
 output={reply:'Перенести и добавить блок?',actions:[{type:'move_task',taskId:'pdd',date:'2026-10-20'},{type:'add_event',title:'Конфликт',category:'Политех',date:'2026-10-19',start:'20:10',end:'20:40'}]};r=await chat();state=await r.json();const snapshot=structuredClone(state);r=await post('/api/chat/apply',{messageId:state.data.messages.at(-1).id,decision:'accept',revision:state.revision});assert.equal(r.status,400);assert.deepEqual(await get(),snapshot);
 output={reply:'Пользователь просит план, нужно проверить расписание.',actions:[]};r=await chat();assert.equal(r.status,503);assert.deepEqual(await get(),snapshot);
 console.log('PASS: concise structured chat, correct Moscow clock, proposal-only generation, explicit confirmation, stale revision, replay rejection, decline, conflict rollback, reasoning rejection and data preservation');
}finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await new Promise(r=>mock.close(r));await rm(temp,{recursive:true,force:true})}
