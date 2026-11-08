import{readFileSync}from'node:fs'
import{parse}from'../src/lib/import/parse.js'
import{save}from'../src/lib/db/templates.js'
const f=process.argv[2]||'fixtures/spectora-export.xls'
const n=f.split('/').pop()
const{tree,issues}=parse(readFileSync(f))
console.log((await save(n.replace(/\.[^.]+$/,''),tree,issues,n)).id)
