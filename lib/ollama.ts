export type ChatMessage={role:'system'|'user'|'assistant';content:string};
export async function askOllama(messages:ChatMessage[],options:{url?:string;model?:string;timeout?:number;json?:boolean}={}){
 const base=options.url||process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434';
 const model=options.model||process.env.OLLAMA_MODEL||'qwen3:4b';
 let response:Response;
 try{response=await fetch(base.replace(/\/$/,'')+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(options.timeout||180000),body:JSON.stringify({model,messages,stream:false,think:false,...(options.json?{format:'json'}:{} ),options:{temperature:0.4,num_predict:options.json?6500:1400}})})}catch{throw Error('Ollama недоступна или ответ занял слишком долго. Запустите ollama serve на том же компьютере, где работает Life OS. Затем загрузите модель: ollama pull '+model+'. Для удалённой Ollama задайте OLLAMA_BASE_URL на сервере приложения.');}
 if(response.status===404)throw Error('Модель не найдена. Загрузите её командой ollama pull '+model+' и повторите запрос.');
 if(!response.ok)throw Error('Ollama не смогла обработать запрос. Проверьте доступную память и имя модели в OLLAMA_MODEL.');
 const result=await response.json();const answer=result?.message?.content;
 if(typeof answer!=='string'||!answer.trim())throw Error('Модель вернула пустой ответ. Попробуйте повторить запрос или выбрать другую модель.');
 return answer.trim();
}
