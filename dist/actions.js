
'use strict';

function showEntrance(){
 document.body.classList.add('at-entry');document.body.classList.remove('sideopen');if(dlg.open)dlg.close();
 $('#side').replaceChildren();$('#top').replaceChildren();
 const login=`<button class="backlink" data-act="choose">${icon('ChevronLeft')} กลับไปเลือกผู้ใช้งาน</button><h2>เข้าสู่ระบบเจ้าหน้าที่</h2><form id="loginform"><label for="username">ชื่อผู้ใช้</label><input id="username" class="field" name="username" required autocomplete="username" autocapitalize="none" spellcheck="false"><label for="password">รหัสผ่าน</label><input id="password" class="field" name="password" type="password" required autocomplete="current-password"><p id="autherror" role="alert"></p><button class="btn primary" type="submit">เข้าสู่ระบบ ${icon('ArrowRight')}</button></form>`;
 const choice=(act,ic,title,sub)=>`<button class="rolechoice" data-act="${act}"><span class="choiceicon">${icon(ic)}</span><span><b>${title}</b><small>${sub}</small></span>${icon('ChevronRight')}</button>`;
 main.innerHTML=`<section class="entrybox"><div class="entryphoto"><div class="entrybrand"><img src="assets/nsdf-logo.webp" alt="ตรากองทุนพัฒนาการกีฬาแห่งชาติ"><span>กองทุนพัฒนาการกีฬาแห่งชาติ</span></div><div class="entrycaption"><span>ปีงบประมาณ 2570</span><h1>ระบบติดตาม<br>ความคืบหน้าแผนงาน</h1></div></div><div class="entrychoices">${loginOpen?login:`<h2>เลือกการเข้าใช้งาน</h2>${choice('guest','LayoutDashboard','สำหรับบุคคลทั่วไป','ดูงบประมาณและความคืบหน้าแผนงานที่ 1–8')}${choice('staff','Users','สำหรับเจ้าหน้าที่','บันทึกรอบรายงานและติดตามงานจัดซื้อจัดจ้าง')}`}</div></section>`;
 document.title='เลือกการเข้าใช้งาน | NSDF 2570';
}
function leave(){
 sessionVersion++;readToken++;legacyRecords=[];author='';if(staff?.templateURL)URL.revokeObjectURL(staff.templateURL);
 staff=null;role=null;loginOpen=false;base=publicBase;setEvents([]);data=structuredClone(base);
 pending=null;previewFile=null;importPlan=1;planId=1;chartKey='allocated';ready=false;failed='';mode='overview';
 history.replaceState(null,'',location.href.split('#')[0]);dlg.replaceChildren();$('#toast').textContent='';showEntrance();
}
async function enter(kind,session){
 sessionVersion++;role=kind;staff=session??null;ready=false;
 base=staff?NSDFAccess.staffBase(publicBase,staff.content):publicBase;
 if(staff){
   const blob=new Blob([NSDFAccess.bytes(staff.content.template)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   staff.templateURL=URL.createObjectURL(blob);
 }
 setEvents([]);await start();
 if(isStaff()){await loadLegacy();if(mode==='import')render();if(legacyRecords.length)toast('พบข้อมูลเดิมในเครื่อง เปิดหน้านำเข้าเพื่อตรวจและย้ายเข้าฐานกลาง');}
}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='loginform')return;
 e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),msg=form.querySelector('#autherror');
 const version=sessionVersion;button.disabled=true;msg.textContent='';
 try{
  const session=await NSDFAccess.signIn(form.username.value,form.password.value);
  if(version!==sessionVersion||!form.isConnected)return;
  form.password.value='';await enter('staff',session);
 }catch{if(form.isConnected){msg.textContent='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';form.password.value='';form.password.focus();}}
 finally{button.disabled=false;}
});
function authHeaders(){return isStaff()?{Authorization:'Bearer '+staff.token}:{};}

