export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/reports'){
   const store={
    read:async()=>{const {results}=await env.DB.prepare('SELECT payload FROM weekly_reports ORDER BY revision').all();return results.map(row=>JSON.parse(row.payload));},
    append:async(revision,payload)=>{const res=await env.DB.prepare('INSERT OR IGNORE INTO weekly_reports (revision,payload) VALUES (?,?)').bind(revision,payload).run();return res.meta.changes===1;}
   };
   return reportsAPI(request,store,globalThis.NSDF_DATA,globalThis.NSDF);
  }
  const resource=assets[url.pathname==='/'?'/index.html':url.pathname];
  if(!resource||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
  const [type,encoded]=resource,headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-cache'};
  return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{headers});
 }
};

