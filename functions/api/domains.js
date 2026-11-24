import {json,body,validSession,requireSameOrigin,randomHex} from "./_utils.js";
const fields=["domain","registrar","registrarUrl","registeredAt","expiresAt","account","encryptedSecret","notes"];
function clean(x){const out={};for(const f of fields)out[f]=typeof x?.[f]==="string"?x[f].trim():"";return out;}
function valid(x){return x.domain&&x.registrar&&/^\d{4}-\d{2}-\d{2}$/.test(x.expiresAt)&&(!x.registeredAt||/^\d{4}-\d{2}-\d{2}$/.test(x.registeredAt))&&x.domain.length<=253&&x.registrar.length<=120&&x.encryptedSecret.length<=10000;}
async function auth(ctx){return validSession(ctx.request,ctx.env);}
export async function onRequestGet(ctx){
  if(!await auth(ctx))return json({error:"请先登录"},401);
  const {results}=await ctx.env.DB.prepare("SELECT id,domain,registrar,registrar_url AS registrarUrl,registered_at AS registeredAt,expires_at AS expiresAt,account,encrypted_secret AS encryptedSecret,notes,created_at AS createdAt,updated_at AS updatedAt FROM domains ORDER BY expires_at ASC").all();
  return json({domains:results});
}
export async function onRequestPost(ctx){
  if(!await auth(ctx))return json({error:"请先登录"},401);
  try{
    requireSameOrigin(ctx.request);const x=clean(await body(ctx.request));
    if(!valid(x))return json({error:"请填写域名、申请平台和正确的到期日期"},400);
    const id=randomHex(12),now=new Date().toISOString();
    await ctx.env.DB.prepare("INSERT INTO domains (id,domain,registrar,registrar_url,registered_at,expires_at,account,encrypted_secret,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id,x.domain,x.registrar,x.registrarUrl,x.registeredAt,x.expiresAt,x.account,x.encryptedSecret,x.notes,now,now).run();
    return json({ok:true,id},201);
  }catch(e){return json({error:e.message||"保存失败"},400);}
}
