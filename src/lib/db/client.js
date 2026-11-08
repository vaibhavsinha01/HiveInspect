import{createClient}from'@supabase/supabase-js'
let c
export function getDb(){
 if(!c){
  const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_KEY
  if(!u||!k)throw new Error('Server is missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Create a file named .env in the project root (copy .env.example), fill both values and restart the server.')
  c=createClient(u,k,{auth:{persistSession:false}})
 }
 return c
}
