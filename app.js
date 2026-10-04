/* Wearcycle app: UI, camera, Supabase storage and Claude calls. Pure scoring rules live in logic.js. */
'use strict';
const APP_VERSION='1.9.0';
const {CATS,CAT,ACCESSORY,GARMENT,OCCASIONS,OCC,COND,FORM,COLORS,DAY,
  daysSince,isActive,primary,effectiveOccasions,eligible,coreOf,scoreOutfit,makeRng,suggest,swapCandidates,careFlags,gaps,
  warmthOf,rainReady,wxFeel,wxWet,needsLayer,canOpen,canUnder,needsBelt,beltPool}=WardrobeLogic;

/* ---------- small helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const isEx=it=>String(it.id).startsWith('ex-');
const CLOSE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/* ---------- configuration ---------- */
const CFG=(()=>{ const c=window.WARDROBE_CONFIG||{}; const saved=LS.get('wardrobe.server')||{};
  return {url:(c.supabaseUrl||saved.url||'').trim(),key:(c.supabaseKey||saved.key||'').trim()}; })();
let sb=null, UID=null, EMAIL='';

/* ---------- state ---------- */
const S={items:new Map(),examples:[],log:[],exLog:[],settings:{checkEvery:25,checkDays:180,unusedDays:365,wx:{on:false}},
  occ:'work',layerMode:'auto',sel:0,view:(LS.get('wearcycle.view')||'board'),fits:[],fitKey:'',seed:Date.now()%100000,cat:'all',tab:'outfits',
  loaded:false,online:navigator.onLine,fromCache:false,busy:false,installEvt:null};
function allItems(){ return [...S.items.values(),...S.examples]; }
function allLog(){ return S.log.concat(S.exLog); }
function byId(id){ return S.items.get(id)||S.examples.find(e=>e.id===id); }
function ctx(){ return {now:Date.now(),log:allLog(),wx:wxForScore()}; }
function canWrite(){ return S.online && !!sb; }
function cacheKey(){ return 'wardrobe.cache.'+UID; }
function saveCache(){ if(!UID) return; LS.set(cacheKey(),{items:[...S.items.values()].map(cleanBodyWithId),log:S.log.slice(0,200),settings:S.settings,at:Date.now()}); }
function cleanBody(it){ const b={}; for(const [k,v] of Object.entries(it)) if(k!=='id' && !k.startsWith('_') && v!==undefined) b[k]=v; return b; }
function cleanBodyWithId(it){ return Object.assign({id:it.id},cleanBody(it)); }

/* ---------- toast ---------- */
function toast(msg,ms){ const r=$('#toastRoot'); r.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); if(ms!==0) toast.t=setTimeout(()=>{r.innerHTML='';},ms||2800); }

/* ---------- glyphs and visuals ---------- */
const GLYPH={
  top:'<path d="M17 7 8 12l3 8 4-2v22h18V18l4 2 3-8-9-5c-1 3-4 5-7 5s-6-2-7-5Z"/>',
  bottom:'<path d="M14 6h20l2 36h-9l-3-23-3 23h-9L14 6Z"/>',
  onepiece:'<path d="M19 6h10l-1 8 8 28H12l8-28-1-8Z"/>',
  outerwear:'<path d="M17 6 8 12v30h11V20l5 6 5-6v22h11V12l-9-6-7 8-7-8Z"/>',
  shoes:'<path d="M5 32c0-7 2-13 4-15h8c0 4 4 7 9 8l12 3c4 1 5 5 5 7H5v-3Z"/>',
  socks:'<path d="M16 4h13v20l9 8c3 3 1 10-5 10-2 0-4-1-5-2L15 31c-2-2-3-4-3-7V8c0-2 2-4 4-4Z"/>',
  watch:'<rect x="19" y="4" width="10" height="40" rx="3"/><circle cx="24" cy="24" r="10"/>',
  belt:'<rect x="3" y="19" width="42" height="10" rx="2"/><rect x="17" y="16" width="11" height="16" rx="2" fill="none" stroke-width="2.5"/>',
  hat:'<path d="M9 31c0-10 7-17 15-17s15 7 15 17Z"/><rect x="3" y="30" width="42" height="5" rx="2"/>',
  bag:'<path d="M9 18h30l-3 24H12L9 18Z"/><path d="M18 18v-4a6 6 0 0 1 12 0v4" fill="none" stroke-width="2.5"/>',
  other:'<circle cx="24" cy="24" r="13"/>'};
function glyph(it){ const c=COLORS[primary(it)]?.hex||'#9aa3ad'; return `<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true" fill="${c}" stroke="rgba(120,130,140,.55)" stroke-width="1.2" stroke-linejoin="round">${GLYPH[it.cat]||GLYPH.other}</svg>`; }
function thumbSrc(it){ return it.thumb||it._localUrl||''; }
function visual(it){ const src=thumbSrc(it); return src?`<img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy" class="${it.box?'fitted':'cover'}">`:glyph(it); }
function condTag(it){ const c=it.cond??4; return `<span class="tag c${c}">C${c} · ${COND[c]}</span>`; }

/* ---------- images ---------- */
async function decode(blob){
  try{ return await createImageBitmap(blob,{imageOrientation:'from-image'}); }
  catch(e){ return await new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=URL.createObjectURL(blob); }); }
}
function drawScaled(src,max){ const w=src.width||src.videoWidth,h=src.height||src.videoHeight,k=Math.min(1,max/Math.max(w,h));
  const cv=document.createElement('canvas'); cv.width=Math.round(w*k); cv.height=Math.round(h*k); cv.getContext('2d').drawImage(src,0,0,cv.width,cv.height); return cv; }
async function prepare(blob){ // -> {full: Blob (<=1024px), thumb: dataURL (<=256px)}
  const src=await decode(blob);
  const full=await new Promise(r=>drawScaled(src,1024).toBlob(r,'image/jpeg',0.84));
  const thumb=drawScaled(src,256).toDataURL('image/jpeg',0.72);
  if(src.close) src.close();
  return {full,thumb};
}
// Crops a photo to Claude's box around the garment, padded and squared so the whole piece fills a tile.
function validBox(b){ return Array.isArray(b)&&b.length===4&&b.every(v=>typeof v==='number'&&v>=0&&v<=1)&&b[2]-b[0]>0.05&&b[3]-b[1]>0.05; }
async function cropThumb(blob,box){
  const src=await decode(blob); const W=src.width,H=src.height;
  let x0=box[0]*W,y0=box[1]*H,x1=box[2]*W,y1=box[3]*H; const pad=0.06*Math.max(x1-x0,y1-y0);
  x0-=pad; y0-=pad; x1+=pad; y1+=pad;
  const side=Math.min(Math.max(x1-x0,y1-y0),W,H), cx=(x0+x1)/2, cy=(y0+y1)/2;
  const sx=Math.max(0,Math.min(W-side,cx-side/2)), sy=Math.max(0,Math.min(H-side,cy-side/2));
  const out=Math.min(320,Math.round(side)); const cv=document.createElement('canvas'); cv.width=cv.height=out;
  cv.getContext('2d').drawImage(src,sx,sy,side,side,0,0,out,out); if(src.close) src.close();
  return cv.toDataURL('image/jpeg',0.8);
}
async function shrink(blob,max){ const src=await decode(blob); const b=await new Promise(r=>drawScaled(src,max).toBlob(r,'image/jpeg',0.82)); if(src.close) src.close(); return b; }
function blobToBase64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=rej; r.readAsDataURL(blob); }); }
const signed=new Map();
async function fullPhotoUrl(path){
  const c=signed.get(path); if(c && c.exp>Date.now()) return c.url;
  const {data,error}=await sb.storage.from('photos').createSignedUrl(path,3600);
  if(error||!data) return '';
  signed.set(path,{url:data.signedUrl,exp:Date.now()+3500e3}); return data.signedUrl;
}
async function uploadPhoto(blob){
  const path=UID+'/'+uuid()+'.jpg';
  const {error}=await sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg',upsert:false});
  if(error){ toast('Photo upload failed ('+(error.message||'unknown error')+'). The item was saved without the full photo.',4500); return null; }
  return path;
}
function removePhoto(path){ if(path&&sb) sb.storage.from('photos').remove([path]).catch(()=>{}); }

/* ---------- Claude (through the Supabase Edge Function) ---------- */
async function callClaude(task,payload){
  if(!canWrite()) throw {friendly:'You are offline. Claude needs a connection.'};
  const {data,error}=await sb.functions.invoke('claude',{body:Object.assign({task},payload)});
  if(error){
    let status=error.context&&error.context.status, detail='';
    try{ const j=await error.context.json(); detail=j&&j.error||''; }catch(e){}
    if(status===404) throw {friendly:'Photo reading is not set up yet. Deploy the "claude" function (setup guide, step 5).'};
    if(status===401) throw {friendly:'Your sign-in expired. Sign out and back in.'};
    if(detail==='unknown_task') throw {friendly:'Update the "claude" function in Supabase to the latest index.ts first.'};
    if(detail==='missing_api_key') throw {friendly:'The Anthropic API key is not set on the server (setup guide, step 5).'};
    if(status===429||detail==='rate_limited') throw {friendly:'Too many requests right now. Try again in a minute.'};
    throw {friendly:'Claude could not answer'+(detail?' ('+detail+')':'')+'. Try again.'};
  }
  if(!data||data.error) throw {friendly:'Claude could not read that'+(data&&data.error?' ('+data.error+')':'')+'.'};
  return data.result;
}
const aiMsg=e=>(e&&e.friendly)||'Claude could not answer right now. Try again.';
async function aiTag(blob){ return callClaude('tag',{image:await blobToBase64(blob)}); }
async function aiCheck(blob,it){ return callClaude('check',{image:await blobToBase64(blob),name:it.name,category:CAT[it.cat].label}); }
function applyAi(it,res){
  if(res.name) it.name=String(res.name).slice(0,60);
  if(CAT[res.category]) it.cat=res.category;
  if(/\bsocks?\b/i.test(String(res.name||''))) it.cat='socks'; // works even before the server function knows the Socks category
  const cs=(res.colors||[]).filter(c=>COLORS[c]).slice(0,3); if(cs.length) it.colors=cs;
  if(res.formality>=1&&res.formality<=5) it.formality=Math.round(res.formality);
  const oc=(res.occasions||[]).filter(o=>OCC[o]); if(oc.length) it.occ=oc;
  if(res.condition>=1&&res.condition<=5) it.cond=Math.round(res.condition);
  if(res.warmth>=1&&res.warmth<=3) it.warmth=Math.round(res.warmth);
  if(typeof res.waterproof==='boolean') it.rain=res.waterproof;
}
async function applyBox(it,blob,box){ if(!validBox(box)) return false; try{ it.thumb=await cropThumb(blob,box); it.box=box.map(v=>Math.round(v*1000)/1000); return true; }catch(e){ return false; } }

