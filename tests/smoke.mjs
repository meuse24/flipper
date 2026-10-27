import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('output',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1200},serviceWorkers:'block'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const source=fs.readFileSync('index.html','utf8').replace(/sync\(\);\s*\}\)\(\);/, 'sync();window.__test={state,spawn,start,update,flippers};})();');
await page.route('**/index.html',r=>r.fulfill({contentType:'text/html',body:source}));
await page.goto('http://127.0.0.1:8090/index.html');await page.screenshot({path:'output/desktop-start.png',fullPage:true});await page.click('#start-btn');
await page.keyboard.down('Space');await page.evaluate(()=>advanceTime(1100));await page.keyboard.up('Space');
const trace=[];for(let i=0;i<10;i++){await page.evaluate(()=>advanceTime(300));trace.push(JSON.parse(await page.evaluate(()=>render_game_to_text())))}
console.log('LAUNCH TRACE',JSON.stringify(trace.map(s=>({score:s.score,balls:s.balls}))));
await page.screenshot({path:'output/desktop-play.png',fullPage:true});
function assert(v,m){if(!v)throw Error(m)}
assert(trace.some(s=>s.balls.some(b=>b.x<440&&b.launched)),'Launcher must exit lane');
await page.keyboard.press('p');let s=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert(s.mode==='paused','pause');await page.keyboard.press('p');
await page.keyboard.down('ArrowLeft');await page.evaluate(()=>advanceTime(100));s=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert(s.flippers[0].angle<-.4,'left flipper');await page.keyboard.up('ArrowLeft');
// Controlled setups test collision outcomes; instrumentation exists only in routed test HTML.
const results=await page.evaluate(()=>{const {state:s,spawn,start,update}=__test;start();s.save=0;const b=s.balls[0];Object.assign(b,{launched:true,x:190,y:231,vx:0,vy:200});update(1/240);const bumper=s.score>0&&b.vy<0;
for(let i=0;i<3;i++){const t=[{x:83,y:337},{x:76,y:382},{x:82,y:427}][i];Object.assign(b,{x:t.x+13,y:t.y,vx:-200,vy:0});update(1/240)}const multi=s.balls.length===3&&s.mult===2;
s.balls=[b];Object.assign(b,{x:390,y:465,vx:0,vy:-450,cool:0});update(1/240);const ramp=!!b.ramp;for(let i=0;i<300;i++)update(1/240);const returned=!b.ramp;
s.balls=[b];Object.assign(b,{x:260,y:850,vy:100,ramp:0});s.save=0;update(1/240);const drain=s.lives===2&&s.balls[0].launched===false;
for(let j=0;j<2;j++){Object.assign(s.balls[0],{launched:true,y:850});s.save=0;update(1/240)}const gameover=s.mode==='gameover';start();return {bumper,multi,ramp,returned,drain,gameover,restart:s.mode==='playing'&&s.lives===3}});
console.log('MECHANICS',results);for(const [k,v]of Object.entries(results))assert(v,k);
await page.keyboard.press('n');await page.keyboard.press('n');await page.keyboard.press('n');s=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert(s.tilt>0,'tilt penalty');await page.evaluate(()=>advanceTime(4100));s=JSON.parse(await page.evaluate(()=>render_game_to_text()));assert(s.tilt===0,'tilt recovery');
await page.click('#sound');assert(await page.locator('#sound').getAttribute('aria-pressed')==='false','mute');
await context.close();
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const mp=await mobile.newPage();await mp.goto('http://127.0.0.1:8090');await mp.tap('#start-btn');await mp.locator('#launch-touch').dispatchEvent('pointerdown',{pointerId:1});await mp.evaluate(()=>advanceTime(700));await mp.locator('#launch-touch').dispatchEvent('pointerup',{pointerId:1});await mp.evaluate(()=>advanceTime(600));await mp.screenshot({path:'output/mobile-play.png',fullPage:true});assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');await mobile.close();
const offline=await browser.newContext();const op=await offline.newPage();await op.goto('http://127.0.0.1:8090');await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();await offline.setOffline(true);await op.reload();assert(await op.locator('#start-btn').isVisible(),'offline load');console.log('OFFLINE PASS');await offline.close();
console.log('ERRORS',errors);assert(errors.length===0,'browser errors');await browser.close();
