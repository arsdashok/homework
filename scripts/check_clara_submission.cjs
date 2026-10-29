const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../clara-2026-10-24-6586ca/index.html'),'utf8');
const start=source.indexOf('  window.hwSend = function');
const send=source.slice(start,source.indexOf('\n})();',start));
async function run({pdfFail=false,status=200,reply='ok',opaque=false,network=false,empty=false,cancel=false,timeout=false}={}){
 let requests=[],done=0,failed=0,removed=0,checked=0,cleared=false;
 const btn={},msg={},fields=Array.from({length:43},(_,i)=>({dataset:{k:'q'+i,label:'Question '+i},classList:{contains:()=>false},answer:empty?'':String(i)}));
 const ctx={window:{claraSubmissionDone(){done++},claraSubmissionFailed(){failed++}},
  document:{getElementById:id=>id==='hwSend'?btn:msg,querySelectorAll:q=>q==='[data-k]'?fields:[{remove(){removed++}}]},
  answerOf:el=>el.answer,CHECK:null,cNorm:x=>x,confirm:()=>!cancel,showChecks:()=> 'score',
  makePDF:()=>pdfFail?Promise.reject(new Error('PDF failed')):Promise.resolve('TEST_PDF'),
  SEND_URL:'https://example.invalid',SEND_KEY:'test',META:{student:'Test',sheet:'Test',sheetId:'test'},
  fetch:async(url,options)=>{requests.push(JSON.parse(options.body));assert.equal(options.mode,'cors');if(network)throw new Error('offline');if(timeout)return new Promise((res,rej)=>options.signal.addEventListener('abort',()=>rej(new Error('aborted'))));return{ok:status===200,type:opaque?'opaque':'cors',text:async()=>reply}},
  AbortController, setTimeout:fn=>{if(timeout)queueMicrotask(fn);return 1},clearTimeout:()=>{cleared=true},
  localStorage:{setItem(){checked++}},CHECKED:'checked',recheck:Object.assign(()=>{}, {on:false})};
 vm.runInNewContext(send,ctx);const result=await ctx.window.hwSend();
 return{done,failed,requests,removed,checked,result,cleared,btn,msg};
}
(async()=>{
 let r=await run();assert.equal(r.done,1);assert.equal(r.requests[0].answers.length,43);assert.equal(r.requests[0].pdf,'TEST_PDF');assert(r.cleared);
 r=await run({pdfFail:true});assert.equal(r.done,1);assert.equal(r.requests[0].pdf,null);
 for(const opts of [{status:500},{reply:'no'},{reply:'<html>Error</html>'},{opaque:true},{network:true},{timeout:true}]){
  r=await run(opts);assert.equal(r.done,0);assert.equal(r.checked,0);assert.equal(r.failed,1);assert.equal(r.removed,0);assert.equal(r.btn.disabled,false);
 }
 r=await run({empty:true,cancel:true});assert.equal(r.requests.length,0);assert.equal(r.result,false);
 assert(source.includes('saved.deliveryConfirmed===1'));assert(source.includes('clara-results-send'));assert(source.includes('if(done.every(Boolean))showOverview(i)'));assert(source.includes("bar.classList.add('available')"));assert(source.includes("if(result===false){window.claraSubmissionFailed()"));
 console.log('PASS: 43 answers, attachment, PDF fallback, server rejection, HTTP failure, opaque reply, offline, timeout, cancellation, preserved marks and receipt migration.');
})().catch(e=>{console.error(e);process.exit(1)});
