/* Local-only UI checks: no student pages, submissions or mail are opened. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let chromium;
try{({chromium}=require('playwright'))}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')))}
const url=process.env.HUB_TEST_URL||'http://127.0.0.1:8778/67f5f7644ece6050/';
const key='homework-hub-completion-v1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 const card=page.locator('.card').filter({has:page.locator('details')}).first();
 const first=card.locator(':scope > .homework-meta .completion');
 assert.equal(await first.getAttribute('aria-pressed'),'mixed');
 assert.equal(await first.getAttribute('data-complete'),'unknown');
 assert.equal((await first.innerText()).trim(),'');assert.equal(await page.locator('.completion-help').count(),0);
 const sheet=await first.getAttribute('data-completion-key');
 await first.click();assert.equal(await first.getAttribute('aria-pressed'),'true');
 await card.locator('summary').click();
 const duplicate=card.locator('details .completion').first();assert.equal(await duplicate.getAttribute('aria-pressed'),'true');
 const older=card.locator('details .completion').nth(1);await older.click();
 const olderSheet=await older.getAttribute('data-completion-key');assert.notEqual(sheet,olderSheet);
 await page.reload({waitUntil:'networkidle'});assert.equal(await first.getAttribute('aria-pressed'),'true');
 const tab=await context.newPage();await tab.goto(url,{waitUntil:'networkidle'});
 await first.click();await tab.waitForFunction(id=>[...document.querySelectorAll('.completion')].filter(e=>e.dataset.completionKey===id).every(e=>e.getAttribute('aria-pressed')==='false'),sheet);
 const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(stored[olderSheet],true);assert.equal(stored[sheet],false);
 // Search and status controls coexist without losing saved marks.
 await page.locator('#search').fill('Vlad');assert.equal(await page.locator('.card:visible').count(),1);
 await page.screenshot({path:path.join(os.tmpdir(),'homework-status-desktop.png')});
 await page.setViewportSize({width:390,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(os.tmpdir(),'homework-status-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 // A denied write must never look successfully saved.
 const denied=await browser.newContext();await denied.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError')}});
 const deniedPage=await denied.newPage();await deniedPage.goto(url,{waitUntil:'networkidle'});
 const blockedButton=deniedPage.locator('.card > .homework-meta .completion').first();await blockedButton.click();
 assert.equal(await blockedButton.getAttribute('aria-pressed'),'mixed');assert.match(await deniedPage.locator('#status').innerText(),/Not saved/);
 await denied.close();
 // A separate browser profile starts with no marks (the stated storage boundary).
 const other=await browser.newContext();const otherPage=await other.newPage();await otherPage.goto(url,{waitUntil:'networkidle'});
 assert.equal(await otherPage.locator('.completion[data-complete="true"]').count(),0);await other.close();
 console.log('PASS: defaults, per-assignment status, history sync, reload persistence, cross-tab sync, search, phone layout, denied-storage handling, browser isolation.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
