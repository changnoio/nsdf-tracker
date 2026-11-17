(function(scope){
  'use strict';
  const esc=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
  const tags=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
  const xml=s=>{
    if(s.includes('<!DOCTYPE')) throw Error('รูปแบบ XML ไม่รองรับ');
    const doc=new DOMParser().parseFromString(s,'application/xml');
    if(tags(doc,'parsererror').length) throw Error('โครงสร้างไฟล์ Excel ไม่สมบูรณ์');
    return doc;
  };
  function canon(path){return path.split('/').reduce((a,s)=>{if(s==='..')a.pop();else if(s&&s!=='.')a.push(s);return a;},[]).join('/');}
  async function read(file,plan){
    if(!/\.xlsx$/i.test(file.name)||file.size>10*1024*1024) throw Error('กรุณาใช้ไฟล์ .xlsx ขนาดไม่เกิน 10 MB');
    const zip=await JSZip.loadAsync(file);
    const entries=Object.values(zip.files);
    if(entries.length>1000||entries.reduce((a,f)=>a+(f._data?.uncompressedSize||0),0)>35*1024*1024) throw Error('ไฟล์ Excel ใหญ่เกินขนาดที่รองรับ');
    const readXml=async path=>{const f=zip.file(path);if(!f)throw Error('ไฟล์ Excel ขาดองค์ประกอบ '+path);return xml(await f.async('string'));};
    const book=await readXml('xl/workbook.xml'), rels=await readXml('xl/_rels/workbook.xml.rels');
    const sheet=tags(book,'sheet').find(s=>s.getAttribute('name')==='อัปเดตรายสัปดาห์');
    if(!sheet) throw Error('ไม่พบชีต “อัปเดตรายสัปดาห์” กรุณาดาวน์โหลดเทมเพลตของแผนงาน');
    const relId=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const target=tags(rels,'Relationship').find(r=>r.getAttribute('Id')===relId)?.getAttribute('Target');
    if(!target)throw Error('ไม่พบชีตตามความสัมพันธ์ในสมุดงาน');
    const worksheet=await readXml(canon(target.startsWith('/')?target:'xl/'+target));
    const strings=zip.file('xl/sharedStrings.xml')?tags(await readXml('xl/sharedStrings.xml'),'si').map(si=>tags(si,'t').map(t=>t.textContent).join('')):[];
    const style=zip.file('xl/styles.xml')?await readXml('xl/styles.xml'):null;
    const formats=style?Object.fromEntries(tags(style,'numFmt').map(n=>[n.getAttribute('numFmtId'),n.getAttribute('formatCode')])):{};
    const styles=style?Array.from(tags(style,'cellXfs')[0]?.children||[]).map(x=>x.getAttribute('numFmtId')):[];
    const rows=tags(worksheet,'row');
    if(!rows.length||rows.length>2500)throw Error('จำนวนแถวในเทมเพลตไม่ถูกต้อง');
    function values(row){
      const out={};
      for(const cell of tags(row,'c')){
        const col=String(cell.getAttribute('r')).replace(/\d/g,''), type=cell.getAttribute('t'), v=tags(cell,'v')[0]?.textContent;
        if(tags(cell,'f').length)throw Error('แถว '+row.getAttribute('r')+' กรุณาใส่ค่าจริงแทนสูตร');
        let value=type==='s'?strings[Number(v)]:type==='inlineStr'?tags(cell,'t').map(t=>t.textContent).join(''):v;
        if(value==null||String(value).trim()==='') continue;
        if(type==='e')throw Error('พบค่าผิดพลาดในเซลล์ '+cell.getAttribute('r'));
        out[col]={value:String(value).trim(),format:styles[Number(cell.getAttribute('s')||0)]};
      }
      return out;
    }
    const heads=values(rows[0]), cols=NSDF.columns(plan), mapping={};
    for(const [label,key] of cols){
      const matches=Object.keys(heads).filter(c=>heads[c].value===label || (key==='paid' && heads[c].value==='เบิกจ่ายสะสม (บาท)'));
      if(plan===9 && key==='paid' && matches.length===0)continue; // Earlier procurement templates ended at column K.
      if(matches.length!==1)throw Error('คอลัมน์ไม่ตรงกับเทมเพลตแผน '+plan+' (“'+label+'”)');
      mapping[key]=matches[0];
    }
    const patches=[];
    for(const row of rows.slice(1)){
      const cells=values(row), changes={};
      for(const [label,key] of cols.slice(2)){
        const cell=cells[mapping[key]];
        if(!cell) continue;
        let v=cell.value;
        if(NSDF.numeric.includes(key)){
          if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?%?$/.test(v)||v.endsWith('%')&&key!=='progress')throw Error('แถว '+row.getAttribute('r')+' ช่อง '+label+' ต้องเป็นตัวเลข');
          const percentage=v.endsWith('%');
          v=Number(v.replace(/[,%]/g,''));
          if(key==='progress'&&!percentage&&(['9','10'].includes(cell.format)||formats[cell.format]?.includes('%'))) v=Math.round(v*1000000)/10000;
        }
        if(key==='contractDate' && /^\d+(?:\.\d+)?$/.test(v)){
          const epoch=tags(book,'workbookPr')[0]?.getAttribute('date1904');
          const day=Date.UTC(epoch==='1'||epoch==='true'?1904:1899,epoch==='1'||epoch==='true'?0:11,epoch==='1'||epoch==='true'?1:30)+86400000*Math.floor(Number(v));
          if(!Number.isFinite(day)||isNaN(new Date(day)))throw Error('วันที่สัญญาไม่ถูกต้อง');
          v=new Date(day).toISOString().slice(0,10);
        }
        changes[key]=v;
      }
      if(Object.keys(changes).length) patches.push({id:cells[mapping.id]?.value,values:changes});
    }
    return patches;
  }
  function colName(index){
    let result='';
    for(let i=index+1;i;i=Math.floor((i-1)/26)) result=String.fromCharCode(65+(i-1)%26)+result;
    return result;
  }
  async function report(sheets,filename){
    const zip=new JSZip(), ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main', rel='http://schemas.openxmlformats.org/package/2006/relationships', docrel='http://schemas.openxmlformats.org/officeDocument/2006/relationships', sheetDefs=[];
    sheets.forEach(({name,rows,widths=[]},i)=>{
      sheetDefs.push('<sheet name="'+esc(name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>');
      const body=rows.map((r,ri)=>'<row r="'+(ri+1)+'"'+(ri===0?' ht="32" customHeight="1"':'')+'>'+r.map((v,ci)=>{
        if(v==null) return '';
        const cell='r="'+colName(ci)+(ri+1)+'" s="'+(ri===0?1:typeof v==='number'?2:0)+'"';
        return typeof v==='number'?'<c '+cell+'><v>'+v+'</v></c>':'<c '+cell+' t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
      }).join('')+'</row>').join('');
      zip.file('xl/worksheets/sheet'+(i+1)+'.xml','<worksheet xmlns="'+ns+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>'+rows[0].map((_,j)=>'<col min="'+(j+1)+'" max="'+(j+1)+'" width="'+(widths[j]||26)+'" customWidth="1"/>').join('')+'</cols><sheetData>'+body+'</sheetData><autoFilter ref="A1:'+colName(rows[0].length-1)+rows.length+'"/></worksheet>');
    });
    const fonts='<fonts count="2"><font><sz val="12"/><name val="Kanit"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Kanit"/></font></fonts>';
    zip.file('xl/styles.xml','<styleSheet xmlns="'+ns+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts>'+fonts+'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3E3F7E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf xfId="0" numFmtId="164" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    zip.file('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="'+docrel+'"><sheets>'+sheetDefs.join('')+'</sheets></workbook>');
    zip.file('_rels/.rels','<Relationships xmlns="'+rel+'"><Relationship Id="rId1" Type="'+docrel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="'+rel+'">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+docrel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rIdStyles" Type="'+docrel+'/styles" Target="styles.xml"/></Relationships>');
    const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.';
    zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="'+mime+'sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="'+mime+'styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="'+mime+'worksheet+xml"/>').join('')+'</Types>');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:mime+'sheet'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  scope.ExcelIO={read,report};
})(globalThis);
