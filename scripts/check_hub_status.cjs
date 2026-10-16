const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
let chromium;try{({chromium}=require('playwright'))}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')))}
const url=process.env.HUB_TEST_URL||'http://127.0.0.1:8778/67f5f7644ece6050/';
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(()=>{
  localStorage.setItem('homework-hub-completion-v1',JSON.stringify({'kristina-2026-10-16-english':true}));
  window.calls=[];window.google={script:{run:{withSuccessHandler(fn){this.ok=fn;return this},withFailureHandler(fn){this.fail=fn;return this},getHomeworkCompletion(ids){window.calls.push(ids)}}}};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.waitForFunction(()=>calls.length===1);
 assert.equal(await page.locator('button.completion').count(),0);
 assert.equal(await page.locator('.completion[data-complete="true"]').count(),0);
 const first=page.locator('.card > .homework-meta .completion').first();assert.equal(await first.getAttribute('data-complete'),'unknown');
 await page.evaluate(()=>{const ids=calls[0];google.script.run.ok({states:Object.fromEntries(ids.map((id,i)=>[id,i===0]))})});
 assert.equal(await first.getAttribute('data-complete'),'true');assert(await page.locator('.completion[data-complete="false"]').count()>0);
 const card=page.locator('.card').first();await card.locator('summary').click();assert.equal(await card.locator('details .completion').first().getAttribute('data-complete'),'true');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>calls.length===2);
 await page.evaluate(()=>google.script.run.fail(new Error('Offline')));assert.equal(await first.getAttribute('data-complete'),'unknown');assert.match(await page.locator('#status').innerText(),/Retrying/);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.evaluate(()=>google.script.run.ok({states:Object.fromEntries(calls[0].map(id=>[id,true]))}));assert.equal(await first.getAttribute('data-complete'),'true');assert.equal(await page.locator('#status').innerText(),'');
 await page.locator('#search').fill('Roman');await page.locator('#student-roman summary').click();
 await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const sameRow=await page.locator('#student-roman > .homework-meta').evaluate(e=>{const a=e.querySelector('.date').getBoundingClientRect(),b=e.querySelector('.completion').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<2});assert(sameRow);
 await page.screenshot({path:path.join(os.tmpdir(),'homework-auto-status-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
 const launcher=await browser.newPage();await launcher.route('https://script.google.com/**',route=>route.fulfill({body:'Private teacher hub'}));await launcher.goto(url);await launcher.waitForURL(/script.google.com.*hub=1/);
 console.log('PASS: automatic archive response, old manual marks ignored, no toggles, latest/history sync, failure stays unknown, focus refresh, narrow inline layout, private launcher.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
