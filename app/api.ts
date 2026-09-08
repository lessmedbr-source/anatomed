export type User={id:string;name:string;email:string;role:'owner'|'student'|'teacher';access:'active'|'pending'|'blocked'};
export type Session={user:User|null;authConfigured:boolean;ownerLogin:boolean;settings:Settings};
export type Settings={price:number;checkoutUrl:string;supportEmail:string;headline:string;offerEnabled:boolean};
export const defaults:Settings={price:19.9,checkoutUrl:'',supportEmail:'',headline:'Anatomia que você vê. Conhecimento que fica.',offerEnabled:true};
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{const response=await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});let data:unknown;try{data=await response.json();}catch{throw Error('Não foi possível conectar agora. Tente novamente.');}if(!response.ok){const message=data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Não foi possível concluir esta ação.';throw Error(message);}return data as T;}
export const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
