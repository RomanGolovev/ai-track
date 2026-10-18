// Run after npm run build. Uses a separate temporary SQLite database.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {planEvents,shiftDate} from '../lib/weekly.ts';
const temp=await mkdtemp(join(tmpdir(),'life-os-week-'));
let invalid=false;let received;
const mock=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;received=JSON.parse(body);const week=JSON.parse(received.messages[1].content).week;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:invalid?'invalid JSON':JSON.stringify({explanation:'После смены выделен сон, утро свободно от дел.',warnings:[],blocks:[{id:'night',title:'Смена',category:'Работа',date:shiftDate(week,4),start:'22:00',endDate:shiftDate(week,5),end:'06:00',kind:'fixed',reason:'По вводу пользователя'},{id:'sleep',title:'Сон после смены',category:'Личное',date:shiftDate(week,5),start:'07:00',endDate:shiftDate(week,5),end:'15:00',kind:'rest',reason:'Восстановление'}]})}}))});
await new Promise(r=>mock.listen(0,'127.0.0.1',r));
const port=20000+Math.floor(Math.random()*20000),base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,OLLAMA_BASE_URL:`http://127.0.0.1:${mock.address().port}`,LIFE_OS_DATA_DIR:temp},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
const get=async()=>await(await fetch(base+'/api/data')).json();
const put=async data=>{const current=await get();const r=await fetch(base+'/api/data',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,revision:current.revision})});assert.equal(r.status,200);return get()};
const generate=(week='2026-10-19')=>fetch(base+'/api/week',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({week,input:'Пятница смена 22:00 — суббота 06:00',now:'2026-10-18T12:00:00Z',timezone:'Europe/Moscow'})});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/data')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,logs);
 const before=await get();const response=await generate();assert.equal(response.status,200);let {data}=await response.json();let plan=data.weekPlans[0];assert.equal(data.events.length,0);assert.equal(received.format,'json');assert.equal(plan.blocks.length,2);
 plan.acceptedAt=new Date().toISOString();data.events=planEvents(plan);await put(data);assert.equal((await get()).data.events.length,3);
 plan.actual[plan.blocks[0].id]={status:'partial',minutes:420,note:'Смена закончилась раньше'};await put(data);const backup=JSON.parse(JSON.stringify((await get()).data));assert.equal(backup.weekPlans[0].actual['0'].minutes,420);await put(backup);
 const following=await generate('2026-10-26');assert.equal(following.status,200);assert.match(received.messages[1].content,/Смена закончилась раньше/);
 invalid=true;const failed=await generate();assert.equal(failed.status,502);assert.equal((await get()).data.weekPlans.length,2);
 await put(before.data);console.log('PASS: structured generation, draft isolation, overnight acceptance, actual persistence, backup roundtrip, historical feedback, invalid AI response, legacy state');
}finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await new Promise(r=>mock.close(r));await rm(temp,{recursive:true,force:true})}
