import labels from './pt-br.json';
const names:Record<string,string>=labels;
export function displayName(name?:string){if(!name)return '';const text=names[name.toLowerCase()]??name;return text.charAt(0).toUpperCase()+text.slice(1);}
export function normalizeSearch(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
const aliases:Record<string,string>={brain:'cérebro encefalo', 'spinal cord':'medula espinhal', patella:'rótula',fibula:'perônio',ulna:'cúbito',scapula:'omoplata', 'big toe':'dedão do pé', 'little finger':'mindinho', 'urinary bladder':'bexiga', 'adrenal gland':'suprarrenal adrenal', 'pituitary gland':'hipófise pituitária'};
export function matchesName(name:string,id:string,query:string){const q=normalizeSearch(query);const text=normalizeSearch(displayName(name)+' '+name+' '+id+' '+Object.entries(aliases).filter(([key])=>name.toLowerCase().includes(key)).map(([,value])=>value).join(' '));return q.split(/\s+/).every(word=>text.includes(word));}
export function nameMeaning(name:string){
 const n=name.toLowerCase(),notes:string[]=[];
 if(/\bright\b/.test(n))notes.push('Direito: lado direito do corpo da pessoa representada.');
 if(/\bleft\b/.test(n))notes.push('Esquerdo: lado esquerdo do corpo da pessoa representada.');
 for(const [word,meaning] of [['anterior','Anterior: mais próximo da frente do corpo.'],['posterior','Posterior: mais próximo das costas.'],['superior','Superior: situado mais acima.'],['inferior','Inferior: situado mais abaixo.'],['medial','Medial: mais próximo do plano central do corpo.'],['lateral','Lateral: mais afastado do plano central do corpo.'],['proximal','Proximal: mais próximo da origem ou da ligação com o tronco.'],['distal','Distal: mais distante da origem ou da ligação com o tronco.'],['superficial','Superficial: mais próximo da superfície.'],['deep','Profundo: mais distante da superfície.']] as const){if(new RegExp('\\b'+word+'\\b').test(n))notes.push(meaning);}
 return notes;
}
