export const categories = ['Политех','QA / IT','Права','Спорт','Работа','Личное'];
export type Task = {id:string; title:string; description:string; category:string; date:string; duration:number; priority:string; done:boolean; completedAt?:string};
export type Event = {id:string; title:string; category:string; date:string; start:string; end:string};
export type Entry = {id:string; date:string; text:string; energy:number; mood:number; fatigue:number};
export type Message = {id:string; role:'user'|'assistant'; content:string; date:string};
export type Settings = {name:string; sleep:number; commute:number; priorities:string; schedule:string; onboarded:boolean};
export type State = {tasks:Task[]; events:Event[]; entries:Entry[]; messages:Message[]; settings:Settings};
export const initial:State = {tasks:[],events:[],entries:[],messages:[],settings:{name:'',sleep:8,commute:30,priorities:'Учёба и здоровье, карьера QA, регулярные ПДД, спорт с восстановлением',schedule:'',onboarded:false}};
const date = (v:unknown) => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const str = (v:unknown,max=20000) => typeof v==='string' && v.length<=max;
const num = (v:unknown,min:number,max:number) => typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
export function validate(v:unknown):v is State {
 if(!v || typeof v!=='object')return false;
 const s=v as State;
 if(!['tasks','events','entries','messages'].every(k=>Array.isArray((s as unknown as Record<string,unknown>)[k]) && ((s as unknown as Record<string,unknown[]>)[k].length<=10000)))return false;
 const ids=(a:{id:string}[])=>a.every(x=>x&&str(x.id,100))&&new Set(a.map(x=>x.id)).size===a.length;
 return [s.tasks,s.events,s.entries,s.messages].every(a=>ids(a)) && s.tasks.every(t=>str(t.title,300)&&!!t.title.trim()&&str(t.description)&&categories.includes(t.category)&&date(t.date)&&num(t.duration,1,1440)&&['Высокий','Обычный','Низкий'].includes(t.priority)&&typeof t.done==='boolean'&&(t.completedAt===undefined||date(t.completedAt))) && s.events.every(e=>str(e.title,300)&&!!e.title.trim()&&categories.includes(e.category)&&date(e.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e.end)&&e.end>e.start) && s.entries.every(e=>date(e.date)&&str(e.text)&&num(e.energy,1,10)&&num(e.mood,1,10)&&num(e.fatigue,1,10)) && s.messages.every(m=>['user','assistant'].includes(m.role)&&str(m.content,30000)&&str(m.date,100)) && !!s.settings && str(s.settings.name,100)&&num(s.settings.sleep,4,12)&&num(s.settings.commute,0,240)&&str(s.settings.priorities)&&str(s.settings.schedule)&&typeof s.settings.onboarded==='boolean';
}
export const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
export function windows(events:Event[],from=8*60,to=23*60){let cursor=from;const free:[number,number][]=[];for(const e of [...events].sort((a,b)=>a.start.localeCompare(b.start))){const start=Math.min(to,Math.max(from,minutes(e.start))),end=Math.min(to,minutes(e.end));if(start>cursor)free.push([cursor,start]);cursor=Math.max(cursor,end);}if(cursor<to)free.push([cursor,to]);return free;}
export const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
