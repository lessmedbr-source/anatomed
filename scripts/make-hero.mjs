import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
const dir=new URL('../public/',import.meta.url),atlas=JSON.parse(fs.readFileSync(new URL('models/atlas.json',dir)));
const chunks=atlas.chunks.map(c=>fs.readFileSync(new URL(c.url.slice(1),dir)));
const includedSystems=['skeletal','muscular','cardiac','digestive','respiratory','sensory'];
const build=(ratio,suffix)=>{
 const blocks=[],meta=[];let offset=0,triangles=0;
 for(const p of atlas.parts){
  if(!includedSystems.includes(p.system))continue;
  const b=chunks[p.chunk],pos=new Float32Array(b.buffer,b.byteOffset+p.positions,p.vertexCount*3),norm=new Int16Array(b.buffer,b.byteOffset+p.normals,p.vertexCount*3),ind=new Uint32Array(b.buffer,b.byteOffset+p.indices,p.indexCount);
  const target=Math.max(12,Math.floor(ind.length*ratio/3)*3);
  const [idx]=MeshoptSimplifier.simplifySloppy(ind,pos,3,null,target,.2);
  const [remap,count]=MeshoptSimplifier.compactMesh(idx),positions=new Float32Array(count*3),normals=new Int16Array(count*3);
  for(let old=0;old<remap.length;old++){const n=remap[old];if(n===0xffffffff)continue;positions.set(pos.subarray(old*3,old*3+3),n*3);normals.set(norm.subarray(old*3,old*3+3),n*3);}
  const append=a=>{const pad=(4-offset%4)%4;if(pad){blocks.push(Buffer.alloc(pad));offset+=pad;}const start=offset,buf=Buffer.from(a.buffer,a.byteOffset,a.byteLength);blocks.push(buf);offset+=buf.length;return start;};
  const center=p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
  meta.push({p:append(positions),n:append(normals),i:append(idx),v:count,c:idx.length,center,s:p.system});triangles+=idx.length/3;
 }
 fs.mkdirSync(new URL('presentation/',dir),{recursive:true});const data=Buffer.concat(blocks),gzip=gzipSync(data,{level:9});
 fs.writeFileSync(new URL('presentation/body'+suffix+'.bin',dir),data);fs.writeFileSync(new URL('presentation/body'+suffix+'.bin.gz',dir),gzip);
 fs.writeFileSync(new URL('presentation/body'+suffix+'.json',dir),JSON.stringify({parts:meta,bytes:data.length,triangles,ratio}));
 return {suffix,parts:meta.length,triangles,bytes:data.length,gzip:gzip.length};
};
console.log({desktop:build(.08,''),mobile:build(.035,'-mobile')});
