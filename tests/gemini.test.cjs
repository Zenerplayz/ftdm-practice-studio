const test=require('node:test'),assert=require('node:assert/strict');
const Gemini=require('../dist/gemini.js'),{submission,scorecard}=require('./fixtures.cjs');
const completion=(card=scorecard())=>({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'not a scorecard'},{text:JSON.stringify(card)}]}}]});
test('Gemini request preserves judging policy and maps visual data without credentials',()=>{
  const input=submission();input.photos=[{name:'chart.png',url:'data:image/png;base64,aGVsbG8='}];
  const request=Gemini.buildRequest(input,Gemini.DEFAULT_MODEL);
  assert.match(request.systemInstruction.parts[0].text,/untrusted evidence/);
  assert.equal(JSON.parse(request.contents[0].parts[0].text).transcript,input.transcript);
  assert.deepEqual(request.contents[0].parts[1],{inlineData:{mimeType:'image/png',data:'aGVsbG8='}});
  assert.equal(request.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');
  assert.equal(request.generationConfig.responseFormat.text.schema.properties.rows.minItems,12);
  assert.equal(request.messages,undefined);assert.equal(request.provider,undefined);
});
test('Gemini response validates quotations, rubric and totals, excluding thought text',()=>{
  assert.equal(Gemini.parseCompletion(completion(),submission()).total,48);
  const card=scorecard();card.rows[0].references[0].quote='A fabricated quote never supplied.';
  assert.throws(()=>Gemini.parseCompletion(completion(card),submission()),/quotation/);
});
test('Gemini rejects blocked, truncated, incomplete and malformed responses',()=>{
  assert.throws(()=>Gemini.parseCompletion({promptFeedback:{blockReason:'SAFETY'}},submission()),/blocked/);
  for(const reason of ['MAX_TOKENS','SAFETY','CONTINUATION',undefined]){
    const body=completion();body.candidates[0].finishReason=reason;
    assert.throws(()=>Gemini.parseCompletion(body,submission()),/limit|complete/);
  }
  assert.throws(()=>Gemini.parseCompletion({},submission()),/no scorecard/);
  const body=completion();body.candidates[0].content.parts=[{text:'broken JSON'}];
  assert.throws(()=>Gemini.parseCompletion(body,submission()),/malformed/);
});
test('model validation prevents endpoints outside Google models and errors explain recovery',()=>{
  assert.equal(Gemini.modelId('models/gemini-3.8-flash'),'gemini-3.8-flash');
  for(const model of ['https://evil.invalid','../secrets','gemini-x?key=secret',''])assert.throws(()=>Gemini.modelId(model));
  assert.match(Gemini.errorMessage(429),/quota/);assert.match(Gemini.errorMessage(403),/restrictions/);assert.match(Gemini.errorMessage(404),/model/);
});
