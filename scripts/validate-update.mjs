import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {decodeModelResponse,fetchModelChunk} from '../app/model-download.ts';
import {defaultModelQuality,stableViewport} from '../app/model-quality.ts';
const root=new URL('../',import.meta.url);
const original=JSON.parse(fs.readFileSync(new URL('public/models/atlas.json',root)));
const mobile=JSON.parse(fs.readFileSync(new URL('public/models/atlas-mobile.json',root)));
assert.equal(original.triangles,2288268);
assert.deepEqual(mobile.parts.map(p=>p.id),original.parts.map(p=>p.id));
assert.deepEqual(mobile.concepts,original.concepts);
assert.ok(mobile.triangles<original.triangles&&mobile.triangles>500000);
// Original atlas is byte-for-byte the first delivered atlas, not a recreated mesh.
execFileSync('git',['diff','--exit-code','152836d','--','public/models/atlas.json','public/models/body-*.bin','public/models/body-*.bin.gz'],{cwd:root,stdio:'pipe'});
for(const atlas of [original,mobile])for(const chunk of atlas.chunks){
 const raw=fs.readFileSync(new URL('public'+chunk.url,root));
 assert.equal(raw.length,chunk.bytes);
 assert.ok(gunzipSync(fs.readFileSync(new URL('public'+chunk.gzip,root))).equals(raw));
}
console.log('Original desktop geometry unchanged; all 2,234 parts and concepts retained in the mobile derivative.');

assert.equal(stableViewport(0,0,{width:0,height:0}),null);
assert.equal(stableViewport(NaN,800,{width:0,height:0}),null);
assert.equal(stableViewport(Infinity,800,{width:0,height:0}),null);
assert.equal(stableViewport(390.1,700.1,{width:390,height:700}),null);
assert.deepEqual(stableViewport(700,390,{width:390,height:700}),{width:700,height:390});
assert.equal(defaultModelQuality(),'original');
let resized=0,previous={width:0,height:0};
for(const [w,h] of [[0,0],[390,700],[390,700],[390.1,700.1],[700,390],[700,390]]){
 const next=stableViewport(w,h,previous);if(next){resized++;previous=next;}
}
assert.equal(resized,2,'Duplicate size notifications must not refit the camera.');
console.log('Zero-sized and duplicate viewport notifications rejected; orientation change accepted once.');

const bytes=new Uint8Array([1,4,9,16,25]),gz=gzipSync(bytes);
assert.deepEqual(new Uint8Array(await decodeModelResponse(new Response(gz),5,true)),bytes);
assert.deepEqual(new Uint8Array(await decodeModelResponse(new Response(bytes),5,true)),bytes);
await assert.rejects(decodeModelResponse(new Response(bytes),6,false));
const realFetch=globalThis.fetch;let calls=[];
try{
 globalThis.fetch=async url=>{calls.push(url);return url.endsWith('.gz')?new Response('',{status:404}):new Response(bytes);};
 assert.deepEqual(new Uint8Array(await fetchModelChunk({url:'/body.bin',gzip:'/body.bin.gz',bytes:5},new AbortController().signal)),bytes);
 assert.deepEqual(calls,['/body.bin.gz','/body.bin']);
 calls=[];globalThis.fetch=async url=>{calls.push(url);throw new Error('Aborted');};
 const controller=new AbortController();controller.abort();
 await assert.rejects(fetchModelChunk({url:'/body.bin',gzip:'/body.bin.gz',bytes:5},controller.signal));
 assert.equal(calls.length,1,'An aborted load must not start a fallback request.');
}finally{globalThis.fetch=realFetch;}
console.log('Gzip/raw decoding, partial-file detection, raw fallback and abort behavior passed.');
