import{NextResponse as R}from'next/server'
import{load,copy}from'@/lib/db/templates'
export const dynamic='force-dynamic'
export async function GET(_,{params}){
 try{return R.json(await load(params.id))}catch(e){return R.json({error:e.message},{status:404})}
}
export async function POST(_,{params}){
 try{return R.json(await copy(params.id))}catch(e){return R.json({error:e.message},{status:400})}
}
