
'use strict';
const base=window.NSDF_DATA, {columns,stages,items,snapshot}=NSDF;
const $=q=>document.querySelector(q), main=$('#main'), dlg=$('#dialog');
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>`<svg aria-hidden="true" class="ico" viewBox="0 0 24 24">${NSDF_ICONS[name]||''}</svg>`;
const fmt=(v,d=0)=>v==null?'—':v.toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const money=v=>v==null?'—':new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(v);
const mil=(v,d=2)=>v==null?'—':fmt(v/1e6,d);
const pct=(n,d)=>n==null||!d?null:n*100/d;
const percent=(n,d)=>pct(n,d)==null?'—':fmt(pct(n,d),1)+'%';
const dateTH=(s,full=false)=>s?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:full?'long':'short',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(s+'T12:00:00Z')):'ไม่ระบุวันที่';
const sum=(arr,k)=>arr.reduce((n,r)=>n+(r[k]??0),0);
const support=d=>d.plans.filter(p=>p.id<9);
const signed=d=>d.procurement.filter(r=>stages.indexOf(r.stage)>=4).length;
const planLabels={1:'นโยบายและยุทธศาสตร์',2:'กีฬาระดับชาติ',3:'กีฬาระดับจังหวัด',4:'กีฬาอาชีพ',5:'กีฬามวยไทย',9:'บริหารกองทุน'};
const titles={overview:'แดชบอร์ดภาพรวม',weekly:'รายงานรายสัปดาห์',import:'นำเข้าและเทมเพลต',sources:'แหล่งข้อมูลและวิธีคำนวณ'};
const staticSite=document.documentElement.dataset.storage==='browser';
const browserStorage=location.protocol==='file:'||staticSite;
const storageKey=staticSite?'nsdf-fy2570-events-v1:'+new URL('.',document.baseURI).pathname:'nsdf-fy2570-events-v1';
let events=[],dates=[base.asOf],asOf=base.asOf,data=structuredClone(base),mode='overview',planId=1,chartKey='allocated',filter='',stageFilter='',page=1,ledgerOpen=false,ready=false,failed='',pending=null,previewFile=null,importPlan=1,importDate=NSDF.localDate(),busy=false;
const refLink='https://cpb.ddc.moph.go.th/ddc-pic/index.php?doc=126&view=doc-center';
const refAccept='https://finance.anamai.moph.go.th/web-upload/19xea11d5b0d4cea50a23c6cedbf5e73d8f/202408/m_document/38915/34253/file_download/9a391530627e8df92e0289b4050b38d0.pdf';
function btn(label,ico,action,cls='',attr=''){return `<button type="button" class="btn ${cls}" data-act="${action}" ${attr}>${icon(ico)}${label}</button>`;}
function go(label,ico,to,cls=''){return `<a class="btn ${cls}" href="#${to}">${icon(ico)}${label}</a>`;}
function badge(text,tone='purple'){return `<span class="badge ${tone}">${h(text)}</span>`;}
function foot(){return `<footer class="trackerfooter">กองทุนพัฒนาการกีฬาแห่งชาติ · ปีงบประมาณ 2570</footer>`;}
function title(tag,name,desc,extra=''){return `<div class="pagetitle"><div><span class="overline">${tag}</span><h1>${h(name)}</h1>${desc?`<p class="sub">${desc}</p>`:''}</div>${extra?`<div class="act">${extra}</div>`:''}</div>`;}
function kpi(label,val,unit,foot,ico,tone){return `<article class="kpi ${tone}"><div class="khead"><span class="kicon">${icon(ico)}</span>${label}</div><div class="moneynum"><strong>${val}</strong><span>${unit}</span></div><div class="kfoot">${foot}</div></article>`;}
function facts(pairs){return `<div class="datafacts">${pairs.map(([a,b])=>`<div class="fact"><small>${a}</small><strong>${h(b??'ยังไม่รายงาน')}</strong></div>`).join('')}</div>`;}
function pageShell(){
 const sideNav=(k,ic,label)=>`<a href="#${k}" class="nav ${mode===k?'active':''}" ${mode===k?'aria-current="page"':''}>${icon(ic)}${label}</a>`;
 $('#side').innerHTML=`<a class="brand" href="#overview" aria-label="หน้าแรก NSDF"><img src="assets/nsdf-logo.webp" alt="ตรากองทุนพัฒนาการกีฬาแห่งชาติ"><div><strong>NSDF</strong><small>ระบบติดตามแผนงานกองทุน</small></div></a><nav class="sidebody"><span class="navlabel">พื้นที่ทำงาน</span>${sideNav('overview','LayoutDashboard','แดชบอร์ดภาพรวม')}${sideNav('weekly','CalendarRange','รายงานรายสัปดาห์')}<span class="navlabel">ติดตามแผนงาน</span>${base.plans.map(p=>`<a href="#plan/${p.id}" class="nav plan ${mode==='plan'&&p.id===planId?'active':''}" ${mode==='plan'&&p.id===planId?'aria-current="page"':''} title="แผนงานที่ ${p.id} ${h(p.shortName)}"><span class="pid">${String(p.id).padStart(2,'0')}</span><span class="smallplan">${planLabels[p.id]}</span></a>`).join('')}<span class="navlabel">จัดการข้อมูล</span>${sideNav('import','Upload','นำเข้าและเทมเพลต')}${sideNav('sources','Database','แหล่งข้อมูล')}</nav><div class="sidefoot"><span class="footicon">${icon('Landmark')}</span><div><b>ปีงบประมาณ 2570</b><small>ระบบติดตามแผนงาน</small></div></div>`;
 $('#top').innerHTML=`<button class="iconbtn mobileMenu" data-act="menu" aria-label="เปิดเมนู">${icon('Menu')}</button><div class="crumb"><span>ระบบติดตามแผนงาน</span>${icon('ChevronRight')}<strong>${mode==='plan'?'แผนงานที่ '+planId:titles[mode]}</strong><b class="mobileTitle">NSDF</b></div><div class="actions"><label class="datewrap">${icon('CalendarDays')}<span>${dateTH(asOf)}</span>${icon('ChevronDown')}<select id="week" aria-label="เลือกรอบรายงาน">${dates.map(d=>`<option value="${d}" ${d===asOf?'selected':''}>รอบ ${dateTH(d)}</option>`).join('')}</select></label>${go('นำเข้าข้อมูล','Upload','import','primary')}</div>`;
}
function ratioBar(n,d){return `<span>${percent(n,d)}</span><span class="mini"><i style="width:${Math.min(100,Math.max(0,pct(n,d)||0))}%"></i></span>`;}
function allocationChart(){
 const plans=support(data),max=Math.max(...plans.map(p=>p.budget)),paid=chartKey==='paid';
 return `<article class="box"><div class="cardhead"><div><h2>งบประมาณรายแผนงาน</h2><p class="sub">เปรียบเทียบกับกรอบวงเงินหลังปรับ · ล้านบาท</p></div><div class="tabbar" aria-label="ตัวชี้วัดกราฟ">${[['allocated','จัดสรร'],['paid','เบิกจ่าย']].map(([k,t])=>`<button data-act="chart" data-key="${k}" aria-pressed="${k===chartKey}" class="${k===chartKey?'active':''}">${t}</button>`).join('')}</div></div><div class="legend"><span><i class="dot" style="background:#e4e1f0"></i>กรอบวงเงิน</span><span><i class="dot" style="background:${paid?'#21887b':'#5b5798'}"></i>${paid?'เบิกจ่ายแล้ว':'จัดสรรแล้ว'}</span></div><div class="chart">${plans.map(p=>`<a class="barline" href="#plan/${p.id}" title="${h(p.shortName)} · กรอบ ${money(p.budget)} บาท · ${paid?'เบิกจ่าย':'จัดสรร'} ${money(p[chartKey])} บาท"><span class="barlabel">แผนงาน ${p.id}</span><span class="bartrack"><span class="barmax" style="width:${100*p.budget/max}%"><span class="barvalue ${paid?'paid':''}" style="width:${Math.min(pct(p[chartKey],p.budget)||0,100)}%"></span></span></span><span class="baramount">${mil(p[chartKey])}</span></a>`).join('')}</div><div class="chartnote">${paid?'เครื่องหมาย — หมายถึงต้นฉบับยังไม่ระบุยอดเบิกจ่าย':'เลือกแท่งกราฟเพื่อดูรายละเอียดของแผนงาน'}</div></article>`;
}
function mouChart(){
 const rows=support(data),n=sum(rows,'mouSigned'),total=sum(rows,'mouTotal'),ready=sum(rows,'mouReady'),p=pct(n,total)||0;
 return `<article class="box"><div class="cardhead"><div><h2>สถานะการลงนาม MOU</h2><p class="sub">แผนงานที่ 1–5 · ทั้งหมด ${fmt(total)} ฉบับ</p></div><button class="utility" data-act="mouinfo" aria-label="วิธีคำนวณสถานะ MOU">${icon('Info')}</button></div><div class="donutbody"><div class="donut" style="--signed:${Math.min(p,100)}%" role="img" aria-label="ลงนามแล้ว ${fmt(p,1)} เปอร์เซ็นต์"><div><b>${fmt(p,1)}%</b><small>ลงนามแล้ว</small></div></div><div class="donutlegend"><div><span class="key"><i class="dot" style="background:var(--indigo)"></i>ลงนามแล้ว</span><b>${fmt(n)} <small>ฉบับ</small></b></div><div><span class="key"><i class="dot" style="background:#ded4af"></i>คงเหลือจากยอดรวม</span><b>${fmt(total-n)} <small>ฉบับ</small></b></div></div></div><div class="charttip">ระบุว่าพร้อมลงนาม ${fmt(ready)} ฉบับ จาก ${rows.filter(r=>r.mouReady!=null).length} แผนงานที่แจ้งยอด</div></article>`;
}
function overview(){
 const g=support(data),budget=sum(g,'budget'),allocated=sum(g,'allocated'),mous=sum(g,'mouSigned'),mt=sum(g,'mouTotal'),proc=data.procurement;
 return `<div class="hero"><div><div class="eyebrow">กองทุนพัฒนาการกีฬาแห่งชาติ</div><h1>ภาพรวมการดำเนินงาน</h1><p>ติดตามความคืบหน้าแผนงาน ประจำปีงบประมาณ 2570</p>${btn('ส่งออกรายงาน','Download','export')}</div></div><div class="sectionhead"><h2>สรุปตัวชี้วัด</h2><small>รอบรายงาน ${dateTH(asOf,true)}</small></div><div class="kpis">${kpi('กรอบวงเงินหลังปรับ',mil(budget,0),'ล้านบาท','กรอบการสนับสนุนแผนงานที่ 1–5','Wallet','purple')}${kpi('งบประมาณจัดสรรแล้ว',mil(allocated),'ล้านบาท',`<b>${percent(allocated,budget)}</b> ของกรอบแผนงานที่ 1–5`,'Banknote','green')}${kpi('MOU ลงนามแล้ว',fmt(mous),'ฉบับ',`จากทั้งหมด <b>${fmt(mt)}</b> ฉบับ ในแผนงานที่ 1–5`,'FileSignature','gold')}${kpi('โครงการลงนามสัญญาแล้ว',fmt(signed(data)),'โครงการ',`จาก <b>${proc.length}</b> โครงการจัดซื้อจัดจ้าง แผน 9`,'ClipboardCheck','rose')}</div><div class="analytic">${allocationChart()}${mouChart()}</div>
 <article class="box tablebox"><div class="cardhead"><div><h2>ความคืบหน้ารายแผนงาน</h2><p class="sub">การสนับสนุนตามกรอบงบประมาณปี 2570</p></div><span class="chip">${icon('Layers')}5 แผนงาน</span></div><div class="tablewrap"><table class="t"><thead><tr><th>แผนงาน</th><th class="number">กรอบวงเงิน (ลบ.)</th><th class="number">จัดสรร (ลบ.)</th><th>สัดส่วนจัดสรร</th><th>ลงนาม MOU</th><th></th></tr></thead><tbody>${g.map(p=>`<tr><td><a class="rowtitle" href="#plan/${p.id}"><span class="pnum">0${p.id}</span>${h(p.shortName)}</a></td><td class="number">${mil(p.budget)}</td><td class="number">${mil(p.allocated)}</td><td>${ratioBar(p.allocated,p.budget)}</td><td>${fmt(p.mouSigned)} / ${fmt(p.mouTotal)}</td><td><a href="#plan/${p.id}" aria-label="ดูแผนงานที่ ${p.id}">${icon('ChevronRight')}</a></td></tr>`).join('')}</tbody></table></div></article><article class="box p9link"><div class="cardhead"><div><span class="pnum">09</span><div><h2>แผนบริหารกองทุน</h2><p class="sub">${proc.length} โครงการจัดซื้อจัดจ้าง · วงเงินในทะเบียน ${mil(sum(proc,'budget'))} ล้านบาท</p></div></div>${go('ติดตามงานเจ้าหน้าที่','ArrowRight','plan/9')}</div></article>`;
}
function route(){
 const hash=location.hash.slice(1),match=/^plan\/([1-59])$/.exec(hash);
 mode=match?'plan':Object.hasOwn(titles,hash)?hash:'overview';if(match){planId=Number(match[1]);importPlan=planId;}
 filter='';stageFilter='';page=1;pending=null;previewFile=null;ledgerOpen=false;document.body.classList.remove('sideopen');if(dlg.open)dlg.close();render();window.scrollTo(0,0);
}
function render(){
 data=snapshot(base,events,asOf);pageShell();
 const screens={overview,plan:planView,weekly:weeklyView,import:importView,sources:sourcesView};
 main.innerHTML=`${failed?`<div class="errorbox">${h(failed)} <button class="textbtn" data-act="reload">โหลดข้อมูลใหม่</button></div>`:''}<div class="screen">${screens[mode]()}${foot()}</div>`;
 document.title=(mode==='plan'?'แผนงานที่ '+planId:titles[mode])+' | NSDF 2570';
}
function setEvents(list,date){events=list;dates=[...new Set([base.asOf,...events.map(e=>e.date)])].sort().reverse();asOf=date&&dates.includes(date)?date:dates[0];}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function modal(head,body){dlg.innerHTML=`<div class="modalhead"><h2>${h(head)}</h2><button class="iconbtn" data-act="close" aria-label="ปิด">${icon('X')}</button></div><div class="modalbody">${body}</div>`;if(!dlg.open)dlg.showModal();}

// END OF MODULE
