import{NextResponse as R}from'next/server'
import{update}from'@/lib/db/templates'
export async function POST(req){
 try{
  const{table,id,patch}=await req.json()
  await update(table,id,patch)
  return R.json({ok:true})
 }catch(e){return R.json({error:e.message},{status:400})}
}
