import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,validate,windows,type Event} from '../lib/model.ts';
const event=(start:string,end:string):Event=>({id:start,title:'Пара',category:'Политех',date:'2026-10-18',start,end});
test('backup validation accepts empty state and valid records',()=>{assert.equal(validate(initial),true);assert.equal(validate({...initial,events:[event('09:00','10:30')]}),true)});
test('invalid backups and inverted events are rejected',()=>{assert.equal(validate({}),false);assert.equal(validate({...initial,events:[event('12:00','10:30')]}),false);assert.equal(validate({...initial,settings:{...initial.settings,sleep:0}}),false);assert.equal(validate({...initial,events:[event('09:00','10:00'),event('09:00','10:00')]}),false)});
test('free windows merge overlapping events without inventing gaps',()=>{assert.deepEqual(windows([event('09:00','12:00'),event('10:00','13:00'),event('15:00','16:00')]),[[480,540],[780,900],[960,1380]])});
test('events outside visible day do not create invalid windows',()=>{assert.deepEqual(windows([event('01:00','07:00'),event('23:10','23:50')]),[[480,1380]])});
