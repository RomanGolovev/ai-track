import 'server-only';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {initial,type State} from './model';
const dataDirectory=resolve(process.env.LIFE_OS_DATA_DIR||'data');
mkdirSync(dataDirectory,{recursive:true});
const db = new DatabaseSync(resolve(dataDirectory,'life-os.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
db.prepare('INSERT OR IGNORE INTO state(id,value) VALUES(1,?)').run(JSON.stringify(initial));
export function read(){const r=db.prepare('SELECT value, revision FROM state WHERE id=1').get() as {value:string;revision:number};return {data:JSON.parse(r.value) as State,revision:r.revision};}
export function write(data:State,revision:number){return db.prepare('UPDATE state SET value=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(data),revision).changes>0;}
