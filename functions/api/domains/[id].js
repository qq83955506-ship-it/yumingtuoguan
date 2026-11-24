import {json,body,validSession,requireSameOrigin} from "../_utils.js";
const fields=["domain","registrar","registrarUrl","registeredAt","expiresAt","account","encryptedSecret","notes"];
function clean(x){const o={};for(const f of fields)o[f]=typeof x?.[f]==="string"?x[f].trim():"";return o;}
export async function onRequestPut(ctx){
  if(!await validSession(ctx.request,ctx.env))return json({error:"请先登录"},401);
  try{
    requireSameOrigin(ctx.request);const x=clean(await body(ctx.request));
    if(!x.domain||!x.registrar||!/^\d{4}-\d{2}-\d{2}$/.test(x.expiresAt)||x.domain.length>253||x.encryptedSecret.length>10000)return json({error:"请检查必填信息和日期格式"},400);
    const id=ctx.params.id,now=new Date().toISOString();
    const r=await ctx.env.DB.prepare("UPDATE domains SET domain=?,registrar=?,registrar_url=?,registered_at=?,expires_at=?,account=?,encrypted_secret=?,notes=?,updated_at=? WHERE id=?")
      .bind(x.domain,x.registrar,x.registrarUrl,x.registeredAt,x.expiresAt,x.account,x.encryptedSecret,x.notes,now,id).run();
    if(!r.meta.changes)return json({error:"记录不存在"},404);
    return json({ok:true});
  }catch(e){return json({error:e.message||"更新失败"},400);}
}
export async function onRequestDelete(ctx){
  if(!await validSession(ctx.request,ctx.env))return json({error:"请先登录"},401);
  try{requireSameOrigin(ctx.request);const r=await ctx.env.DB.prepare("DELETE FROM domains WHERE id=?").bind(ctx.params.id).run();if(!r.meta.changes)return json({error:"记录不存在"},404);return json({ok:true});}
  catch(e){return json({error:e.message||"删除失败"},400);}
}
