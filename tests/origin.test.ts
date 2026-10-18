import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin} from '../lib/origin.ts';
test('same-origin requests use public Host instead of normalized bind URL',()=>{assert.equal(sameOrigin(new Request('http://0.0.0.0:3000/api/data',{headers:{host:'localhost:3000',origin:'http://localhost:3000'}})),true);assert.equal(sameOrigin(new Request('http://0.0.0.0:3000/api/data',{headers:{host:'localhost:3000',origin:'http://evil.example'}})),false)});
