import {json,clearCookie,requireSameOrigin} from "../_utils.js";
export async function onRequestPost({request}) {
  try{requireSameOrigin(request);return json({ok:true},200,{"Set-Cookie":clearCookie()});}
  catch(e){return json({error:e.message},400);}
}
