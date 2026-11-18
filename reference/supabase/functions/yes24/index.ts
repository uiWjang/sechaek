import {createClient} from 'npm:@supabase/supabase-js@2';
import {normalize,exactMatch,type Item} from './normalize.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const origins=(Deno.env.get('YES24_ALLOWED_ORIGINS')||'https://sechaek-library-live.vuh14.chatgpt.site,http://127.0.0.1:5173').split(',');
const inflight=new Map<string,Promise<any>>();
let nextCall=0;
async function throttle(){const now=Date.now(),slot=Math.max(now,nextCall);nextCall=slot+200;if(slot>now)await new Promise(r=>setTimeout(r,slot-now));}
async function provider(path:string,params:Record<string,string>){
 const key=path+'?'+new URLSearchParams(params),now=Date.now();
 const {data:cache,error}=await db.from('yes24_cache').select('*').eq('key',key).maybeSingle();
 if(error)throw new Error('DB 설정이 필요합니다.');
 if(cache&&Date.parse(cache.expires_at)>now)return {...cache.payload,fetchedAt:cache.updated_at};
 if(inflight.has(key))return inflight.get(key);
 const promise=(async()=>{
  const apiKey=Deno.env.get('YES24_API_KEY');if(!apiKey)throw new Error('예스24 연결 준비 중입니다.');
  const budget=await db.rpc('take_yes24_budget');if(budget.error||!budget.data)throw new Error('조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
  await throttle();
  const response=await fetch('https://apis.yes24.com/v1/'+key,{headers:{'X-Api-Key':apiKey},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(response.status===429?'조회 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'예스24 정보를 불러오지 못했습니다.');
  const json=await response.json();if(!json.success||!Array.isArray(json.data?.items))throw new Error('예스24 응답을 확인할 수 없습니다.');
  const payload={items:json.data.items.filter((i:Item)=>i.adultYn!=='Y'),total:json.data.totalCount||0};
  const stamp=new Date().toISOString();
  const saved=await db.from('yes24_cache').upsert({key,payload,updated_at:stamp,expires_at:new Date(now+3600000).toISOString()});if(saved.error)throw new Error('조회 정보를 저장하지 못했습니다.');
  await db.from('yes24_cache').delete().lt('expires_at',new Date(now-86400000).toISOString());
  return {...payload,fetchedAt:stamp};
 })();inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
}
async function remember(item:Item,knownId?:string){
 const fields=normalize(item);
 let existing=knownId?{id:knownId}:null;
 if(!existing){const r=await db.from('books').select('id').eq('yes24_id',fields.yes24_id).maybeSingle();if(r.error)throw r.error;existing=r.data;}
 if(!existing&&fields.isbn13){const r=await db.from('books').select('id').eq('isbn13',fields.isbn13).limit(2);if(r.error)throw r.error;if(r.data.length===1)existing=r.data[0];}
 // Never match a different edition on title alone or overwrite a reader's records.
 if(!existing){const r=await db.from('books').select('id,title,author,publisher').eq('title',fields.title).is('yes24_id',null);if(r.error)throw r.error;const matches=r.data.filter(b=>exactMatch(b,[item]));if(matches.length===1)existing=matches[0];}
 const r=existing?await db.from('books').update(fields).eq('id',existing.id).select().single():await db.from('books').insert({...fields,genres:[]}).select().single();
 if(r.error){const retry=await db.from('books').select('*').eq('yes24_id',fields.yes24_id).maybeSingle();if(retry.data)return retry.data;throw r.error;}return r.data;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const headers={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 if(origin&&!origins.includes(origin))return new Response('{}',{status:403,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method!=='POST')return send({error:'POST required'},405);
 try{
 const body=await req.json();const action=body.action;
 if(action==='search'||action==='chart'){
  const page=Number(body.page||1);if(!Number.isInteger(page)||page<1||page>10000)return send({error:'페이지 범위를 확인해 주세요.'},400);
  const query=String(body.query||'').trim();if(action==='search'&&(!query||query.length>120))return send({error:'검색어를 확인해 주세요.'},400);
  const result=await provider(action==='chart'?'category/bestseller':'goods/itemList',action==='chart'?{categoryId:'001',page:String(page),pageSize:'15',detail:'Y'}:{query,category:'BOOK',page:String(page),pageSize:'15',detail:'Y'});
  // Search/chart metadata remains in the bounded response cache. Persist only when opened.
  return send({books:result.items.map((i:Item)=>({...normalize(i),id:'yes24-'+i.itemId,genres:[],rank:i.sortOrder})),total:result.total,fetchedAt:result.fetchedAt,page});
 }
 if(action==='detail'){
  const itemId=String(body.itemId||'');if(!/^\d{1,15}$/.test(itemId))return send({error:'상품 번호를 확인해 주세요.'},400);
  const result=await provider('goods/itemDetail',{searchType:'ItemId',query:itemId,detail:'Y'});if(!result.items[0])return send({error:'도서 정보가 없습니다.'},404);
  return send({book:await remember(result.items[0])});
 }
 if(action==='resolve'){
  const bookId=String(body.bookId||'');if(!/^[0-9a-f-]{36}$/i.test(bookId))return send({error:'도서 ID를 확인해 주세요.'},400);
  const r=await db.from('books').select('*').eq('id',bookId).single();if(r.error)return send({error:'도서를 찾을 수 없습니다.'},404);
  if(r.data.metadata_updated_at&&Date.parse(r.data.metadata_updated_at)>Date.now()-86400000)return send({book:r.data});
  const result=r.data.yes24_id?await provider('goods/itemDetail',{searchType:'ItemId',query:r.data.yes24_id,detail:'Y'}):await provider('goods/itemList',{query:r.data.title,category:'BOOK',page:'1',pageSize:'20',detail:'Y'});
  const item=r.data.yes24_id?result.items[0]:exactMatch(r.data,result.items);
  return send({book:item?await remember(item,bookId):r.data,matched:!!item});
 }
 return send({error:'지원하지 않는 요청입니다.'},400);
 }catch(e){return send({error:e instanceof Error&&/예스24|조회|설정/.test(e.message)?e.message:'도서 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}
});
