type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<unknown>>();
export const TTL_SERVICES = 60_000;
export const TTL_CATALOG = 30_000;
export function cacheGet<T>(key: string): T | null { const e=store.get(key); if(!e) return null; if(Date.now()>=e.expires){store.delete(key);return null;} return e.value as T; }
export function cacheSet<T>(key: string,value:T,ttl:number):void { store.set(key,{value,expires:Date.now()+ttl}); }