import test from'node:test'
import assert from'node:assert'
import{readFileSync}from'node:fs'
const skip=!process.env.SUPABASE_URL
const lib=async()=>({...await import('../src/lib/db/templates.js'),...await import('../src/lib/db/client.js'),...await import('../src/lib/import/parse.js')})
test('copy is independent and edits persist',{skip},async()=>{
 const{save,copy,load,update,parse}=await lib()
 const{tree,issues}=parse(readFileSync(new URL('../fixtures/spectora-export.xls',import.meta.url)))
 const a=await save('db-test',tree,issues,'fixture')
 const b=await copy(a.id)
 const cb=await load(b.id),secB=cb.tree[0].id
 await update('sections',secB,{name:'Changed'})
 assert.equal((await load(a.id)).tree[0].name,tree[0].name)
 assert.equal((await load(b.id)).tree[0].name,'Changed')
 const n=t=>t.tree.reduce((x,s)=>x+s.items.reduce((y,i)=>y+i.comments.length,0),0)
 assert.equal(n(await load(a.id)),392)
 assert.equal(n(await load(b.id)),392)
 const{getDb}=await lib()
 await getDb().from('templates').delete().in('id',[a.id,b.id])
})
test('failed import leaves nothing behind',{skip},async()=>{
 const{save,getDb}=await lib()
 await assert.rejects(save('atomic-test',[{name:'S',items:[{name:null,comments:[]}]}],[],'x'))
 const{data}=await getDb().from('templates').select('id').eq('name','atomic-test')
 assert.equal(data.length,0)
})
