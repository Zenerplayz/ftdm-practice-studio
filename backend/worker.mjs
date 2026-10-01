const windows=new Map();
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=env.ALLOWED_ORIGIN;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(allowed&&origin===allowed){headers['Access-Control-Allow-Origin']=allowed;headers['Access-Control-Allow-Headers']='Content-Type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';}
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed||origin!==allowed)return reply(403,{error:{message:'This site is not enabled for the judging service.'}});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/judge')return reply(404,{error:{message:'Not found'}});
  if(!env.OPENROUTER_API_KEY)return reply(503,{error:{message:'The owner has not configured the judging service yet.'}});
  const ip=request.headers.get('CF-Connecting-IP')||'local';const now=Date.now();
  for(const [k,v]of windows)if(now-v.start>60000)windows.delete(k);
  const rate=windows.get(ip)||{start:now,count:0};
  if(rate.count>=5)return reply(429,{error:{message:'Please wait a minute before requesting more scorecards.'}});
  rate.count++;windows.set(ip,rate);
  try{
   if(Number(request.headers.get('Content-Length'))>12000000)return reply(413,{error:{message:'Submission too large.'}});
   const reader=request.body?.getReader();if(!reader)return reply(400,{error:{message:'Missing submission.'}});
   const chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000000){await reader.cancel();return reply(413,{error:{message:'Submission too large.'}});}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   const body=JSON.parse(new TextDecoder().decode(bytes));
   if(!Array.isArray(body.messages)||body.messages.length!==2||body.messages[0]?.role!=='system'||body.messages[1]?.role!=='user')return reply(400,{error:{message:'Invalid submission.'}});
   const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.OPENROUTER_API_KEY,'X-Title':'FTDM Practice Studio'},signal:AbortSignal.timeout(110000),body:JSON.stringify({model:env.JUDGE_MODEL||'stealth/space-bunny-alpha',provider:{max_price:{prompt:0,completion:0},allow_fallbacks:false},messages:body.messages,temperature:.2,max_tokens:6500,response_format:{type:'json_object'}})});
   if(!response.ok)return reply(response.status,{error:{message:response.status===429?'The free model is rate limited. Try again later.':'The judging provider could not complete this request. Check model availability and owner configuration.'}});
   const result=await response.json();return reply(200,{choices:result.choices});
  }catch(error){return reply(error instanceof SyntaxError?400:502,{error:{message:error instanceof SyntaxError?'Invalid submission JSON.':'Judging request failed or timed out. Please try again.'}});}
 }
};
