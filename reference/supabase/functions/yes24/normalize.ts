export type Item = {itemId:number;title:string;author?:string;publisher?:string;isbn13?:string;cover?:string;link?:string;pages?:number;shopPrice?:number;salePrice?:number;itemStatus?:string;sortOrder?:number;adultYn?:string;contentDetail?:{bookIntroduction?:string}};
export const plain=(v:unknown)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function safeUrl(value:unknown,host:string){try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname===host?u.href:null;}catch{return null;}}
export function normalize(item:Item){
 if(!Number.isSafeInteger(item.itemId)||item.itemId<=0||!plain(item.title))throw new Error('Invalid product');
 return {yes24_id:String(item.itemId),isbn13:/^\d{13}$/.test(item.isbn13||'')?item.isbn13:null,title:plain(item.title),author:plain(item.author)||null,publisher:plain(item.publisher)||null,pages:Number.isInteger(item.pages)&&item.pages!>0?item.pages:null,description:plain(item.contentDetail?.bookIntroduction),cover_url:safeUrl(item.cover,'image.yes24.com'),yes24_url:safeUrl(item.link,'www.yes24.com')||`https://www.yes24.com/product/goods/${item.itemId}`,list_price:Number.isFinite(item.shopPrice)&&item.shopPrice!>=0?Math.round(item.shopPrice!):null,source_sale_price:Number.isFinite(item.salePrice)&&item.salePrice!>=0?Math.round(item.salePrice!):null,availability:plain(item.itemStatus),metadata_updated_at:new Date().toISOString()};
}
export const identity=(s:string|null|undefined)=>plain(s).normalize('NFKC').replace(/\s/g,'').toLowerCase();
export const authorIdentity=(s:string|null|undefined)=>identity(plain(s).split('/')[0].replace(/\s+(저|글|지음)$/,''));
export function exactMatch(book:{title:string;author:string|null;publisher:string|null},items:Item[]){
 const matches=items.filter(i=>identity(i.title)===identity(book.title)&&!!book.author&&authorIdentity(i.author)===authorIdentity(book.author)&&(!book.publisher||identity(i.publisher)===identity(book.publisher)));
 return matches.length===1?matches[0]:null;
}
