import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const labels=JSON.parse(await readFile(new URL('../app/pt-br.json',import.meta.url)));
const atlas=JSON.parse(await readFile(new URL('../public/models/atlas.json',import.meta.url)));
for(const entry of [...atlas.parts,...atlas.concepts]){
 const pt=labels[entry.name.toLowerCase()];
 assert.ok(typeof pt==='string'&&pt.length>0,`Missing: ${entry.name}`);
 assert.ok(!/[\[\]]|\b(of|left|right|artery|vein|bone|muscle)\b/.test(pt),`Untranslated: ${entry.name}`);
}
const source=(await readFile(new URL('../app/localization.ts',import.meta.url),'utf8')).replace("import labels from './pt-br.json';",`const labels=${JSON.stringify(labels)};`);
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {displayName,matchesName,nameMeaning}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
for(const [en,pt] of [['heart','Coração'],['right kidney','Rim direito'],['left renal artery','Artéria renal esquerda'],['left lateral rectus','Músculo reto lateral esquerdo'],['proximal phalanx of left big toe','Falange proximal do hálux esquerdo'],['right gluteus medius','Músculo glúteo médio direito']])assert.equal(displayName(en),pt);
for(const [en,q] of [['heart','coracao'],['heart','coração'],['heart','heart'],['femur','femur'],['brain','cerebro'],['patella','rotula'],['left renal artery','arteria renal esquerda'],['left renal artery','esquerda renal']])assert.ok(matchesName(en,'FMA123',q),q);
assert.ok(matchesName('heart','FMA7088','fma7088'));
assert.equal(matchesName('right kidney','FMA123','esquerdo'),false);
assert.equal(nameMeaning('left anterior tibial artery').length,2);
const page=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.match(page,/<h1>\s*ANATOMED/);
assert.match(page,/matchesName\(c\.name,\s*c\.id,\s*term\)/);
assert.ok(page.includes('displayName(chosen?.name)'));
assert.ok((await readFile(new URL('../web/index.html',import.meta.url),'utf8')).includes('lang="pt-BR"'));
console.log(`Validated ${Object.keys(labels).length} Portuguese concepts, all ${atlas.parts.length} mesh labels, side-specific names, accent-insensitive bilingual search, aliases and ANATOMED identity.`);
