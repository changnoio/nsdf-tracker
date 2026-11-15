const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function reportsAPI(request,store,base,logic){
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'วิธีเรียกไม่รองรับ'},405);
  if(request.method==='POST'){
    if(request.headers.get('origin')!==new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json'))return json({error:'คำขอบันทึกต้องมาจากหน้าแดชบอร์ด'},403);
    if(Number(request.headers.get('content-length')||0)>600000)return json({error:'ไฟล์อัปเดตมีข้อมูลมากเกินไป'},413);
  }
  try{
    const events=await store.read();
    if(request.method==='GET')return json({events});
    let update;
    try{
      const body=await request.text();
      if(body.length>600000)return json({error:'ไฟล์อัปเดตมีข้อมูลมากเกินไป'},413);
      update=JSON.parse(body);
      if(update.revision!==events.length)return json({error:'มีการอัปเดตรอบรายงานจากหน้าต่างอื่น กรุณาโหลดข้อมูลใหม่และตรวจไฟล์อีกครั้ง'},409);
      update.event=logic.validate(base,events,update.event);
    }catch(e){return json({error:e.message},422);}
    const wrote=await store.append(events.length+1,JSON.stringify(update.event));
    if(!wrote)return json({error:'มีการบันทึกพร้อมกัน กรุณาโหลดรอบรายงานใหม่'},409);
    return json({revision:events.length+1},201);
  }catch{return json({error:'เข้าถึงฐานข้อมูลรายสัปดาห์ไม่สำเร็จ กรุณาลองใหม่'},503);}
}