function exportDialog(){
 if(!isStaff())return;
 modal('ส่งออกรายงานความคืบหน้า',`<p>รายงาน Excel ณ ${dateTH(asOf,true)} พร้อมรายละเอียดและแถวต้นทาง</p><label class="formlabel">ขอบเขตรายงาน<select class="field" id="exportplan"><option value="all">ภาพรวมแผนงานที่ 1–8</option>${(mode==='plan'&&planId===9?data.plans:support(data)).map(p=>`<option value="${p.id}" ${mode==='plan'&&planId===p.id?'selected':''}>แผน ${p.id} · ${h(p.shortName)}</option>`).join('')}</select></label><div class="modalfoot">${btn('ยกเลิก','X','close')}${btn('ดาวน์โหลด Excel','FileDown','download','primary')}</div>`);
}
async function downloadReport(id){
 if(!isStaff())return;
 const selected=id==='all'?support(data):data.plans.filter(p=>p.id===Number(id)), prior=dates[dates.indexOf(asOf)+1],old=prior?snapshot(base,events,prior):null;
 const summary=[['รอบรายงาน','แผนงาน','ชื่อแผนงาน','กรอบเดิม (บาท)','กรอบวงเงิน (บาท)','คณะกรรมการอนุมัติแล้ว (บาท)','จัดสรรต่อกรอบ (%)','MOU ลงนาม','MOU อยู่ระหว่างดำเนินการ','MOU พร้อมลงนาม','MOU รวมตามทะเบียน','เบิกจ่ายแล้ว (บาท)','เบิกจ่ายต่อยอดอนุมัติ (%)','วันที่ปรับปรุงแผน','เปลี่ยนแปลงจัดสรรจากรอบก่อน (บาท)','เปลี่ยนแปลง MOU ลงนาม (ฉบับ)','แถวสรุปต้นทาง','ผู้บันทึกล่าสุด']];
 const sheets=[{name:'สรุปรายสัปดาห์',rows:summary,widths:[22,12,85,24,24,24,22,18,26,21,23,25,30,22,40,35,22,32]}];
 for(const p of selected){
  const priorPlan=old?.plans.find(x=>x.id===p.id);
  summary.push([dateTH(asOf),p.id,p.name,p.originalBudget,p.budget,p.allocated,pct(p.allocated,p.budget),p.mouSigned,p.mouPending,p.mouReady,p.mouTotal,p.paid,pct(p.paid,p.allocated),dateTH(p.reportDate||base.asOf),old?p.allocated-priorPlan.allocated:null,old&&p.mouSigned!=null&&priorPlan.mouSigned!=null?p.mouSigned-priorPlan.mouSigned:null,p.sourceRow,p.updatedBy|| (p.migratedBy?'ย้ายโดย '+p.migratedBy:'ไม่ระบุ')]);
  const proc=p.id===9,source=base.sources[proc?'procurement':'plans'],cols=columns(p.id),fields=['กรอบรายการ (บาท)',...cols.slice(2).map(c=>c[0])];
  const detail=items(data,p.id).map(r=>[r.id,r.name,r.budget,...cols.slice(2).map(c=>c[1]==='contractDate'?r.contractDate||r.contractDateRaw:r[c[1]]),pct(r.paid,r.allocated),dateTH(r.reportDate||base.asOf),source.sheet,r.sourceRow,r.updatedFrom||source.file,r.updatedBy|| (r.migratedBy?'ย้ายโดย '+r.migratedBy:'ไม่ระบุ')]);
  sheets.push({name:proc?'จัดซื้อจัดจ้างแผน 9':'รายการแผน '+p.id,rows:[['รหัสรายการ','รายการ',...fields,'เบิกจ่ายต่อยอดอนุมัติ (%)','ข้อมูล ณ วันที่','ชีตต้นทาง','แถวต้นทาง','แหล่งอัปเดตล่าสุด','ผู้บันทึกล่าสุด'],...detail],widths:[16,85,23,...cols.slice(2).map(c=>['officer','status','note','evidence'].includes(c[1])?65:26),30,20,21,14,40,32]});
  if(proc){
   sheets.push({name:'สรุปจัดซื้อจัดจ้าง',rows:[['ตัวชี้วัด','ค่า','หน่วย'],['กรอบแผนบริหาร',p.budget,'บาท'],['วงเงินในทะเบียน',sum(data.procurement,'budget'),'บาท'],['อนุมัติจัดซื้อจัดจ้าง',sum(data.procurement,'allocated'),'บาท'],['จำนวนโครงการ',data.procurement.length,'โครงการ'],['ลงนามสัญญาสะสม',signed(data),'โครงการ'],...stages.map(s=>[s,data.procurement.filter(r=>r.stage===s).length,'โครงการ'])],widths:[45,26,16]});
   sheets.push({name:'ทะเบียนรายจ่าย ตค 69',rows:[['วันที่ตัดบัญชี','จำนวนรายการ','ก่อนหัก (บาท)','สุทธิ (บาท)','แถวต้นทาง'],...base.ledger.rows.map(r=>[r.date?dateTH(r.date):'ไม่ระบุวันที่',r.count,r.gross,r.net,r.sourceRows.join(', ')])],widths:[26,18,26,26,30]});
  }
 }
 const log=[['วันที่รายงาน','แผนงาน','รหัสรายการ','ช่องที่อัปเดต','ค่าใหม่','ชื่อไฟล์','ผู้บันทึก','ผู้ย้ายข้อมูลเดิม','เวลาบันทึก (ประเทศไทย)']];
 for(const ev of events.filter(e=>e.date<=asOf&&selected.some(p=>p.id===e.planId))){
  const labels=Object.fromEntries(columns(ev.planId).map(([v,k])=>[k,v]));
  ev.rows.forEach(r=>Object.entries(r.values).forEach(([k,v])=>log.push([dateTH(ev.date),ev.planId,r.id,labels[k],v,ev.file,ev.updatedBy||'ไม่ระบุ',ev.migratedBy||'',ev.recordedAt?new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(ev.recordedAt)):''])));
 }
 if(log.length>1)sheets.push({name:'ประวัติการอัปเดต',rows:log,widths:[23,12,20,45,64,55,32,32,32]});
 const refs=[['แหล่งอ้างอิง','ชีตหรือหัวข้อ','รายละเอียด'],...Object.values(selected.some(p=>p.id===9)?base.sources:publicBase.sources).map(s=>[s.file,s.sheet,s.columns+' · '+s.note]),['รอบเปรียบเทียบ',prior?dateTH(prior):'ยังไม่มีรอบก่อนหน้า','ช่องว่างในข้อมูลตัวเลขหมายถึงยังไม่มีข้อมูลรายงาน'],...selected.flatMap(p=>p.notes.map(n=>['ข้อสังเกตจากข้อมูลตั้งต้น','แผน '+p.id,n]))];
 sheets.push({name:'แหล่งข้อมูล',rows:refs,widths:[55,34,125]});
 await ExcelIO.report(sheets,`NSDF-2570-${id==='all'?'ภาพรวม':'แผน-'+id}-${asOf}.xlsx`);
}
function patchTable(ev,before){
 const plan=before.plans.find(p=>p.id===ev.planId),records=new Map(items(before,ev.planId).map(r=>[r.id,r]));
 records.set('P'+plan.id+'-TOTAL',{...plan,name:'ยอดรวมระดับแผนงาน'});
 const keys=Object.fromEntries(columns(ev.planId).map(([v,k])=>[k,v]));
 const changeRows=ev.rows.flatMap(p=>Object.entries(p.values).map(([k,v])=>({id:p.id,name:records.get(p.id)?.name,k:keys[k],old:records.get(p.id)?.[k],v})));
 const show=v=>v==null?'—':typeof v==='number'?money(v):h(v);
 return `<div class="tablewrap" style="max-height:380px"><table class="t"><thead><tr><th>รายการ / ช่อง</th><th>เดิม</th><th>ค่าใหม่</th></tr></thead><tbody>${changeRows.map(r=>`<tr><td>${h(r.k)}<small class="tdsmall">${h(r.id)} · ${h(r.name)}</small></td><td>${show(r.old)}</td><td>${show(r.v)}</td></tr>`).join('')}</tbody></table></div>`;
}

