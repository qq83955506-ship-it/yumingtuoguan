const $ = (id) => document.getElementById(id);
let vaultKey = null, vaultSalt = null, domains = [], isSetup = false;

async function api(path, options={}) {
  const res = await fetch(path, {credentials:"same-origin", headers:{"Content-Type":"application/json",...(options.headers||{})}, ...options});
  const data = await res.json().catch(()=>({error:"服务器返回异常"}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}
function b64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)));}
function unb64(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
async function deriveKey(password,salt){
  const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function encryptSecret(value){
  if(!value) return "";
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},vaultKey,new TextEncoder().encode(value));
  return `${b64(iv)}.${b64(encrypted)}`;
}
async function decryptSecret(value){
  if(!value) return "";
  try {const [iv,data]=value.split(".");const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv)},vaultKey,unb64(data));return new TextDecoder().decode(plain);}
  catch{return "";}
}
function showError(id,msg){$(id).textContent=msg;$(id).classList.remove("hidden");}
function clearError(id){$(id).textContent="";$(id).classList.add("hidden");}
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),2600);}
function dateStatus(date){const today=new Date();today.setHours(0,0,0,0);const end=new Date(date+"T00:00:00");const days=Math.ceil((end-today)/86400000);return days<0?{key:"expired",label:"已过期",days}:days<=30?{key:"soon",label:`${days}天后到期`,days}:{key:"active",label:"正常",days};}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function init(){
  try {const state=await api("/api/auth/status");isSetup=state.initialized;$("authTitle").textContent=isSetup?"欢迎回来":"创建私人保险箱";$("authDesc").textContent=isSetup?"登录你的私人免费域名管理中心。":"首次使用，请先设置一个强管理密码。";$("passwordLabel").textContent=isSetup?"管理密码":"设置管理密码（至少 12 位）";$("passwordInput").placeholder=isSetup?"请输入管理密码":"至少 12 位，建议使用独立密码";$("passwordInput").autocomplete=isSetup?"current-password":"new-password";$("authSubmit").textContent=isSetup?"登录并解锁":"创建保险箱";$("authHint").textContent=isSetup?"登录后还需要用同一密码解锁本地加密保险箱。密码遗失无法找回已加密的账号密码。":"密码至少 12 位。它同时用于登录和加密敏感信息，请务必妥善保管。";}catch(e){showError("authError",e.message);}
}
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();clearError("authError");const password=$("passwordInput").value;
  if(password.length<12){showError("authError","管理密码至少需要 12 位。");return;}
  $("authSubmit").disabled=true;
  try{
    const result=await api(isSetup?"/api/auth/login":"/api/auth/setup",{method:"POST",body:JSON.stringify({password})});
    vaultSalt=result.vaultSalt;
    vaultKey=await deriveKey(password,unb64(vaultSalt));
    $("passwordInput").value="";await enterApp();
  }catch(err){showError("authError",err.message);}finally{$("authSubmit").disabled=false;}
});
async function enterApp(){$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("top-actions").classList.remove("hidden");await loadDomains();}
async function loadDomains(){const data=await api("/api/domains");domains=data.domains||[];render();}
function render(){
  const stats={active:0,soon:0,expired:0};domains.forEach(d=>stats[dateStatus(d.expiresAt).key]++);
  $("totalCount").textContent=domains.length;$("activeCount").textContent=stats.active;$("soonCount").textContent=stats.soon;$("expiredCount").textContent=stats.expired;
  const q=$("searchInput").value.trim().toLowerCase(),f=$("filterSelect").value;
  const filtered=domains.filter(d=>{const s=dateStatus(d.expiresAt).key;return(!q||[d.domain,d.registrar,d.notes].join(" ").toLowerCase().includes(q))&&(f==="all"||s===f);});
  $("domainList").innerHTML=filtered.map(d=>{const s=dateStatus(d.expiresAt);return `<article class="domain-card panel">
    <div class="domain-main"><div class="domain-name">${escapeHtml(d.domain)}</div><div class="domain-meta">${escapeHtml(d.registrar)} · ${d.registeredAt?`申请于 ${escapeHtml(d.registeredAt)}`:"未填写申请日期"}</div></div>
    <div class="domain-detail"><span>到期日期</span><strong>${escapeHtml(d.expiresAt)}</strong><div class="status ${s.key}">${s.label}</div></div>
    <div class="domain-detail"><span>注册账号</span><strong>${d.account?escapeHtml(d.account):"未填写"} ${d.encryptedSecret?" · 🔒已保存密码":""}</strong></div>
    <div class="card-actions">${d.encryptedSecret?`<button class="icon-button" title="解密并复制密码" data-copy="${d.id}">⧉</button>`:""}<button class="icon-button" title="编辑" data-edit="${d.id}">✎</button><button class="icon-button" title="删除" data-delete="${d.id}">⌫</button></div></article>`;}).join("");
  $("emptyState").classList.toggle("hidden",domains.length!==0);
  $("domainList").classList.toggle("hidden",filtered.length===0);
  if(domains.length&&filtered.length===0){$("domainList").innerHTML='<div class="empty panel"><h3>没有找到匹配的域名</h3><p>试试其他关键词或筛选条件。</p></div>';$("domainList").classList.remove("hidden");}
}
$("searchInput").addEventListener("input",render);$("filterSelect").addEventListener("change",render);
function openModal(d=null){
  clearError("formError");$("domainForm").reset();$("domainId").value=d?.id||"";$("modalTitle").textContent=d?"编辑域名":"添加域名";
  if(d){$("domainName").value=d.domain;$("registrar").value=d.registrar;$("registrarUrl").value=d.registrarUrl||"";$("registeredAt").value=d.registeredAt||"";$("expiresAt").value=d.expiresAt;$("account").value=d.account||"";$("notes").value=d.notes||"";}
  $("sitePassword").value="";$("modal").classList.remove("hidden");
}
function closeModal(){$("modal").classList.add("hidden");}
$("addBtn").onclick=()=>openModal();$("emptyAddBtn").onclick=()=>openModal();$("closeModal").onclick=closeModal;$("cancelBtn").onclick=closeModal;
$("modal").addEventListener("click",e=>{if(e.target.dataset.close)closeModal();});
$("domainList").addEventListener("click",async e=>{
  const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]"),copy=e.target.closest("[data-copy]");
  if(copy){const d=domains.find(x=>x.id===copy.dataset.copy);if(d){const secret=await decryptSecret(d.encryptedSecret);if(!secret){toast("无法解密，请确认使用创建保险箱时的管理密码");}else{try{await navigator.clipboard.writeText(secret);toast("密码已解密并复制到剪贴板");}catch{prompt("平台登录密码（请手动复制）",secret);}}}}
  if(edit){const d=domains.find(x=>x.id===edit.dataset.edit);if(d)openModal(d);}
  if(del){const d=domains.find(x=>x.id===del.dataset.delete);if(d&&confirm(`确定删除 ${d.domain} 吗？此操作不可撤销。`)){try{await api(`/api/domains/${d.id}`,{method:"DELETE"});await loadDomains();toast("已删除域名记录");}catch(err){toast(err.message);}}}
});
$("domainForm").addEventListener("submit",async e=>{
  e.preventDefault();clearError("formError");
  const id=$("domainId").value,old=domains.find(x=>x.id===id);
  try{
    const secret=$("sitePassword").value;
    const payload={domain:$("domainName").value.trim(),registrar:$("registrar").value.trim(),registrarUrl:$("registrarUrl").value.trim(),registeredAt:$("registeredAt").value,expiresAt:$("expiresAt").value,account:$("account").value.trim(),notes:$("notes").value.trim(),encryptedSecret:secret?await encryptSecret(secret):(old?.encryptedSecret||"")};
    await api(id?`/api/domains/${id}`:"/api/domains",{method:id?"PUT":"POST",body:JSON.stringify(payload)});
    closeModal();await loadDomains();toast("域名记录已保存");
  }catch(err){showError("formError",err.message);}
});
$("exportBtn").onclick=async()=>{
  try{const data=await api("/api/domains");const backup={format:"free-domain-manager-v1",exportedAt:new Date().toISOString(),domains:data.domains};const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`域名备份-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("备份文件已导出（含加密密文）");}catch(e){toast(e.message);}
};
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const data=JSON.parse(await file.text());if(data.format!=="free-domain-manager-v1"||!Array.isArray(data.domains))throw new Error("备份文件格式不正确");
    if(!confirm(`将导入 ${data.domains.length} 条记录。相同域名会按新记录处理，是否继续？`))return;
    for(const d of data.domains){const {id,...payload}=d;await api("/api/domains",{method:"POST",body:JSON.stringify(payload)});}
    await loadDomains();toast("导入完成");
  }catch(err){toast("导入失败："+err.message);}finally{e.target.value="";}
});
$("logoutBtn").onclick=async()=>{try{await api("/api/auth/logout",{method:"POST"});}catch{}vaultKey=null;vaultSalt=null;domains=[];$("appView").classList.add("hidden");$("top-actions").classList.add("hidden");$("authView").classList.remove("hidden");await init();toast("已退出登录");};
init();