/* ---------- weather (Open-Meteo, no key; postal codes via Zippopotam) ---------- */
// Only rounded coordinates (about 1 km) are stored, in your own settings row.
const WXC={data:null,busy:false,err:''};
const COUNTRIES=[['CA','Canada'],['US','United States'],['MX','Mexico'],['GB','United Kingdom'],['FR','France'],['DE','Germany'],['ES','Spain'],['IT','Italy'],['PT','Portugal'],['NL','Netherlands'],['BE','Belgium'],['CH','Switzerland'],['AU','Australia'],['NZ','New Zealand'],['BR','Brazil'],['IN','India'],['JP','Japan']];
function wxSet(){ return S.settings.wx||(S.settings.wx={on:false}); }
function wxOn(){ const w=wxSet(); return !!(w.on&&isFinite(w.lat)&&isFinite(w.lon)); }
function wxForScore(){ const d=WXC.data; if(!wxOn()||!d) return null; return {feelMin:d.feelMin,feelMax:d.feelMax,rain:d.rain,snow:d.snow,off:wxSet().off||0}; }
function unitsF(){ const u=wxSet().units; return u?u==='F':/-US$/i.test(navigator.language||''); }
function tdeg(c){ return unitsF()?Math.round(c*9/5+32)+'°F':Math.round(c)+'°C'; }
function hourLabel(h){ return unitsF()?((h%12)||12)+(h<12?' am':' pm'):String(h).padStart(2,'0')+':00'; }
const r2=v=>Math.round(v*100)/100;
function wmo(c){ return c===0||c===1?'Clear':c===2?'Partly cloudy':c===3?'Cloudy':c===45||c===48?'Fog':(c>=51&&c<=57)?'Drizzle':(c>=61&&c<=67)||(c>=80&&c<=82)?'Rain':(c>=71&&c<=77)||c===85||c===86?'Snow':c>=95?'Thunderstorms':'Mixed'; }
async function geocode(q,cc){
  const raw=q.trim(); if(!raw) return null;
  let pc=raw.toUpperCase().replace(/\s+/g,' ');
  if(cc==='CA') pc=pc.replace(/\s/g,'').slice(0,3); else if(cc==='GB') pc=pc.split(' ')[0];
  if(/\d/.test(pc)){ try{ const r=await fetch('https://api.zippopotam.us/'+cc.toLowerCase()+'/'+encodeURIComponent(pc));
    if(r.ok){ const j=await r.json(); const p=j.places&&j.places[0];
      if(p) return {lat:+p.latitude,lon:+p.longitude,label:pc+' · '+String(p['place name']).replace(/\s*\(.*$/,'')+(p['state abbreviation']?', '+p['state abbreviation']:'')}; } }catch(e){} }
  try{ const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name='+encodeURIComponent(raw)+'&countryCode='+cc);
    if(r.ok){ const j=await r.json(); const p=j.results&&j.results[0]; if(p) return {lat:p.latitude,lon:p.longitude,label:p.name+(p.admin1?', '+p.admin1:'')}; } }catch(e){}
  return null;
}
function summarize(j){
  const H=j.hourly; const nowLocal=new Date(Date.now()+j.utc_offset_seconds*1000).toISOString().slice(0,13);
  let i0=H.time.findIndex(t=>t.slice(0,13)>=nowLocal); if(i0<0) i0=0;
  const day=H.time[i0].slice(0,10); let i1=H.time.findIndex(t=>t>=day+'T21'); if(i1<=i0+2) i1=i0+3; i1=Math.min(i1,H.time.length-1);
  const idx=[]; for(let i=i0;i<=i1;i++) idx.push(i);
  const pick=k=>idx.map(i=>H[k][i]).filter(v=>v!=null);
  const feel=pick('apparent_temperature'), temp=pick('temperature_2m'), pp=pick('precipitation_probability'), mm=pick('precipitation'), codes=pick('weather_code'), wind=pick('wind_speed_10m');
  const snow=codes.some(c=>(c>=71&&c<=77)||c===85||c===86);
  const rainProb=pp.length?Math.max(...pp):0, rainMm=mm.reduce((a,b)=>a+b,0);
  const wetFrom=idx.find(i=>(H.precipitation_probability[i]||0)>=50);
  const main=codes.slice().sort((a,b)=>codes.filter(x=>x===b).length-codes.filter(x=>x===a).length)[0];
  return {feelMin:Math.min(...feel),feelMax:Math.max(...feel),tempMin:Math.min(...temp),tempMax:Math.max(...temp),rainProb,rainMm,
    rain:!snow&&(rainProb>=50||rainMm>=1),snow:snow&&(rainProb>=40||rainMm>=0.5),wind:wind.length?Math.max(...wind):0,
    wetFrom:wetFrom!=null?+H.time[wetFrom].slice(11,13):null,from:+H.time[i0].slice(11,13),to:+H.time[i1].slice(11,13),sky:wmo(main),at:Date.now()};
}
async function loadWeather(force){
  const w=wxSet(); if(!wxOn()){ WXC.data=null; return; }
  const key=r2(w.lat)+','+r2(w.lon)+','+todayISO();
  const c=LS.get('wearcycle.wx');
  if(!force&&c&&c.key===key&&Date.now()-c.data.at<3600e3){ WXC.data=c.data; return; }
  if(!S.online){ if(c&&c.key===key) WXC.data=c.data; return; }
  WXC.busy=true; WXC.err=''; if($('#wx')) renderWx();
  try{
    const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+r2(w.lat)+'&longitude='+r2(w.lon)+
      '&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=2');
    if(!r.ok) throw new Error('HTTP '+r.status);
    WXC.data=summarize(await r.json()); LS.set('wearcycle.wx',{key,data:WXC.data});
  }catch(e){ WXC.err='Could not get the forecast right now.'; if(c&&c.key===key) WXC.data=c.data; }
  WXC.busy=false; S.fitKey=''; renderOutfits();
}
function getPosition(){
  return new Promise((res,rej)=>{ if(!navigator.geolocation){ rej({friendly:'This browser cannot share a location. Enter a postal code instead.'}); return; }
    navigator.geolocation.getCurrentPosition(p=>res({lat:r2(p.coords.latitude),lon:r2(p.coords.longitude)}),
      e=>rej({friendly:e.code===1?'Location is blocked for this site. Allow it in Chrome (icon left of the address, then Permissions), or enter a postal code.':'Your location could not be found. Try again or enter a postal code.'}),
      {enableHighAccuracy:false,timeout:12000,maximumAge:1800e3}); });
}
async function refreshGps(){ // keeps "my location" current when permission is already granted; never prompts on its own
  const w=wxSet(); if(!w.on||w.mode!=='gps'||!navigator.permissions) return;
  try{ const st=await navigator.permissions.query({name:'geolocation'}); if(st.state!=='granted') return;
    const p=await getPosition(); if(Math.abs(p.lat-w.lat)>0.05||Math.abs(p.lon-w.lon)>0.05){ Object.assign(w,p); queueSettingsSave(); loadWeather(true); } }catch(e){}
}
function saveWx(patch){ Object.assign(wxSet(),patch); saveCache(); queueSettingsSave(); S.fitKey=''; }

/* ---------- flat-lay cut-outs (background removed on the phone, in a background worker) ---------- */
const CUT={worker:null,n:0,pend:{},urls:new Map(),busy:false};
function bgWorker(){
  if(CUT.worker) return CUT.worker;
  CUT.worker=new Worker('vendor/bgworker.mjs',{type:'module'});
  CUT.worker.onmessage=e=>{ const d=e.data, p=CUT.pend[d.id]; if(!p) return;
    if(d.progress){ if(p.onp) p.onp(d.progress); return; }
    delete CUT.pend[d.id]; if(d.error) p.rej(new Error(d.error)); else p.res(d.blob); };
  CUT.worker.onerror=e=>{ for(const k in CUT.pend){ CUT.pend[k].rej(new Error(e.message||'worker failed')); delete CUT.pend[k]; } CUT.worker=null; };
  return CUT.worker;
}
function removeBg(blob,onp){ return new Promise((res,rej)=>{ const id=++CUT.n; CUT.pend[id]={res,rej,onp};
  bgWorker().postMessage({id,blob,publicPath:new URL('vendor/bgr-data/',location.href).href}); }); }
// Trims the transparent margin, caps the size at 640 px and saves as WebP (PNG if WebP is unavailable).
async function trimAlpha(png){
  const src=await decode(png); const W=src.width,H=src.height;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); g.drawImage(src,0,0); if(src.close) src.close();
  const a=g.getImageData(0,0,W,H).data; let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y+=2) for(let x=0;x<W;x+=2){ if(a[(y*W+x)*4+3]>24){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  if(x1<0) throw new Error('Nothing was found in the photo');
  const pad=Math.round(0.02*Math.max(x1-x0,y1-y0)); x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(W-1,x1+pad); y1=Math.min(H-1,y1+pad);
  const w=x1-x0+1,h=y1-y0+1,k=Math.min(1,640/Math.max(w,h));
  const out=document.createElement('canvas'); out.width=Math.round(w*k); out.height=Math.round(h*k);
  out.getContext('2d').drawImage(cv,x0,y0,w,h,0,0,out.width,out.height);
  let b=await new Promise(r=>out.toBlob(r,'image/webp',0.86)); if(!b||b.type!=='image/webp') b=await new Promise(r=>out.toBlob(r,'image/png'));
  return b;
}
const cutKey=path=>new URL('cutouts/'+path,location.href).href;
async function cutUrl(it){
  if(!it||!it.cut) return '';
  if(CUT.urls.has(it.cut)) return CUT.urls.get(it.cut);
  let blob=null;
  try{ const c=await caches.open('wearcycle-cutouts'); const hit=await c.match(cutKey(it.cut)); if(hit) blob=await hit.blob();
    if(!blob&&sb&&S.online){ const {data}=await sb.storage.from('photos').download(it.cut); if(data){ blob=data; c.put(cutKey(it.cut),new Response(data,{headers:{'Content-Type':data.type||'image/webp'}})); } } }catch(e){}
  if(!blob) return '';
  const u=URL.createObjectURL(blob); CUT.urls.set(it.cut,u); return u;
}
async function makeCut(it,onp){
  const src=await photoBlob(it.photo);
  const png=await removeBg(src,onp);
  const out=await trimAlpha(png);
  const ext=out.type==='image/webp'?'webp':'png';
  const path=UID+'/'+it.id+'-cut-'+Date.now().toString(36)+'.'+ext;
  const {error}=await sb.storage.from('photos').upload(path,out,{contentType:out.type,upsert:false});
  if(error) throw new Error(error.message||'upload failed');
  try{ const c=await caches.open('wearcycle-cutouts'); await c.put(cutKey(path),new Response(out,{headers:{'Content-Type':out.type}})); }catch(e){}
  const old=it.cut; if(await patchItem(it.id,{cut:path})){ if(old) removePhoto(old); return true; }
  return false;
}
function needsCut(it){ return it&&!isEx(it)&&it.photo&&!it.cut&&isActive(it); }
async function makeCuts(list){
  list=list.filter(needsCut); if(!list.length){ toast('All these pieces already have cut-outs.'); return; }
  if(CUT.busy) return; if(!canWrite()){ toast('You are offline. Cut-outs need a connection the first time.'); return; }
  CUT.busy=true; closeSheet(); let n=0, fail=0, lastErr='';
  for(const it of list){
    const label='Cut-out '+(n+fail+1)+' of '+list.length+' ('+it.name+')';
    toast(label+'…',0);
    try{ await makeCut(it,p=>{ if(p&&/fetch/.test(p.k)&&p.tot) toast('First time only: downloading the cut-out tool, '+Math.round(100*p.cur/p.tot)+'% of about 100 MB…',0); else if(p&&/compute|inference/.test(p.k)) toast(label+': working…',0); }); n++; renderOutfits(); }
    catch(e){ fail++; lastErr=String(e&&e.message||e); }
  }
  CUT.busy=false; renderAll();
  toast('Made '+n+' cut-out'+(n===1?'':'s')+'.'+(fail?' '+fail+' failed'+(lastErr?' ('+lastErr.slice(0,80)+')':'')+'.':''),7000);
}

/* ---------- persistence ---------- */
async function writeItem(it){
  if(isEx(it)){ const i=S.examples.findIndex(e=>e.id===it.id); if(i>=0) S.examples[i]=it; renderAll(); return true; }
  if(!canWrite()){ toast('You are offline. Changes need a connection.'); return false; }
  const prev=S.items.get(it.id); S.items.set(it.id,it); renderAll();
  const {error}=await sb.from('items').upsert({id:it.id,body:cleanBody(it),updated_at:new Date().toISOString()});
  if(error){ if(prev) S.items.set(it.id,prev); else S.items.delete(it.id); renderAll(); toast('Could not save: '+(error.message||'unknown error'),4500); return false; }
  saveCache(); return true;
}
async function patchItem(id,patch){ const it=byId(id); if(!it) return false; return writeItem(Object.assign({},it,patch)); }
async function loadRemote(){
  const [it,we,se]=await Promise.all([
    sb.from('items').select('id,body'),
    sb.from('wears').select('date,occ,items').order('date',{ascending:false}).limit(200),
    sb.from('settings').select('body').maybeSingle()]);
  const err=it.error||we.error||se.error;
  if(err){ S.fromCache=true; renderAll(); if(S.online) toast('Could not load from the server: '+(err.message||'unknown error'),5000); return; }
  S.items=new Map(it.data.map(r=>[r.id,Object.assign({},r.body,{id:r.id})]));
  S.log=we.data||[]; if(se.data&&se.data.body) Object.assign(S.settings,se.data.body);
  S.fromCache=false; S.loaded=true; saveCache(); renderAll(); loadWeather(); refreshGps();
}
function loadCache(){ const c=LS.get(cacheKey()); if(!c) return false;
  S.items=new Map((c.items||[]).map(r=>[r.id,r])); S.log=c.log||[]; if(c.settings) Object.assign(S.settings,c.settings);
  S.loaded=true; S.fromCache=true; return true; }

/* ---------- camera ---------- */
const CAM={stream:null,mode:'single',shots:[],resolve:null,facing:'environment',busy:false};
let guarded=false;
function guard(){ if(!guarded){ try{ history.pushState({wearcycle:1},''); guarded=true; }catch(e){} } }
function inDepth(){ return !!CAM.resolve || !!$('#sheetRoot').innerHTML || S.sel!==0 || S.tab!=='outfits'; }
window.addEventListener('popstate',()=>{
  guarded=false;
  if(CAM.resolve) closeCamera(CAM.mode==='batch'?CAM.shots:[]);
  else if($('#sheetRoot').innerHTML) closeSheet();
  else if(S.sel!==0){ S.sel=0; renderOutfits(); window.scrollTo(0,0); }
  else if(S.tab!=='outfits') goTab('outfits');
  else { history.back(); return; } // nothing left to close: let back leave the app
  if(inDepth()) guard();
});
function openCamera(mode){
  guard();
  return new Promise(resolve=>{
    CAM.mode=mode; CAM.shots=[]; CAM.resolve=resolve;
    drawCamera(); startStream();
  });
}
function drawCamera(msg){
  const last=CAM.shots[CAM.shots.length-1];
  $('#camRoot').innerHTML=`<div class="cam" role="dialog" aria-label="Camera">
    ${msg?`<div class="msg">${msg}</div>`:`<video id="camVideo" playsinline muted autoplay></video><div class="guide" aria-hidden="true"></div><div class="flash" id="camFlash"></div>`}
    <div class="top"><span>${CAM.mode==='batch'?'One piece per photo, plain background':'Fill the frame with the item'}</span>
      <button class="side" data-cam="flip" style="width:44px;height:36px" aria-label="Switch camera"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h13l-4-4M20 15H7l4 4"/></svg></button></div>
    <div class="bar">
      <button class="side" data-cam="cancel">Cancel</button>
      ${msg?'<span></span>':'<button class="shutter" data-cam="shoot" aria-label="Take photo"></button>'}
      ${CAM.mode==='batch'?`<button class="side" data-cam="done" ${CAM.shots.length?'':'disabled'} aria-label="Done, ${CAM.shots.length} photos">${last?`<img src="${CAM.lastUrl}" alt="">`:''}<span class="n">${CAM.shots.length}</span>${last?'':'Done'}</button>`:'<span class="side" style="border:0"></span>'}
    </div></div>`;
  if(!msg && CAM.stream){ const v=$('#camVideo'); v.srcObject=CAM.stream; v.play().catch(()=>{}); }
}
async function startStream(){
  stopStream();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ cameraFallback('This browser cannot show the camera inside the app.'); return; }
  try{
    CAM.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:CAM.facing},width:{ideal:1920},height:{ideal:1440}}});
    if(!CAM.resolve){ stopStream(); return; }
    const v=$('#camVideo'); if(v){ v.srcObject=CAM.stream; v.play().catch(()=>{}); } else drawCamera();
  }catch(e){
    const name=e&&e.name;
    cameraFallback(name==='NotAllowedError'?'Camera access is blocked. Allow it in Chrome: tap the icon left of the address, then Permissions, then Camera.'
      :name==='NotFoundError'?'No camera was found on this device.':'The camera could not start ('+esc(name||'unknown')+').');
  }
}
function cameraFallback(text){
  drawCamera(`<p>${text}</p><button class="btn primary" data-cam="gallery">Choose photos instead</button>`);
}
function stopStream(){ if(CAM.stream){ CAM.stream.getTracks().forEach(t=>t.stop()); CAM.stream=null; } }
function closeCamera(result){ stopStream(); $('#camRoot').innerHTML=''; const r=CAM.resolve; CAM.resolve=null; if(r) r(result||[]); }
async function shoot(){
  const v=$('#camVideo'); if(!v||!v.videoWidth||CAM.busy) return; CAM.busy=true;
  const blob=await new Promise(r=>drawScaled(v,1280).toBlob(r,'image/jpeg',0.86));
  CAM.busy=false; if(!blob) return;
  if(CAM.mode==='single'){ closeCamera([blob]); return; }
  CAM.shots.push(blob); if(CAM.lastUrl) URL.revokeObjectURL(CAM.lastUrl); CAM.lastUrl=URL.createObjectURL(blob);
  const f=$('#camFlash'); if(f){ f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  const done=document.querySelector('[data-cam="done"]'); if(done){ done.disabled=false; done.innerHTML=`<img src="${CAM.lastUrl}" alt=""><span class="n">${CAM.shots.length}</span>`; done.setAttribute('aria-label','Done, '+CAM.shots.length+' photos'); }
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden && CAM.resolve) closeCamera(CAM.shots); });

