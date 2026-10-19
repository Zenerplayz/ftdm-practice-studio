'use strict';
const $=id=>document.getElementById(id);
const Gemini=window.FTDMGemini;
const Judge=window.FTDMJudge,CASE_LIBRARY=window.FTDM_CASES;
const SERIES_GUIDE='https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/6a8327464898284bb03962f4_HS_Series_Guidelines.pdf';
const TDM_GUIDE='https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/6a8327f7f7f637d914a9fc71_HS_TDM_Guidelines.pdf';
const FTDM_PAGE='https://www.deca.org/compete/financial-services-team-decision-making';
const STORAGE='ftdm-drafts-v2',clone=value=>JSON.parse(JSON.stringify(value));
let currentCase='family',activeCase=clone(CASE_LIBRARY[0]),caseDrafts=new Map();
let mode='team',cluster='ftdm';
let step=0,revealed=false,photos=[],feedback=null,busy=false,recording=false,recordStarting=false;
let sessionStarted=false,deadline=null,prepDeadline=null,prepRemaining=Judge.FORMATS.team.prepMs;
let recorder=null,stream=null,chunks=[],speechWorker=null,lastRecording=null,audioUrls=[],autosave=false,modelCatalog=null,cancelTranscription=null;
const message=value=>$('notice').textContent=value;
const node=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
const formatTime=seconds=>{seconds=Math.max(0,Math.ceil(seconds));return Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toString().padStart(2,'0');};
const practice=()=>Judge.FORMATS[mode]||Judge.FORMATS.team;
const answers=()=>activeCase.questions.map((_,i)=>$('answer'+i)?.value||'');
const occupied=()=>busy||recording||recordStarting;
function caseForSubmit(){
  const c=clone(activeCase);
  if(cluster==='ftdm'){c.mode='team';c.event='ftdm';c.cluster='finance';}
  else{c.mode=mode;c.event='';c.cluster=cluster;}
  return c;
}
const submission=()=>({case:caseForSubmit(),transcript:$('transcript').value,answers:answers(),photos:clone(photos)});
const signature=value=>JSON.stringify(value);

