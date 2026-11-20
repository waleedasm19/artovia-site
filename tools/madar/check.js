const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+process.argv[2]);await p.waitForTimeout(1200);
const r=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((pg,i)=>{
 const pb=pg.getBoundingClientRect();let worst=0,who='';
 pg.querySelectorAll('.body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.height&&r.bottom>pb.bottom-15*3.78+2){const o=r.bottom-(pb.bottom-15*3.78);if(o>worst){worst=o;who=e.tagName+'.'+e.className+':'+(e.textContent||'').slice(0,30)}}
  if(r.width&&r.left<pb.left-1){who+=' LEFT-OVF:'+e.tagName}});
 return (i+1)+': '+(worst?worst.toFixed(0)+'px '+who:'ok')}));
console.log(r.join('\n'));await b.close();})();
