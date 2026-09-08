/** Static hosts may serve .gz as a compressed response or as a gzip file.
 * Fetch already decodes Content-Encoding; inspect the payload to avoid decoding twice.
 */
export async function decodeModelResponse(response:Response,expectedBytes:number,compressed:boolean):Promise<ArrayBuffer>{
 if(!response.ok)throw new Error('Não foi possível carregar um arquivo anatômico.');
 const payload=await response.arrayBuffer(),signature=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 const gzip=compressed&&signature[0]===0x1f&&signature[1]===0x8b;
 const buffer=gzip?await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():payload;
 if(buffer.byteLength!==expectedBytes)throw new Error('Um arquivo anatômico está incompleto. Recarregue o visualizador.');
 return buffer;
}

/** Some hosts cannot serve a .gz asset. Fall back to the equivalent raw asset once. */
export async function fetchModelChunk(chunk:{url:string;bytes:number;gzip?:string},signal:AbortSignal){
 const compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';
 try{return await decodeModelResponse(await fetch(compressed?chunk.gzip!:chunk.url,{signal}),chunk.bytes,compressed);}
 catch(error){if(signal.aborted||!compressed)throw error;return decodeModelResponse(await fetch(chunk.url,{signal}),chunk.bytes,false);}
}