function pickFiles(multiple){
  return new Promise(res=>{ const inp=multiple?$('#bulkIn'):$('#galIn'); inp.value='';
    inp.onchange=()=>res([...(inp.files||[])]); inp.click(); });
}

/* ---------- add many photos ---------- */
async function addPhotos(blobs){
  if(!blobs.length) return;
  if(!canWrite()){ toast('You are offline. Adding clothes needs a connection.'); return; }
  S.busy=true; let done=0, aiFail=0, aiStop='';
  const list=blobs.slice(0,40);
  for(const b of list){
    toast('Adding '+(done+1)+' of '+list.length+(aiStop?'':' · Claude is reading it')+'…',0);
    let p; try{ p=await prepare(b); }catch(e){ continue; }
    const now=todayISO();
    const it={id:uuid(),name:'New item '+(done+1),cat:'top',colors:[],formality:2,occ:[],cond:4,notes:'',created:now,lastCheck:now,status:'active',worn:0,wearsSinceCheck:0,review:true,thumb:p.thumb};
    const path=await uploadPhoto(p.full); if(path) it.photo=path;
    if(!aiStop){ try{ const r=await aiTag(p.full); if(r&&!r.error){ applyAi(it,r); await applyBox(it,p.full,r.box); } else aiFail++; }catch(e){ aiFail++; if(/not set up|API key|sign-in/.test(aiMsg(e))) aiStop=aiMsg(e); } }
    if(await writeItem(it)) done++;
  }
  S.busy=false; renderAll();
  toast('Added '+done+' item'+(done===1?'':'s')+'. Open each one marked Review to confirm the details.'+(aiStop?' '+aiStop:(aiFail?' Claude could not read '+aiFail+'.':'')),7000);
  goTab('closet');
}

/* ---------- rendering ---------- */
function renderAll(){ renderStatus(); renderOutfits(); renderCloset(); renderCare(); renderShop(); const v=$('#appVersion'); if(v) v.textContent='Wearcycle v'+APP_VERSION; }
function renderStatus(){
  const st=$('#status'); let b='';
  if(!S.online){ st.textContent='Offline'; st.className='status warn'; b='<div class="banner"><div><b>You are offline.</b> Showing the last saved copy. Changes and Claude need a connection.</div></div>'; }
  else if(S.fromCache){ st.textContent='Syncing'; st.className='status'; }
  else { st.textContent='Saved'; st.className='status ok'; }
  if(S.online && S.installEvt && !LS.get('wardrobe.installDismissed')) b+='<div class="banner" style="background:var(--accent-soft)"><div style="flex:1"><b style="color:var(--accent)">Install Wearcycle</b> to open it from your home screen like any app.</div><button class="btn sm primary" data-act="install">Install</button><button class="btn sm ghost" data-act="installNo">Later</button></div>';
  $('#banner').innerHTML=b;
  $('#addBtn').hidden=S.tab!=='closet';
  const n=allItems().filter(it=>careFlags(it,Date.now(),S.settings).some(f=>f.kind==='retire'||f.kind==='check'||f.kind==='downgraded')).length;
  const bd=$('#careBadge'); bd.hidden=!n; bd.textContent=n;
}
function emptyCloset(){
  return `<div class="empty"><h3>Your closet is empty</h3>
    <ol><li>Tap <b>Take photos</b> and photograph your clothes one piece at a time, on a bed or floor with good light.</li>
    <li>Tap the counter when you are done. Claude fills in category, colors and condition for each one.</li>
    <li>Open items marked <b>Review</b> in Closet to confirm. Two tops, one bottom and one pair of shoes per occasion are enough to get outfits.</li></ol>
    <div class="row"><button class="btn primary" data-act="camBatch">Take photos</button><button class="btn" data-act="bulk">Choose from gallery</button>${S.examples.length?'':'<button class="btn ghost" data-act="examples">Example closet</button>'}</div>
    <p class="hint">The example closet only shows on this screen and is never saved.</p></div>`;
}
function layerOn(){ return S.layerMode==='on'||(S.layerMode==='auto'&&needsLayer(wxForScore())); }
function fitKeyNow(){ const w=wxForScore(); return S.occ+'|'+layerOn()+'|'+(w?[Math.round(w.feelMin),Math.round(w.feelMax),w.rain,w.snow,w.off].join(','):'nowx')+'|'+allItems().filter(isActive).map(i=>i.id+':'+(i.cond??4)+':'+(i.occ||[]).join(',')+':'+(i.colors||[]).join(',')+':'+(i.formality??3)+':'+warmthOf(i)+':'+rainReady(i)+':'+canOpen(i)+canUnder(i)+needsBelt(i)+':'+(i.thumb||'').length).sort().join(';'); }
function idsOf(o){ return {top:o.top?.id,under:o.under?.id,bottom:o.bottom?.id,onepiece:o.onepiece?.id,outer:o.outer?.id,shoes:o.shoes?.id,acc:(o.acc||[]).map(a=>a.id)}; }
function hydrate(ids){ const o={}; for(const k of ['top','under','bottom','onepiece','outer','shoes']) if(ids[k]&&byId(ids[k])) o[k]=byId(ids[k]); o.acc=(ids.acc||[]).map(byId).filter(Boolean); return o; }
function regenerate(){
  const r=suggest(allItems(),S.occ,ctx(),{n:4,jitter:S.seed?1.2:0,rng:makeRng(S.seed),layer:layerOn()});
  S.fits=r.outfits.map(f=>({ids:idsOf(f.o),score:f.score,reasons:f.reasons})).sort((a,b)=>b.score-a.score); S.fits.forEach((f,k)=>{f.rank=k+1;}); S.missing=r.missing; S.fitKey=fitKeyNow(); S.sel=0;
}
// Match label from the score (see "How Wearcycle decides"); bars give a quick visual of the same thing.
const MATCH=[[4,'Excellent match',5],[3,'Great match',4],[2,'Good match',3],[0.5,'Fair match',2],[-Infinity,'Weak match',1]];
// Each warning (red dot) lowers the label one step, so a high score can't hide a real problem.
function match(f){ const lv=Math.max(1,MATCH.find(x=>f.score>=x[0])[2]-(f.reasons||[]).filter(r=>r.neg).length); const m=MATCH.find(x=>x[2]===lv); return {label:m[1],bars:lv}; }
function bars(n){ return `<span class="bars" aria-hidden="true">${[1,2,3,4,5].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`; }
const WX_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 12 3 3 0 0 1 18 18H7Z"/></svg>';
function renderWx(adv){
  const box=$('#wx'); const w=wxSet();
  if(!wxOn()){
    box.innerHTML=w.dismissed?'':`<div class="wxcard setup"><div class="wxtxt"><b>Dress for the weather</b><span>Wearcycle checks today's forecast for your area and picks layers, rain gear and fabrics to match.</span></div>
      <div class="row"><button class="btn sm primary" data-wx="gps">Use my location</button><button class="btn sm" data-wx="edit">Enter postal code</button><button class="btn sm ghost" data-wx="dismiss">Not now</button></div></div>`;
    return;
  }
  const d=WXC.data;
  if(!d){ box.innerHTML=`<div class="wxcard"><span class="wxic">${WX_ICON}</span><div class="wxtxt"><b>${esc(w.label||'Your area')}</b><span>${WXC.busy?'Getting the forecast…':esc(WXC.err||'Forecast not loaded yet.')}</span></div><button class="btn sm ghost" data-wx="edit">Change</button></div>`; return; }
  const wet=d.snow?'Snow likely'+(d.wetFrom!=null?' from '+hourLabel(d.wetFrom):''):d.rain?Math.round(d.rainProb)+'% chance of rain'+(d.wetFrom!=null&&d.wetFrom>d.from?' from '+hourLabel(d.wetFrom):''):(d.rainProb>=20?Math.round(d.rainProb)+'% chance of rain':'Dry');
  box.innerHTML=`<div class="wxcard"><div class="wxtxt"><b><span class="wxic">${WX_ICON}</span>${tdeg(d.tempMin)} to ${tdeg(d.tempMax)} · ${esc(d.sky)}</b>
    <span>Feels like ${tdeg(d.feelMin)} to ${tdeg(d.feelMax)} · ${esc(wet)}${d.wind>=30?' · windy':''}</span>
    <span class="wxwhere">${esc(w.label||'Your location')} · ${hourLabel(d.from)} to ${hourLabel(d.to)}</span></div><button class="btn sm ghost" data-wx="edit">Change</button>
    ${adv?`<p class="advice">${esc(adv)}</p>`:''}</div>`;
}
function adviceText(){
  const w=wxForScore(), d=WXC.data; if(!w||!d) return '';
  const {lo,hi}=wxFeel(w); const out=[];
  const band=lo<0?'Freezing':lo<5?'Cold':lo<12?'Cool':lo<18?'Mild':hi>=25?'Hot':'Warm';
  out.push(band+(d.snow?' with snow':d.rain?' and wet':'')+' for '+OCC[S.occ].label.toLowerCase()+'.');
  const hasOuter=eligible(allItems(),S.occ).some(i=>i.cat==='outerwear');
  if(S.layerMode==='auto'){
    if(needsLayer(w)) out.push(hasOuter?'I added an outer layer.':'An outer layer would help, but none is tagged for '+OCC[S.occ].label.toLowerCase()+' yet.');
    else if(hi>=24) out.push('Light, breathable pieces ranked first.');
  }
  if(wxWet(w)){ const top=S.fits[0]&&hydrate(S.fits[0].ids); if(!(top&&top.outer&&rainReady(top.outer))) out.push(d.snow?'Wear boots if you have them.':'Take an umbrella.'); }
  return out.join(' ');
}
function renderOutfits(){
  renderWx('');
  $('#occChips').innerHTML=OCCASIONS.map(o=>`<button class="chip" data-occ="${o.id}" aria-pressed="${S.occ===o.id}">${o.label}</button>`).join('');
  const auto=needsLayer(wxForScore());
  $('#layerSeg').innerHTML=`<span class="lab">Outer layer</span>`+[['auto','Auto'+(wxForScore()?(auto?' · on':' · off'):'')],['on','Add'],['off','None']].map(([k,l])=>`<button class="chip" data-layer="${k}" aria-pressed="${S.layerMode===k}">${l}</button>`).join('');
  const box=$('#fits');
  if(!S.loaded){ box.innerHTML='<p class="hint">Loading your closet…</p>'; return; }
  if(!allItems().length){ box.innerHTML=emptyCloset(); return; }
  if(S.fitKey!==fitKeyNow()) regenerate();
  if(!S.fits.length){
    const names={top:'tops',bottom:'bottoms',shoes:'shoes'}; const occ=OCC[S.occ];
    box.innerHTML=`<div class="empty"><h3>Not enough for ${esc(occ.label.toLowerCase())} yet</h3>
      <p class="hint">Missing: ${(S.missing||[]).map(m=>names[m]).join(', ')} tagged for ${esc(occ.label.toLowerCase())} in condition ${occ.min}/5 or better. Tag existing items for this occasion in Closet, or see the Shop tab.</p>
      <div class="row"><button class="btn" data-tab-go="shop">Open shopping list</button></div></div>`; return;
  }
  if(S.sel>=S.fits.length) S.sel=0;
  const adv=adviceText();
  const others=S.fits.map((f,i)=>i===S.sel?'':altRow(f,i)).join('');
  renderWx(adv);
  setTimeout(hydrateCuts,0);
  box.innerHTML=todayLine()+heroCard(S.fits[S.sel],S.sel)+
    `<div class="alts"><div class="alts-h"><h3>${S.fits.length>1?'Other options':'Only one outfit fits'}</h3><span class="spacer"></span>${S.fits.length>1?'<button class="btn sm" id="shuffleBtn">New ideas</button>':''}</div><p class="hint">${S.fits.length>1?'Ranked by match. Tap one to see it full size.':'Add or tag more pieces for '+esc(OCC[S.occ].label.toLowerCase())+' to get more options.'}</p>${others}</div>`+
    `<p class="hint center">Ranked by color harmony, dress level, how long pieces have rested${wxForScore()?' and today’s weather':''}. Settings explain the rules.</p>`;
}
const SWAP_ICON='<span class="swap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9h13l-4-4M20 15H7l4 4"/></svg></span>';
function tile(it,slot,i,size){
  if(!it) return '';
  const acc=slot.startsWith('acc');
  return `<button class="tile ${size||''}" data-swap="${i}" data-slot="${slot}" aria-label="${esc(CAT[it.cat].label)}: ${esc(it.name)}. Tap to swap">${acc?'':SWAP_ICON}<div class="vis">${visual(it)}</div><div class="cap"><span class="k">${esc(slot==='outer'?'Layer':slot==='under'?'Underneath':(slot==='top'&&size==='open')?'Top, worn open':CAT[it.cat].label)}</span>${esc(it.name)}</div></button>`;
}
function heroCard(f,i){
  const o=hydrate(f.ids); const m=match(f);
  const core=[o.outer&&['outer',o.outer],o.onepiece?['onepiece',o.onepiece]:o.top&&['top',o.top],o.under&&['under',o.under],!o.onepiece&&o.bottom&&['bottom',o.bottom],o.shoes&&['shoes',o.shoes]].filter(Boolean);
  const canAddUnder=o.top&&!o.under&&canOpen(o.top)&&swapCandidates(o,'under',allItems(),S.occ,ctx()).length;
  const beltK=o.bottom?o.acc.findIndex(a=>a.cat==='belt'):-1; const rest=o.acc.map((a,k)=>[a,k]).filter(([a,k])=>k!==beltK);
  const head=f.edited?`<span class="rank">#${f.rank}</span><span class="rk-l"><b>Your version of option ${f.rank}</b>${m.label}</span>`
    :i===0?`<span class="rank top">#1</span><span class="rk-l"><b>Best match</b>${m.label} · 1 of ${S.fits.length}</span>`
    :`<span class="rank">#${f.rank}</span><span class="rk-l"><b>Option ${f.rank} of ${S.fits.length}</b>${m.label}</span>`;
  const viewSw=`<div class="viewsw" role="group" aria-label="View"><button class="chip" data-view="board" aria-pressed="${S.view==='board'}">Flat-lay</button><button class="chip" data-view="pieces" aria-pressed="${S.view!=='board'}">Pieces</button></div>`;
  if(S.view==='board') return `<article class="fit hero"><header class="fit-h">${head}${bars(m.bars)}</header>${viewSw}${flatlay(o,i)}${heroMeta(f,i,o,canAddUnder)}</article>`;
  return `<article class="fit hero"><header class="fit-h">${head}${bars(m.bars)}</header>${viewSw}
    <div class="board2 n${core.length}">${core.map(([k,it])=>k==='bottom'&&beltK>=0?beltOn(it,o.acc[beltK],beltK,i):tile(it,k,i,k==='top'&&o.under?'open':'')).join('')}</div>
    ${rest.length?`<div class="accrow">${rest.map(([a,k])=>tile(a,'acc'+k,i,'xs')).join('')}</div>`:''}
    ${heroMeta(f,i,o,canAddUnder)}</article>`;
}
function heroMeta(f,i,o,canAddUnder){
  return `<div class="fit-meta"><ul class="why">${f.reasons.map(r=>`<li class="${r.neg?'neg':''}">${esc(r.t)}</li>`).join('')}</ul>
      <div class="row">${f.worn?'<span class="worn-ok">Logged as worn today</span>':`<button class="btn primary grow" data-wear="${i}">Wear this today</button>`}
      ${S.fits.length>1?`<button class="btn" data-next="1" aria-label="Show the next option">Next option</button>`:''}</div>
      ${canAddUnder?`<button class="btn sm ghost addunder" data-addunder="${i}">+ Wear a t-shirt underneath</button>`:''}
      <p class="hint">${S.view==='board'&&S.fits.length>1?'Swipe the board for the next option. ':''}Tap any piece to swap it for another one that fits.</p>
      <button class="btn ghost sm logother" data-act="logOther">Wore something else? Log what you wore</button></div>`;
}
/* Flat-lay board: pieces laid out like a styled outfit photo. Positions are % of a 4:5 board: [left, top, width, height, z]. */
const FL={
  bottom:[3,4,40,46,2], top:[42,2,55,62,3], under:[30,8,32,40,1], outer:[46,1,52,60,4], topWithOuter:[24,4,38,48,3], underWithOuter:[22,30,24,28,1],
  shoes:[3,56,40,34,3], socks:[42,74,14,22,4], belt:[44,62,24,12,5], watch:[80,64,17,22,5], extra:[[60,80,18,18,5],[80,84,18,14,5]]};
