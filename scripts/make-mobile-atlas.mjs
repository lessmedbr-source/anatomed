import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {MeshoptSimplifier} from 'meshoptimizer';

// The desktop atlas is unchanged. This derivative keeps every ID, concept and part.
await MeshoptSimplifier.ready;
const publicDir = new URL('../public/', import.meta.url);
const source = JSON.parse(fs.readFileSync(new URL('models/atlas.json', publicDir)));
const atlas = structuredClone(source);
const chunks = source.chunks.map(c => fs.readFileSync(new URL(c.url.slice(1), publicDir)));
let blocks = [], bytes = 0, triangles = 0;
atlas.chunks = [];
const flush = () => {
  if (!bytes) return;
  const url = '/models/mobile-' + atlas.chunks.length + '.bin';
  const data = Buffer.concat(blocks), compressed = gzipSync(data, {level:9});
  fs.writeFileSync(new URL(url.slice(1), publicDir), data);
  fs.writeFileSync(new URL(url.slice(1) + '.gz', publicDir), compressed);
  atlas.chunks.push({url, bytes, gzip:url+'.gz', gzipBytes:compressed.length});
  blocks = []; bytes = 0;
};
const append = values => {
  const pad = (4 - bytes % 4) % 4;
  if (pad) { blocks.push(Buffer.alloc(pad)); bytes += pad; }
  const start = bytes, data = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  blocks.push(data); bytes += data.length; return start;
};
for (const part of atlas.parts) {
  const b = chunks[part.chunk];
  const pos = new Float32Array(b.buffer, b.byteOffset+part.positions, part.vertexCount*3);
  const normal = new Int16Array(b.buffer, b.byteOffset+part.normals, part.vertexCount*3);
  const indices = new Uint32Array(b.buffer, b.byteOffset+part.indices, part.indexCount);
  const target = Math.min(indices.length, Math.max(96, Math.floor(indices.length*.18/3)*3));
  // Error-bounded simplification (not simplifySloppy), preserving slender vessels.
  const [result] = MeshoptSimplifier.simplify(indices,pos,3,target,.008);
  const [remap,count] = MeshoptSimplifier.compactMesh(result);
  const positions = new Float32Array(count*3), normals = new Int16Array(count*3);
  for(let old=0;old<remap.length;old++) {
    const next=remap[old]; if(next===0xffffffff) continue;
    positions.set(pos.subarray(old*3,old*3+3),next*3);
    normals.set(normal.subarray(old*3,old*3+3),next*3);
  }
  if(bytes > 3_000_000) flush();
  part.chunk=atlas.chunks.length; part.positions=append(positions);part.normals=append(normals);part.indices=append(result);
  part.vertexCount=count;part.indexCount=result.length;triangles+=result.length/3;
}
flush(); atlas.triangles=triangles;atlas.quality='light';
atlas.optimized={method:'error-bounded mobile derivative',maximumRelativeError:.008,preservedMeshes:atlas.parts.length};
fs.writeFileSync(new URL('models/atlas-mobile.json',publicDir),JSON.stringify(atlas));
console.log({parts:atlas.parts.length,triangles,gzipBytes:atlas.chunks.reduce((n,c)=>n+c.gzipBytes,0)});
