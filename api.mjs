const PUBLIC_ORIGIN = 'https://changnoio.github.io';
function response(payload, status, origin) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return new Response(status===204?null:JSON.stringify(payload), {status,headers});
}
async function fingerprint(value) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
}
export async function reportsAPI(request,store,base,logic) {
  const requestedOrigin = request.headers.get('origin');
  const allowed = requestedOrigin === PUBLIC_ORIGIN || requestedOrigin === new URL(request.url).origin;
  const origin = allowed ? requestedOrigin : null;
  const json = (value,status=200)=>response(value,status,origin);
  if(requestedOrigin && !allowed)return json({error:'เว็บไซต์นี้ไม่มีสิทธิ์เรียกข้อมูล'},403);
  if(request.method==='OPTIONS')return json(null,204);
  if(!['GET','POST'].includes(request.method))return json({error:'วิธีเรียกไม่รองรับ'},405);
  let session=null;
  const auth=request.headers.get('authorization');
  if(auth){
    try{
      if(!/^Bearer [A-Za-z0-9+/]{43}=$/.test(auth))throw Error();
      session=await globalThis.NSDFAccess.fromToken(auth.slice(7));
    }catch{return json({error:'กรุณาเข้าสู่ระบบเจ้าหน้าที่'},401);}
  }
  if(request.method==='POST'){
    if(!session)return json({error:'กรุณาเข้าสู่ระบบเจ้าหน้าที่'},401);
    if(!allowed || !request.headers.get('content-type')?.startsWith('application/json'))return json({error:'คำขอบันทึกต้องมาจากหน้าแดชบอร์ด'},403);
    if(Number(request.headers.get('content-length')||0)>600000)return json({error:'ข้อมูลอัปเดตมากเกินไป'},413);
  }
  try{
    const events=await store.read();
    if(request.method==='GET'){
      const visible=session?events:events.filter(e=>base.plans.some(p=>p.id===e.planId));
      return json({events:visible,revision:visible.length});
    }
    let event;
    try{
      const body=await request.text();
      if(body.length>600000)return json({error:'ข้อมูลอัปเดตมากเกินไป'},413);
      const update=JSON.parse(body);
      if(!/^[a-f0-9-]{36,64}$/.test(update.requestId||''))throw Error('รหัสคำขอบันทึกไม่ถูกต้อง กรุณาตรวจไฟล์อีกครั้ง');
      const digest=await fingerprint(update.event);
      const existing=events.find(e=>e.requestId===update.requestId);
      if(existing)return existing.requestDigest===digest?json({revision:events.length,duplicate:true}):json({error:'รหัสคำขอซ้ำกับข้อมูลอื่น กรุณาตรวจไฟล์อีกครั้ง'},409);
      if(update.event?.sourceId && events.some(e=>e.sourceId===update.event.sourceId))return json({revision:events.length,duplicate:true});
      if(update.revision!==events.length)return json({error:'มีข้อมูลใหม่จากเจ้าหน้าที่ท่านอื่น กรุณาโหลดข้อมูลใหม่และตรวจผลต่างอีกครั้ง'},409);
      const author=logic.authorName(update.event?.updatedBy);
      const migrated=update.event?.sourceId!=null;
      if(migrated && (!/^[a-f0-9]{64}$/.test(update.event.sourceId)||!logic.validDate(update.event.sourceDate)))throw Error('ข้อมูลรอบเดิมไม่ถูกต้อง');
      event=logic.validate(globalThis.NSDFAccess.staffBase(base,session.content),events,update.event);
      event={...event,updatedBy:migrated?null:author,recordedAt:new Date().toISOString(),requestId:update.requestId,requestDigest:digest};
      if(migrated)Object.assign(event,{sourceId:update.event.sourceId,sourceDate:update.event.sourceDate,migratedBy:author});
    }catch(e){return json({error:e.message},422);}
    const wrote=await store.append(events.length+1,JSON.stringify(event));
    if(!wrote)return json({error:'มีการบันทึกพร้อมกัน กรุณาโหลดข้อมูลใหม่และตรวจผลต่างอีกครั้ง'},409);
    return json({revision:events.length+1},201);
  }catch{return json({error:'เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จ กรุณาลองใหม่'},503);}
}