function flatlay(o,i){
  const parts=[], miss=[];
  const put=(it,slot,box,cls)=>{ if(!it) return; if(needsCut(it)) miss.push(it);
    parts.push(`<button class="fl ${cls||''} ${it.cut?'iscut':''}" style="left:${box[0]}%;top:${box[1]}%;width:${box[2]}%;height:${box[3]}%;z-index:${box[4]}" data-swap="${i}" data-slot="${slot}" aria-label="${esc(CAT[it.cat].label)}: ${esc(it.name)}. Tap to swap">${flVisual(it)}</button>`); };
  if(o.onepiece) put(o.onepiece,'onepiece',[18,2,50,62,2]);
  else { put(o.bottom,'bottom',FL.bottom,'fold');
    if(o.outer){ put(o.outer,'outer',FL.outer); put(o.top,'top',FL.topWithOuter); put(o.under,'under',FL.underWithOuter); }
    else { put(o.top,'top',FL.top); put(o.under,'under',FL.under); } }
  put(o.shoes,'shoes',FL.shoes);
  let e=0; o.acc.forEach((a,k)=>{ const box=a.cat==='socks'?FL.socks:a.cat==='belt'?FL.belt:a.cat==='watch'?FL.watch:FL.extra[e++]; if(box) put(a,'acc'+k,box,'acc'); });
  const note=miss.length&&!CUT.busy?`<div class="cutnote"><span>${miss.length} piece${miss.length>1?'s':''} still on the floor photo.</span><button class="btn sm primary" data-act="cutOutfit">Make cut-outs</button></div>`:(CUT.busy?'<div class="cutnote"><span>Making cut-outs… you can keep using the app.</span></div>':'');
  return `<div class="flatlay" data-swipe="1">${parts.join('')}</div>${note}`;
}
function flVisual(it){ const src=thumbSrc(it); return `<img ${it.cut?`data-cut="${esc(it.id)}"`:''} src="${esc(src||'')}" alt="" ${src?'':'hidden'}>${src?'':glyph(it)}`; }
// After each render, swap in the transparent cut-outs (loaded from the phone's cache, or downloaded once).
function hydrateCuts(){ document.querySelectorAll('img[data-cut]').forEach(img=>{ const it=byId(img.dataset.cut); cutUrl(it).then(u=>{ if(u&&img.isConnected){ img.src=u; img.hidden=false; img.classList.add('cut'); } }); }); }
// The belt is drawn as a band across the top of the trousers tile, where it is worn; it swaps on its own.
function beltOn(bottom,belt,k,i){
  return `<div class="withbelt">${tile(bottom,'bottom',i)}<button class="beltband" data-swap="${i}" data-slot="acc${k}" aria-label="Belt: ${esc(belt.name)}. Tap to swap"><span class="bimg">${visual(belt)}</span><span class="blab"><span class="k">Belt</span><span class="bn">${esc(belt.name)}</span></span></button></div>`;
}
function altRow(f,i){
  const o=hydrate(f.ids); const m=match(f); const list=coreOf(o);
  return `<button class="alt" data-sel="${i}" aria-label="Option ${f.rank}, ${m.label}: ${esc(list.map(x=>x.name).join(', '))}"><span class="rank">#${f.rank}</span>
    <span class="strip">${list.map(it=>`<span class="mini">${visual(it)}</span>`).join('')}</span>
    <span class="alt-l">${m.label}${bars(m.bars)}</span></button>`;
}
function renderCloset(){
  const items=allItems().filter(isActive);
  const counts={}; for(const it of items) counts[it.cat]=(counts[it.cat]||0)+1;
  const cats=[{id:'all',label:'All'}].concat(CATS.filter(c=>counts[c.id]));
  if(!cats.find(c=>c.id===S.cat)) S.cat='all';
  $('#catChips').innerHTML=cats.map(c=>`<button class="chip" data-cat="${c.id}" aria-pressed="${S.cat===c.id}">${c.label}<span class="n">${c.id==='all'?items.length:counts[c.id]}</span></button>`).join('');
  $('#catChips').hidden=!items.length;
  const box=$('#closetGrid');
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():'<p class="hint">Loading…</p>'; return; }
  const list=items.filter(it=>S.cat==='all'||it.cat===S.cat).sort((a,b)=>(b.review?1:0)-(a.review?1:0)||CATS.findIndex(c=>c.id===a.cat)-CATS.findIndex(c=>c.id===b.cat)||String(a.name).localeCompare(b.name));
  const now=Date.now(); const reviews=items.filter(i=>i.review).length;
  box.innerHTML=(reviews?`<div class="row" style="margin:0 0 12px"><p class="hint" style="margin:0;flex:1;min-width:200px">${reviews} item${reviews>1?'s':''} marked <span class="ex">Review</span>: check what Claude filled in. Open any item to correct it, or confirm them all.</p><button class="btn sm primary" data-act="confirmAll" ${S.busy?'disabled':''}>Confirm all ${reviews}</button></div>`:'')+
   (S.examples.length?`<div class="row" style="margin-bottom:12px"><span class="hint">Items marked <span class="ex">Example</span> are not saved.</span><span class="spacer"></span><button class="btn sm ghost" data-act="clearEx">Remove examples</button></div>`:'')+
   '<div class="grid">'+list.map(it=>{ const fl=careFlags(it,now,S.settings); const bad=fl.some(f=>f.kind==='retire'); return `<button class="card" data-edit="${esc(it.id)}">
    <div class="vis">${visual(it)}</div><div class="body"><div class="name">${esc(it.name)}</div>
    <div class="meta">${condTag(it)}${fl.length?`<span class="dot ${bad?'bad':''}" title="Needs attention"></span>`:''}${isEx(it)?'<span class="ex">Example</span>':''}${it.review?'<span class="ex">Review</span>':''}</div>
    <div class="meta">${(effectiveOccasions(it).map(o=>OCC[o].label).join(' · '))||'No occasion fits'}</div></div></button>`; }).join('')+'</div>';
}
function thumbBox(it){ return `<div class="thumb">${thumbSrc(it)?`<img src="${esc(thumbSrc(it))}" alt="">`:glyph(it)}</div>`; }
function careRow(it,f,acts){
  const cls=f.kind==='retire'?'stripe-retire':(f.kind==='downgraded'?'stripe-down':'');
  return `<div class="li care ${cls}">${thumbBox(it)}<div class="txt"><b>${esc(it.name)} ${isEx(it)?'<span class="ex">Example</span>':''}</b><span>${esc(f.text)}</span></div><div class="acts">${acts}</div></div>`;
}
function renderCare(){
  const now=Date.now(), items=allItems(); const box=$('#careBody');
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():''; return; }
  const groups={retire:[],unused:[],downgraded:[],check:[]};
  for(const it of items) for(const f of careFlags(it,now,S.settings)) groups[f.kind].push([it,f]);
  const panel=(title,desc,rows)=>`<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="count">${rows.length}</span></div>${desc?`<div class="panel-h"><p>${desc}</p></div>`:''}${rows.join('')}</div>`;
  const out=[];
  const donate=groups.retire.concat(groups.unused.filter(([it])=>!groups.retire.some(([r])=>r.id===it.id)));
  out.push(donate.length?panel('Donate or recycle','Retired items and anything not worn for '+Math.round(S.settings.unusedDays/MONTH)+'+ months.',donate.map(([it,f])=>careRow(it,f,`<button class="btn sm" data-donate="${esc(it.id)}">Mark donated</button><button class="btn sm ghost" data-edit="${esc(it.id)}">Open</button>`)))
    :'<div class="panel"><div class="panel-h"><h3>Donate or recycle</h3><span class="count">0</span></div><div class="li"><span class="done">Nothing to donate right now.</span></div></div>');
  if(groups.downgraded.length) out.push(panel('Moved down a level','Still useful, but no longer counted for work or going out.',groups.downgraded.map(([it,f])=>careRow(it,f,`<button class="btn sm" data-check="${esc(it.id)}">Recheck</button>`))));
  if(groups.check.length) out.push(panel('Condition check due','Take a fresh photo, or rate it yourself.',groups.check.map(([it,f])=>careRow(it,f,`<button class="btn sm primary" data-check="${esc(it.id)}">Check</button>`))));
  const donated=items.filter(it=>it.status==='donated');
  if(donated.length) out.push(`<div class="panel"><div class="panel-h"><h3>Donated</h3><span class="count">${donated.length}</span></div>${donated.slice(0,20).map(it=>`<div class="li">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>Donated ${esc(it.donatedOn||'')}</span></div><div class="acts"><button class="btn sm ghost" data-restore="${esc(it.id)}">Restore</button></div></div>`).join('')}</div>`);
  box.innerHTML='<div style="display:flex;flex-direction:column;gap:16px">'+out.join('')+'</div>';
}
let ideasState={busy:false,list:null,err:''};
function renderShop(){
  const box=$('#shopBody'); const items=allItems().filter(isActive);
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():''; return; }
  const g=gaps(items); const slotName={top:'Tops',bottom:'Bottoms',shoes:'Shoes'};
  const blocks=g.map(x=>{
    const o=OCC[x.occ];
    const body=x.needs.length?x.needs.map(n=>`<div class="need"><div class="row"><b>${slotName[n.slot]}</b><span class="meter" aria-label="${n.have} of ${n.target}">${Array.from({length:n.target},(_,k)=>`<i class="${k<n.have?'on':''}"></i>`).join('')}</span><span class="hint">${n.have} of ${n.target}</span></div>
      <div class="opt">Add ${n.target-n.have}: ${esc(n.idea)}</div>
      <div class="opt">${n.colors.map(c=>`<span><span class="swatch" style="background:${COLORS[c.color].hex}"></span>${c.color} <em>${c.adds?'+'+c.adds+' outfit'+(c.adds===1?'':'s'):'pairs widely'}</em></span>`).join(' &nbsp;or&nbsp; ')}</div></div>`).join('')
      :`<div class="need"><span class="done">Covered: ${x.have.top} tops, ${x.have.bottom} bottoms, ${x.have.shoes} shoes ready.</span></div>`;
    return `<div class="panel"><div class="panel-h"><h3>${o.label}</h3><span class="count">${x.needs.length?x.needs.length+' gap'+(x.needs.length>1?'s':''):'ready'}</span></div>${body}</div>`;
  });
  const retire=items.filter(it=>(it.cond??4)<=1);
  const repl=retire.length?`<div class="panel"><div class="panel-h"><h3>Replace</h3><span class="count">${retire.length}</span></div>${retire.map(it=>`<div class="li stripe-retire">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>Replace with a ${esc(primary(it)||'')} ${esc(CAT[it.cat].label.toLowerCase())} for ${esc((it.occ||[]).map(o=>OCC[o]?.label.toLowerCase()).filter(Boolean).join(', ')||'the same use')}.</span></div></div>`).join('')}</div>`:'';
  const list=ideasState.list;
  const ai=`<div class="panel"><div class="panel-h"><h3>Ideas from Claude</h3><span class="spacer"></span><button class="btn sm" data-act="ideas" ${ideasState.busy?'disabled':''}>${ideasState.busy?'Thinking…':(list?'Ask again':'Suggest purchases')}</button></div>
     ${ideasState.err?`<div class="li"><span class="hint">${esc(ideasState.err)}</span></div>`:''}
     ${list?list.map(x=>`<div class="idea"><b>${esc(x.item)}${x.color?' · '+esc(x.color):''}</b><span>${esc(OCC[x.occasion]?.label||x.occasion||'')}${x.pairsWith&&x.pairsWith.length?' · pairs with '+esc(x.pairsWith.join(', ')):''}</span><span>${esc(x.why||'')}</span></div>`).join(''):`<div class="li"><span class="hint">Claude reads a summary of your closet and the gaps above, and suggests specific pieces. Billed to your Anthropic API account.</span></div>`}</div>`;
  box.innerHTML='<div style="display:flex;flex-direction:column;gap:16px">'+repl+blocks.join('')+ai+'</div>';
}
async function askIdeas(){
  if(ideasState.busy) return; ideasState={busy:true,list:ideasState.list,err:''}; renderShop();
  const items=allItems().filter(isActive);
  const closet=items.map(it=>`- ${it.name} | ${it.cat} | colors: ${(it.colors||[]).join('/')} | formality ${it.formality??3} | condition ${it.cond??4} | for: ${effectiveOccasions(it).join(', ')||'none'}`).join('\n').slice(0,12000);
  const gapText=gaps(items).map(x=>`${x.occ}: `+(x.needs.map(n=>`${n.slot} ${n.have}/${n.target}`).join(', ')||'covered')).join('\n');
  try{ const r=await callClaude('ideas',{closet,gaps:gapText}); ideasState={busy:false,list:Array.isArray(r)?r.slice(0,8):[],err:Array.isArray(r)?'':'No ideas came back. Try again.'}; }
  catch(e){ ideasState={busy:false,list:ideasState.list,err:aiMsg(e)}; }
  renderShop();
}

