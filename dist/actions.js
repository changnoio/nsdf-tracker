
'use strict';
function exportDialog(){
 modal('ส่งออกรายงานความคืบหน้า',`<p>รายงาน Excel ณ ${dateTH(asOf,true)} พร้อมรายละเอียดและแถวต้นทาง</p><label class="formlabel">ขอบเขตรายงาน<select class="field" id="exportplan"><option value="all">ภาพรวมทั้ง 6 แผนงาน</option>${data.plans.map(p=>`<option value="${p.id}" ${mode==='plan'&&planId===p.id?'selected':''}>แผน ${p.id} · ${h(p.shortName)}</option>`).join('')}</select></label><div class="modalfoot">${btn('ยกเลิก','X','close')}${btn('ดาวน์โหลด Excel','FileDown','download','primary')}</div>`);
}
async function downloadReport(id){
 const selected=id==='all'?data.plans:data.plans.filter(p=>p.id===Number(id)), prior=dates[dates.indexOf(asOf)+1],old=prior?snapshot(base,events,prior):null;
 const summary=[['รอบรายงาน','แผนงาน','ชื่อแผนงาน','กรอบเดิม (บาท)','กรอบหลังปรับ (บาท)','จัดสรรสะสม (บาท)','จัดสรรต่อกรอบ (%)','MOU ลงนาม','MOU อยู่ระหว่างดำเนินการ','MOU พร้อมลงนาม','MOU รวมตามทะเบียน','เบิกจ่ายสะสม (บาท)','วันที่ปรับปรุงแผน','เปลี่ยนแปลงจัดสรรจากรอบก่อน (บาท)','เปลี่ยนแปลง MOU ลงนาม (ฉบับ)','แถวสรุปต้นทาง']];
 const sheets=[{name:'สรุปรายสัปดาห์',rows:summary,widths:[22,12,85,24,24,24,22,18,26,21,23,25,22,40,35,22]}];
 for(const p of selected){
  const priorPlan=old?.plans.find(x=>x.id===p.id);
  summary.push([dateTH(asOf),p.id,p.name,p.originalBudget,p.budget,p.allocated,pct(p.allocated,p.budget),p.mouSigned,p.mouPending,p.mouReady,p.mouTotal,p.paid,dateTH(p.reportDate||base.asOf),old?p.allocated-priorPlan.allocated:null,old&&p.id!==9?p.mouSigned-priorPlan.mouSigned:null,p.sourceRow]);
  const proc=p.id===9,source=base.sources[proc?'procurement':'plans'],cols=columns(p.id),fields=['กรอบรายการ (บาท)',...cols.slice(2).map(c=>c[0])];
  const detail=items(data,p.id).map(r=>[r.id,r.name,r.budget,...cols.slice(2).map(c=>c[1]==='contractDate'?r.contractDate||r.contractDateRaw:r[c[1]]),dateTH(r.reportDate||base.asOf),source.sheet,r.sourceRow,r.updatedFrom||source.file]);
  sheets.push({name:proc?'จัดซื้อจัดจ้างแผน 9':'รายการแผน '+p.id,rows:[['รหัสรายการ','รายการ',...fields,'ข้อมูล ณ วันที่','ชีตต้นทาง','แถวต้นทาง','แหล่งอัปเดตล่าสุด'],...detail],widths:[16,85,23,...cols.slice(2).map(c=>['officer','status','note','evidence'].includes(c[1])?65:26),20,21,14,40]});
  if(proc){
   sheets.push({name:'สรุปจัดซื้อจัดจ้าง',rows:[['ตัวชี้วัด','ค่า','หน่วย'],['กรอบแผนบริหาร',p.budget,'บาท'],['วงเงินในทะเบียน',sum(data.procurement,'budget'),'บาท'],['อนุมัติจัดซื้อจัดจ้าง',sum(data.procurement,'allocated'),'บาท'],['จำนวนโครงการ',data.procurement.length,'โครงการ'],['ลงนามสัญญาสะสม',signed(data),'โครงการ'],...stages.map(s=>[s,data.procurement.filter(r=>r.stage===s).length,'โครงการ'])],widths:[45,26,16]});
   sheets.push({name:'ทะเบียนรายจ่าย ตค 69',rows:[['วันที่ตัดบัญชี','จำนวนรายการ','ก่อนหัก (บาท)','สุทธิ (บาท)','แถวต้นทาง'],...base.ledger.rows.map(r=>[r.date?dateTH(r.date):'ไม่ระบุวันที่',r.count,r.gross,r.net,r.sourceRows.join(', ')])],widths:[26,18,26,26,30]});
  }
 }
 const log=[['วันที่รายงาน','แผนงาน','รหัสรายการ','ช่องที่อัปเดต','ค่าใหม่','ชื่อไฟล์']];
 for(const ev of events.filter(e=>e.date<=asOf&&selected.some(p=>p.id===e.planId))){
  const labels=Object.fromEntries(columns(ev.planId).map(([v,k])=>[k,v]));
  ev.rows.forEach(r=>Object.entries(r.values).forEach(([k,v])=>log.push([dateTH(ev.date),ev.planId,r.id,labels[k],v,ev.file])));
 }
 if(log.length>1)sheets.push({name:'ประวัติการอัปเดต',rows:log,widths:[23,12,20,45,64,55]});
 const refs=[['แหล่งอ้างอิง','ชีตหรือหัวข้อ','รายละเอียด'],...Object.values(base.sources).map(s=>[s.file,s.sheet,s.columns+' · '+s.note]),['รอบเปรียบเทียบ',prior?dateTH(prior):'ยังไม่มีรอบก่อนหน้า','ช่องว่างในข้อมูลตัวเลขหมายถึงยังไม่มีข้อมูลรายงาน'],...selected.flatMap(p=>p.notes.map(n=>['ข้อสังเกตจากข้อมูลตั้งต้น','แผน '+p.id,n]))];
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
let readToken=0,preparedRevision=0;
async function previewImport(file){
 const token=++readToken,zone=$('#preview');pending=null;previewFile=file;
 if(!file||!zone)return;
 zone.innerHTML='<p class="hint">กำลังตรวจไฟล์ Excel…</p>';
 try{
  if(!ready||failed)throw Error('ต้องโหลดประวัติรอบรายงานสำเร็จก่อนนำเข้าข้อมูล');
  const rows=await ExcelIO.read(file,importPlan);
  if(token!==readToken||mode!=='import')return;
  const ev=NSDF.validate(base,events,{date:importDate,planId:importPlan,file:file.name,rows});
  pending=ev;preparedRevision=events.length;
  zone.innerHTML=`<div class="successbox">ตรวจผ่าน ${ev.rows.length} รายการ · ${h(ev.file)}<br>แผน ${ev.planId} · รอบ ${dateTH(ev.date)}</div>${patchTable(ev,snapshot(base,events,dates[0]))}<div class="modalfoot">${btn('ยืนยันบันทึกรอบรายงาน','Check','commit','primary')}</div>`;
 }catch(err){if(token===readToken&&mode==='import')zone.innerHTML=`<p class="errorbox" role="alert">${h(err.message)}</p>`;}
}
async function readEvents(){
 if(browserStorage)return JSON.parse(localStorage.getItem(storageKey)||'[]');
 const response=await fetch('./api/reports',{cache:'no-store'});
 if(!response.ok)throw Error('เปิดประวัติการอัปเดตไม่สำเร็จ');
 const result=await response.json();
 if(!Array.isArray(result.events))throw Error('รูปแบบประวัติไม่ถูกต้อง');return result.events;
}
async function commitImport(el){
 if(!pending||busy)return;
 busy=true;el.disabled=true;
 try{
  const ev=pending;
  if(browserStorage){
   const save=async()=>{const latest=await readEvents();if(latest.length!==preparedRevision)throw Error('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่ก่อนตรวจไฟล์อีกครั้ง');const clean=NSDF.validate(base,latest,ev);localStorage.setItem(storageKey,JSON.stringify([...latest,clean]));};
   if(navigator.locks)await navigator.locks.request(storageKey,save);else await save();
  }else{
   const response=await fetch('./api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:preparedRevision,event:ev})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'บันทึกไม่สำเร็จ');
  }
  setEvents(await readEvents(),ev.date);pending=null;previewFile=null;
  location.hash='weekly';toast('บันทึกความคืบหน้ารอบ '+dateTH(ev.date)+' แล้ว');
 }catch(err){modal('ยังไม่ยืนยันการบันทึก',`<p>${h(err.message)}</p><div class="modalfoot">${btn('โหลดรอบรายงานใหม่','RotateCw','reload','primary')}</div>`);}
 finally{busy=false;el.disabled=false;}
}
async function start(){
 failed='';try{setEvents(await readEvents());ready=true;}catch(e){ready=false;failed='เปิดประวัติรายสัปดาห์ไม่สำเร็จ กำลังแสดงเฉพาะข้อมูลตั้งต้น';}route();
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-act]');if(!el)return;
 const act=el.dataset.act;
 if(act==='menu')document.body.classList.toggle('sideopen');
 if(act==='close')dlg.close();
 if(act==='chart'){chartKey=el.dataset.key;render();}
 if(act==='mouinfo'){const g=support(data);modal('วิธีอ่านยอด MOU',`<p>วงแสดงจำนวนลงนาม ${fmt(sum(g,'mouSigned'))} ฉบับ เทียบกับยอดรวม ${fmt(sum(g,'mouTotal'))} ฉบับตามทะเบียน พื้นที่ส่วนที่เหลือคำนวณจากยอดรวมลบยอดลงนาม</p><p class="hint">ยอด “อยู่ระหว่างดำเนินการ” ที่รายงานจริง ${fmt(sum(g,'mouPending'))} ฉบับ รวมรายการพร้อมลงนามแล้ว</p><p class="sub">${h(base.plans[2].notes[0])}</p>`);}
 if(act==='export')exportDialog();
 if(act==='download'){el.disabled=true;try{await downloadReport($('#exportplan').value);dlg.close();toast('สร้างไฟล์รายงาน Excel แล้ว');}catch(err){toast('ส่งออกไม่สำเร็จ '+err.message);}finally{el.disabled=false;}}
 if(act==='item')itemDialog(el.dataset.id);
 if(act==='prev'||act==='next'){page+=act==='next'?1:-1;$('#rows').innerHTML=rowTable();}
 if(act==='stage'){stageFilter=el.dataset.stage;page=1;$('#stagefilter').value=stageFilter;$('#rows').innerHTML=rowTable();$('#projects').scrollIntoView({block:'start'});}
 if(act==='log'){const i=Number(el.dataset.ev),ev=events[i];if(ev)modal('รายการที่อัปเดต',`<p>แผน ${ev.planId} · ${dateTH(ev.date)} · ${h(ev.file)}</p>${patchTable(ev,snapshot(base,events.slice(0,i),ev.date))}`);}
 if(act==='commit')await commitImport(el);
 if(act==='reload'){if(dlg.open)dlg.close();await start();}
});
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.id==='week'){asOf=t.value;page=1;pending=null;previewFile=null;render();}
 if(t.id==='stagefilter'){stageFilter=t.value;page=1;$('#rows').innerHTML=rowTable();}
 if(t.id==='importplan'||t.id==='importdate'){if(t.id==='importplan')importPlan=Number(t.value);else importDate=t.value;if(previewFile)previewImport(previewFile);}
 if(t.id==='file')previewImport(t.files[0]);
});
document.addEventListener('input',e=>{if(e.target.id==='search'){filter=e.target.value;page=1;$('#rows').innerHTML=rowTable();}});
document.addEventListener('dragover',e=>{const z=e.target.closest('#drop');if(z){e.preventDefault();z.classList.add('drag');}});
document.addEventListener('dragleave',e=>e.target.closest('#drop')?.classList.remove('drag'));
document.addEventListener('drop',e=>{const z=e.target.closest('#drop');if(z){e.preventDefault();z.classList.remove('drag');previewImport(e.dataTransfer.files[0]);}});
dlg.addEventListener('click',e=>{if(e.target===dlg){const b=dlg.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dlg.close();}});
$('#shade').addEventListener('click',()=>document.body.classList.remove('sideopen'));
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('sideopen');});
window.addEventListener('hashchange',()=>{readToken++;route();});
window.addEventListener('storage',e=>{if(browserStorage&&e.key===storageKey)start();});
start();

