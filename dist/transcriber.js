let transcriber;
self.onmessage=async({data})=>{try{
  if(!transcriber){
    self.postMessage({status:'loading',message:'Downloading the free speech model… First use takes longer.'});
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
    env.allowLocalModels=false;
    env.backends.onnx.wasm.numThreads=1;
    transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')self.postMessage({status:'loading',message:'Downloading speech model: '+Math.round(p.progress||0)+'%'});}});
  }
  self.postMessage({status:'working',message:'Turning your recording into text…'});
  const output=await transcriber(data.audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:false});
  self.postMessage({status:'done',text:output.text});
}catch(error){transcriber=null;self.postMessage({status:'error',message:error.message});}};
