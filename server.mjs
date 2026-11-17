import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {reportsAPI} from './api.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)), dist=path.join(root,'dist');
globalThis.window=globalThis;
await import('./dist/data.js');
await import('./dist/access.js');
await import('./dist/staff-data.js');
await import('./dist/core.js');
const state=process.env.NSDF_DATA_DIR||path.join(root,'.local-data');
mkdirSync(state,{recursive:true});
const db=new DatabaseSync(path.join(state,'weekly.sqlite'));
db.exec('PRAGMA journal_mode=WAL');
db.exec(readFileSync(path.join(root,'drizzle/0000_weekly_reports.sql'),'utf8'));
const read=db.prepare('SELECT payload FROM weekly_reports ORDER BY revision');
const append=db.prepare('INSERT OR IGNORE INTO weekly_reports (revision,payload) VALUES (?,?)');
const store={read:()=>read.all().map(r=>JSON.parse(r.payload)),append:(id,body)=>append.run(id,body).changes===1};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.ttf':'font/ttf','.webp':'image/webp','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://'+req.headers.host);
  if(url.pathname==='/api/reports'){
   const pieces=[];let size=0;
   for await(const piece of req){size+=piece.length;if(size>600000){res.writeHead(413);res.end();return;}pieces.push(piece);}
   const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?Buffer.concat(pieces):undefined});
   const response=await reportsAPI(request,store,globalThis.NSDF_DATA,globalThis.NSDF);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const allowed=/^(?:index\.html|(?:styles\.css|(?:data|staff-data|access|core|excel|app|views|actions)\.js)|assets\/(?:[\w.-]+\/)*[\w.-]+|templates\/plan-[1-8]\.xlsx)$/.test(relative) && !relative.includes('..');
  const file=path.join(dist,relative);
  if(req.method!=='GET'&&req.method!=='HEAD'||!allowed||!existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
 }catch{if(!res.headersSent)res.writeHead(400);res.end();}
});
const port=Number(process.env.NSDF_PORT||4190);
const address='http://127.0.0.1:'+port+'/';
function openDashboard(){
 if(process.argv.includes('--open') && process.platform==='win32'){
  const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',address],{detached:true,stdio:'ignore',windowsHide:true});
  browser.unref();
 }
}
server.on('error',async error=>{
 if(error.code==='EADDRINUSE'){
  try{
   const page=await fetch(address,{signal:AbortSignal.timeout(3000)});
   if((await page.text()).includes('NSDF | ติดตามแผนงานปี 2570')){
    console.log('NSDF dashboard '+address);
    openDashboard();
    db.close();
    return;
   }
  }catch{}
 }
 console.error(error.message);
 process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{console.log('NSDF dashboard '+address);openDashboard();});
