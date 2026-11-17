/* Store cumulative weekly changes against the dated Excel baseline. */
(function(scope) {
  'use strict';
  const stages = ['เตรียมการ','จัดทำ TOR และราคากลาง','เชิญชวนและพิจารณาข้อเสนอ','รอลงนาม','ลงนามสัญญาแล้ว','บริหารสัญญา','ตรวจรับ','เบิกจ่าย','เสร็จสิ้น'];
  const common = [['รหัสรายการ','id'],['รายการ','name']];
  const grantColumns = [...common,['จัดสรรสะสม (บาท)','allocated'],['ลงนาม MOU (ฉบับ)','mouSigned'],['MOU อยู่ระหว่างดำเนินการ (ฉบับ)','mouPending'],['MOU พร้อมลงนาม (ฉบับ)','mouReady'],['MOU ทั้งหมด (ฉบับ)','mouTotal'],['เบิกจ่ายแล้ว (บาท)','paid'],['ผลงาน (%)','progress'],['ผู้รับผิดชอบ','officer'],['ความคืบหน้าและงานถัดไป','note'],['หลักฐานอ้างอิง','evidence']];
  const procurementColumns = [...common,['ขั้นตอน','stage'],['สถานะตามรายงาน','status'],['ผู้รับผิดชอบ','officer'],['วงเงินอนุมัติ (บาท)','allocated'],['เลขที่สัญญา','contract'],['วันที่สัญญา','contractDate'],['ผลงาน (%)','progress'],['งานถัดไป','note'],['หลักฐานอ้างอิง','evidence'],['เบิกจ่ายแล้ว (บาท)','paid']];
  const aggregate = ['allocated','mouSigned','mouPending','mouReady','mouTotal','paid'];
  const numeric = [...aggregate,'progress'];
  const columns = id => id === 9 ? procurementColumns : grantColumns;
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  }
  function localDate() {
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  function items(data,planId) {
    return planId===9 ? data.procurement : data.plans.find(p=>p.id===planId)?.items || [];
  }
  function apply(data,event) {
    const plan=data.plans.find(p=>p.id===event.planId);
    const byId=new Map(items(data,event.planId).map(r=>[r.id,r]));
    const totalId='P'+event.planId+'-TOTAL';
    const summary=event.rows.find(r=>r.id===totalId);
    for(const {id,values} of event.rows) {
      if(id===totalId) continue;
      const row=byId.get(id);
      if(!row) throw Error('ไม่พบรหัสรายการ '+id);
      for(const [key,val] of Object.entries(values)) {
        if(event.planId!==9 && aggregate.includes(key) && row[key]!=null && plan[key]!=null) {
          plan[key]=Math.round((plan[key]+val-row[key])*100)/100;
        }
        row[key]=val;
      }
      row.reportDate=event.date;
      row.updatedFrom=event.file;
    }
    if(summary) Object.assign(plan,summary.values);
    plan.reportDate=event.date;
    return data;
  }
  function snapshot(base,events,date) {
    const result=structuredClone(base);
    for(const ev of events) if(ev.date<=date) apply(result,ev);
    return result;
  }
  function validate(base,events,proposal) {
    if(!proposal || !base.plans.some(plan=>plan.id===proposal.planId)) throw Error('เลือกแผนงานที่ต้องการอัปเดต');
    if(!validDate(proposal.date)||proposal.date<base.asOf||proposal.date>localDate()) throw Error('วันที่รายงานต้องอยู่ระหว่างวันที่ฐานข้อมูลถึงวันนี้');
    const latest=events.at(-1)?.date||base.asOf;
    if(proposal.date<latest) throw Error('รอบรายงานต้องตรงกับหรืออยู่หลังรอบล่าสุด เพื่อรักษาลำดับข้อมูลสะสม');
    if(typeof proposal.file!=='string'||!proposal.file.trim()||proposal.file.length>240) throw Error('ชื่อไฟล์ไม่ถูกต้อง');
    if(!Array.isArray(proposal.rows)||!proposal.rows.length||proposal.rows.length>2000) throw Error('กรุณากรอกข้อมูลที่ต้องการอัปเดตอย่างน้อย 1 รายการ');
    const state=snapshot(base,events,latest), rows=new Map(items(state,proposal.planId).map(r=>[r.id,r])), keys=columns(proposal.planId).slice(2).map(c=>c[1]), seen=new Set(), changes=[];
    const totalId='P'+proposal.planId+'-TOTAL',plan=state.plans.find(p=>p.id===proposal.planId);
    const summary=proposal.planId!==9 && proposal.rows.find(r=>r.id===totalId);
    if(proposal.planId!==9) rows.set(totalId,plan);
    for(const patch of proposal.rows) {
      if(!patch||!rows.has(patch.id)||seen.has(patch.id)) throw Error('รหัสรายการไม่ตรงกับแผนงานหรือซ้ำกัน '+String(patch?.id??''));
      seen.add(patch.id);
      const row=rows.get(patch.id), next={};
      if(!patch.values || typeof patch.values!=='object'||Array.isArray(patch.values)) throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
      for(const [key,value] of Object.entries(patch.values)) {
        if(!keys.includes(key)||patch.id===totalId&&!aggregate.includes(key)) throw Error('พบคอลัมน์ที่ไม่รองรับในแถว '+patch.id);
        if(proposal.planId!==9 && patch.id!==totalId && aggregate.includes(key) && (row[key]==null||plan[key]==null) && summary?.values?.[key]==null) throw Error(patch.id+' ช่อง '+columns(proposal.planId).find(c=>c[1]===key)[0]+' เดิมไม่มีฐานตัวเลข กรุณากรอกยอดรวมของช่องเดียวกันในแถว '+totalId+' ด้วย');
        if(numeric.includes(key)) {
          if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e13) throw Error(patch.id+' กรุณาระบุตัวเลขตั้งแต่ 0 ขึ้นไป');
          if(key.startsWith('mou')&&!Number.isInteger(value)) throw Error(patch.id+' จำนวน MOU ต้องเป็นจำนวนเต็ม');
          if(key==='progress' && value>100) throw Error(patch.id+' ผลงานต้องอยู่ในช่วง 0–100');
        } else if(typeof value!=='string'||!value.trim()||value.length>3000) throw Error(patch.id+' ข้อความไม่ถูกต้องหรือยาวเกิน 3,000 ตัวอักษร');
        if(key==='stage'&&!stages.includes(value)) throw Error(patch.id+' ขั้นตอนไม่ตรงกับตัวเลือกในเทมเพลต');
        if(key==='contractDate'&&!validDate(value)) throw Error(patch.id+' วันที่สัญญาต้องใช้รูปแบบ ค.ศ. YYYY-MM-DD');
        if(row[key]!==value || patch.id===totalId) next[key]=value;
      }
      const merged={...row,...next};
      if(('mouReady' in next||'mouPending' in next) && merged.mouReady!=null && merged.mouPending!=null && merged.mouReady>merged.mouPending) throw Error(patch.id+' จำนวนพร้อมลงนามต้องไม่เกินจำนวนอยู่ระหว่างดำเนินการ');
      if(['mouSigned','mouPending','mouTotal'].some(k=>k in next) && merged.mouTotal!=null && (merged.mouSigned??0)+(merged.mouPending??0)>merged.mouTotal && (merged.mouSigned??0)+(merged.mouPending??0)-merged.mouTotal>Math.max(0,(row.mouSigned??0)+(row.mouPending??0)-(row.mouTotal??Infinity))) throw Error(patch.id+' จำนวนลงนามรวมกับจำนวนระหว่างดำเนินการเกิน MOU ทั้งหมด');
      if(Object.keys(next).length) changes.push({id:patch.id,values:next});
    }
    if(!changes.some(r=>Object.entries(r.values).some(([k,v])=>rows.get(r.id)[k]!==v))) throw Error('ข้อมูลตรงกับรอบล่าสุดทุกช่อง กรุณาเลือกไฟล์ที่มีการเปลี่ยนแปลง');
    const preview=apply(state,{...proposal,rows:changes});
    const after=preview.plans.find(p=>p.id===proposal.planId);
    if(aggregate.some(k=>after[k]!=null && after[k]<0))throw Error('ยอดรวมหลังอัปเดตติดลบ กรุณาตรวจแถวสรุประดับแผน');
    return {date:proposal.date,planId:proposal.planId,file:proposal.file,rows:changes};
  }
  scope.NSDF={columns,stages,numeric,validDate,localDate,items,apply,snapshot,validate};
})(globalThis);
