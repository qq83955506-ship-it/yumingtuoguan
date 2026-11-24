import {json,body,passwordHash,makeSession,sessionCookie,requireSameOrigin} from "../_utils.js";
export async function onRequestPost({request,env}) {
  try {
    requireSameOrigin(request);
    const {password}=await body(request);
    const row=await env.DB.prepare("SELECT auth_salt,password_hash,vault_salt FROM settings WHERE id=1").first();
    if(!row)return json({error:"请先初始化保险箱"},400);
    const hash=await passwordHash(password||"",row.auth_salt);
    if(hash!==row.password_hash)return json({error:"管理密码不正确"},401);
    const token=await makeSession(env);
    return json({ok:true,vaultSalt:row.vault_salt},200,{"Set-Cookie":sessionCookie(token)});
  }catch(e){return json({error:e.message||"登录失败"},400);}
}