function legacyNotice(){
 if(!legacyRecords.length)return '';
 return `<article class="box legacybox"><h2>พบข้อมูลเดิมที่บันทึกในเครื่องนี้ ${legacyRecords.length} รอบ</h2><p class="sub">กรอกชื่อผู้ย้ายข้อมูล แล้วตรวจค่าเดิมกับค่าปัจจุบันก่อนบันทึกเข้าฐานกลาง ชื่อผู้บันทึกเดิมจะแสดงว่าไม่ระบุ</p>${btn('ตรวจและย้ายข้อมูลเดิม','Upload','legacy')}</article>`;
}
async function sourceId(event){
 const rows=event.rows.map(r=>({id:r.id,values:Object.fromEntries(Object.entries(r.values).sort(([a],[b])=>a.localeCompare(b)))})).sort((a,b)=>a.id.localeCompare(b.id));
 const value={date:event.date,planId:event.planId,file:event.file,rows};
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function loadLegacy(){
 const version=sessionVersion,session=staff;
 if(!session)return;
 try{
  const keys=[...new Set([storageKey,'nsdf-fy2570-events-v1'])],found=new Map();
  for(const key of keys){
   const raw=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(raw))continue;
   for(const record of raw){
    const event=record.sealed?await NSDFAccess.open(session.key,record):record;
    if(!event?.rows||!base.plans.some(p=>p.id===event.planId))continue;
    const id=await sourceId(event);
    if(!events.some(e=>e.sourceId===id))found.set(id,{event,id});
   }
  }
  if(version===sessionVersion)legacyRecords=[...found.values()].sort((a,b)=>a.event.date.localeCompare(b.event.date));
 }catch{if(version===sessionVersion)toast('อ่านข้อมูลเดิมในเครื่องไม่สำเร็จ กรุณาเก็บไฟล์ Excel เดิมไว้เพื่อนำเข้าอีกครั้ง');}
}
function showLegacy(){
 if(!isStaff()||!legacyRecords.length)return;
 try{author=NSDF.authorName($('#author')?.value||author);}
 catch(err){toast(err.message);$('#author')?.focus();return;}
 modal('ตรวจข้อมูลเดิมก่อนย้าย',`<p>เลือกข้อมูลเดิมที่ต้องการนำเข้าฐานกลาง ระบบจะแสดงผลต่างก่อนยืนยัน</p><label class="formlabel">รอบข้อมูลเดิม<select id="legacyrecord" class="field">${legacyRecords.map(({event},i)=>`<option value="${i}">แผน ${event.planId} · ${dateTH(event.date)} · ${h(event.file)}</option>`).join('')}</select></label><p class="hint">ข้อมูลจะบันทึกเป็นรอบวันที่ ${dateTH(importDate)} ผู้ย้ายข้อมูล ${h(author)}</p><div class="modalfoot">${btn('ตรวจผลต่าง','Check','legacy-preview','primary')}</div>`);
}
function previewLegacy(){
 if(!isStaff())return;
 const record=legacyRecords[Number($('#legacyrecord')?.value)];
 if(!record)return;
 try{
  if(!ready||failed)throw Error('กรุณาเชื่อมต่อฐานข้อมูลกลางก่อนย้ายข้อมูล');
  const ev=NSDF.validate(base,events,{...record.event,date:importDate});
  pending={...ev,sourceId:record.id,sourceDate:record.event.date,requestId:crypto.randomUUID()};
  preparedRevision=sharedRevision;previewFile=null;
  dlg.close();renderPreview(pending,`ย้ายข้อมูลเดิมรอบ ${dateTH(record.event.date)} · ผู้ย้าย ${h(author)}`);
 }catch(err){toast(err.message);}
}
function renderPreview(ev,extra=''){
 const zone=$('#preview');if(!zone)return;
 zone.innerHTML=`<div class="successbox">ตรวจผ่าน ${ev.rows.length} รายการ · ${h(ev.file)}<br>แผน ${ev.planId} · รอบ ${dateTH(ev.date)}${extra?`<br>${extra}`:''}</div>${patchTable(ev,snapshot(base,events,dates[0]))}<div class="modalfoot">${btn('ยืนยันบันทึกรอบรายงาน','Check','commit','primary')}</div>`;
}
let readToken=0,preparedRevision=0;
async function previewImport(file){
 if(!isStaff())return;
 const token=++readToken,zone=$('#preview');pending=null;previewFile=file;
 if(!file||!zone)return;
 zone.innerHTML='<p class="hint">กำลังตรวจไฟล์ Excel…</p>';
 try{
  if(!ready||failed)throw Error('ต้องโหลดข้อมูลกลางสำเร็จก่อนนำเข้าข้อมูล');
  author=NSDF.authorName($('#author')?.value||author);
  const rows=await ExcelIO.read(file,importPlan);
  if(token!==readToken||mode!=='import')return;
  const ev=NSDF.validate(base,events,{date:importDate,planId:importPlan,file:file.name,rows});
  pending={...ev,requestId:crypto.randomUUID()};preparedRevision=sharedRevision;
  renderPreview(pending);
 }catch(err){if(token===readToken&&mode==='import')zone.innerHTML=`<p class="errorbox" role="alert">${h(err.message)}</p>`;}
}
async function readEvents(){
 const response=await fetch(reportsEndpoint,{cache:'no-store',headers:authHeaders(),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('เปิดข้อมูลกลางไม่สำเร็จ');
 const result=await response.json();
 if(!Array.isArray(result.events)||!Number.isInteger(result.revision))throw Error('รูปแบบข้อมูลกลางไม่ถูกต้อง');
 return result;
}
async function commitImport(el){
 if(!isStaff()||!pending||busy)return;
 const version=sessionVersion;
 busy=true;el.disabled=true;
 try{
  author=NSDF.authorName($('#author')?.value||author);
  const {requestId,...event}=pending;
  const response=await fetch(reportsEndpoint,{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({revision:preparedRevision,requestId,event:{...event,updatedBy:author}}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'บันทึกไม่สำเร็จ');
  if(version!==sessionVersion)return;
  pending=null;previewFile=null;
  const updated=await readEvents();if(version!==sessionVersion)return;
  sharedRevision=updated.revision;setEvents(updated.events,event.date);
  await loadLegacy();if(version!==sessionVersion)return;
  location.hash='weekly';toast('บันทึกในฐานข้อมูลกลางแล้ว ทุกเครื่องจะเห็นข้อมูลรอบนี้');
 }catch(err){
  if(version!==sessionVersion)return;
  modal('ตรวจสถานะการบันทึก',`<p>${h(err.message)}</p><p class="sub">หากเครือข่ายขาดระหว่างส่งข้อมูล สามารถปิดหน้าต่างนี้แล้วกดยืนยันซ้ำได้ ระบบตรวจคำขอซ้ำก่อนบันทึก</p><div class="modalfoot">${btn('ปิด','X','close')}${btn('โหลดข้อมูลใหม่','RotateCw','reload','primary')}</div>`);
 }finally{busy=false;el.disabled=false;}
}
async function start(){
 if(!role){route();return;}
 const version=sessionVersion;failed='';
 try{
  const result=await readEvents();if(version!==sessionVersion)return;
  sharedRevision=result.revision;setEvents(result.events);ready=true;
 }catch{
  if(version!==sessionVersion)return;
  ready=false;failed='เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จ ข้อมูลที่แสดงอาจยังไม่ใช่รอบล่าสุด';
 }
 route();
}
async function syncShared(){
 if(!role||syncing||busy||pending||document.hidden)return;
 syncing=true;const version=sessionVersion;
 try{
  const result=await readEvents();if(version!==sessionVersion||pending||busy)return;
  const changed=JSON.stringify(events)!==JSON.stringify(result.events),wasFailed=!!failed;
  sharedRevision=result.revision;ready=true;failed='';
  if(changed){
   const followingLatest=asOf===dates[0];
   setEvents(result.events,followingLatest?undefined:asOf);
   if(mode!=='import'){render();toast('อัปเดตข้อมูลล่าสุดจากฐานกลางแล้ว');}
  }
  const notice=$('#syncnotice');if(notice){notice.hidden=true;notice.textContent='';}
  if(wasFailed && mode!=='import')render();
 }catch{
  if(version!==sessionVersion)return;
  failed='กำลังเชื่อมต่อฐานข้อมูลกลางใหม่ ข้อมูลที่แสดงอาจยังไม่ใช่รอบล่าสุด';
  const notice=$('#syncnotice');if(notice){notice.hidden=false;notice.textContent=failed;}
 }finally{syncing=false;}
}

document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-act]');if(!el)return;
 const act=el.dataset.act;
 if(act==='leave'){leave();return;}
 if(!role){
   if(act==='guest')await enter('guest');
   if(act==='staff'||act==='choose'){loginOpen=act==='staff';showEntrance();$('#username')?.focus();}
   return;
 }
 if(!isStaff()&&['commit','export','download','legacy','legacy-preview'].includes(act))return;
 if(act==='menu')document.body.classList.toggle('sideopen');
 if(act==='close')dlg.close();
 if(act==='chart'){chartKey=el.dataset.key;render();}
 if(act==='mouinfo'){const g=support(data);modal('วิธีอ่านยอด MOU',`<p>วงแสดงจำนวนลงนาม ${fmt(sum(g,'mouSigned'))} ฉบับ เทียบกับยอดรวม ${fmt(sum(g,'mouTotal'))} ฉบับตามทะเบียน พื้นที่ส่วนที่เหลือคำนวณจากยอดรวมลบยอดลงนาม</p><p class="hint">ยอด “อยู่ระหว่างดำเนินการ” ที่รายงานจริง ${fmt(sum(g,'mouPending'))} ฉบับ รวมรายการพร้อมลงนามแล้ว</p><p class="sub">${h(base.plans[2].notes[0])}</p>`);}
 if(act==='export')exportDialog();
 if(act==='download'){el.disabled=true;try{await downloadReport($('#exportplan').value);dlg.close();toast('สร้างไฟล์รายงาน Excel แล้ว');}catch(err){toast('ส่งออกไม่สำเร็จ '+err.message);}finally{el.disabled=false;}}
 if(act==='item')itemDialog(el.dataset.id);
 if(act==='prev'||act==='next'){page+=act==='next'?1:-1;$('#rows').innerHTML=rowTable();}
 if(act==='stage'){stageFilter=el.dataset.stage;page=1;$('#stagefilter').value=stageFilter;$('#rows').innerHTML=rowTable();$('#projects').scrollIntoView({block:'start'});}
 if(act==='log'){const i=Number(el.dataset.ev),ev=events[i];if(ev)modal('รายการที่อัปเดต',`<p>แผน ${ev.planId} · ${dateTH(ev.date)} · ${h(ev.file)}</p><p class="sub">${auditText(ev)}</p>${patchTable(ev,snapshot(base,events.slice(0,i),ev.date))}`);}
 if(act==='legacy')showLegacy();
 if(act==='legacy-preview')previewLegacy();
 if(act==='commit')await commitImport(el);
 if(act==='reload'){if(dlg.open)dlg.close();await start();}
});
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.id==='week'){asOf=t.value;page=1;pending=null;previewFile=null;render();}
 if(t.id==='stagefilter'){stageFilter=t.value;page=1;$('#rows').innerHTML=rowTable();}
 if(t.id==='importplan'||t.id==='importdate'){if(pending?.sourceId){pending=null;$('#preview').innerHTML='<p class="sub">กรุณาตรวจข้อมูลเดิมอีกครั้งหลังเปลี่ยนรอบรายงาน</p>';}if(t.id==='importplan')importPlan=Number(t.value);else importDate=t.value;if(previewFile)previewImport(previewFile);}
 if(t.id==='file')previewImport(t.files[0]);
});
document.addEventListener('input',e=>{if(e.target.id==='author')author=e.target.value;if(e.target.id==='search'){filter=e.target.value;page=1;$('#rows').innerHTML=rowTable();}});
document.addEventListener('dragover',e=>{const z=e.target.closest('#drop');if(z){e.preventDefault();z.classList.add('drag');}});
document.addEventListener('dragleave',e=>e.target.closest('#drop')?.classList.remove('drag'));
document.addEventListener('drop',e=>{const z=e.target.closest('#drop');if(z){e.preventDefault();z.classList.remove('drag');previewImport(e.dataTransfer.files[0]);}});
dlg.addEventListener('click',e=>{if(e.target===dlg){const b=dlg.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dlg.close();}});
$('#shade').addEventListener('click',()=>document.body.classList.remove('sideopen'));
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('sideopen');});
window.addEventListener('hashchange',()=>{readToken++;route();});
window.addEventListener('focus',syncShared);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncShared();});
setInterval(syncShared,15000);
start();
