const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const {scorecard}=require('./fixtures.cjs');
const output=process.env.REVIEW_OUTPUT_DIR;
const findings=[];
let browser;
const fakeKey='sk-or-v1-'+ 'a'.repeat(40);
async function open(options={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.route('**/*',route=>route.abort());
  await context.route('http://practice.invalid/**',route=>{
    const pathname=new URL(route.request().url()).pathname,name=pathname==='/'?'index.html':pathname.slice(1),file=path.resolve(__dirname,'../dist',name);
    if(options.ownerAPI&&name==='config.js')return route.fulfill({body:"window.FTDM_API_BASE='https://owner.invalid';",contentType:'application/javascript'});
    if(!file.startsWith(path.resolve(__dirname,'../dist')+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
    return route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(options.clock)await page.clock.install();
  if(options.init)await page.addInitScript(options.init);
  await page.goto('http://practice.invalid/');
  if(!options.gemini&&!options.ownerAPI)await page.locator('#provider').selectOption('openrouter',{force:true});
  return {page,context,errors};
}
async function test(name,fn,options){const target=await open(options);try{await fn(target);assert.deepEqual(target.errors,[]);findings.push({name,status:'passed'});console.log('PASS '+name);}finally{await target.context.close();}}
async function prepare(page){
  await page.locator('#settings summary').click();await page.locator('#key').fill(fakeKey);
  await page.locator('#begin').click();await page.locator('#transcript').fill('We would confirm household income, expenses and risk tolerance before recommending products.');
  await page.locator('#finish').click();await page.locator('#answer0').fill('We would review accounts quarterly and after a life change.');await page.locator('#answer1').fill('We would pay the statement balance in full and monitor spending.');await page.locator('#transcriptreview').check();
}
async function mockJudge(page,options={}){
  await page.route('https://openrouter.ai/api/v1/chat/completions',async route=>{
    const request=JSON.parse(route.request().postData()),prompt=JSON.parse(request.messages[1].content[0].text);
    const input={case:prompt.case,transcript:prompt.transcript,answers:prompt.answers.map(a=>a.answer),photos:[]};
    if(options.before)await options.before(request);
    const card=scorecard(input);card.rows.forEach(row=>row.references[0].quote=input.transcript.slice(0,70));
    if(options.change)options.change(card);
    if(options.status)return route.fulfill({status:options.status,json:{error:{message:'Synthetic provider failure'}}});
    await route.fulfill({json:{model:'synthetic/returned-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify(card)}}]}});
  });
}
(async()=>{
  const downloadsPath=path.resolve(__dirname,'../.test-downloads');fs.mkdirSync(downloadsPath,{recursive:true});
  browser=await chromium.launch({headless:true,downloadsPath,...(process.env.FTDM_CHROME_PATH?{executablePath:process.env.FTDM_CHROME_PATH}:{})});
  await test('Gemini default grades sample visuals, keeps keys out of exports, and clears on reload',async({page})=>{
    assert.equal(await page.locator('#provider').inputValue(),'gemini');
    await page.locator('#settings summary').click();await page.locator('#key').fill('synthetic-gemini-key');
    assert.equal(await page.locator('#freerouting').isVisible(),false);
    await page.route('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',async route=>{
      assert.equal(route.request().headers()['x-goog-api-key'],'synthetic-gemini-key');
      assert.equal(route.request().url().includes('key='),false);
      const request=route.request().postDataJSON(),prompt=JSON.parse(request.contents[0].parts[0].text);
      assert.equal(request.contents[0].parts.filter(p=>p.inlineData).length,3);
      assert.equal(request.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');
      const input={case:prompt.case,transcript:prompt.transcript,answers:prompt.answers.map(a=>a.answer),photos:[]},card=scorecard(input);
      card.rows.forEach(row=>row.references[0].quote=input.transcript.slice(0,70));
      await route.fulfill({json:{modelVersion:'gemini-3.8-flash-test',candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(card)}]}}]}});
    });
    await page.getByText('Try a sample submission',{exact:true}).click();await page.locator('#loaddemo').click();await page.locator('#finish').click();await page.locator('#transcriptreview').check();await page.locator('#judge').click();await page.locator('.scorehero').waitFor();
    assert.equal(await page.locator('.scorehero strong').innerText(),'48 / 100');assert.match(await page.locator('.scorehero').innerText(),/gemini-3.8-flash-test/);
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);assert.equal(fs.readFileSync(await download.path(),'utf8').includes('synthetic-gemini-key'),false);
    await page.getByText('Keep your practice work',{exact:true}).click();await page.locator('#autosave').check();assert.equal(await page.evaluate(()=>localStorage.getItem('ftdm-drafts-v2').includes('synthetic-gemini-key')),false);
    await page.reload();assert.equal(await page.locator('#key').inputValue(),'');assert.equal(await page.locator('#provider').inputValue(),'gemini');
  },{gemini:true});
  await test('Gemini model discovery paginates, authenticates in header, and provider switch clears key',async({page})=>{
    await page.locator('#settings summary').click();await page.locator('#key').fill('synthetic-gemini-key');let calls=0;
    await page.route('https://generativelanguage.googleapis.com/v1beta/models?*',route=>{
      calls++;assert.equal(route.request().headers()['x-goog-api-key'],'synthetic-gemini-key');
      const more=new URL(route.request().url()).searchParams.get('pageToken');
      return route.fulfill({json:{models:[{name:more?'models/gemini-3.5-flash-lite':'models/gemini-3.8-flash',displayName:'Test Gemini',supportedGenerationMethods:['generateContent']}],...(!more?{nextPageToken:'next'}:{})}});
    });
    await page.locator('#checkmodel').click();await page.getByText(/Key accepted for model listing/).waitFor();assert.equal(calls,2);assert.equal(await page.locator('#models option').count(),2);
    await page.locator('#provider').selectOption('openrouter');assert.equal(await page.locator('#key').inputValue(),'');assert.equal(await page.locator('#models option').count(),0);
    await page.locator('#provider').selectOption('gemini');await page.locator('#key').fill('another-synthetic-key');await page.locator('#clearkey').click();assert.equal(await page.locator('#key').inputValue(),'');
  },{gemini:true});
  await test('Gemini key and quota failures preserve draft and allow retry without exposing provider errors',async({page})=>{
    await prepare(page);
    for(const status of [401,403,404,429,503]){
      await page.route('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',route=>route.fulfill({status,json:{error:{message:'Do not expose synthetic-gemini-key'}}}));
      await page.locator('#judge').click();await page.getByText(/Your draft is intact/).waitFor();assert.equal(await page.locator('#judge').isEnabled(),true);assert.equal(await page.locator('.scorehero').count(),0);assert.ok((await page.locator('#transcript').inputValue()).length>0);assert.equal((await page.locator('#notice').innerText()).includes('Do not expose'),false);
    }
  },{gemini:true});
  await test('startup, mobile layout and early start action',async({page})=>{
    assert.equal(await page.locator('#caseselect option').count(),8);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok((await page.locator('#begin').boundingBox()).y<844);
    if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'improved-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(output,'improved-desktop.png'),fullPage:true});}
  });
  await test('question gate and blank presentation gate',async({page})=>{await page.locator('[data-step="2"]').click();assert.match(await page.locator('#notice').innerText(),/Finish/);await page.locator('#begin').click();await page.locator('#finish').click();assert.match(await page.locator('#notice').innerText(),/transcript first/);});
  await test('typed practice starts timer and prep pause retains remaining time',async({page})=>{
    await page.locator('#prep').click();await page.clock.fastForward(10000);await page.locator('#prep').click();assert.match(await page.locator('#prepclock').innerText(),/29:50/);await page.clock.fastForward(20000);await page.locator('#prep').click();assert.match(await page.locator('#prepclock').innerText(),/29:50/);await page.locator('#begin').click();await page.clock.fastForward(5000);assert.equal(await page.locator('#clock').innerText(),'14:55');
  },{clock:true});
  await test('custom case display, switching and download preserve custom instructions',async({page})=>{
    await page.getByText('Use a custom FTDM case',{exact:true}).click();await page.locator('#customtitle').fill('Synthetic custom case');await page.locator('#custom').fill('Custom scenario about a fictional bakery.');await page.locator('#pis').fill('A\nB\nC\nD\nE');await page.locator('#qs').fill('Question X?\nQuestion Y?');await page.locator('#applycase').click();const id=await page.locator('#caseselect').inputValue();assert.ok(id.startsWith('custom-'));assert.equal(await page.locator('#casebrief').innerText(),'Custom scenario about a fictional bakery.');await page.locator('#caseselect').selectOption('fraud');await page.locator('#caseselect').selectOption(id);assert.equal(await page.locator('#casetitle').innerText(),'Synthetic custom case');await page.locator('#begin').click();await page.locator('#transcript').fill('A synthetic custom presentation.');await page.locator('#finish').click();assert.equal(await page.locator('#questions h3').first().innerText(),'Question X?');
    await page.getByText('Keep your practice work',{exact:true}).click();const [downloaded]=await Promise.all([page.waitForEvent('download'),page.locator('#savedraft').click()]);const session=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.equal(session.drafts.find(d=>d.case.id===id).case.scenario,'Custom scenario about a fictional bakery.');assert.equal(JSON.stringify(session).includes(fakeKey),false);
  });
  await test('opt-in autosave restores draft without key; clear removes saved storage',async({page})=>{
    await page.locator('#settings summary').click();await page.locator('#key').fill(fakeKey);await page.locator('#begin').click();await page.locator('#transcript').fill('Saved synthetic presentation.');await page.getByText('Keep your practice work',{exact:true}).click();await page.locator('#autosave').check();assert.equal(await page.evaluate(()=>localStorage.getItem('ftdm-drafts-v2').includes('sk-or-v1')),false);await page.reload();assert.equal(await page.locator('#transcript').inputValue(),'Saved synthetic presentation.');assert.equal(await page.locator('#key').inputValue(),'');await page.getByText('Keep your practice work',{exact:true}).click();await page.locator('#cleardraft').click();assert.equal(await page.evaluate(()=>localStorage.getItem('ftdm-drafts-v2')),null);
  });
  await test('scoring checklist, evidence details and provenance export',async({page})=>{
    await mockJudge(page);await prepare(page);await page.locator('#transcriptreview').uncheck();await page.locator('#judge').click();assert.match(await page.locator('#notice').innerText(),/Review the transcript/);await page.locator('#transcriptreview').check();await page.locator('#judge').click();await page.locator('.scorehero').waitFor();assert.equal(await page.locator('.scorehero strong').innerText(),'48 / 100');assert.equal(await page.locator('.score-detail').count(),12);assert.equal(await page.locator('.priorities li').count(),3);
    const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(data.model,'synthetic/returned-model');assert.equal(data.source,data.submission.case.source);assert.equal(data.submission.transcript,'We would confirm household income, expenses and risk tolerance before recommending products.');assert.equal(data.promptVersion,'2026-10-12-v2');assert.equal(JSON.stringify(data).includes(fakeKey),false);
    if(output){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'improved-scorecard.png'),fullPage:true});}
  });
  await test('transcript, answer and visual edits invalidate scores',async({page})=>{
    await mockJudge(page);await prepare(page);await page.locator('#judge').click();await page.locator('.scorehero').waitFor();await page.locator('#retry').click();await page.locator('#answer0').fill('Changed answer.');assert.equal(await page.locator('#download').isEnabled(),false);await page.locator('[data-step="3"]').click();assert.match(await page.locator('.scorehero').innerText(),/OUT OF DATE/);
    await page.locator('[data-step="1"]').click();await page.locator('#transcript').fill('Changed presentation.');assert.equal(await page.locator('#transcriptreview').isChecked(),false);assert.equal(await page.locator('#download').isEnabled(),false);
  });
  await test('provider errors and fabricated quotes preserve drafts without accepting results',async({page})=>{
    await mockJudge(page,{change:card=>card.rows[0].references[0].quote='This never appeared.'});await prepare(page);await page.locator('#judge').click();await page.getByText(/quotation that does not appear/).waitFor();assert.equal(await page.locator('.scorehero').count(),0);assert.ok((await page.locator('#answer0').inputValue()).length>0);assert.equal(await page.locator('#judge').isEnabled(),true);
  });
  await test('429 rate limit keeps current session',async({page})=>{await mockJudge(page,{status:429});await prepare(page);await page.locator('#judge').click();await page.getByText(/rate limited/).waitFor();assert.ok((await page.locator('#transcript').inputValue()).length>0);assert.equal(await page.locator('#judge').isEnabled(),true);});
  await test('request locks edits and ignores programmatically changed submissions',async({page})=>{
    let release;const pending=new Promise(resolve=>release=resolve);await mockJudge(page,{before:()=>pending});await prepare(page);await page.locator('#judge').click();assert.equal(await page.locator('#answer0').getAttribute('readonly'),'');assert.equal(await page.locator('#caseselect').isDisabled(),true);
    await page.evaluate(()=>document.getElementById('answer0').value='Programmatically changed answer.');release();await page.getByText(/submission changed during judging/).waitFor();assert.equal(await page.locator('.scorehero').count(),0);
  });
  await test('current model check lists free image models and does not auto-switch',async({page})=>{
    await page.route('https://openrouter.ai/api/v1/models',r=>r.fulfill({json:{data:[{id:'synthetic/free-vision',architecture:{input_modalities:['text','image']},supported_parameters:['response_format','structured_outputs'],pricing:{prompt:'0',completion:'0'}}]}}));await page.locator('#settings summary').click();await page.locator('#checkmodel').click();await page.getByText(/not in the current list/).waitFor();assert.equal(await page.locator('#model').inputValue(),'stealth/space-bunny-alpha');assert.equal(await page.locator('#models option').count(),1);
  });
  await test('invalid session import is atomic and leaves draft intact',async({page})=>{
    await page.locator('#begin').click();await page.locator('#transcript').fill('Keep this current draft.');await page.getByText('Keep your practice work',{exact:true}).click();await page.locator('#importdraft').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'ftdm-session',version:2,currentCase:'missing',drafts:[]}))});await page.getByText(/Could not import/).waitFor();assert.equal(await page.locator('#transcript').inputValue(),'Keep this current draft.');
  });
  await test('microphone denial restores controls and permits typing',async({page})=>{await page.locator('#begin').click();await page.locator('#record').click();await page.getByText(/Microphone could not start/).waitFor();assert.equal(await page.locator('#record').isEnabled(),true);await page.locator('#transcript').fill('Fallback typed presentation.');},{init:()=>{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{throw Error('Synthetic permission denial');}},configurable:true});}});
  await test('sample visuals load, visual removal invalidates feedback',async({page})=>{
    await page.locator('#settings summary').click();await page.locator('#key').fill(fakeKey);await page.getByText('Try a sample submission',{exact:true}).click();await page.locator('#loaddemo').click();assert.equal(await page.locator('#gallery img').count(),3);await page.locator('#finish').click();await page.locator('#transcriptreview').check();await mockJudge(page);await page.locator('#judge').click();await page.locator('.scorehero').waitFor();await page.locator('[data-step="1"]').click();await page.locator('.photo-remove').first().click();assert.equal(await page.locator('#gallery img').count(),2);assert.equal(await page.locator('#download').isEnabled(),false);
  });
  await test('valid session import restores matching scores and protects API key',async({page})=>{
    await mockJudge(page);await prepare(page);await page.locator('#judge').click();await page.locator('.scorehero').waitFor();await page.getByText('Keep your practice work',{exact:true}).click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#savedraft').click()]);const buffer=fs.readFileSync(await download.path());
    page.once('dialog',dialog=>dialog.accept());await page.locator('#restart').click();assert.equal(await page.locator('#transcript').inputValue(),'');
    await page.locator('#importdraft').setInputFiles({name:'session.json',mimeType:'application/json',buffer});await page.getByText(/Session imported/).waitFor();assert.ok((await page.locator('#transcript').inputValue()).includes('household'));await page.locator('[data-step="3"]').click();assert.equal(await page.locator('#download').isEnabled(),true);assert.equal(await page.locator('.scorehero strong').innerText(),'48 / 100');
  });
  await test('sample does not overwrite family draft and fresh attempt asks before clearing',async({page})=>{
    await page.locator('#begin').click();await page.locator('#transcript').fill('My existing family draft.');await page.locator('[data-step="0"]').click();await page.getByText('Try a sample submission',{exact:true}).click();await page.locator('#loaddemo').click();await page.locator('[data-step="0"]').click();await page.locator('#caseselect').selectOption('family');assert.equal(await page.locator('#transcript').inputValue(),'My existing family draft.');page.once('dialog',dialog=>dialog.dismiss());await page.locator('#restart').click();assert.equal(await page.locator('#transcript').inputValue(),'My existing family draft.');
  });
  await test('owner API uses validated submission contract through backend and renders provenance',async({page})=>{
    const {default:worker}=await import('../backend/worker.mjs'),originalFetch=global.fetch;let sent;
    global.fetch=async(_,opts)=>{const request=JSON.parse(opts.body),prompt=JSON.parse(request.messages[1].content[0].text);const card=scorecard({case:prompt.case});return Response.json({model:'synthetic/backend-model',choices:[{message:{content:JSON.stringify(card)}}]});};
    try{
      await page.route('https://owner.invalid/api/judge',async route=>{sent=JSON.parse(route.request().postData());const response=await worker.fetch(new Request(route.request().url(),{method:'POST',headers:{Origin:'http://practice.invalid','Content-Type':'application/json'},body:JSON.stringify(sent)}),{ALLOWED_ORIGIN:'http://practice.invalid',OPENROUTER_API_KEY:'synthetic-test-only'});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});});
      await page.locator('#begin').click();await page.locator('#transcript').fill('We would confirm household income, expenses and risk tolerance before recommending products.');await page.locator('#finish').click();await page.locator('#answer0').fill('Review quarterly.');await page.locator('#answer1').fill('Pay the balance in full.');await page.locator('#transcriptreview').check();await page.locator('#judge').click();await page.locator('.scorehero').waitFor();assert.deepEqual(Object.keys(sent),['submission']);assert.equal(await page.locator('#keysettings').isVisible(),false);assert.match(await page.locator('.scorehero').innerText(),/synthetic\/backend-model/);
    }finally{global.fetch=originalFetch;}
  },{ownerAPI:true});
  if(output)fs.writeFileSync(path.join(output,'implementation-browser-results.json'),JSON.stringify({scope:'Repository frontend; local assets and synthetic provider responses intercepted. No live model quality claim.',findings},null,2));
  console.log(findings.length+' browser scenarios passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
