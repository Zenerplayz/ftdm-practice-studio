import Judge from '../dist/judge-core.js';
import cases from '../dist/cases.js';

const windows=new Map();
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGIN;
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(allowed&&origin===allowed)Object.assign(headers,{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'});
    const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    if(!allowed||origin!==allowed)return reply(403,{error:{message:'This site is not enabled for the judging service.'}});
    if(new URL(request.url).pathname!=='/api/judge')return reply(404,{error:{message:'Not found'}});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,{error:{message:'Use POST for judging.'}});
    if(!env.OPENROUTER_API_KEY||!env.JUDGE_MODEL?.trim())return reply(503,{error:{message:'The owner has not configured the judging service yet.'}});
    // Best-effort per-isolate protection. Public services need platform/shared rate limiting.
    const ip=request.headers.get('CF-Connecting-IP')||'local',now=Date.now();
    for(const [key,value]of windows)if(now-value.start>=60000)windows.delete(key);
    try{
      if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:{message:'Use JSON for submissions.'}});
      if(Number(request.headers.get('Content-Length'))>Judge.MAX_BYTES)return reply(413,{error:{message:'Submission exceeds 4 MB.'}});
      const reader=request.body?.getReader();if(!reader)return reply(400,{error:{message:'Missing submission.'}});
      const chunks=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>Judge.MAX_BYTES){await reader.cancel();return reply(413,{error:{message:'Submission exceeds 4 MB.'}});}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let submission;
      try{
        const body=JSON.parse(new TextDecoder().decode(bytes));
        if(!body||Object.keys(body).some(key=>key!=='submission'))throw Error('Send submission fields, not model messages or instructions.');
        const input=body.submission,canonical=cases.find(c=>c.id===input?.case?.id);
        if(!canonical&&!input?.case?.id?.startsWith('custom-'))throw Error('Unknown practice case.');
        submission=Judge.validateSubmission({...input,case:canonical||input.case});
      }catch(error){return reply(400,{error:{message:error instanceof SyntaxError?'Invalid submission JSON.':error.message}});}
      // Reserve synchronously after reading the body so concurrent requests share the same counter.
      const rate=windows.get(ip)||{start:Date.now(),count:0};
      if(rate.count>=5)return reply(429,{error:{message:'Please wait a minute before requesting more scorecards.'}});
      rate.count++;windows.set(ip,rate);
      const body=Judge.buildRequest(submission,env.JUDGE_MODEL.trim(),{freeOnly:true,structured:env.JUDGE_STRUCTURED_OUTPUTS==='true'});
      const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.OPENROUTER_API_KEY,'X-OpenRouter-Title':'DECA Roleplay Practice Studio'},signal:AbortSignal.timeout(110000),body:JSON.stringify(body)});
      if(!response.ok)return reply(response.status,{error:{message:response.status===429?'The free model is rate limited. Try again later.':'The judging provider could not complete this request. Check model availability and owner configuration.'}});
      const result=await response.json();
      let feedback;try{feedback=Judge.parseCompletion(result,submission);}catch(error){return reply(502,{error:{message:error.message}});}
      return reply(200,{feedback,submission,model:typeof result.model==='string'?result.model:body.model,promptVersion:Judge.VERSION,evaluatedAt:new Date().toISOString()});
    }catch(error){
      console.error('FTDM judging failed:',error.name);
      return reply(502,{error:{message:'Judging request failed or timed out. Please try again.'}});
    }
  }
};