function show(n){
  if(occupied()){message('Wait for recording or processing to finish before changing steps.');return;}
  if(n>1&&!revealed){message('Finish your presentation before opening the judge questions.');return;}
  step=n;
  document.querySelectorAll('[data-panel]').forEach(e=>e.hidden=Number(e.dataset.panel)!==n);
  document.querySelectorAll('[data-step]').forEach(e=>{e.classList.toggle('active',Number(e.dataset.step)===n);if(Number(e.dataset.step)===n)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
  $('stepstatus').textContent='Step '+(n+1)+' of 4';
  $('sessionbar').hidden=n===0||n===3;
  $('sessioncase').textContent=activeCase.title;
  updateChecklist();
}
function controls(){
  const locked=occupied();
  ['record','judge','finish','audioimport','retrytranscribe','photos','caseselect','applycase','begin','starttimer','loaddemo','importdraft','cleardraft','restart','prep','resetprep','cluster'].forEach(id=>$(id).disabled=locked);
  $('mode-individual').disabled=locked;$('mode-team').disabled=locked;
  $('stop').disabled=!recording;
  document.querySelectorAll('.answer-record,.photo-remove').forEach(e=>e.disabled=locked);
  document.querySelectorAll('.answer-stop').forEach(e=>e.disabled=!recording);
  ['transcript','model','key','custom','pis','qs','customtitle'].forEach(id=>$(id).readOnly=locked);
  document.querySelectorAll('#questions textarea').forEach(e=>e.readOnly=locked);
  $('freeonly').disabled=locked;$('provider').disabled=locked;$('clearkey').disabled=locked;$('checkmodel').disabled=locked;
  $('download').disabled=!feedback||feedback.stale||locked;
  $('judge').textContent=busy?'Reviewing evidence…':mode==='individual'?'Evaluate my roleplay':'Evaluate our roleplay';
  $('judge').setAttribute('aria-busy',String(busy));
}
function renderFormat(){
  const f=practice(),individual=mode==='individual';
  $('mode-individual').checked=individual;$('mode-team').checked=!individual;
  const ftdmOption=$('cluster').querySelector('option[value="ftdm"]');
  ftdmOption.disabled=individual;
  if(![...$('cluster').options].some(option=>option.value===cluster&&!option.disabled))cluster='';
  $('cluster').value=cluster;
  $('samplecard').hidden=cluster!=='ftdm';
  $('formatstrong').textContent=individual?'1 participant · 10 min prep':'2 participants · 30 min prep';
  $('formatcopy').textContent=individual?'Up to 10 minutes with the judge. The 2026–27 form scores five performance indicators, the solution, career competencies and overall impression. Live delivery is not assessed from a transcript.':'15 minutes for the presentation and questions. Both people should speak. Live teamwork is not assessed from a transcript.';
  $('formatnote').textContent=individual?'Individual Series: one participant, 10 minutes to prepare, and up to 10 minutes to present. Finance events score the solution as Accurate.':'Team Decision Making: two participants, 30 minutes to prepare, and 15 minutes to present and answer questions.';
  const guide=cluster==='ftdm'?FTDM_PAGE:individual?SERIES_GUIDE:TDM_GUIDE;
  $('officiallink').href=guide;
  $('officiallink').textContent=cluster==='ftdm'?'Official FTDM page ↗':individual?'Individual Series guidelines ↗':'Team Decision Making guidelines ↗';
  $('guidelink').href=individual?SERIES_GUIDE:TDM_GUIDE;
  $('guidelink').textContent=individual?'Individual Series guidelines ↗':'Team Decision Making guidelines ↗';
  $('begin').textContent='Start practice · '+f.interviewMinutes+' min';
  $('presenttitle').textContent=individual?'Your presentation':'Team presentation';
  $('presenthelp').textContent=individual?'Record yourself, import audio, or type a transcript. Review names, numbers and missing words before scoring.':'Record both participants, import audio, or type a transcript. Review names, numbers and missing words before scoring.';
  $('questionlead').textContent=activeCase.questions.length?(individual?'Answer the judge. The presentation timer includes this portion.':'Each participant should answer at least one question. The interview timer includes this portion.'):'This case has no judge questions. Review the transcript, then evaluate the presentation.';
  $('finish').textContent=activeCase.questions.length?'Finish presentation & reveal questions':'Finish presentation & review';
  $('sessionclocklabel').textContent=individual?'Presentation':'Interview';
  $('clock').setAttribute('aria-label',(individual?'Presentation':'Interview')+' time remaining');
  $('sessionclock').setAttribute('aria-label',(individual?'Presentation':'Interview')+' time remaining');
}
function renderCase(){
  $('casetitle').textContent=activeCase.title;$('casebrief').textContent=activeCase.scenario;
  $('casetag').textContent=activeCase.tag;$('casenote').textContent=activeCase.note;
  $('casepis').replaceChildren(...activeCase.indicators.map(value=>node('li',value)));
  $('samplelink').hidden=!activeCase.source;
  if(activeCase.source){$('samplelink').href=activeCase.source;$('samplelink').textContent=activeCase.tag.startsWith('Original')?'Event reference ↗':'Read source case ↗';}
  const custom=activeCase.id.startsWith('custom-');
  $('pis').value=custom?activeCase.indicators.join('\n'):'';$('custom').value=custom?activeCase.scenario:'';
  $('qs').value=custom?activeCase.questions.join('\n'):'';
  $('customtitle').value=custom?activeCase.title:'';
  $('sessioncase').textContent=activeCase.title;
  renderFormat();
}
function addCaseOption(c){if([...$('caseselect').options].some(o=>o.value===c.id))return;const option=node('option',c.title+' · '+c.tag);option.value=c.id;$('caseselect').append(option);}
function draft(){return {case:clone(activeCase),mode,cluster,transcript:$('transcript').value,photos:clone(photos),revealed,answers:answers(),feedback:feedback?clone(feedback):null,sessionStarted,deadline,prepDeadline,prepRemaining,step};}
function saveDraft(){caseDrafts.set(currentCase,draft());}
function exportSession(){saveDraft();return {type:'deca-roleplay-session',version:3,currentCase,drafts:[...caseDrafts.values()]};}
function persist(){
  if(!autosave)return;
  try{localStorage.setItem(STORAGE,JSON.stringify(exportSession()));$('draftstatus').textContent='Draft saved on this device. API key and audio are not saved.';}
  catch{$('draftstatus').textContent='Device storage is full or unavailable. Download your session to keep this work.';}
}
function changed(){
  if(feedback){feedback.stale=true;renderResults();}
  updateChecklist();persist();
}
function updateChecklist(){
  const count=activeCase.questions.length,supplied=answers().filter(v=>v.trim()).length;
  $('checktranscript').textContent=$('transcript').value.trim()?'Presentation supplied':'Presentation needed';
  $('checkanswers').textContent=count?supplied+' of '+count+' judge answer'+(count===1?'':'s')+' supplied':'No judge questions for this case';
  $('checkvisuals').textContent=photos.length+' visuals · optional';
  $('checkreview').textContent=$('transcriptreview').checked?'Transcript reviewed':'Review the transcript before scoring';
}
function ticks(){
  const limit=practice();
  const interview=sessionStarted?(deadline?Math.max(0,deadline-Date.now()):0):limit.interviewMs;
  $('clock').textContent=formatTime(interview/1000);$('sessionclock').textContent=formatTime(interview/1000);
  if(deadline&&interview===0){deadline=null;message(limit.interviewMinutes+' minutes have elapsed. You can finish this practice session; competition time is over.');persist();}
  const prep=prepDeadline?Math.max(0,prepDeadline-Date.now()):prepRemaining;
  $('prepclock').textContent=formatTime(prep/1000);
  if(prepDeadline&&prep===0){prepDeadline=null;prepRemaining=0;message('Preparation time is complete.');persist();}
  $('prep').textContent=prepDeadline?'Pause prep timer':prepRemaining===0?'Restart '+limit.prepMinutes+'-minute prep':prepRemaining<limit.prepMs?'Resume prep timer':'Start '+limit.prepMinutes+'-minute prep';
  $('starttimer').textContent=sessionStarted?(mode==='individual'?'Presentation timer started':'Interview timer started'):mode==='individual'?'Start presentation timer':'Start interview timer';
}
function startTimer(){if(!sessionStarted){sessionStarted=true;deadline=Date.now()+practice().interviewMs;if(prepDeadline){prepRemaining=Math.max(0,prepDeadline-Date.now());prepDeadline=null;}}ticks();persist();}
function setMode(next){
  if(occupied()){renderFormat();return;}
  mode=next==='individual'?'individual':'team';
  if(mode==='individual'&&cluster==='ftdm')cluster='';
  if(!prepDeadline)prepRemaining=practice().prepMs;
  renderFormat();ticks();changed();
}
function setCluster(next){
  if(occupied()){renderFormat();return;}
  cluster=next;
  if(cluster==='ftdm'){mode='team';if(!prepDeadline)prepRemaining=practice().prepMs;}
  renderFormat();ticks();changed();
}
$('mode-individual').onchange=()=>setMode('individual');
$('mode-team').onchange=()=>setMode('team');
$('cluster').onchange=e=>setCluster(e.target.value);
$('prep').onclick=()=>{if(prepDeadline){prepRemaining=Math.max(0,prepDeadline-Date.now());prepDeadline=null;}else{if(prepRemaining===0)prepRemaining=practice().prepMs;prepDeadline=Date.now()+prepRemaining;}ticks();persist();};
$('resetprep').onclick=()=>{prepDeadline=null;prepRemaining=practice().prepMs;ticks();persist();};
$('begin').onclick=()=>{startTimer();show(1);};
$('starttimer').onclick=startTimer;
setInterval(ticks,500);
document.querySelectorAll('[data-step]').forEach(e=>e.onclick=()=>show(Number(e.dataset.step)));

function applyPractice(source){
  mode=source.mode==='individual'?'individual':'team';
  cluster=source.event==='ftdm'?'ftdm':(source.cluster||'');
  if(mode==='individual'&&cluster==='ftdm')cluster='';
}
function selectCase(id,save=true){
  if(occupied()){message('Wait for recording or processing before switching cases.');$('caseselect').value=currentCase;return;}
  const stored=caseDrafts.get(id),c=stored?.case||CASE_LIBRARY.find(item=>item.id===id);
  if(!c)return;
  if(save)saveDraft();
  currentCase=id;activeCase=clone(c);
  const d=stored||{};photos=clone(d.photos||[]);revealed=!!d.revealed;feedback=d.feedback?clone(d.feedback):null;
  applyPractice(d.mode||d.cluster?{mode:d.mode,cluster:d.cluster,event:d.cluster==='ftdm'?'ftdm':''}:activeCase);
  sessionStarted=!!d.sessionStarted;deadline=d.deadline||null;prepDeadline=d.prepDeadline||null;prepRemaining=d.prepRemaining??practice().prepMs;
  if(prepRemaining>practice().prepMs)prepRemaining=practice().prepMs;
  $('transcript').value=d.transcript||'';$('transcriptreview').checked=false;
  renderCase();renderQuestions(d.answers||[]);gallery();renderResults();
  clearAudio();
  $('speechhint').textContent='Automatic transcription runs locally after you stop. First use downloads a free English model.';
  if([...$('caseselect').options].some(option=>option.value===id))$('caseselect').value=id;
  message('');ticks();show(0);controls();if(save)persist();
}
$('caseselect').onchange=e=>{
  const library=CASE_LIBRARY.find(item=>item.id===e.target.value);
  if(library?.event==='ftdm'){
    const stored=caseDrafts.get(library.id);
    if(stored){
      const formatChanged=stored.mode==='individual'||stored.cluster!=='ftdm';
      stored.mode='team';stored.cluster='ftdm';
      if(formatChanged&&!stored.sessionStarted){stored.prepDeadline=null;stored.prepRemaining=Judge.FORMATS.team.prepMs;}
    }
  }
  selectCase(e.target.value);
};
$('applycase').onclick=()=>{
  try{
    const indicators=$('pis').value.split('\n').map(v=>v.trim()).filter(Boolean),questions=$('qs').value.split('\n').map(v=>v.trim()).filter(Boolean);
    const id='custom-'+(globalThis.crypto?.randomUUID?.()||Date.now());
    const chosen=cluster==='ftdm'?{mode:'team',event:'ftdm',cluster:'finance'}:{mode,event:'',cluster};
    const c={id,title:$('customtitle').value.trim()||'My practice roleplay',tag:'Your roleplay',source:null,note:'Your supplied situation, performance indicators and judge questions.',scenario:$('custom').value.trim(),indicators,questions,...chosen};
    Judge.validateSubmission({case:c,transcript:'Validation only',answers:questions.map(()=>'Validation only'),photos:[]});
    saveDraft();mode=chosen.mode;cluster=chosen.event==='ftdm'?'ftdm':chosen.cluster;
    caseDrafts.set(id,{case:c,transcript:'',answers:[],photos:[],prepRemaining:practice().prepMs,mode,cluster});
    addCaseOption(c);selectCase(id,false);persist();message('Roleplay ready. It has its own draft and can be revisited.');
  }catch(e){message(e.message);}
};
function gallery(){
  $('gallery').replaceChildren();
  photos.forEach((p,i)=>{
    const wrap=node('div','','visual'),image=document.createElement('img');image.src=p.url;image.alt=p.name;
    const remove=node('button','Remove '+(i+1),'photo-remove secondary');remove.disabled=occupied();
    remove.onclick=()=>{if(occupied())return;photos.splice(i,1);gallery();changed();};
    wrap.append(image,node('p',(i+1)+'. '+p.name,'hint'),remove);$('gallery').append(wrap);
  });
}
async function encodeImage(file){
  const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c.toDataURL('image/jpeg',.78);
}
$('photos').onchange=async e=>{
  if(occupied())return;
  busy=true;controls();let added=false;
  try{
    for(const file of e.target.files){
      if(photos.length>=6)throw Error('Maximum six photos. Remove one to add another.');
      if(!file.type.startsWith('image/')||file.size>8388608)throw Error('Choose image files smaller than 8 MB.');
      const photo={name:file.name,url:await encodeImage(file)};
      if(photo.url.length>1500000||JSON.stringify([...photos,photo]).length>3500000)throw Error('Visuals are too large. Use fewer or smaller images.');
      photos.push(photo);added=true;
    }
  }catch(error){message(error.message);}
  finally{busy=false;e.target.value='';gallery();if(added)changed();controls();}
};
function renderQuestions(values=[]){
  $('questions').replaceChildren();if(!revealed)return;
  if(!activeCase.questions.length){$('questions').append(node('div','No judge questions were included. You can evaluate the presentation as it stands.','card'));return;}
  activeCase.questions.forEach((question,i)=>{
    const card=node('div','','card');card.append(node('div','QUESTION '+(i+1),'eyebrow'),node('h3',question));
    const label=node('label','Your answer');label.htmlFor='answer'+i;
    const area=document.createElement('textarea');area.id='answer'+i;area.value=values[i]||'';area.placeholder='Record your answer or type it here.';area.maxLength=12000;area.oninput=changed;
    const record=node('button','Record answer','secondary answer-record');record.onclick=()=>startRecording(area);
    const stop=node('button','Stop','secondary answer-stop');stop.disabled=!recording;stop.onclick=stopRecording;
    const actions=node('div','','actions');actions.append(record,stop);card.append(label,area,actions);$('questions').append(card);
  });
}
$('transcript').oninput=()=>{$('transcriptreview').checked=false;changed();};
$('transcriptreview').onchange=updateChecklist;
$('finish').onclick=()=>{
  if(!$('transcript').value.trim()){message('Record or paste your presentation transcript first.');return;}
  startTimer();if(!revealed){revealed=true;renderQuestions();}message('');show(2);persist();
};

async function decodeRecording(blob){
  const AudioCtx=window.AudioContext||window.webkitAudioContext,ctx=new AudioCtx();let decoded;
  try{decoded=await ctx.decodeAudioData(await blob.arrayBuffer());}finally{await ctx.close();}
  if(decoded.duration>1800)throw Error('Use a recording shorter than 30 minutes.');
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();return(await offline.startRendering()).getChannelData(0);
}
function speechToText(audio){
  return new Promise((resolve,reject)=>{
    if(!speechWorker)speechWorker=new Worker('transcriber.js',{type:'module'});
    const timeout=setTimeout(()=>{speechWorker?.terminate();speechWorker=null;finish(Error('Transcription timed out. Your recording is available to save or retry.'));},300000);
    const finish=(error,value)=>{clearTimeout(timeout);cancelTranscription=null;$('canceltranscribe').hidden=true;error?reject(error):resolve(value);};
    cancelTranscription=()=>{speechWorker?.terminate();speechWorker=null;finish(Error('Transcription cancelled. You can save the recording, retry, or type your transcript.'));};
    $('canceltranscribe').hidden=false;
    speechWorker.onmessage=({data})=>{if(data.status==='done')finish(null,data.text);else if(data.status==='error')finish(Error(data.message));else{$('speechhint').textContent=data.message;message(data.message);}};
    speechWorker.onerror=()=>{speechWorker.terminate();speechWorker=null;finish(Error('The speech model could not load. Check your connection and retry.'));};
    speechWorker.postMessage({audio},[audio.buffer]);
  });
}
async function transcribeRecording(blob,field,previous){
  lastRecording={blob,field,previous};busy=true;controls();$('retrytranscribe').hidden=true;$('saveaudio').hidden=false;$('recstatus').textContent='Transcribing…';message('Preparing the recording for transcription…');
  try{
    const audio=await decodeRecording(blob),text=(await speechToText(audio)).trim();
    if(!text)throw Error('No speech was detected. Check playback and retry.');
    field.value=[previous,text].filter(Boolean).join('\n');$('transcriptreview').checked=false;changed();
    $('recstatus').textContent='Transcript ready';$('speechhint').textContent='Review names, numbers and missing words before scoring.';message('Transcript ready. Review the text before continuing.');
  }catch(error){$('recstatus').textContent='Transcription failed';$('retrytranscribe').hidden=false;message('Could not transcribe: '+error.message);}
  finally{busy=false;controls();}
}
async function startRecording(field){
  if(occupied())return;
  recordStarting=true;controls();message('Requesting microphone access…');
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});const previous=field.value.trim();chunks=[];recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType}),url=URL.createObjectURL(blob);audioUrls.push(url);$('playback').src=url;$('playback').hidden=false;transcribeRecording(blob,field,previous);};
    recorder.onerror=()=>{stream?.getTracks().forEach(t=>t.stop());recording=false;busy=false;controls();message('Recording failed. Try again or paste a transcript.');};
    recorder.start();recording=true;startTimer();$('recstatus').textContent='● Recording';$('speechhint').textContent='Press Stop when you finish. Transcription starts automatically.';message('');
  }catch(error){stream?.getTracks().forEach(t=>t.stop());recording=false;message('Microphone could not start: '+error.message);}
  finally{recordStarting=false;controls();}
}
function stopRecording(){if(!recording)return;recording=false;busy=true;if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());$('recstatus').textContent='Preparing transcript…';controls();}
$('record').onclick=()=>startRecording($('transcript'));$('stop').onclick=stopRecording;
$('retrytranscribe').onclick=()=>{if(lastRecording&&!occupied())transcribeRecording(lastRecording.blob,lastRecording.field,lastRecording.previous);};
$('audioimport').onchange=e=>{const file=e.target.files[0];if(file&&!occupied()){if(file.size>100000000){message('Use an audio file smaller than 100 MB.');}else{startTimer();const url=URL.createObjectURL(file);audioUrls.push(url);$('playback').src=url;$('playback').hidden=false;transcribeRecording(file,$('transcript'),$('transcript').value.trim());}}e.target.value='';};
$('saveaudio').onclick=()=>{if(lastRecording){const mime=lastRecording.blob.type,extension=mime.includes('mp4')?'m4a':mime.includes('wav')?'wav':mime.includes('mpeg')?'mp3':mime.includes('ogg')?'ogg':'webm';downloadBlob(lastRecording.blob,'deca-roleplay-recording.'+extension);}};
$('canceltranscribe').onclick=()=>cancelTranscription?.();
function clearAudio(){lastRecording=null;audioUrls.forEach(URL.revokeObjectURL);audioUrls=[];$('retrytranscribe').hidden=true;$('saveaudio').hidden=true;$('canceltranscribe').hidden=true;$('playback').hidden=true;$('playback').removeAttribute('src');$('recstatus').textContent='Ready';}

