import{getDb}from'./client.js'
const ok=({data,error})=>{if(error)throw new Error(error.message);return data}
const editable={templates:['name'],sections:['name'],items:['name'],comments:['name','body']}
export async function save(name,tree,issues,source,copiedFrom=null){
 const id=ok(await getDb().rpc('import_template',{p_name:name,p_source:source,p_issues:issues,p_tree:tree,p_copied_from:copiedFrom}))
 return{id}
}
export const list=async()=>ok(await getDb().from('templates').select('id,name,created_at,copied_from').order('created_at',{ascending:false}))
export async function update(table,id,patch){
 if(!editable[table])throw new Error('Bad table')
 const p=Object.fromEntries(Object.entries(patch||{}).filter(([k,v])=>editable[table].includes(k)&&typeof v==='string'))
 if(!Object.keys(p).length)throw new Error('Nothing to update')
 ok(await getDb().from(table).update(p).eq('id',id))
}
export async function load(id){
 const t=ok(await getDb().from('templates').select('*').eq('id',id).single())
 const ss=ok(await getDb().from('sections').select('*').eq('template_id',id).order('pos'))
 const ids=ss.map(s=>s.id)
 const its=ids.length?ok(await getDb().from('items').select('*').in('section_id',ids).order('pos')):[]
 const iids=its.map(i=>i.id),cs=[]
 for(let i=0;i<iids.length;i+=100)cs.push(...ok(await getDb().from('comments').select('*').in('item_id',iids.slice(i,i+100)).order('pos')))
 t.tree=ss.map(s=>({...s,items:its.filter(i=>i.section_id===s.id).map(i=>({...i,comments:cs.filter(c=>c.item_id===i.id)}))}))
 return t
}
export async function copy(id){
 const t=await load(id)
 return save(t.name+' (copy)',t.tree,t.issues,t.source,t.id)
}
