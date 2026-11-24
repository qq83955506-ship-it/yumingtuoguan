const COOKIE = "fdm_session";
const enc = new TextEncoder();
export function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}
export async function body(request) {
  try { return await request.json(); } catch { throw new Error("请求内容不是有效 JSON"); }
}
export function randomHex(bytes=32) {
  const a=crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function hexBytes(hex){return new Uint8Array(hex.match(/.{2}/g).map(x=>parseInt(x,16)));}
async function hmac(secret, value) {
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(value)));
}
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
export async function makeSession(env) {
  const payload=b64url(enc.encode(JSON.stringify({exp:Date.now()+7*24*60*60*1000,nonce:randomHex(16)})));
  const sig=b64url(await hmac(env.SESSION_SECRET,payload));
  return `${payload}.${sig}`;
}
export async function validSession(request,env) {
  const cookie=request.headers.get("Cookie")||"";
  const token=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
  if(!token)return false;
  const [payload,sig]=token.split(".");
  if(!payload||!sig)return false;
  const expected=b64url(await hmac(env.SESSION_SECRET,payload));
  if(sig.length!==expected.length)return false;
  let diff=0;for(let i=0;i<sig.length;i++)diff|=sig.charCodeAt(i)^expected.charCodeAt(i);
  if(diff!==0)return false;
  try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0)))).exp>Date.now();}catch{return false;}
}
export function sessionCookie(token, secure=true) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;
}
export function clearCookie(){return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;}
export async function passwordHash(password,saltHex) {
  const material=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexBytes(saltHex),iterations:310000,hash:"SHA-256"},material,256);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function requireSameOrigin(request) {
  const origin=request.headers.get("Origin");
  if(origin && origin!==new URL(request.url).origin) throw new Error("请求来源校验失败");
}