/* ---------- sheets ---------- */
function closeSheet(){ $('#sheetRoot').innerHTML=''; document.body.style.overflow=''; ED=null; CK=null; LG=null; }
function openSheet(html){ guard(); $('#sheetRoot').innerHTML=`<div class="scrim" data-scrim="1"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`; document.body.style.overflow='hidden'; }
const sheetHead=t=>`<div class="sheet-h"><h3>${t}</h3><span class="spacer"></span><button class="iconbtn" data-close aria-label="Close">${CLOSE_ICON}</button></div>`;

function openAddMenu(){
  openSheet(sheetHead('Add clothes')+`
   <button class="btn primary" data-act="camBatch" style="justify-content:flex-start;padding:14px">Take photos <span class="hint" style="color:inherit;opacity:.8;margin-left:auto">many in a row</span></button>
   <button class="btn" data-act="bulk" style="justify-content:flex-start;padding:14px">Choose from gallery <span class="hint" style="margin-left:auto">select several</span></button>
   <button class="btn ghost" data-act="add" style="justify-content:flex-start;padding:14px">Enter one item by hand</button>
   <p class="hint">Tip: lay each piece flat on a bed or the floor, in daylight, one piece per photo.</p>`);
}

let ED=null;
function openEditor(id){
  const base=id?byId(id):null;
  ED={id:base?base.id:null,it:base?Object.assign({},base):{name:'',cat:'top',colors:[],formality:2,occ:[],cond:4,bought:'',notes:''},blob:null,preview:'',full:'',ai:null,busy:false,confirmDel:false};
  drawEditor();
  if(base&&base.photo&&canWrite()) fullPhotoUrl(base.photo).then(u=>{ if(ED&&ED.id===base.id&&u){ ED.full=u; drawEditor(); } });
}
function drawEditor(){
  const it=ED.it; const pv=ED.cropChanged?ED.thumb:(ED.preview||ED.full||thumbSrc(it)); const hasPic=!!(ED.blob||it.photo)&&!isEx(it); const cropped=ED.cropChanged?!!ED.newBox:!!it.box;
  const colorBtns=Object.entries(COLORS).map(([k,v])=>{ const ix=(it.colors||[]).indexOf(k); return `<button type="button" data-color="${k}" aria-pressed="${ix>=0}" aria-label="${k}${ix>=0?', choice '+(ix+1):''}" title="${k}" style="background:${v.hex}">${ix>=0?`<span class="ord">${ix+1}</span>`:''}</button>`; }).join('');
  const seg=(key,labels)=>`<div class="seg">${[1,2,3,4,5].map(n=>`<button type="button" data-seg="${key}" data-v="${n}" aria-pressed="${(it[key]??(key==='cond'?4:3))===n}"><b>${n}</b><span>${key==='cond'?labels[n]:labels[n].split(' ')[0]}</span></button>`).join('')}</div>`;
  openSheet(sheetHead(ED.id?(it.review?'Review item':'Edit item'):'New item')+`
   ${isEx(it)?'<p class="hint"><span class="ex">Example</span> Changes to example items are not saved.</p>':''}
   <div class="photo"><div class="pv">${pv?`<img src="${esc(pv)}" alt="">`:glyph(it)}</div>
     <div class="col"><button type="button" class="btn sm" data-photo="cam">Take photo</button><button type="button" class="btn sm ghost" data-photo="gal">Choose photo</button>
     ${ED.blob?`<button type="button" class="btn sm primary" data-ai="tag" ${ED.busy?'disabled':''}>${ED.busy?'Reading photo…':'Fill in with Claude'}</button>`:''}
     ${hasPic?(cropped?`<button type="button" class="btn sm ghost" data-uncrop="1" ${ED.busy?'disabled':''}>Show whole photo</button>`:`<button type="button" class="btn sm ghost" data-ai="box" ${ED.busy?'disabled':''}>Crop to the clothes</button>`):''}</div></div>
   ${ED.ai?`<div class="ai">${ED.ai}</div>`:''}
   <div class="field"><label for="f-name">Name</label><input type="text" id="f-name" value="${esc(it.name)}" placeholder="e.g. White oxford shirt" maxlength="60"></div>
   <div class="field"><label for="f-cat">Category</label><select id="f-cat">${CATS.map(c=>`<option value="${c.id}" ${it.cat===c.id?'selected':''}>${c.label}</option>`).join('')}</select></div>
   <div class="field"><span class="lab">Colors · tap in order, main color first</span><div class="colors">${colorBtns}</div></div>
   <div class="field"><span class="lab">Dress level · ${FORM[it.formality??3]}</span>${seg('formality',FORM)}</div>
   <div class="field"><span class="lab">Warmth · ${['','Light','Medium','Warm'][warmthOf(it)]}${it.warmth?'':' (guessed)'}</span><div class="seg s3">${[[1,'Light','tee, shorts'],[2,'Medium','shirt, jeans'],[3,'Warm','sweater, coat']].map(([n,l,e])=>`<button type="button" data-seg="warmth" data-v="${n}" aria-pressed="${warmthOf(it)===n}"><b>${l}</b><span>${e}</span></button>`).join('')}</div>
     ${['outerwear','shoes','hat','bag'].includes(it.cat)?`<label class="row hint"><input type="checkbox" id="f-rain" ${rainReady(it)?'checked':''}> Made for rain or snow</label>`:''}
     ${it.cat==='bottom'?`<label class="row hint"><input type="checkbox" id="f-belt" ${needsBelt(it)?'checked':''}> Worn with a belt</label>`:''}
     ${it.cat==='top'?`<label class="row hint"><input type="checkbox" id="f-open" ${canOpen(it)?'checked':''}> Can be worn open over a t-shirt</label><label class="row hint"><input type="checkbox" id="f-inner" ${canUnder(it)?'checked':''}> Works as a t-shirt under an open shirt</label>`:''}</div>
   <div class="field"><span class="lab">Occasions</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.map(o=>`<button type="button" class="chip" data-occt="${o.id}" aria-pressed="${(it.occ||[]).includes(o.id)}">${o.label}</button>`).join('')}</div></div>
   <div class="field"><div class="row"><span class="lab" style="flex:1">Condition · ${COND[it.cond??4]}</span><button type="button" class="btn sm" data-isnew="1">Brand new</button></div>${seg('cond',COND)}<p class="hint">5 like new · 4 good, no visible wear · 3 visible wear (pilling, fading), fine for home · 2 worn out (stains, small holes), chores only · 1 unusable.</p></div>
   <div class="field"><label for="f-bought">Bought (month, optional)</label><input type="month" id="f-bought" value="${esc(it.bought||'')}"></div>
   <div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" maxlength="300" placeholder="Fit, care, where it came from">${esc(it.notes||'')}</textarea></div>
   ${ED.id&&!isEx(it)?`<p class="hint">Worn ${it.worn||0} times${it.lastWorn?', last on '+esc(it.lastWorn):''}.${it.lastCheck?' Last condition check '+esc(it.lastCheck)+'.':''}</p>`:''}
   <div class="row sheet-actions"><button type="button" class="btn primary" data-save ${ED.busy?'disabled':''}>${it.review?'Confirm and save':'Save'}</button><button type="button" class="btn ghost" data-close>Cancel</button><span class="spacer"></span>
   ${ED.id?`<button type="button" class="btn danger sm" data-del>${ED.confirmDel?'Tap again to delete':'Delete'}</button>`:''}</div>`);
}
function readEditorFields(){ if(!ED) return; const it=ED.it, g=s=>$(s); if(g('#f-rain')) it.rain=g('#f-rain').checked; if(g('#f-open')) it.open=g('#f-open').checked; if(g('#f-belt')) it.belt=g('#f-belt').checked; if(g('#f-inner')) it.inner=g('#f-inner').checked; if(g('#f-name')) it.name=g('#f-name').value.trim(); if(g('#f-cat')) it.cat=g('#f-cat').value; if(g('#f-bought')) it.bought=g('#f-bought').value; if(g('#f-notes')) it.notes=g('#f-notes').value.trim(); }
async function editorSetPhoto(blob){
  try{ const p=await prepare(blob); if(!ED) return; ED.blob=p.full; ED.thumb=p.thumb; ED.newBox=null; ED.cropChanged=false; if(ED.preview) URL.revokeObjectURL(ED.preview); ED.preview=URL.createObjectURL(p.full); ED.ai=null; }
  catch(e){ toast('That image could not be opened.'); }
  if(ED) drawEditor();
}
async function saveEditor(){
  readEditorFields(); const it=ED.it;
  if(!it.name){ toast('Give the item a name.'); $('#f-name')?.focus(); return; }
  if(!it.colors||!it.colors.length){ toast('Pick at least one color.'); return; }
  if(!isEx(it)&&!canWrite()){ toast('You are offline. Changes need a connection.'); return; }
  ED.busy=true; drawEditor();
  const now=todayISO(); let oldPhoto=null;
  if(!ED.id){ it.id=uuid(); it.created=now; it.status='active'; it.worn=0; it.wearsSinceCheck=0; it.lastCheck=now; }
  if(ED.blob&&it.cut){ removePhoto(it.cut); it.cut=null; }
  if(ED.blob||ED.cropChanged){ it.thumb=ED.thumb; if(ED.newBox) it.box=ED.newBox; else delete it.box; }
  if(ED.blob){
    if(!isEx(it)){ const path=await uploadPhoto(ED.blob); if(path){ oldPhoto=it.photo; it.photo=path; } }
    else it._localUrl=ED.preview;
  }
  delete it.review;
  const ok=await writeItem(it);
  if(ok){ if(oldPhoto) removePhoto(oldPhoto); closeSheet(); toast('Saved'); }
  else if(ED){ ED.busy=false; drawEditor(); }
}
async function deleteItem(){
  const it=ED.it; closeSheet();
  if(isEx(it)){ S.examples=S.examples.filter(e=>e.id!==it.id); renderAll(); return; }
  if(!canWrite()){ toast('You are offline. Deleting needs a connection.'); return; }
  const {error}=await sb.from('items').delete().eq('id',it.id);
  if(error){ toast('Could not delete: '+error.message,4500); return; }
  S.items.delete(it.id); removePhoto(it.photo); saveCache(); renderAll(); toast('Deleted');
}

