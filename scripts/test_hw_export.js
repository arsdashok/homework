// Failure-path regression: node scripts/test_hw_export.js. Never sends email.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

(async function () {
  let frames = 0, requests = 0;
  const button = {disabled:false, textContent:'Send to Dasha'};
  const message = {textContent:''};
  const download = {onclick:'old print handler'};
  const context = {
    window:{}, console, setTimeout, clearTimeout, Promise,
    localStorage:{getItem:()=>null},
    fetch:()=>{ requests++; throw Error('No network is permitted in this test'); },
    document:{
      body:{dataset:{}, appendChild:()=>{ frames++; }},
      querySelectorAll:selector=>selector==='.hw-pdf'?[download]:[],
      getElementById:id=>id==='hwSend'?button:message,
      createElement:()=>({
        style:{}, setAttribute:()=>{}, remove:()=>{ frames--; },
        contentDocument:{open:()=>{throw Error('Simulated PDF failure');}}
      })
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/hw.js'),'utf8'),context);
  assert.equal(typeof download.onclick,'function','Download must not use window.print');
  const first = context.window.hwMakePDF();
  assert.equal(first,context.window.hwMakePDF(),'Concurrent exports share one job');
  await assert.rejects(first,/Simulated PDF failure/);
  assert.equal(frames,0,'Failed export removes its iframe');
  context.window.hwSend();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,0,'Never send a successful-looking submission without its PDF');
  assert.equal(button.disabled,false,'Failure allows retry');
  assert.match(message.textContent,/did not send/);
  assert.equal(frames,0,'Retry cleans up too');
  console.log('PASS: shared job, download handler, cleanup, retry, no send without PDF');
})().catch(error=>{console.error(error);process.exitCode=1;});