function normalizeApiKey(value){const unquote=v=>v.trim().replace(/^(['"])([\s\S]*)\1$/,'$2').trim();return unquote(unquote(value).replace(/^Authorization\s*:\s*/i,'').replace(/^Bearer\s+/i,''));}
function apiBase(){const value=(window.FTDM_API_BASE||'').trim().replace(/\/$/,'');if(value&&!/^https:\/\//.test(value))throw Error('The judging API address must use HTTPS.');return value;}
function useGemini(){return $('provider').value==='gemini';}
function providerChanged(){
  const gemini=useGemini();$('key').value='';modelCatalog=null;$('models').replaceChildren();
  $('model').value=gemini?Gemini.DEFAULT_MODEL:'';
  $('keylabel').textContent=gemini?'Gemini API key':'OpenRouter API key';
  $('key').placeholder=gemini?'Paste your Gemini API key':'sk-or-v1-…';
  $('keyhint').textContent='Kept in this tab only and sent directly to '+(gemini?'Google':'OpenRouter')+' when scoring. Never included in saved sessions or downloads.';
  $('geminihelp').hidden=!gemini;$('freerouting').hidden=gemini;$('routinghint').hidden=gemini;
  $('modelstatus').textContent=gemini?'Gemini grades your transcript, answers and visuals. The key stays in this tab and is sent only to Google. Check available models with your key; quota and pricing are managed in Google AI Studio.':'Availability and image support vary by model and provider.';
}
$('provider').onchange=providerChanged;$('clearkey').onclick=()=>{$('key').value='';message('API key cleared from this tab.');};
async function checkGeminiModels(){
  const key=normalizeApiKey($('key').value);if(!key){$('modelstatus').textContent='Paste your Gemini API key first.';return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);busy=true;controls();
  $('modelstatus').textContent='Checking Gemini models…';
  try{
    let token='',catalog=[];
    do{
      const url=new URL(Gemini.BASE+'models');url.searchParams.set('pageSize','100');if(token)url.searchParams.set('pageToken',token);
      const response=await fetch(url,{headers:{'x-goog-api-key':key},signal:controller.signal});
      if(!response.ok)throw Error(Gemini.errorMessage(response.status));
      const body=await response.json();if(!Array.isArray(body.models))throw Error('Google returned an invalid model list.');
      catalog.push(...body.models);token=body.nextPageToken||'';
      if(catalog.length>2000)throw Error('Model list is too large. Try again later.');
    }while(token);
    modelCatalog=catalog.filter(m=>m.supportedGenerationMethods?.includes('generateContent')&&/^models\/gemini-/.test(m.name));
    $('models').replaceChildren(...modelCatalog.map(m=>{const option=document.createElement('option');option.value=m.name.replace(/^models\//,'');option.label=m.displayName||option.value;return option;}));
    const selected=modelCatalog.find(m=>m.name==='models/'+Gemini.modelId($('model').value));
    $('modelstatus').textContent=selected?'Key accepted for model listing · '+selected.displayName+'. Grading access, image support and quota are verified when you evaluate. Check pricing in Google AI Studio.':'This model is not in the current list. Choose an available model; no automatic replacement will be made.';
  }catch(error){$('modelstatus').textContent=error.name==='AbortError'?'Model check timed out. You can retry.':error.message;}
  finally{clearTimeout(timeout);busy=false;controls();}
}
async function checkModels(){
  if(occupied())return;
  if(useGemini())return checkGeminiModels();
  busy=true;controls();
  $('modelstatus').textContent='Checking current model availability…';$('checkmodel').disabled=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch('https://openrouter.ai/api/v1/models',{signal:controller.signal});if(!response.ok)throw Error('Could not load the current model list.');
    const body=await response.json();if(!Array.isArray(body.data))throw Error('Invalid model list.');modelCatalog=body.data;
    $('models').replaceChildren(...modelCatalog.filter(m=>m.architecture?.input_modalities?.includes('image')&&m.supported_parameters?.includes('response_format')&&Number(m.pricing?.prompt)===0&&Number(m.pricing?.completion)===0).map(m=>{const option=document.createElement('option');option.value=m.id;return option;}));
    const m=modelCatalog.find(m=>m.id===$('model').value.trim());
    if(!m){$('modelstatus').textContent='This model is not in the current list. Choose an available model; no automatic replacement will be made.';return;}
    const image=m.architecture?.input_modalities?.includes('image'),json=m.supported_parameters?.includes('response_format');
    $('modelstatus').textContent='Listed now · '+(image?'images supported':'text only')+' · '+(json?'JSON supported':'JSON support not listed')+' · $'+Number(m.pricing?.prompt)*1000000+' input / $'+Number(m.pricing?.completion)*1000000+' output per million tokens. Availability may still vary by provider.';
  }catch(error){$('modelstatus').textContent=error.name==='AbortError'?'Model check timed out. You can retry.':error.message;}
  finally{clearTimeout(timeout);busy=false;controls();}
}
$('checkmodel').onclick=checkModels;
$('model').oninput=()=>{$('modelstatus').textContent='Model changed. Check availability and pricing before scoring.';};
$('judge').onclick=async()=>{
  if(occupied())return;
  let snapshot,base,key,model,request,gemini;
  try{
    if(!revealed)throw Error('Finish the presentation before scoring.');
    if(activeCase.questions.length&&answers().some(answer=>!answer.trim()))throw Error('Answer each judge question before scoring.');
    if(!$('transcriptreview').checked)throw Error('Review the transcript and check “Transcript reviewed” before scoring.');
    snapshot=Judge.validateSubmission(submission());base=apiBase();gemini=!base&&useGemini();model=$('model').value.trim();key=normalizeApiKey($('key').value);
    if(gemini){
      if(!key||/\s/.test(key)){ $('settings').open=true;throw Error('Paste your Gemini API key in Judge settings.');}
      model=Gemini.modelId(model);
      if(modelCatalog&&!modelCatalog.some(m=>m.name==='models/'+model))throw Error('Choose a model present in the current availability list.');
      request=Gemini.buildRequest(snapshot,model);
    }else if(!base){
      if(!/^sk-or-v1-[A-Za-z0-9_-]{32,}$/.test(key)){ $('settings').open=true;throw Error('Paste your full OpenRouter API key in Judge settings.');}
      const selected=modelCatalog?.find(m=>m.id===model);
      if(modelCatalog&&!selected)throw Error('Choose a model present in the current availability list.');
      if(selected&&snapshot.photos.length&&!selected.architecture?.input_modalities?.includes('image'))throw Error('This model does not accept visuals. Choose an image-capable model.');
      if(selected&&!selected.supported_parameters?.includes('response_format'))throw Error('This model does not list JSON output support. Choose a compatible model.');
      request=Judge.buildRequest(snapshot,model,{freeOnly:$('freeonly').checked,structured:selected?.supported_parameters?.includes('structured_outputs')});
    }
  }catch(error){message(error.message);return;}
  const inputSignature=signature(snapshot),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
  busy=true;controls();message('Reviewing your presentation, visuals and answers…');
  try{
    const response=await fetch(base?base+'/api/judge':gemini?Gemini.BASE+'models/'+model+':generateContent':'https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(gemini?{'x-goog-api-key':key}:!base?{Authorization:'Bearer '+key,'X-OpenRouter-Title':'DECA Roleplay Practice Studio'}:{})},body:JSON.stringify(base?{submission:snapshot}:request)});
    const raw=await response.text();let body;try{body=JSON.parse(raw);}catch{throw Error('The judging service returned a non-JSON response (HTTP '+response.status+').');}
    if(!response.ok)throw Error(gemini?Gemini.errorMessage(response.status):response.status===401?'OpenRouter could not authenticate this key. Paste the full key in Judge settings.':response.status===429?'The judging service is rate limited. Wait before retrying.':response.status===413?'Submission is too large. Use fewer or smaller visuals.':body.error?.message||'Judging service error '+response.status);
    const evaluated=base?Judge.validateSubmission(body.submission):snapshot;
    const result=base?Judge.validateScorecard(body.feedback,evaluated):gemini?Gemini.parseCompletion(body,snapshot):Judge.parseCompletion(body,snapshot);
    // Ignore a result if inputs changed while the provider was processing.
    if(signature(Judge.validateSubmission(submission()))!==inputSignature||signature(evaluated)!==inputSignature)throw Error('The submission changed during judging. Score the current draft again.');
    if(base&&(body.promptVersion!==Judge.VERSION||typeof body.model!=='string'||!Number.isFinite(Date.parse(body.evaluatedAt))))throw Error('The judging API returned incompatible provenance. Update the frontend and backend together.');
    feedback={...result,submission:clone(evaluated),model:gemini?(body.modelVersion||model):typeof body.model==='string'?body.model:model,promptVersion:base?body.promptVersion:Judge.VERSION,rubricVersion:'DECA-2026-27-'+evaluated.case.mode+'-content-v1',evaluatedAt:base?body.evaluatedAt:new Date().toISOString(),stale:false};
    renderResults();message('');busy=false;show(3);persist();
  }catch(error){message((error.name==='AbortError'?'The judge timed out.':error.message)+' Your draft is intact; you can retry.');}
  finally{clearTimeout(timeout);busy=false;controls();}
};
function level(score,max){return score===max?'Exemplary':score>=(max===10?7:max===8?6:4)?'Proficient':score>=(max===10?4:max===8?3:2)?'Developing':'Novice';}
function renderResults(){
  const root=$('results');root.replaceChildren();
  if(!feedback){root.append(node('div','Complete your presentation and answers to get an evidence-backed scorecard.','card'));controls();return;}
  const hero=node('div','','scorehero');hero.append(node('div',feedback.stale?'OUT OF DATE · SCORE AGAIN':'AI CONTENT PRACTICE ESTIMATE','eyebrow'),node('strong',feedback.total+' / 100'),node('p',feedback.summary));
  hero.append(node('p',feedback.stale?'Your draft changed after this evaluation. These scores describe the earlier submission.':'Evaluated '+new Date(feedback.evaluatedAt).toLocaleString()+' · '+feedback.model));
  root.append(hero,node('p','Live delivery, poise and confidence remain unassessed'+(feedback.submission?.case?.mode==='team'?', as does live teamwork':'')+'. This 100-point estimate evaluates observable content and is not an official DECA score.','hint'));
  const priorities=node('section','','card priorities');priorities.append(node('h3','Your next three practice actions'));
  const list=document.createElement('ol');Judge.nextActions(feedback).forEach(action=>{const item=document.createElement('li');item.append(node('strong',action.name),node('p',action.action));list.append(item);});priorities.append(list);root.append(priorities);
  feedback.rows.forEach((r,i)=>{
    const details=node('details','','card score-detail'),summary=node('summary',(i+1)+'. '+r.name);
    summary.append(node('span',r.score+' / '+r.max,'row-score'));details.append(summary,node('div',level(r.score,r.max)+' · '+r.bands,'badge'),node('p','Evidence: '+r.evidence),node('p','Why this band: '+r.rationale));
    r.references.forEach(ref=>{const quote=node('blockquote',ref.quote||ref.detail);quote.append(node('cite',' — '+ref.source));details.append(quote);});
    details.append(node('p','Next practice: '+r.improvement));root.append(details);
  });controls();
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const downloadJSON=(value,name)=>downloadBlob(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),name);
$('download').onclick=()=>{if(feedback&&!feedback.stale&&!occupied()){const practiceCase=feedback.submission.case;downloadJSON({type:'deca-roleplay-feedback',version:3,event:practiceCase.event||practiceCase.cluster||'unspecified',mode:practiceCase.mode,season:'2026–27',source:practiceCase.source,guidelines:practiceCase.mode==='individual'?SERIES_GUIDE:TDM_GUIDE,...clone(feedback),limitations:'Content-only AI practice estimate. Not an official DECA score. Live delivery, poise and confidence are unassessed. Live teamwork is unassessed for team events.'},'deca-roleplay-feedback.json');}};
$('retry').onclick=()=>show(2);
$('savedraft').onclick=()=>downloadJSON(exportSession(),'deca-roleplay-session.json');

function validatedSession(data){
  const legacy=data&&data.type==='ftdm-session'&&data.version===2;
  const current=data&&data.type==='deca-roleplay-session'&&data.version===3;
  if((!legacy&&!current)||!Array.isArray(data.drafts)||!data.drafts.length||data.drafts.length>50)throw Error('Choose a saved DECA roleplay session file.');
  const map=new Map();
  for(const d of data.drafts){
    if(!d||typeof d.transcript!=='string'||!Array.isArray(d.answers)||d.answers.length>4||d.answers.some(a=>typeof a!=='string')||!Array.isArray(d.case?.questions)||d.answers.length>d.case.questions.length)throw Error('Invalid saved draft.');
    const padded=d.case.questions.map((_,i)=>d.answers[i]||'Validation only');
    const checked=Judge.validateSubmission({case:d.case,transcript:d.transcript||'Validation only',answers:padded,photos:d.photos});
    const canonical=CASE_LIBRARY.find(c=>c.id===checked.case.id);
    if(!canonical&&!checked.case.id.startsWith('custom-'))throw Error('Unknown saved case.');
    if(map.has(checked.case.id))throw Error('Duplicate saved case.');
    const draftMode=d.mode==='individual'||checked.case.mode==='individual'?'individual':'team';
    const windowMs=Judge.FORMATS[draftMode].prepMs;
    for(const value of [d.deadline,d.prepDeadline])if(value!=null&&(!Number.isFinite(value)||value<0||value>Date.now()+windowMs))throw Error('Invalid saved timer.');
    if(d.prepRemaining!=null&&(!Number.isFinite(d.prepRemaining)||d.prepRemaining<0||d.prepRemaining>windowMs))throw Error('Invalid saved preparation time.');
    const restoredCase=clone(canonical||checked.case);
    if(!canonical){restoredCase.mode=checked.case.mode;restoredCase.cluster=checked.case.cluster;restoredCase.event=checked.case.event;}
    const restored={case:restoredCase,mode:d.mode||restoredCase.mode||'team',cluster:d.cluster!=null?d.cluster:(restoredCase.event==='ftdm'?'ftdm':(restoredCase.cluster||'')),transcript:d.transcript,answers:d.answers,photos:checked.photos,revealed:!!d.revealed,sessionStarted:!!d.sessionStarted,deadline:d.deadline||null,prepDeadline:d.prepDeadline||null,prepRemaining:d.prepRemaining??Judge.FORMATS[draftMode].prepMs,feedback:null};
    if(d.feedback){
      try{
        const evaluated=Judge.validateSubmission(d.feedback.submission),card=Judge.validateScorecard(d.feedback,evaluated);
        if(evaluated.case.id===restored.case.id&&typeof d.feedback.model==='string'&&d.feedback.model.length<=200&&typeof d.feedback.evaluatedAt==='string'&&Number.isFinite(Date.parse(d.feedback.evaluatedAt))){
          let stale=!!d.feedback.stale;
          try{
            const overlay={...restored.case,mode:restored.cluster==='ftdm'?'team':restored.mode,event:restored.cluster==='ftdm'?'ftdm':'',cluster:restored.cluster==='ftdm'?'finance':restored.cluster};
            const currentNormalized=Judge.validateSubmission({case:overlay,transcript:restored.transcript,answers:restored.answers,photos:restored.photos});
            stale=stale||signature(currentNormalized)!==signature(evaluated);
          }catch{stale=true;}
          restored.feedback={...card,submission:evaluated,model:d.feedback.model,promptVersion:String(d.feedback.promptVersion||''),rubricVersion:String(d.feedback.rubricVersion||''),evaluatedAt:d.feedback.evaluatedAt,stale};
        }
      }catch{/* Restore the draft even when its old scorecard is invalid. */}
    }
    map.set(restored.case.id,restored);
  }
  if(!map.has(data.currentCase))throw Error('Saved current case is missing.');
  return {map,currentCase:data.currentCase};
}
$('importdraft').onchange=async e=>{
  const file=e.target.files[0];e.target.value='';if(!file||occupied())return;
  busy=true;controls();
  try{
    if(file.size>20000000)throw Error('Use a session file smaller than 20 MB.');
    const restored=validatedSession(JSON.parse(await file.text()));saveDraft();
    for(const [id,d]of restored.map){caseDrafts.set(id,d);addCaseOption(d.case);}busy=false;selectCase(restored.currentCase,false);persist();message('Session imported. Existing cases in the file replace their current drafts.');
  }catch(error){message('Could not import session: '+error.message);}
  finally{busy=false;controls();}
};
$('autosave').onchange=()=>{autosave=$('autosave').checked;if(autosave)persist();else{try{localStorage.removeItem(STORAGE);}catch{}$('draftstatus').textContent='Device autosave is off. Download a session to keep your work.';}};
$('cleardraft').onclick=()=>{try{localStorage.removeItem(STORAGE);}catch{}autosave=false;$('autosave').checked=false;$('draftstatus').textContent='Saved device draft cleared. Your current session remains open.';};
$('restart').onclick=()=>{
  if(occupied())return;
  if(($('transcript').value.trim()||photos.length||answers().some(a=>a.trim()))&&!window.confirm('Clear the current attempt for this case? Download the session first if you want to keep it.'))return;
  clearAudio();photos=[];feedback=null;revealed=false;sessionStarted=false;deadline=null;prepDeadline=null;prepRemaining=practice().prepMs;
  $('transcript').value='';$('transcriptreview').checked=false;renderQuestions();gallery();renderResults();ticks();show(0);persist();message('Fresh practice attempt started for this case.');
};
$('loaddemo').onclick=()=>{
  if(occupied())return;
  saveDraft();const sample={...clone(CASE_LIBRARY[0]),id:'custom-sample-family',title:'Sample submission · family finance',tag:'Synthetic practice example',note:'Fictional sample presentation and visuals, not an official answer key. Source case linked for context.',mode:'team',cluster:'finance',event:'ftdm'};
  mode='team';cluster='ftdm';
  caseDrafts.set(sample.id,{case:sample,photos:[],answers:[],transcript:'',prepRemaining:practice().prepMs,mode,cluster});addCaseOption(sample);selectCase(sample.id,false);
  const kit=window.FTDM_TEST_KIT;
  photos=kit.visuals.map(v=>({name:v.name,url:v.url}));$('transcript').value=kit.transcript;revealed=true;renderQuestions(kit.answers);
  feedback=null;sessionStarted=false;deadline=null;$('transcriptreview').checked=false;gallery();renderResults();show(1);persist();
  $('demostatus').textContent='Synthetic presentation, three visuals and answers loaded.';message('Sample loaded. Review the transcript, then open the judge questions.');
};
window.addEventListener('beforeunload',()=>{persist();stream?.getTracks().forEach(t=>t.stop());speechWorker?.terminate();audioUrls.forEach(URL.revokeObjectURL);});
CASE_LIBRARY.forEach(addCaseOption);
selectCase('family',false);
try{
  const saved=localStorage.getItem(STORAGE);
  if(saved){const restored=validatedSession(JSON.parse(saved));caseDrafts=restored.map;caseDrafts.forEach(d=>addCaseOption(d.case));selectCase(restored.currentCase,false);autosave=true;$('autosave').checked=true;$('draftstatus').textContent='Saved device draft restored. Re-enter your API key to score.';}
}catch{$('draftstatus').textContent='The saved device draft could not be restored. You can clear it and import a downloaded session.';}
providerChanged();
if(window.FTDM_API_BASE){$('providersettings').hidden=true;$('keysettings').hidden=true;$('modelsettings').hidden=true;$('modelstatus').textContent='Owner-managed judging service. Model and free-only routing are configured by the owner.';}