let CK=null;
function openCheck(id){ const it=byId(id); if(!it) return; CK={id,blob:null,thumb:'',preview:'',res:null,busy:false,err:'',cond:it.cond??4,usePhoto:false}; drawCheck(); }
function drawCheck(){
  const it=byId(CK.id); const r=CK.res;
  openSheet(sheetHead('Condition check')+`
   <p class="hint">${esc(it.name)} · currently ${COND[it.cond??4].toLowerCase()} (${it.cond??4}/5). Photograph the most worn area in good light: collar, cuffs, knees or soles.</p>
   <div class="photo"><div class="pv">${CK.preview?`<img src="${esc(CK.preview)}" alt="">`:(thumbSrc(it)?`<img src="${esc(thumbSrc(it))}" alt="">`:glyph(it))}</div>
    <div class="col"><button type="button" class="btn sm" data-cphoto="cam">Take photo</button><button type="button" class="btn sm ghost" data-cphoto="gal">Choose photo</button>
    <button type="button" class="btn sm primary" data-ai="check" ${!CK.blob||CK.busy?'disabled':''}>${CK.busy?'Assessing…':'Assess with Claude'}</button>${CK.blob?'':'<span class="hint">Take or choose a photo first.</span>'}</div></div>
   ${CK.err?`<p class="err">${esc(CK.err)}</p>`:''}
   ${r?`<div class="ai"><span class="k">Claude's read · ${esc(r.confidence||'')} confidence</span><div><b>${esc(COND[r.condition]||'')} (${esc(r.condition)}/5)</b>, recommends ${esc(r.recommendation||'')}. ${esc(r.summary||'')}</div>${(r.issues||[]).length?`<ul>${r.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<span class="hint">A photo can miss odors, fit and fabric thinning. Adjust the rating if you know better.</span></div>`:''}
   <div class="field"><span class="lab">Your rating · ${COND[CK.cond]}</span><div class="seg">${[1,2,3,4,5].map(n=>`<button type="button" data-ckc="${n}" aria-pressed="${CK.cond===n}"><b>${n}</b><span>${COND[n]}</span></button>`).join('')}</div></div>
   ${CK.blob&&!isEx(it)?`<label class="row hint"><input type="checkbox" id="ck-use" ${CK.usePhoto?'checked':''}> Use this photo as the item photo</label>`:''}
   <div class="row sheet-actions"><button type="button" class="btn primary" data-cksave ${CK.busy?'disabled':''}>Save check</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
}
async function checkSetPhoto(blob){
  try{ const p=await prepare(blob); if(!CK) return; CK.blob=p.full; CK.thumb=p.thumb; if(CK.preview) URL.revokeObjectURL(CK.preview); CK.preview=URL.createObjectURL(p.full); CK.res=null; CK.err=''; }
  catch(e){ if(CK) CK.err='That image could not be opened.'; }
  if(CK) drawCheck();
}
async function saveCheck(){
  const it=byId(CK.id); const patch={cond:CK.cond,lastCheck:todayISO(),wearsSinceCheck:0};
  if(CK.res) patch.ai={date:todayISO(),cond:CK.res.condition,rec:CK.res.recommendation||'',summary:String(CK.res.summary||'').slice(0,300),issues:(CK.res.issues||[]).slice(0,8).map(x=>String(x).slice(0,120))};
  const use=$('#ck-use')?.checked; let old=null;
  if(use&&CK.blob&&canWrite()&&!isEx(it)){ const path=await uploadPhoto(CK.blob); if(path){ old=it.photo; patch.photo=path; patch.thumb=CK.thumb; patch.box=null; if(it.cut){ removePhoto(it.cut); patch.cut=null; } } }
  const cond=CK.cond; closeSheet();
  if(await patchItem(it.id,patch)){ if(old) removePhoto(old); toast(cond<=1?'Saved. It is now on the donate list.':'Check saved'); }
}

// Settings use steppers and presets instead of typed numbers; months instead of days.
const MONTH=30.42;
const SETDEF={
  checkEvery:{label:'Check condition after',unit:v=>v+' wears',min:5,max:200,step:5,presets:[15,25,40,60],get:s=>s.checkEvery,set:(s,v)=>{s.checkEvery=v;}},
  checkDays:{label:'…or after',unit:v=>v+(v===1?' month':' months'),min:1,max:24,step:1,presets:[3,6,12],get:s=>Math.max(1,Math.round(s.checkDays/MONTH)),set:(s,v)=>{s.checkDays=Math.round(v*MONTH);}},
  unusedDays:{label:'Suggest donating clothes not worn for',unit:v=>v+' months',min:3,max:36,step:1,presets:[6,12,18,24],get:s=>Math.max(3,Math.round(s.unusedDays/MONTH)),set:(s,v)=>{s.unusedDays=Math.round(v*MONTH);}}};
function settingRow(k){
  const d=SETDEF[k], v=d.get(S.settings);
  return `<div class="setting"><span class="lab">${d.label}</span>
    <div class="stepper"><button type="button" class="stepbtn" data-step="${k}" data-d="-1" aria-label="Decrease">&minus;</button>
    <output id="out-${k}" aria-live="polite">${d.unit(v)}</output>
    <button type="button" class="stepbtn" data-step="${k}" data-d="1" aria-label="Increase">+</button></div>
    <div class="presets">${d.presets.map(p=>`<button type="button" class="chip" data-preset="${k}" data-v="${p}" aria-pressed="${p===v}">${d.unit(p)}</button>`).join('')}</div></div>`;
}
function openSettings(){
  openSheet(sheetHead('Settings')+`
   <div class="panel"><div class="li"><div class="txt"><b>${esc(EMAIL||'Signed in')}</b><span>Your closet syncs to your own Supabase project.</span></div><div class="acts"><button class="btn sm" data-act="signout">Sign out</button></div></div>
   ${S.installEvt?'<div class="li"><div class="txt"><b>Install on this device</b><span>Adds Wearcycle to your home screen.</span></div><div class="acts"><button class="btn sm primary" data-act="install">Install</button></div></div>':''}</div>
   <h3>Weather</h3>
   <div class="panel"><div class="li"><div class="txt"><b>${wxOn()?esc(wxSet().label||'Your location'):'Off'}</b><span>${wxOn()?'Outfits follow today\u2019s forecast.':'Outfits ignore the weather.'}</span></div><div class="acts"><button class="btn sm" data-wx="edit">${wxOn()?'Change':'Set up'}</button></div></div></div>
   <h3>Photos</h3>
   <div class="panel"><div class="li"><div class="txt"><b>Crop photos to the clothes</b><span>${(()=>{const n=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&!i.box).length;return n?n+' photo'+(n===1?'':'s')+' show the background. Claude finds each piece and crops around it (one small request per photo).':'All photos are cropped. New photos are cropped when Claude reads them.';})()}</span></div><div class="acts"><button class="btn sm" data-act="cropAll">Crop</button></div></div>
   <div class="li"><div class="txt"><b>Flat-lay cut-outs</b><span>${(()=>{const n=[...S.items.values()].filter(needsCut).length;return n?n+' piece'+(n===1?'':'s')+' without a cut-out. Made on this phone (no AI cost); the first time downloads about 100 MB, then about 20 to 60 seconds per piece.':'Every piece with a photo has a cut-out.';})()}</span></div><div class="acts"><button class="btn sm" data-act="cutAll" ${CUT.busy?'disabled':''}>Make</button></div></div></div>
   <h3>Reminders</h3>
   ${settingRow('checkEvery')}${settingRow('checkDays')}${settingRow('unusedDays')}
   <p class="hint" id="set-status">Changes save automatically.</p>
   <details class="rules"><summary>How Wearcycle decides</summary>
    <p><b>Outfit score.</b> +2 for an all-neutral palette or neutrals plus one accent color, +1 for two analogous or complementary accents, -2 or -3 for accents that compete. +1 when all pieces sit within one dress level, minus a point for each extra level apart. Up to +1.5 for pieces that have rested two weeks, -1 if something was worn yesterday, -2 if the same top and bottom were worn together this week.</p>
    <p><b>Weather.</b> Uses the feels-like temperature from now until 9 pm, shifted by your "I usually feel" choice. Below 12° shorts lose 2 points (3 below 5°); below 16° they lose 1. Below 5° an outfit without an outer layer loses 2; a warm layer earns +1. Above 24° each warm piece loses 2 and an all-light outfit earns +1. With 50%+ rain or snow, a waterproof layer earns +1 and open shoes lose 1.5. In Auto, an outer layer is added below 15° or when it is wet. These thresholds are practical rules of thumb, not standards.</p>
    <p><b>Layered look.</b> Shirts that can be worn open (button-ups, flannels, overshirts, cardigans) are also suggested over a t-shirt, using the t-shirt that scores best. Worn open, the shirt counts as casual (dress level 2 at most) and the t-shirt is left out of the dress-level check. With weather on, the t-shirt adds +0.5 below 16° and costs 1 point above 24°. Which items count is guessed from their names; change it in each item's editor.</p>
    <p><b>Belts.</b> Jeans, chinos, trousers and casual shorts always get a belt if you own one, even one not tagged for the occasion; joggers and athletic wear don't. With leather dress shoes the belt should match them (black with black, brown with brown) and a casual belt is flagged; with sneakers any belt that keeps the colors in harmony. If your only belt doesn't fit the rule it is still shown, with a warning. Change whether a bottom takes a belt in its editor.</p>
    <p><b>Socks.</b> One pair is suggested whenever the outfit has closed shoes. For work and going out: socks the color of the trousers first (it lengthens the leg line), then a shade darker than pale trousers, then socks matching the shoes; white socks with dress shoes are avoided. For casual days, any socks that keep the colors in harmony. Socks don't change an outfit's rank; tap them to swap.</p>
    <p><b>Match label.</b> Excellent (score 4+), Great (3+), Good (2+), Fair (0.5+), Weak. Each warning, shown with a red dot, lowers the label one step. Options are listed from highest score down.</p>
    <p><b>Neutrals.</b> Black, white, grey, navy, beige, khaki, brown, denim and olive pair with anything. This follows common menswear color guidance; it is a convention, not a law.</p>
    <p><b>Condition bars.</b> Work and going out need 4/5, sport and home 3/5, chores 2/5. A casual garment that drops to 3/5 or 2/5 moves to home and chores automatically. 1/5 goes to the donate list.</p>
    <p><b>Shopping targets.</b> Work: 5 tops (one per weekday), 3 bottoms, 2 shoes. Going out, sport and home: 3, 2, 1. Chores: 2, 1, 1. Colors are ranked by how many good combinations a new piece would create with what you own.</p>
   </details>
   <div class="row"><button class="btn sm ghost" data-act="server">Change server settings</button><span class="spacer"></span><span class="hint">Version ${APP_VERSION}</span></div>`);
}
function changeSetting(k,v){
  const d=SETDEF[k]; v=Math.max(d.min,Math.min(d.max,v));
  d.set(S.settings,v);
  const out=$('#out-'+k); if(out) out.textContent=d.unit(v);
  document.querySelectorAll(`[data-preset="${k}"]`).forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===v)));
  saveCache(); renderAll(); queueSettingsSave();
}
let setTimer=null;
function queueSettingsSave(){
  const st=$('#set-status'); if(st) st.textContent='Saving…';
  clearTimeout(setTimer);
  setTimer=setTimeout(async()=>{
    const st2=$('#set-status');
    if(!canWrite()){ if(st2) st2.textContent='Offline: changes will not be saved until you reconnect.'; return; }
    const {error}=await sb.from('settings').upsert({user_id:UID,body:S.settings});
    if(st2) st2.textContent=error?'Could not save: '+error.message:'Saved.';
  },600);
}

/* ---------- weather sheet ---------- */
function openWxSheet(msg){
  const w=wxSet(); const cc=w.cc||((navigator.language||'').split('-')[1]||'CA').toUpperCase();
  const off=w.off||0;
  openSheet(sheetHead('Weather')+`
   <p class="hint">${wxOn()?'Now using: <b>'+esc(w.label||'your location')+'</b>.':'Pick where to check the forecast.'} Outfits use the feels-like temperature and rain chance from now until 9 pm.</p>
   <button class="btn primary" data-wx="gps" style="justify-content:flex-start;padding:14px">Use my current location <span class="hint" style="color:inherit;opacity:.8;margin-left:auto">approximate</span></button>
   <div class="field"><label for="wx-q">Or postal code or city</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="wx-q" value="${esc(w.mode==='place'?w.q||'':'')}" placeholder="e.g. M5V 3L9 or Toronto" autocomplete="postal-code" style="flex:1">
     <select id="wx-cc" aria-label="Country" style="width:auto">${COUNTRIES.map(([k,n])=>`<option value="${k}" ${k===cc?'selected':''}>${k}</option>`).join('')}</select></div>
     <button class="btn" data-wx="lookup">Use this place</button>
     <p class="hint">Canadian postal codes resolve to the first three characters (your neighbourhood area).</p></div>
   ${msg?`<p class="err">${esc(msg)}</p>`:''}
   <div class="field"><span class="lab">Temperature</span><div class="chips"><button class="chip" data-wx="units-C" aria-pressed="${!unitsF()}">°C</button><button class="chip" data-wx="units-F" aria-pressed="${unitsF()}">°F</button></div></div>
   <div class="field"><span class="lab">I usually feel</span><div class="chips" style="flex-wrap:wrap">${[[-3,'The cold'],[0,'Average'],[3,'Warm']].map(([v,l])=>`<button class="chip" data-wx="off${v}" aria-pressed="${off===v}">${l}</button>`).join('')}</div>
     <p class="hint">"The cold" treats the day as 3° colder when choosing layers; "Warm" as 3° warmer.</p></div>
   ${wxOn()?'<button class="btn ghost danger" data-wx="disable">Turn off weather advice</button>':''}
   <p class="hint">Forecast from <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). Postal codes via Zippopotam.us. Saved in your own database: the place name and coordinates rounded to about 1 km. Canadian postal codes keep only the first three characters.</p>`);
}
async function wxAction(k){
  if(k==='edit'){ openWxSheet(); return; }
  if(k==='dismiss'){ saveWx({dismissed:true}); renderOutfits(); toast('Weather advice is off. Turn it on any time in Settings.',4500); return; }
  if(k==='disable'){ saveWx({on:false,dismissed:true}); WXC.data=null; closeSheet(); renderOutfits(); toast('Weather advice turned off.'); return; }
  if(k==='units-C'||k==='units-F'){ saveWx({units:k.slice(-1)}); openWxSheet(); renderOutfits(); return; }
  if(k.startsWith('off')){ saveWx({off:+k.slice(3)}); openWxSheet(); renderOutfits(); return; }
  if(k==='gps'){
    toast('Finding your area…',0);
    try{ const p=await getPosition(); saveWx(Object.assign({on:true,mode:'gps',label:'Your location',dismissed:false},p)); closeSheet(); toast('Checking the forecast…',0); await loadWeather(true); toast(WXC.err||'Outfits now follow today’s weather.'); }
    catch(e){ toast(''); $('#toastRoot').innerHTML=''; openWxSheet(e.friendly||'Location failed.'); }
    return;
  }
  if(k==='lookup'){
    const q=$('#wx-q')?.value||'', cc=$('#wx-cc')?.value||'CA';
    if(!q.trim()){ openWxSheet('Type a postal code or a city.'); return; }
    if(!S.online){ openWxSheet('You are offline.'); return; }
    toast('Looking it up…',0); const g=await geocode(q,cc); $('#toastRoot').innerHTML='';
    if(!g){ openWxSheet('Could not find "'+q.trim()+'" in '+cc+'. Try the city name instead.'); return; }
    saveWx({on:true,mode:'place',q:cc==='CA'&&/\d/.test(q)?q.replace(/\s/g,'').slice(0,3).toUpperCase():q.trim(),cc,lat:r2(g.lat),lon:r2(g.lon),label:g.label,dismissed:false}); closeSheet();
    toast('Checking the forecast…',0); await loadWeather(true); toast(WXC.err||'Using '+g.label+'.'); return;
  }
}
async function photoBlob(path){ const {data,error}=await sb.storage.from('photos').download(path); if(error||!data) throw {friendly:'Could not load the photo.'}; return data; }
async function aiBox(blob){ return callClaude('box',{image:await blobToBase64(await shrink(blob,768))}); }
async function cropAll(){
  if(S.busy) return; if(!canWrite()){ toast('You are offline.'); return; }
  const list=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&!i.box); if(!list.length){ toast('All photos are already cropped.'); return; }
  closeSheet(); S.busy=true; let n=0, miss=0;
  for(const it of list){
    toast('Cropping '+(n+miss+1)+' of '+list.length+'…',0);
    try{ const blob=await photoBlob(it.photo); const r=await aiBox(blob); const tmp={}; if(r&&await applyBox(tmp,blob,r.box)){ if(await patchItem(it.id,{thumb:tmp.thumb,box:tmp.box})) n++; else miss++; } else miss++; }
    catch(e){ S.busy=false; toast(aiMsg(e)+(n?' Cropped '+n+' so far.':''),7000); return; }
  }
  S.busy=false; S.fitKey=''; renderAll(); toast('Cropped '+n+' photo'+(n===1?'':'s')+'.'+(miss?' '+miss+' could not be read; open them to crop by hand or leave them.':''),6000);
}

