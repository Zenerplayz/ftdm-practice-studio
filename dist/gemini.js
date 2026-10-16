(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./judge-core.js'):root.FTDMJudge);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FTDMGemini=api;
})(typeof globalThis==='object'?globalThis:this,function(Judge){
  'use strict';
  const DEFAULT_MODEL='gemini-3.8-flash',BASE='https://generativelanguage.googleapis.com/v1beta/';
  function modelId(value){
    const id=value.trim().replace(/^models\//,'');
    if(!/^gemini-[A-Za-z0-9._-]+$/.test(id))throw Error('Enter a Gemini model ID, such as '+DEFAULT_MODEL+'.');
    return id;
  }
  function buildRequest(input,model){
    modelId(model);
    const request=Judge.buildRequest(input,model),parts=request.messages[1].content.map(part=>{
      if(part.type==='text')return {text:part.text};
      const match=/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(part.image_url.url);
      return {inlineData:{mimeType:match[1],data:match[2]}};
    });
    return {systemInstruction:{parts:[{text:request.messages[0].content}]},contents:[{role:'user',parts}],generationConfig:{maxOutputTokens:16384,responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:Judge.schema()}}}};
  }
  function parseCompletion(body,input){
    const candidate=body?.candidates?.[0];
    if(body?.promptFeedback?.blockReason)throw Error('Gemini blocked this submission. Review the content before trying again.');
    if(!candidate)throw Error('Gemini returned no scorecard. Try again or choose another available model.');
    if(candidate.finishReason!=='STOP')throw Error(candidate.finishReason==='MAX_TOKENS'?'Gemini reached its output limit. Try a shorter submission or another model.':'Gemini did not complete the scorecard ('+(candidate.finishReason||'unknown reason')+').');
    const content=candidate.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
    return Judge.parseCompletion({choices:[{finish_reason:'stop',message:{content}}]},input);
  }
  function errorMessage(status){
    if(status===400||status===401)return 'Google rejected the Gemini key or request. Check your API key and model in Judge settings.';
    if(status===403)return 'Google denied this request. Check API-key restrictions, API access and region eligibility in Google AI Studio.';
    if(status===404)return 'This Gemini model is unavailable. Check available models in Judge settings.';
    if(status===429)return 'Gemini quota is exhausted or rate limited. Check your quota in Google AI Studio and wait before retrying.';
    return 'Gemini could not complete grading (HTTP '+status+'). Try again later.';
  }
  return {DEFAULT_MODEL,BASE,modelId,buildRequest,parseCompletion,errorMessage};
});
