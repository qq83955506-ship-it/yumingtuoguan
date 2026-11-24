import {json,body,randomHex,passwordHash,makeSession,sessionCookie,requireSameOrigin} from "../_utils.js";
export async function onRequestPost({request,env}) {
  try {
    requireSameOrigin(request);
    const {password}=await body(request);
    if(typeof password!=="string"||password.length<12||password.length>256)return json({error:"管理密码必须为 12 至 256 位"},400);
    const exists=await env.DB.prepare("SELECT id FROM settings WHERE id=1").first();
    if(exists)return json({error:"保险箱已经初始化，请直接登录"},409);
    const authSalt=randomHex(16),vaultSalt=randomHex(16),hash=await passwordHash(password,authSalt);
    await env.DB.prepare("INSERT INTO settings (id, auth_salt, password_hash, vault_salt, created_at) VALUES (1, ?, ?, ?, ?)")
      .bind(authSalt,hash,vaultSalt,new Date().toISOString()).run();
    const token=await makeSession(env);
    return json({ok:true,vaultSalt},200,{"Set-Cookie":sessionCookie(token)});
  }catch(e){return json({error:e.message||"初始化失败"},400);}
}
