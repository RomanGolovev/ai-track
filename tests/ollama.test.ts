import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {askOllama} from '../lib/ollama.ts';
test('Ollama protocol sends context without keys and handles replies and missing model',async()=>{
 let missing=false;
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);assert.equal(req.url,'/api/chat');assert.equal(req.headers.authorization,undefined);assert.equal(body.model,'test-local');assert.equal(body.stream,false);assert.equal(body.messages[0].content,'Контекст дня');res.writeHead(missing?404:200,{'Content-Type':'application/json'});res.end(JSON.stringify(missing?{error:'not found'}:{message:{content:'Отдохни 20 минут.'}}));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');const url=`http://127.0.0.1:${address.port}`;
 try{assert.equal(await askOllama([{role:'user',content:'Контекст дня'}],{url,model:'test-local'}),'Отдохни 20 минут.');missing=true;await assert.rejects(askOllama([{role:'user',content:'Контекст дня'}],{url,model:'test-local'}),/ollama pull test-local/);}finally{await new Promise<void>(r=>server.close(()=>r()));}
 await assert.rejects(askOllama([],{url,timeout:1000}),/Ollama недоступна/);
});
