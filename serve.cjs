const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'dist');
const files={'/':'index.html','/index.html':'index.html',...Object.fromEntries(['app.js','style.css','config.js','cases.js','test-kit.js','judge-core.js','transcriber.js'].map(name=>['/'+name,name]))};
function createServer(env=process.env){
  return http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/judge'){
      try{
        const {default:worker}=await import('./backend/worker.mjs');
        const data=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>4000000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'Submission exceeds 4 MB.'}}));return;}data.push(chunk);}
        const request=new Request('http://localhost'+req.url,{method:req.method,headers:{...req.headers,origin:req.headers.origin||''},...(req.method==='POST'?{body:Buffer.concat(data)}:{})});
        const response=await worker.fetch(request,env);
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
      }catch(error){console.error('Local judging bridge failed:',error.name);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'Local judging service failed.'}}));}
      return;
    }
    const name=files[pathname];
    if(!name){res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.setHeader('Cache-Control','no-store');
    fs.createReadStream(path.join(root,name)).pipe(res);
  });
}
if(require.main===module){const server=createServer();server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('FTDM Practice Studio: http://localhost:'+server.address().port+' — press Ctrl+C to stop'));}
module.exports={createServer};
