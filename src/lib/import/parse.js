import * as XLSX from 'xlsx'
import{rules,dec}from'./columns.js'
export function parse(buf,override){
 const wb=XLSX.read(buf,{type:'buffer'})
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false})
 const first=rows.findIndex(r=>r.some(c=>c!==''))
 const h=override?override.h:rows.findIndex(r=>r.some(c=>/section/i.test(c)))
 if(h<0)throw Object.assign(new Error('No header row with a Section column found. Use Export to spreadsheet > Export HTML Text.'),{headers:rows[first]||[],h:first,rows:rows.slice(first,first+3)})
 const cols=override?{...override.cols}:{},extraCols=[]
 rows[h].forEach((c,i)=>{
  if(override){if(c&&!Object.values(override.cols).includes(i))extraCols.push([i,c]);return}
  const r=rules.find(([k,re])=>!(k in cols)&&re.test(c));if(r)cols[r[0]]=i;else if(c)extraCols.push([i,c])
 })
 if(!('body' in cols))throw Object.assign(new Error('No comment text column found in header: '+rows[h].join(' | ')),{headers:rows[h],h,rows:rows.slice(h,h+3)})
 const tree=[],issues=[],extraSeen=new Set()
 let s,it,read=0,blank=0,comments=0
 rows.slice(h+1).forEach((r,k)=>{
  const n=h+k+2
  if(r.every(c=>c==='')){blank++;return}
  read++
  const sec=cols.section!=null?dec(r[cols.section]):'',item=cols.item!=null?dec(r[cols.item]):''
  if(sec!==''&&(!s||sec!==s.name)){s={name:sec,items:[]};tree.push(s);it=null}
  if(!s){s={name:'(Unsectioned)',items:[]};tree.push(s);issues.push({row:n,msg:'No section name; placed under (Unsectioned)'})}
  if(item!==''&&(!it||item!==it.name)){it={name:item,comments:[]};s.items.push(it)}
  if(!it){it={name:'(No item)',comments:[]};s.items.push(it);issues.push({row:n,msg:'No item name; placed under (No item)'})}
  const name=cols.name!=null?dec(r[cols.name]):'',body=r[cols.body],extra={}
  extraCols.forEach(([i,c])=>{if(r[i]!==''){extra[c]=r[i];extraSeen.add(c)}})
  if(name!==''||body!==''||Object.keys(extra).length){it.comments.push({name,body,extra});comments++}
 })
 const used=[...extraSeen],unused=extraCols.map(x=>x[1]).filter(c=>!extraSeen.has(c))
 if(used.length)issues.push({row:null,msg:`${used.length} columns kept as read-only Spectora settings: ${used.join('; ')}`})
 if(unused.length)issues.push({row:null,msg:`${unused.length} empty columns ignored: ${unused.join('; ')}`})
 issues.push({row:null,msg:'HTML entities in section, item and comment names were decoded for display; comment text is stored as exported'})
 if(blank)issues.push({row:null,msg:`${blank} blank rows skipped`})
 if(!tree.length)throw new Error('Header found but no data rows')
 issues.unshift({row:null,msg:`Read ${read} data rows, imported ${tree.length} sections, ${tree.reduce((a,x)=>a+x.items.length,0)} items, ${comments} comments`})
 return{tree,issues}
}