/* ---------- actions ---------- */
async function logWear(list,day,occ){
  const ids=list.map(x=>x.id); const real=ids.filter(id=>!String(id).startsWith('ex-'));
  if(real.length&&!canWrite()){ toast('You are offline. Logging needs a connection.'); return false; }
  for(const it of list){ await patchItem(it.id,{worn:(it.worn||0)+1,lastWorn:(it.lastWorn&&it.lastWorn>day)?it.lastWorn:day,wearsSinceCheck:(it.wearsSinceCheck||0)+1}); }
  const entry={date:day,occ,items:ids};
  if(!real.length) S.exLog.unshift(entry);
  else { const {error}=await sb.from('wears').insert(entry); if(error){ toast('Could not log the outfit: '+error.message,4500); return false; } S.log.unshift(entry); saveCache(); }
  S.fitKey=fitKeyNow(); renderAll(); return true;
}
async function wear(i){
  const f=S.fits[i]; if(!f||f.worn) return;
  const o=hydrate(f.ids); f.worn=true; renderOutfits();
  if(await logWear(coreOf(o).concat(o.acc),todayISO(),S.occ)) toast('Logged as worn today'); else f.worn=false;
}
/* Log any combination: starts from the outfit on screen, then pick or unpick pieces from the closet. */
let LG=null;
function yesterdayISO(){ const d=new Date(Date.now()-DAY); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function openLog(){
  const f=S.fits[S.sel]; const o=f?hydrate(f.ids):null;
  LG={day:todayISO(),occ:S.occ,sel:new Set(o?coreOf(o).concat(o.acc).map(x=>x.id):[])}; LG.first=new Set(LG.sel); drawLog();
}
function drawLog(){
  const items=allItems().filter(isActive); const groups=CATS.map(c=>[c,items.filter(i=>i.cat===c.id)]).filter(([c,l])=>l.length);
  openSheet(sheetHead('What I wore')+`
   <p class="hint">Starts with the outfit on screen. Tap pieces to add or remove them, then log.</p>
   <div class="field"><span class="lab">Day</span><div class="chips"><button class="chip" data-lgday="${todayISO()}" aria-pressed="${LG.day===todayISO()}">Today</button><button class="chip" data-lgday="${yesterdayISO()}" aria-pressed="${LG.day===yesterdayISO()}">Yesterday</button></div></div>
   <div class="field"><span class="lab">Occasion</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.map(o=>`<button class="chip" data-lgocc="${o.id}" aria-pressed="${LG.occ===o.id}">${o.label}</button>`).join('')}</div></div>
   ${groups.map(([c,l])=>`<div class="field"><span class="lab">${esc(c.label)}</span><div class="pickrow">${l.slice().sort((a,b)=>(LG.first.has(b.id)?1:0)-(LG.first.has(a.id)?1:0)).map(it=>`<button class="pick" data-lgit="${esc(it.id)}" aria-pressed="${LG.sel.has(it.id)}" aria-label="${esc(it.name)}"><span class="mini">${visual(it)}</span><span class="pn">${esc(it.name)}</span></button>`).join('')}</div></div>`).join('')}
   <div class="row sheet-actions"><button class="btn primary" data-lgsave ${LG.sel.size?'':'disabled'}>Log ${LG.sel.size} piece${LG.sel.size===1?'':'s'}</button><button class="btn ghost" data-close>Cancel</button></div>`);
}
async function saveLog(){
  const list=[...LG.sel].map(byId).filter(Boolean); if(!list.length) return;
  const day=LG.day, occ=LG.occ; closeSheet();
  if(await logWear(list,day,occ)) toast('Logged '+list.length+' piece'+(list.length===1?'':'s')+' for '+(day===todayISO()?'today':'yesterday')+'.');
}
function todayLine(){
  const es=allLog().filter(e=>e.date===todayISO()); if(!es.length) return '';
  const names=[...new Set(es.flatMap(e=>e.items))].map(byId).filter(Boolean).filter(i=>!ACCESSORY.includes(i.cat)).map(i=>i.name);
  return `<p class="hint today">Logged today: ${esc(names.join(', ')||es.length+' outfit')}</p>`;
}
function swap(i,slot){
  const f=S.fits[i]; if(!f) return; const o=hydrate(f.ids);
  if(slot.startsWith('acc')){
    const k=+slot.slice(3); const cur=o.acc[k]; if(!cur) return;
    const opts=cur.cat==='belt'?beltPool(allItems(),S.occ):eligible(allItems(),S.occ).filter(x=>x.cat===cur.cat); if(opts.length<2){ toast('No other '+CAT[cur.cat].label.toLowerCase()+' for this occasion.'); return; }
    o.acc[k]=opts[(opts.findIndex(x=>x.id===cur.id)+1)%opts.length];
  } else {
    const cands=swapCandidates(o,slot,allItems(),S.occ,ctx()); const cur=o[slot];
    if(slot==='under'){ const k=cands.findIndex(x=>x.id===cur.id); if(k<0||k===cands.length-1){ delete o.under; toast('Worn without a t-shirt underneath. Tap + to add one back.'); } else o.under=cands[k+1];
      const r=scoreOutfit(o,S.occ,ctx()); S.fits[i]={ids:idsOf(o),score:r.score,reasons:r.reasons,rank:f.rank,edited:true}; renderOutfits(); return; }
    if(cands.length<2){ toast('No other '+CAT[slot==='outer'?'outerwear':slot].label.toLowerCase()+' for this occasion.'); return; }
    o[slot]=cands[(cands.findIndex(x=>x.id===cur.id)+1)%cands.length];
  }
  const r=scoreOutfit(o,S.occ,ctx()); S.fits[i]={ids:idsOf(o),score:r.score,reasons:r.reasons,rank:f.rank,edited:true}; renderOutfits();
}
function loadExamples(){
  const d=n=>new Date(Date.now()-n*DAY).toISOString().slice(0,10);
  const mk=(id,name,cat,colors,formality,occ,cond,lw,extra)=>Object.assign({id:'ex-'+id,name,cat,colors,formality,occ,cond,lastWorn:lw==null?undefined:d(lw),created:d(400),lastCheck:d(60),worn:12,wearsSinceCheck:4,status:'active'},extra||{});
  S.examples=[
    mk(1,'White oxford shirt','top',['white'],3,['work','out'],5,6), mk(2,'Light blue shirt','top',['lightblue'],3,['work'],4,2),
    mk(3,'Navy polo','top',['navy'],2,['work','out'],4,9), mk(4,'Burgundy knit','top',['burgundy'],3,['out','work'],5,20),
    mk(5,'Grey tee','top',['grey'],1,['home','sport'],3,1), mk(6,'Khaki chinos','bottom',['khaki'],3,['work','out'],4,3),
    mk(7,'Navy trousers','bottom',['navy'],3,['work'],5,8), mk(8,'Dark jeans','bottom',['denim'],2,['out'],4,5),
    mk(9,'Black joggers','bottom',['black'],1,['sport','home'],4,4), mk(10,'Brown leather shoes','shoes',['brown'],3,['work','out'],4,3),
    mk(11,'White sneakers','shoes',['white'],2,['out','work'],4,5), mk(12,'Running shoes','shoes',['grey','orange'],1,['sport'],3,4,{wearsSinceCheck:31}),
    mk(13,'Brown belt','belt',['brown'],3,['work','out'],4,3), mk(27,'Black leather belt','belt',['black'],3,['work'],5,9), mk(14,'Steel watch','watch',['grey'],3,['work','out'],5,1),
    mk(15,'Navy blazer','outerwear',['navy'],4,['work','out'],5,12), mk(16,'Old work jeans','bottom',['denim'],1,['chores'],2,30),
    mk(17,'Stained paint tee','top',['white'],1,['chores'],1,40), mk(18,'Green rain jacket','outerwear',['green'],2,['out','chores'],3,90,{lastCheck:d(250)}),
    mk(19,'Teal swim shorts','bottom',['teal'],1,['sport'],4,420), mk(20,'Plaid button-up shirt','top',['red','navy'],2,['out'],5,10),
    mk(21,'White t-shirt','top',['white'],1,['out','home'],5,7), mk(22,'Black t-shirt','top',['black'],1,['out','home'],4,4),
    mk(23,'Navy dress socks','socks',['navy'],3,['work','out'],4,3), mk(24,'Brown dress socks','socks',['brown'],3,['work','out'],4,6),
    mk(25,'White athletic socks','socks',['white'],1,['sport','home','chores'],3,2), mk(26,'Burgundy patterned socks','socks',['burgundy','navy'],2,['out'],5,15)];
  renderAll(); toast('Example closet loaded. It is not saved.');
}
async function confirmAll(){
  if(S.busy) return;
  if(!canWrite()){ toast('You are offline. Changes need a connection.'); return; }
  const list=allItems().filter(i=>i.review && isActive(i));
  const ready=list.filter(i=>(i.colors||[]).length && i.name);
  const skipped=list.length-ready.length;
  S.busy=true; renderCloset(); let n=0;
  for(const it of ready){ toast('Confirming '+(n+1)+' of '+ready.length+'…',0); if(await patchItem(it.id,{review:false})) n++; }
  S.busy=false; renderAll();
  toast('Confirmed '+n+' item'+(n===1?'':'s')+'.'+(skipped?' '+skipped+' still need a color or name; open them to finish.':''),6000);
}
function goTab(tab){
  S.tab=tab; if(tab!=='outfits') guard();
  for(const b of document.querySelectorAll('nav.tabs button')){ if(b.dataset.tab===tab) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }
  for(const s of document.querySelectorAll('section.tab')) s.hidden=s.id!=='tab-'+tab;
  renderStatus(); window.scrollTo(0,0);
}

document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-scrim]'); if(!t) return;
  if(Date.now()-swiped<400 && t.closest('[data-swipe]')) return;
  const ds=t.dataset;
  // camera overlay
  if(ds.cam){
    if(ds.cam==='shoot') shoot();
    else if(ds.cam==='done') closeCamera(CAM.shots);
    else if(ds.cam==='cancel') closeCamera(CAM.mode==='batch'?CAM.shots:[]);
    else if(ds.cam==='flip'){ CAM.facing=CAM.facing==='environment'?'user':'environment'; startStream(); }
    else if(ds.cam==='gallery'){ const mode=CAM.mode; closeCamera(CAM.shots); const files=await pickFiles(mode==='batch'); if(mode==='batch') addPhotos(files); else if(files[0]) (ED?editorSetPhoto:checkSetPhoto)(files[0]); }
    return;
  }
  if(ds.scrim && e.target===t){ closeSheet(); return; }
  if(ds.close!==undefined){ closeSheet(); return; }
  if(ds.tab){ goTab(ds.tab); return; }
  if(ds.tabGo){ goTab(ds.tabGo); return; }
  if(ds.occ){ S.occ=ds.occ; S.seed=0; renderOutfits(); return; }
  if(t.id==='shuffleBtn'){ S.seed=(Date.now()%100000)+1; S.fitKey=''; renderOutfits(); toast('New combinations, still ranked best first.'); return; }
  if(ds.view){ S.view=ds.view; LS.set('wearcycle.view',S.view); renderOutfits(); return; }
  if(ds.layer){ S.layerMode=ds.layer; renderOutfits(); return; }
  if(ds.sel!==undefined){ S.sel=+ds.sel; if(S.sel) guard(); renderOutfits(); document.querySelector('.fit.hero')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(ds.addunder!==undefined){ const f=S.fits[+ds.addunder]; if(!f) return; const o=hydrate(f.ids); const c=swapCandidates(o,'under',allItems(),S.occ,ctx()); if(!c.length) return;
    o.under=c[0]; const r=scoreOutfit(o,S.occ,ctx()); S.fits[+ds.addunder]={ids:idsOf(o),score:r.score,reasons:r.reasons,rank:f.rank,edited:true}; renderOutfits(); return; }
  if(ds.next){ S.sel=(S.sel+1)%S.fits.length; if(S.sel) guard(); renderOutfits(); return; }
  if(ds.wx){ wxAction(ds.wx); return; }
  if(t.id==='addBtn'){ if(S.busy) toast('Still adding the last batch…'); else openAddMenu(); return; }
  if(t.id==='rulesBtn'){ openSettings(); return; }
  switch(ds.act){
    case 'camBatch': { closeSheet(); if(S.busy) return; const shots=await openCamera('batch'); addPhotos(shots); return; }
    case 'bulk': { closeSheet(); if(S.busy) return; const files=await pickFiles(true); addPhotos(files); return; }
    case 'add': closeSheet(); openEditor(null); return;
    case 'examples': loadExamples(); return;
    case 'confirmAll': confirmAll(); return;
    case 'clearEx': S.examples=[]; S.exLog=[]; renderAll(); return;
    case 'ideas': askIdeas(); return;
    case 'cropAll': cropAll(); return;
    case 'logOther': openLog(); return;
    case 'cutOutfit': { const f=S.fits[S.sel]; if(!f) return; const o=hydrate(f.ids); makeCuts(coreOf(o).concat(o.acc)); return; }
    case 'cutAll': makeCuts([...S.items.values()]); return;
    case 'install': if(S.installEvt){ const ev=S.installEvt; S.installEvt=null; closeSheet(); renderStatus(); ev.prompt(); let out='';
      try{ out=(await ev.userChoice).outcome; }catch(err){}
      if(out==='accepted') toast('Installing Wearcycle. The icon appears on your home screen in a few seconds.',6000);
      else toast('Not installed. You can install any time from Chrome\u2019s menu: Install app or Add to Home screen.',6000); }
    else toast('To install, open Chrome\u2019s menu and choose Install app or Add to Home screen.',6000);
    return;
    case 'installNo': LS.set('wardrobe.installDismissed',true); renderStatus(); return;
    case 'signout': closeSheet(); await sb.auth.signOut(); return;
    case 'server': closeSheet(); showSetup(true); return;
  }
  if(LG && $('#sheetRoot').innerHTML){
    if(ds.lgday){ LG.day=ds.lgday; drawLog(); return; }
    if(ds.lgocc){ LG.occ=ds.lgocc; drawLog(); return; }
    if(ds.lgit){ const sc=document.querySelector('.sheet')?.scrollTop||0; LG.sel.has(ds.lgit)?LG.sel.delete(ds.lgit):LG.sel.add(ds.lgit); drawLog(); const sh=document.querySelector('.sheet'); if(sh) sh.scrollTop=sc; return; }
    if(ds.lgsave!==undefined){ saveLog(); return; }
  }
  if(ds.cat){ S.cat=ds.cat; renderCloset(); return; }
  if(ds.edit){ closeSheet(); openEditor(ds.edit); return; }
  if(ds.wear){ wear(+ds.wear); return; }
  if(ds.swap!==undefined){ swap(+ds.swap,ds.slot); return; }
  if(ds.donate){ if(await patchItem(ds.donate,{status:'donated',donatedOn:todayISO()})) toast('Marked as donated'); return; }
  if(ds.restore){ if(await patchItem(ds.restore,{status:'active'})) toast('Back in your closet'); return; }
  if(ds.check){ openCheck(ds.check); return; }
  if(ds.step){ changeSetting(ds.step, SETDEF[ds.step].get(S.settings)+(+ds.d)*SETDEF[ds.step].step); return; }
  if(ds.preset){ changeSetting(ds.preset,+ds.v); return; }
  if(ED){
    if(ds.color){ readEditorFields(); const c=ED.it.colors=(ED.it.colors||[]).slice(); const ix=c.indexOf(ds.color); if(ix>=0) c.splice(ix,1); else if(c.length<3) c.push(ds.color); else toast('Up to three colors.'); drawEditor(); return; }
    if(ds.seg){ readEditorFields(); ED.it[ds.seg]=+ds.v; drawEditor(); return; }
    if(ds.isnew){ readEditorFields(); ED.it.cond=5; ED.it.bought=todayISO().slice(0,7); drawEditor(); toast('Set to Like new, bought '+ED.it.bought+'.'); return; }
    if(ds.occt){ readEditorFields(); const o=ED.it.occ=(ED.it.occ||[]).slice(); const ix=o.indexOf(ds.occt); if(ix>=0) o.splice(ix,1); else o.push(ds.occt); drawEditor(); return; }
    if(ds.photo){ readEditorFields(); if(ds.photo==='cam'){ const [b]=await openCamera('single'); if(b) editorSetPhoto(b); } else { const [f]=await pickFiles(false); if(f) editorSetPhoto(f); } return; }
    if(ds.ai==='tag'){ readEditorFields(); ED.busy=true; ED.ai=null; drawEditor();
      try{ const res=await aiTag(ED.blob); if(!ED) return;
        if(res&&res.error) ED.ai=`<span class="k">Claude</span><div>${esc(res.error)}</div>`;
        else if(res){ applyAi(ED.it,res); if(validBox(res.box)){ try{ ED.thumb=await cropThumb(ED.blob,res.box); ED.newBox=res.box.map(v=>Math.round(v*1000)/1000); ED.cropChanged=true; }catch(e){} } ED.ai=`<span class="k">Filled in by Claude · ${esc(res.confidence||'')} confidence</span><div>Check each field below before saving.</div>${(res.issues||[]).length?`<ul>${res.issues.slice(0,6).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`; }
      }catch(err){ if(ED) ED.ai=`<span class="k">Claude</span><div>${esc(aiMsg(err))}</div>`; }
      if(ED){ ED.busy=false; drawEditor(); } return; }
    if(ds.ai==='box'){ readEditorFields(); ED.busy=true; drawEditor();
      try{ const blob=ED.blob||await photoBlob(ED.it.photo); const r=await aiBox(blob); if(!ED) return;
        if(r&&validBox(r.box)){ ED.thumb=await cropThumb(blob,r.box); ED.newBox=r.box.map(v=>Math.round(v*1000)/1000); ED.cropChanged=true; toast('Cropped. Save to keep it.'); }
        else toast('Claude could not find the item in this photo.'); }
      catch(err){ toast(aiMsg(err),5000); }
      if(ED){ ED.busy=false; drawEditor(); } return; }
    if(ds.uncrop){ readEditorFields(); ED.busy=true; drawEditor();
      try{ const blob=ED.blob||await photoBlob(ED.it.photo); const p=await prepare(blob); if(!ED) return; ED.thumb=p.thumb; ED.newBox=null; ED.cropChanged=true; toast('Whole photo. Save to keep it.'); }
      catch(err){ toast(aiMsg(err)); }
      if(ED){ ED.busy=false; drawEditor(); } return; }
    if(ds.save!==undefined){ saveEditor(); return; }
    if(ds.del!==undefined){ if(!ED.confirmDel){ readEditorFields(); ED.confirmDel=true; drawEditor(); return; } deleteItem(); return; }
  }
  if(CK){
    if(ds.cphoto){ CK.usePhoto=!!$('#ck-use')?.checked; if(ds.cphoto==='cam'){ const [b]=await openCamera('single'); if(b) checkSetPhoto(b); } else { const [f]=await pickFiles(false); if(f) checkSetPhoto(f); } return; }
    if(ds.ai==='check'){ CK.busy=true; CK.err=''; drawCheck();
      try{ const r=await aiCheck(CK.blob,byId(CK.id)); if(!CK) return;
        if(r&&r.condition>=1&&r.condition<=5){ r.condition=Math.round(r.condition); CK.res=r; CK.cond=r.condition; } else CK.err='The assessment came back incomplete. Try another photo.'; }
      catch(err){ if(CK) CK.err=aiMsg(err); }
      if(CK){ CK.busy=false; drawCheck(); } return; }
    if(ds.ckc){ CK.usePhoto=!!$('#ck-use')?.checked; CK.cond=+ds.ckc; drawCheck(); return; }
    if(ds.cksave!==undefined){ saveCheck(); return; }
  }
});
let SW0=null;
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('[data-swipe]'); SW0=b?{x:e.clientX,y:e.clientY,t:Date.now()}:null; },{passive:true});
document.addEventListener('pointerup',e=>{ if(!SW0) return; const dx=e.clientX-SW0.x, dy=e.clientY-SW0.y; const quick=Date.now()-SW0.t<700; SW0=null;
  if(quick&&Math.abs(dx)>60&&Math.abs(dy)<50&&S.fits.length>1){ S.sel=(S.sel+(dx<0?1:S.fits.length-1))%S.fits.length; if(S.sel) guard(); swiped=Date.now(); renderOutfits(); } },{passive:true});
let swiped=0;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(CAM.resolve) closeCamera(CAM.mode==='batch'?CAM.shots:[]); else if($('#sheetRoot').innerHTML) closeSheet(); } });
window.addEventListener('online',()=>{ S.online=true; renderAll(); if(sb&&UID) loadRemote(); });
window.addEventListener('offline',()=>{ S.online=false; renderAll(); });
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); S.installEvt=e; if(UID) renderStatus(); });
window.addEventListener('appinstalled',()=>{ S.installEvt=null; if(UID){ renderStatus(); toast('Wearcycle is installed. Open it from its home-screen icon.',6000); } });

/* ---------- setup and sign-in screens ---------- */
function showGate(html){ $('#appRoot').hidden=true; const g=$('#gate'); g.hidden=false; g.innerHTML=`<div class="brandrow"><img class="logo" src="icons/logo-icon.svg" alt="" width="52" height="52"><div class="brand">Wearcycle<small>WEAR · CARE · DONATE · BUY</small></div></div>`+html; }
function showSetup(again){
  showGate(`<div class="card2"><h3>Connect your database</h3>
    <p class="hint">Paste the two values from your Supabase project (Project Settings, then API Keys). Both are safe to keep on this device. Never paste a secret key here.</p>
    <div class="field"><label for="g-url">Project URL</label><input type="url" id="g-url" placeholder="https://xxxx.supabase.co" value="${esc(CFG.url)}" autocomplete="off"></div>
    <div class="field"><label for="g-key">Publishable key</label><input type="text" id="g-key" placeholder="sb_publishable_…" value="${esc(CFG.key)}" autocomplete="off"></div>
    <p class="err" id="g-err"></p>
    <div class="row"><button class="btn primary" id="g-save">Connect</button>${again?'<button class="btn ghost" id="g-back">Back</button>':''}</div></div>`);
  $('#g-save').onclick=()=>{
    const url=$('#g-url').value.trim().replace(/\/+$/,''), key=$('#g-key').value.trim();
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)){ $('#g-err').textContent='The URL should look like https://xxxx.supabase.co'; return; }
    if(/^sb_secret_/.test(key)||/service_role/.test(atobSafe(key))){ $('#g-err').textContent='That is a secret key. Use the publishable key instead, and keep the secret one private.'; return; }
    if(key.length<20){ $('#g-err').textContent='Paste the full publishable key.'; return; }
    LS.set('wardrobe.server',{url,key}); location.reload();
  };
  if(again) $('#g-back').onclick=()=>location.reload();
}
function atobSafe(k){ try{ return atob(k.split('.')[1]||''); }catch(e){ return ''; } }
function showLogin(msg){
  showGate(`<div class="card2"><h3>Sign in</h3>
    <div class="field"><label for="g-email">Email</label><input type="email" id="g-email" autocomplete="email"></div>
    <div class="field"><label for="g-pass">Password</label><input type="password" id="g-pass" autocomplete="current-password" minlength="8"></div>
    <p class="err" id="g-err">${esc(msg||'')}</p>
    <div class="row"><button class="btn primary" id="g-in">Sign in</button><button class="btn ghost" id="g-up">Create account</button></div>
    <p class="hint">Create your account once. After that, turn off new sign-ups in Supabase so nobody else can register (setup guide, step 6).</p></div>
    <button class="btn ghost sm" id="g-server" style="align-self:flex-start">Change server settings</button><p class="hint">Wearcycle v${APP_VERSION}</p>`);
  const creds=()=>({email:$('#g-email').value.trim(),password:$('#g-pass').value});
  $('#g-in').onclick=async()=>{ const c=creds(); if(!c.email||!c.password){ $('#g-err').textContent='Enter your email and password.'; return; }
    $('#g-in').disabled=true; const {error}=await sb.auth.signInWithPassword(c); $('#g-in').disabled=false;
    if(error) $('#g-err').textContent=error.message==='Invalid login credentials'?'Email or password is wrong.':error.message; };
  $('#g-up').onclick=async()=>{ const c=creds(); if(!c.email||c.password.length<8){ $('#g-err').textContent='Enter an email and a password of at least 8 characters.'; return; }
    $('#g-up').disabled=true; const {data,error}=await sb.auth.signUp({email:c.email,password:c.password,options:{emailRedirectTo:location.origin+location.pathname}}); $('#g-up').disabled=false;
    if(error){ $('#g-err').textContent=error.message; return; }
    if(!data.session) $('#g-err').textContent='Account created. Open the confirmation email, tap the link, then sign in here.'; };
  $('#g-server').onclick=()=>showSetup(true);
}
function startApp(session){
  if(UID===session.user.id) return;
  UID=session.user.id; EMAIL=session.user.email||'';
  $('#gate').hidden=true; $('#appRoot').hidden=false;
  loadCache(); renderAll(); loadWeather();
  if(S.online) loadRemote(); else renderAll();
}
async function boot(){
  if(!CFG.url||!CFG.key||!window.supabase){ showSetup(false); return; }
  sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((event,session)=>{
    if(session&&session.user) setTimeout(()=>startApp(session),0);
    else if(event==='SIGNED_OUT'){ if(UID) LS.del(cacheKey()); UID=null; S.items=new Map(); S.log=[]; S.loaded=false; showLogin(); }
  });
  const {data}=await sb.auth.getSession();
  if(data&&data.session) startApp(data.session); else showLogin();
}
boot();
