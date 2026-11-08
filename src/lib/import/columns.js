export const rules=[['section',/^section/i],['item',/^(sub ?section|item)/i],['name',/comment.*(name|title)|^name$/i],['body',/comment|text|body/i]]
export const dec=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&amp;/g,'&')
