import {json} from "../_utils.js";
export async function onRequestGet({env}) {
  const row=await env.DB.prepare("SELECT id FROM settings WHERE id=1").first();
  return json({initialized:!!row});
}
