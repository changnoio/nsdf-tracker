import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)), dist=path.join(root,'dist');
const assets={};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',webp:'image/webp',ttf:'font/ttf',txt:'text/plain; charset=utf-8'};
function collect(dir,prefix=''){
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  if(ent.name==='server'||ent.name.startsWith('.'))continue;
  const key=prefix+'/'+ent.name,file=path.join(dir,ent.name);
  if(ent.isDirectory())collect(file,key);
  else assets[key]=[types[path.extname(ent.name).slice(1)]||'application/octet-stream',readFileSync(file).toString('base64')];
 }
}
collect(dist);
const worker=[
 'const window=globalThis;',
 readFileSync(path.join(dist,'data.js'),'utf8'),
 readFileSync(path.join(dist,'core.js'),'utf8'),
 readFileSync(path.join(root,'api.mjs'),'utf8').replace('export async function reportsAPI','async function reportsAPI'),
 'const assets='+JSON.stringify(assets)+';',
 readFileSync(path.join(root,'worker.mjs'),'utf8')
].join('\n');
mkdirSync(path.join(dist,'server'),{recursive:true});
writeFileSync(path.join(dist,'server/index.js'),worker);
console.log('Worker prepared with',Object.keys(assets).length,'assets.');

