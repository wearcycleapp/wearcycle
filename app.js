/* Wearcycle app: UI, camera, Supabase storage and Claude calls. Pure scoring rules live in logic.js. */
'use strict';
const APP_VERSION='1.37.0';
const {PALETTES,CATS,CAT,ACCESSORY,GARMENT,OCCASIONS,OCC,COND,FORM,COLORS,DAY,
  daysSince,notPicked,isActive,primary,effectiveOccasions,eligible,coreOf,scoreOutfit,makeRng,suggest,swapCandidates,careFlags,gaps,
  warmthOf,rainReady,wxFeel,wxWet,needsLayer,needsBase,layeredOver,SEASONS,seasonPlan,seasonChecklist,seasonRotation,HOLIDAYS,upcomingHolidays,STYLES,STYLE_IDS,setDept,styleDesc,pieceStyles,learnStyles,essentials,canOpen,canUnder,needsBelt,beltPool,washEvery,NOWASH,repairOk,REPAIR_OCC,DRESS_CODES,setDressCode,workOk,formalOk}=WardrobeLogic;

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
const S={items:new Map(),examples:[],log:[],exLog:[],settings:{checkEvery:30,checkDays:365,unusedDays:730,wx:{on:false}},
  occ:'work',layerMode:'auto',sel:0,view:(LS.get('wearcycle.view')||'board'),fits:[],fitKey:'',seed:Date.now()%100000,cat:'all',tab:'outfits',
  loaded:false,online:navigator.onLine,fromCache:false,busy:false,installEvt:null};
function allItems(){ return [...S.items.values(),...S.examples]; }
function allLog(){ return S.log.concat(S.exLog); }
function byId(id){ return S.items.get(id)||S.examples.find(e=>e.id===id); }
function ctx(){ return {now:Date.now(),log:allLog(),wx:wxForScore(),palette:S.settings.palette||'any',style:styleTarget(S.occ),theme:themeNow()}; }
/* ---------- seasons and holidays ---------- */
// Country for country-specific holidays: the weather place's country, else the phone's time zone, else the language region.
const CA_TZ=/^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Regina|Halifax|St_Johns|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Fort_Nelson|Creston|Iqaluit|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Yellowknife|Swift_Current|Atikokan|Blanc-Sablon|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$/;
function region(){ const w=wxSet(); if(w.on&&w.cc) return String(w.cc).toUpperCase();
  let tz=''; try{ tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){}
  if(CA_TZ.test(tz)) return 'CA'; if(/^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Boise|Indiana|Kentucky)|Pacific\/Honolulu)/.test(tz)) return 'US';
  return (((navigator.language||'').split('-')[1])||'').toUpperCase(); }
function holidaysOff(){ return S.settings.holidaysOff||[]; }
function holidaysSoon(days){ return upcomingHolidays(Date.now(),days,region(),holidaysOff()); }
function themeNow(){ if(!S.theme) return null; const h=holidaysSoon(30).find(x=>x.id===S.theme); return h?{label:h.label,colors:h.colors,formality:h.formality}:null; }
function fmtDay(iso){ return new Date(iso+'T12:00').toLocaleDateString(I18N.locale,{month:'long',day:'numeric'}); }
function whenLabel(n){ return n===0?'Today':n===1?'Tomorrow':'In '+n+' days'; }
function miniBoard(o){ const cells=flCells(o).map(c=>`<span class="fl ${c.small?'small':''} ${c.it.cut?'iscut':''}" style="left:${c.x}%;top:${c.y}%;width:${c.w}%;height:${c.h}%">${flVisual(c.it)}</span>`).join('');
  return `<span class="flatlay mini">${cells}</span>`; }
function comingUp(items){
  const out=[]; const w=wxSet(); const plan=seasonPlan(Date.now(),wxOn()?w.lat:NaN);
  if(plan){ const se=SEASONS[plan.id]; const list=seasonChecklist(plan.id,items); const ok=list.filter(x=>x.have.length>=x.need).length;
    const rot=seasonRotation(plan.id,items,Date.now());
    const prev=['work','out'].map(occ=>{ const c=Object.assign(ctx(),{wx:se.wx,style:styleTarget(occ),theme:null}); const r=suggest(items,occ,c,{n:1,layer:true}); const f=r.outfits[0];
      return f?`<div class="seaprev">${miniBoard(f.o)}<span>${OCC[occ].label}</span></div>`:''; }).join('');
    out.push(`<div><h3 style="margin:0">${plan.upcoming?'Coming up: '+se.label:se.label}</h3><p class="hint" style="margin:4px 0 0">${plan.upcoming?'Starts '+fmtDay(plan.start)+'. ':''}${se.desc}</p></div>
     <div class="panel"><div class="panel-h"><h3>${'Ready for '+se.label.toLowerCase()+'?'}</h3><span class="count">${ok} of ${list.length}</span></div>
      ${list.map(x=>{ const done=x.have.length>=x.need; const inner=`<span class="mark">${done?'✓':'+'}</span><div class="txt"><b>${x.label}</b><span>${x.have.length} of ${x.need}</span><span data-notr>${x.have.length?' · ':''}${esc(x.have.slice(0,3).map(i=>i.name).join(', '))}</span></div>`;
        return done?`<div class="li ess have">${inner}</div>`:`<a class="li lirow ess shop" href="${shopUrl(shopQ(x.label))}" target="_blank" rel="noopener">${inner}${SHOP_GO}</a>`; }).join('')}
      ${prev?`<div class="li"><div class="txt"><b>${'What you would wear on a '+se.label.toLowerCase()+' day'}</b><div class="seaprevs">${prev}</div></div></div>`:''}
      ${rot.bringOut.length?`<div class="li"><div class="txt"><b>Bring these out</b><span data-notr>${esc(rot.bringOut.slice(0,8).map(i=>i.name).join(', '))}</span></div></div>`:''}
      ${rot.store.length?`<div class="li"><div class="txt"><b>Can go into storage</b><span data-notr>${esc(rot.store.slice(0,8).map(i=>i.name).join(', '))}</span></div></div>`:''}
     </div>`); }
  const hs=holidaysSoon(30);
  if(hs.length){ out.push(`<div class="panel"><div class="panel-h"><h3>Holidays coming up</h3><span class="count">${hs.length}</span></div>
    ${hs.map(h=>{ const own=h.colors.map(c=>[c,items.filter(i=>isActive(i)&&primary(i)===c).length]);
      return `<div class="li hol"><span class="sws">${h.colors.slice(0,4).map(c=>`<span class="sw" style="background:${COLORS[c].hex}"></span>`).join('')}</span><div class="txt"><b>${h.label} · ${fmtDay(h.date)}</b><span>${h.tip}</span><span>${'You own: '+own.map(([c,n])=>I18N.t(c)+' '+n).join(' · ')}</span></div><div class="acts"><button class="btn sm" data-theme-go="${h.id}">See outfits</button></div></div>`; }).join('')}</div>`); }
  return out.join('');
}
/* ---------- styles ----------
   Picked styles (up to three, plus looks learned from photos) guide Work and Going out; Work can have its own.
   With nothing picked, the style is learned from what was worn (5+ logged outfits in 120 days), at half weight.
   Sport, home, chores and formal follow their own rules, so no style target applies there. */
const STYLE_OCC=['work','out'];
function styleSet(){ const st=S.settings.style||(S.settings.style={pick:[],work:[]}); st.pick=st.pick||[]; if(!Array.isArray(st.work)) st.work=st.work?[st.work]:[]; return st; }
function looks(){ return S.settings.looks||(S.settings.looks=[]); }
function styleName(k){ return STYLES[k]?STYLES[k].label:(looks().find(l=>l.id===k)||{}).label||''; }
function learned(){ return learnStyles(allItems().filter(isActive),allLog(),Date.now()); }
function targetOf(keys,weight,isLearned){ const ids=keys.filter(k=>STYLES[k]), lk=looks().filter(l=>keys.includes(l.id));
  if(!ids.length&&!lk.length) return null; return {ids,looks:lk,weight,learned:!!isLearned,label:styleName(keys[0])}; }
function styleTarget(occ){
  if(!STYLE_OCC.includes(occ)) return null;
  const today=dayStyles(occ);
  if(today.length>=2&&S.styleToday==='rotate'){ const k=rotateStyle(); if(k) return targetOf([k],2); }
  if(today.length>=2&&S.styleToday&&today.includes(S.styleToday)) return targetOf([S.styleToday],2);
  const st=styleSet(); const keys=occ==='work'&&st.work.length?st.work:st.pick;
  if(keys.length) return targetOf(keys,1);
  const l=learned(); return l.ids.length?targetOf(l.ids,0.5,true):null;
}
// Rotate: a different style each day. Candidates are your picked styles (2+), otherwise styles you own 3+ pieces of.
// Picks the one worn least in the last 6 days (by each logged outfit's main style); ties follow the date.
function dayStyles(occ){ const st=styleSet(); const list=(occ||S.occ)==='work'&&st.work.length?st.work:st.pick;
  return list.filter(k=>STYLES[k]||looks().some(l=>l.id===k)); }
function rotateCands(){ return dayStyles(); }
function rotateStyle(){
  const c=rotateCands(); if(!c.length) return null; const now=Date.now(), used={};
  for(const e of allLog()){ if(WardrobeLogic.daysSince(e.date,now)>6) continue; const cnt={};
    for(const id of e.items||[]){ const it=byId(id); if(!it||!['top','bottom','onepiece','outerwear','shoes'].includes(it.cat)) continue;
      for(const k of c) if(STYLES[k]?pieceStyles(it).includes(k):WardrobeLogic.lookMatch(it,looks().find(l=>l.id===k)||{})) cnt[k]=(cnt[k]||0)+1; }
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]; if(top) used[top[0]]=(used[top[0]]||0)+1; }
  const day=Math.floor(now/864e5);
  return c.map((k,i)=>[k,used[k]||0,(i-day%c.length+c.length)%c.length]).sort((a,b)=>a[1]-b[1]||a[2]-b[2])[0][0];
}
function setStyleToday(k){ S.styleToday=k||undefined; LS.set('wearcycle.styleDay',{day:todayISO(),k:k||''}); S.fitKey=''; renderOutfits(); }
function renderStyleChips(){
  const box=$('#styleChips'); if(!box) return; const hint=$('#styleHint');
  const keys=STYLE_OCC.includes(S.occ)?dayStyles():[];
  if(keys.length<2){ box.hidden=true; box.innerHTML=''; if(hint) hint.hidden=true; return; } box.hidden=false;
  const cur=S.styleToday==='rotate'||keys.includes(S.styleToday)?S.styleToday:'';
  if(hint){ const r=cur==='rotate'?rotateStyle():(STYLES[cur]?cur:null);
    const top=S.fits&&S.fits[0]; const short=r&&STYLES[r]&&top&&top.style!==r;
    const msg=(cur==='rotate'&&r?'Rotating styles: today is '+styleName(r)+'.':'')+(short?(cur==='rotate'?' ':'')+'Not enough '+STYLES[r].label+' pieces for a full outfit, so these are the closest.':'');
    hint.hidden=!msg; hint.textContent=msg; }
  const chip=(k,l,notr)=>`<button class="chip" data-stoday="${esc(k)}" aria-pressed="${cur===k}" ${notr?'data-notr':''}>${esc(l)}</button>`;
  box.innerHTML=`<span class="rowlab">Style</span>`+chip('','All my styles')+chip('rotate','Rotate')+keys.map(k=>STYLES[k]?chip(k,STYLES[k].label):chip(k,styleName(k),1)).join('');
}
function styleKey(){ const t=styleTarget(S.occ); return t?(t.ids.join(',')+'/'+t.looks.map(l=>l.id).join(',')+'/'+t.weight):'-'; }
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
  outerwear:'<path d="M17 5 9 9 5 38h6l3-15v21h20V23l3 15h6l-4-29-8-4-7 10-7-10Z"/><path d="M17 5l3 12 4-2M31 5l-3 12-4-2M24 15v29" fill="none" stroke-width="1.4"/><circle cx="26.5" cy="26" r="1.3"/><circle cx="26.5" cy="33" r="1.3"/>',
  shoes:'<path d="M5 32c0-7 2-13 4-15h8c0 4 4 7 9 8l12 3c4 1 5 5 5 7H5v-3Z"/>',
  socks:'<path d="M16 4h13v20l9 8c3 3 1 10-5 10-2 0-4-1-5-2L15 31c-2-2-3-4-3-7V8c0-2 2-4 4-4Z"/>',
  watch:'<rect x="19" y="4" width="10" height="40" rx="3"/><circle cx="24" cy="24" r="10"/>',
  belt:'<rect x="3" y="19" width="42" height="10" rx="2"/><rect x="17" y="16" width="11" height="16" rx="2" fill="none" stroke-width="2.5"/>',
  hat:'<path d="M9 31c0-10 7-17 15-17s15 7 15 17Z"/><rect x="3" y="30" width="42" height="5" rx="2"/>',
  bag:'<path d="M9 18h30l-3 24H12L9 18Z"/><path d="M18 18v-4a6 6 0 0 1 12 0v4" fill="none" stroke-width="2.5"/>',
  other:'<circle cx="24" cy="24" r="13"/>'};
function glyph(it){ const c=COLORS[primary(it)]?.hex||'#9aa3ad'; return `<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true" fill="${c}" stroke="rgba(120,130,140,.55)" stroke-width="1.2" stroke-linejoin="round">${GLYPH[it.cat]||GLYPH.other}</svg>`; }
function thumbSrc(it){ return it.thumb||it._localUrl||''; }
function visual(it){ const src=thumbSrc(it); return src?`<img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy" class="${it.box?'fitted':'cover'}"${enhanceOn()&&it.thumb?` data-enh="${esc(it.id)}"`:''}>`:glyph(it); }
/* Photo enhancement, on screen only (stored photos are never changed; Claude and color detection see the originals).
   Cut-outs: exposure is corrected toward the brightness of the piece's own main color (a black tee stays black,
   a white shirt becomes white instead of grey), gain limited to 0.85x to 1.6x, then a gentle S-curve for contrast and
   +8% saturation. Photos with a background (thumbnails): levels stretched from the 1st to 99th percentile, with the
   black point capped at 25 and the white point at 215 so nothing is pushed hard, then the same contrast curve. */
function enhanceOn(){ return S.settings.enhance!==false; }
const ENH=new Map();
function colorLum(name){ const c=COLORS[name]; if(!c) return null; const h=c.hex, v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); return (0.2126*v[0]+0.7152*v[1]+0.0722*v[2])/255; }
function enhanceData(d,opts){
  const lum=i=>0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; const hist=new Uint32Array(256); let n=0;
  for(let i=0;i<d.length;i+=4){ if(opts.mask&&d[i+3]<128) continue; hist[Math.round(lum(i))]++; n++; }
  if(n<50) return false;
  const pct=q=>{ let acc=0; for(let v=0;v<256;v++){ acc+=hist[v]; if(acc>=n*q) return v; } return 255; };
  const lut=new Float32Array(256);
  if(opts.mask){ const med=pct(0.5)/255, target=opts.target;
    const gain=target!=null&&med>0.02?Math.min(1.6,Math.max(0.85,target/med)):(med<0.3?Math.min(1.3,0.38/Math.max(med,0.05)):1);
    for(let v=0;v<256;v++) lut[v]=Math.min(1,v/255*gain); }
  else { const lo=Math.min(25,pct(0.01)), hi=Math.max(215,pct(0.99)); for(let v=0;v<256;v++) lut[v]=Math.min(1,Math.max(0,(v-lo)/(hi-lo))); }
  for(let v=0;v<256;v++){ const x=lut[v]; lut[v]=255*(x+0.12*(x-0.5)*(1-Math.abs(2*x-1))); } // gentle S-curve: midtone contrast +12%, black and white points unchanged
  for(let i=0;i<d.length;i+=4){ if(opts.mask&&d[i+3]===0) continue;
    let r=lut[d[i]],g=lut[d[i+1]],b=lut[d[i+2]]; const y=0.2126*r+0.7152*g+0.0722*b;
    d[i]=y+(r-y)*1.08; d[i+1]=y+(g-y)*1.08; d[i+2]=y+(b-y)*1.08; }
  return true;
}
async function enhanceBlob(blob,opts){
  const src=await decode(blob); const c=document.createElement('canvas'); c.width=src.width; c.height=src.height; const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(src,0,0); if(src.close) src.close(); const im=x.getImageData(0,0,c.width,c.height);
  if(!enhanceData(im.data,opts)) return blob; x.putImageData(im,0,0);
  return await new Promise(r=>c.toBlob(b=>r(b||blob),opts.mask?'image/webp':'image/jpeg',0.9));
}
async function enhanceImg(img){
  const it=byId(img.dataset.enh); if(!it||!it.thumb||img.dataset.enhDone) return; img.dataset.enhDone='1';
  const key=it.id+'|'+it.thumb.length+'|'+it.thumb.slice(-24);
  let u=ENH.get(key); if(!u){ try{ const b=await (await fetch(it.thumb)).blob(); u=URL.createObjectURL(await enhanceBlob(b,{mask:false})); ENH.set(key,u); }catch(e){ return; } }
  if(img.isConnected&&!img.classList.contains('cut')) img.src=u;
}
new MutationObserver(()=>{ if(!enhanceOn()) return; document.querySelectorAll('img[data-enh]:not([data-enh-done])').forEach(enhanceImg); }).observe(document.documentElement,{childList:true,subtree:true});
function condTag(it){ const c=it.cond??4; return `<span class="tag c${c}" title="Condition ${c} of 5">${COND[c]}</span>`; }

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
const PRIVACY_V='2026-10-07'; // bump when the privacy notice changes in a way people should see again
function claudeOn(){ return S.settings.claude!==false; }
async function callClaude(task,payload){
  if(!claudeOn()) throw {friendly:'Claude features are off. Turn them on in Settings, under Privacy and your data.'};
  if(!canWrite()) throw {friendly:'You are offline. Claude needs a connection.'};
  const {data,error}=await sb.functions.invoke('claude',{body:Object.assign({task,lang:I18N.lang},payload)});
  if(error){
    let status=error.context&&error.context.status, detail='';
    try{ const j=await error.context.json(); detail=j&&j.error||''; }catch(e){}
    if(status===404) throw {friendly:'Photo reading is not set up yet. Deploy the "claude" function (setup guide, step 5).'};
    if(status===401) throw {friendly:'Your sign-in expired. Sign out and back in.'};
    if(detail==='unknown_task') throw {friendly:'Update the "claude" function in Supabase to the latest index.ts first.'};
    if(detail==='missing_api_key') throw {friendly:'The Anthropic API key is not set on the server (setup guide, step 5).'};
    if(detail==='daily_limit') throw {friendly:'You have reached today\u2019s limit for this Claude feature. It resets tomorrow.'};
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
  if(typeof res.graphic==='boolean') it.graphic=res.graphic;
  if(typeof res.waterproof==='boolean') it.rain=res.waterproof;
  applyStyleFields(it,res);
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
const CUT={worker:null,n:0,pend:{},urls:new Map(),busy:false,failed:{},missing:new Set()};
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
// Cleans and frames a cut-out: keeps the main piece (and parts at least 8% of its size, like the second shoe of a pair),
// drops faint haze and stray specks left by background removal, trims to the piece, caps at 640 px, saves WebP (PNG fallback).
async function trimAlpha(png){
  const src=await decode(png); const W=src.width,H=src.height;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); g.drawImage(src,0,0); if(src.close) src.close();
  const img=g.getImageData(0,0,W,H), a=img.data;
  const cs=Math.max(1,Math.ceil(Math.max(W,H)/200)), gw=Math.ceil(W/cs), gh=Math.ceil(H/cs), on=new Uint8Array(gw*gh);
  for(let y=0;y<H;y+=1) for(let x=0;x<W;x+=1){ if(a[(y*W+x)*4+3]>140) on[((y/cs)|0)*gw+((x/cs)|0)]=1; }
  const lab=new Int32Array(gw*gh), sizes=[0]; let n=0;
  for(let i=0;i<on.length;i++){ if(!on[i]||lab[i]) continue; n++; let cnt=0; const st=[i]; lab[i]=n;
    while(st.length){ const j=st.pop(); cnt++; const jx=j%gw, jy=(j/gw)|0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const X=jx+dx,Y=jy+dy; if(X<0||Y<0||X>=gw||Y>=gh) continue; const k=Y*gw+X; if(on[k]&&!lab[k]){ lab[k]=n; st.push(k); } } }
    sizes.push(cnt); }
  if(!n) throw new Error('Nothing was found in the photo');
  const big=Math.max(...sizes), keep=sizes.map(c=>c>=big*0.08);
  let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const p=(y*W+x)*4; if(!a[p+3]) continue; const l=lab[((y/cs)|0)*gw+((x/cs)|0)];
    // pixels outside kept parts (or faint haze) become transparent; nearby edge pixels of kept parts stay
    let k=l&&keep[l]; if(!k&&a[p+3]>40){ const cx=(x/cs)|0, cy=(y/cs)|0; for(let dy=-1;dy<=1&&!k;dy++) for(let dx=-1;dx<=1&&!k;dx++){ const X=cx+dx,Y=cy+dy; if(X>=0&&Y>=0&&X<gw&&Y<gh){ const m=lab[Y*gw+X]; if(m&&keep[m]) k=true; } } }
    if(!k||a[p+3]<=24){ a[p+3]=0; continue; }
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  if(x1<0) throw new Error('Nothing was found in the photo');
  g.putImageData(img,0,0);
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
  try{ const c=await caches.open('wearcycle-cutouts'); const hit=await c.match(cutKey(it.cut)); let clean=false;
    if(hit){ blob=await hit.blob(); clean=hit.headers.get('X-Clean')==='2'; }
    if(!blob&&sb&&S.online){ const {data}=await sb.storage.from('photos').download(it.cut); if(data) blob=data; }
    if(blob&&!clean){ try{ blob=await trimAlpha(blob); }catch(e){} c.put(cutKey(it.cut),new Response(blob,{headers:{'Content-Type':blob.type||'image/webp','X-Clean':'2'}})); } }catch(e){}
  if(!blob) return '';
  if(enhanceOn()){ try{ blob=await enhanceBlob(blob,{mask:true,target:colorLum((it.colors||[])[0])}); }catch(e){} }
  const u=URL.createObjectURL(blob); CUT.urls.set(it.cut,u); return u;
}
async function makeCut(it,onp){
  const src=it.photo?await photoBlob(it.photo):await (await fetch(it.thumb)).blob();
  const png=await removeBg(src,onp);
  const out=await trimAlpha(png);
  const ext=out.type==='image/webp'?'webp':'png';
  const path=UID+'/'+it.id+'-cut-'+Date.now().toString(36)+'.'+ext;
  const {error}=await sb.storage.from('photos').upload(path,out,{contentType:out.type,upsert:false});
  if(error) throw new Error(error.message||'upload failed');
  try{ const c=await caches.open('wearcycle-cutouts'); await c.put(cutKey(path),new Response(out,{headers:{'Content-Type':out.type,'X-Clean':'2'}})); }catch(e){}
  const old=it.cut; if(await patchItem(it.id,{cut:path})){ if(old) removePhoto(old); return true; }
  return false;
}
// A saved cut-out whose file cannot be loaded counts as missing, so it can be made again.
// Pieces whose full photo never uploaded still have the small preview, so the cut-out falls back to that.
function needsCut(it){ return it&&!isEx(it)&&(it.photo||/^data:image/.test(it.thumb||''))&&(!it.cut||CUT.missing.has(it.id))&&isActive(it); }
/* Background job bar (above the tab bar): shows long-running work without blocking the screen. */
function job(text,pct){ const r=$('#jobRoot'); if(!r) return; document.body.classList.toggle('hasjob',!!text); if(!text){ r.innerHTML=''; return; }
  r.innerHTML=`<div class="jobbar" role="status"><span class="spin" aria-hidden="true"></span><span class="jt">${esc(text)}</span>${pct!=null?`<span class="jp"><i style="width:${Math.max(4,Math.min(100,pct))}%"></i></span>`:''}</div>`; }
// Cut-outs run one at a time from a queue, so adding more photos while it works simply extends the queue.
CUT.queue=[];
function makeCuts(list,opts){
  opts=opts||{};
  const add=list.filter(needsCut).filter(it=>!CUT.queue.includes(it.id)); 
  if(!add.length){ if(!opts.auto&&!CUT.busy) toast('All these pieces already have cut-outs.'); return; }
  if(!canWrite()){ if(!opts.auto) toast('You are offline. Cut-outs need a connection the first time.'); return; }
  CUT.queue.push(...add.map(it=>it.id)); if(!opts.auto) closeSheet();
  if(!CUT.busy) runCuts();
}
async function runCuts(){
  CUT.busy=true; let n=0, fail=0, lastErr=''; renderOutfits();
  while(CUT.queue.length){
    const id=CUT.queue[0], it=byId(id); const total=n+fail+CUT.queue.length;
    if(it&&needsCut(it)){
      const label='Cut-out '+(n+fail+1)+' of '+total;
      job(label+' · '+it.name,(n+fail)/total*100);
      try{ await makeCut(it,p=>{ if(p&&/fetch/.test(p.k)&&p.tot) job('One-time download of the cut-out tool',100*p.cur/p.tot); else if(p&&/compute|inference/.test(p.k)) job(label+' · '+it.name,(n+fail+0.5)/total*100); }); n++; delete CUT.failed[id]; CUT.missing.delete(id); renderOutfits(); renderCloset(); }
      catch(e){ fail++; lastErr=String(e&&e.message||e); CUT.failed[id]=lastErr; }
    }
    CUT.queue.shift();
  }
  CUT.busy=false; job(''); renderAll();
  if(n||fail) toast('Made '+n+' cut-out'+(n===1?'':'s')+'.'+(fail?' '+fail+' failed'+(lastErr?' ('+lastErr.slice(0,80)+')':'')+'.':''),5000);
}
function autoCuts(list){ if(S.settings.autoCut===false) return; makeCuts(list,{auto:true}); }

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
    sb.from('wears').select('id,date,occ,items').order('date',{ascending:false}).limit(400),
    sb.from('settings').select('body').maybeSingle()]);
  const err=it.error||we.error||se.error;
  if(err){ S.fromCache=true; renderAll(); if(S.online) toast('Could not load from the server: '+(err.message||'unknown error'),5000); return; }
  S.items=new Map(it.data.map(r=>[r.id,Object.assign({},r.body,{id:r.id})]));
  S.log=we.data||[]; if(se.data&&se.data.body) Object.assign(S.settings,se.data.body); settingsLoaded();
  S.fromCache=false; S.loaded=true; saveCache(); renderAll(); loadWeather(); refreshGps(); autoWash(); privacyCheck();
}
function loadCache(){ const c=LS.get(cacheKey()); if(!c) return false;
  S.items=new Map((c.items||[]).map(r=>[r.id,r])); S.log=c.log||[]; if(c.settings) Object.assign(S.settings,c.settings); settingsLoaded();
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
    CAM.mode=mode; CAM.shots=[]; CAM.resolve=resolve; CAM.darkTold=false;
    drawCamera(); startStream();
  });
}
function drawCamera(msg){
  const last=CAM.shots[CAM.shots.length-1];
  $('#camRoot').innerHTML=`<div class="cam" role="dialog" aria-label="Camera">
    ${msg?`<div class="msg">${msg}</div>`:`<video id="camVideo" playsinline muted autoplay></video><div class="guide" aria-hidden="true"></div><div class="flash" id="camFlash"></div>`}
    <div class="top"><span>${CAM.mode==='batch'?'One piece per photo, plain background':'Fill the frame with the item'}</span>
      <span class="camtools"><button class="side" data-cam="torch" id="camTorch" ${CAM.torchOk||CAM.torchMaybe?'':'hidden'} aria-pressed="${!!CAM.torchOn}" style="width:44px;height:36px" aria-label="Flashlight" title="Flashlight"><svg width="20" height="20" viewBox="0 0 24 24" fill="${CAM.torchOn?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></button>
      <button class="side" data-cam="flip" style="width:44px;height:36px" aria-label="Switch camera"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h13l-4-4M20 15H7l4 4"/></svg></button></span></div>
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
    let saved=null; try{ saved=localStorage.getItem('wearcycle.camId'); }catch(e){}
    const vid={width:{ideal:1920},height:{ideal:1440}};
    if(saved&&CAM.facing==='environment'){ try{ CAM.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:Object.assign({deviceId:{exact:saved}},vid)}); }catch(e){ CAM.stream=null; } }
    if(!CAM.stream) CAM.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:Object.assign({facingMode:{ideal:CAM.facing}},vid)});
    if(!CAM.resolve){ stopStream(); return; }
    const v=$('#camVideo'); if(v){ v.srcObject=CAM.stream; v.play().catch(()=>{}); } else drawCamera();
    setupTorch();
  }catch(e){
    const name=e&&e.name;
    cameraFallback(name==='NotAllowedError'?'Camera access is blocked. Allow it in Chrome: tap the icon left of the address, then Permissions, then Camera.'
      :name==='NotFoundError'?'No camera was found on this device.':'The camera could not start ('+esc(name||'unknown')+').');
  }
}
/* Light: the phone's flashlight, kept on while the camera is open (MediaStreamTrack "torch" constraint).
   Shown only when the camera reports it can do it (Chrome on Android with the back camera, usually);
   the last choice is remembered on this device. */
// Phones with several back cameras often give the light to only one of them, so when the chosen camera has none,
// the button still shows on the back camera and tapping it looks for the back camera that has the light.
async function trackHasTorch(t){
  if(!t||!t.getCapabilities) return false;
  try{ if(window.ImageCapture) await new ImageCapture(t).getPhotoCapabilities(); }catch(e){} // some Android builds report torch only after this
  for(let k=0;k<3;k++){ let c={}; try{ c=t.getCapabilities()||{}; }catch(e){} if(c.torch) return true; await new Promise(r=>setTimeout(r,350)); }
  return false;
}
async function setupTorch(){
  CAM.torchOk=false; CAM.torchMaybe=false; CAM.torchOn=false; const t=CAM.stream&&CAM.stream.getVideoTracks()[0]; if(!t) return;
  const has=await trackHasTorch(t); if(!CAM.stream) return;
  if(!has){ CAM.torchMaybe=CAM.facing==='environment'&&!CAM.noTorch; paintTorch(); return; }
  CAM.torchOk=true;
  let want=false; try{ want=localStorage.getItem('wearcycle.torch')==='1'; }catch(e){}
  if(want) await setTorch(true); else paintTorch();
}
async function findTorchCamera(){
  let devs=[]; try{ devs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'); }catch(e){}
  const cur=CAM.stream&&CAM.stream.getVideoTracks()[0]&&CAM.stream.getVideoTracks()[0].getSettings().deviceId;
  const back=devs.filter(d=>d.deviceId!==cur&&!/front|user|facetime/i.test(d.label||'')).sort((a,b)=>(/\b0\b/.test(b.label)?1:0)-(/\b0\b/.test(a.label)?1:0));
  stopStream();
  for(const d of back){
    let st=null; try{ st=await navigator.mediaDevices.getUserMedia({audio:false,video:{deviceId:{exact:d.deviceId},width:{ideal:1920},height:{ideal:1440}}}); }catch(e){ continue; }
    if(!CAM.resolve){ st.getTracks().forEach(x=>x.stop()); return false; }
    if(await trackHasTorch(st.getVideoTracks()[0])){ CAM.stream=st; try{ localStorage.setItem('wearcycle.camId',d.deviceId); }catch(e){}
      const v=$('#camVideo'); if(v){ v.srcObject=st; v.play().catch(()=>{}); } return true; }
    st.getTracks().forEach(x=>x.stop());
  }
  CAM.noTorch=true; await startStream(); return false;
}
async function setTorch(on){
  if(on&&!CAM.torchOk&&CAM.torchMaybe){ toast('Looking for the camera with the light…',3000);
    if(await findTorchCamera()){ CAM.torchOk=true; CAM.torchMaybe=false; }
    else { CAM.noTorch=true; CAM.torchMaybe=false; paintTorch(); toast('This phone does not let web apps use its light. Use a lamp or window light; dark photos are brightened automatically.',7000); return; } }
  const t=CAM.stream&&CAM.stream.getVideoTracks()[0]; if(!t) return;
  try{ await t.applyConstraints({advanced:[{torch:on}]}); CAM.torchOn=on; try{ localStorage.setItem('wearcycle.torch',on?'1':'0'); }catch(e){} }
  catch(e){ CAM.torchOn=false; toast('The light could not be turned on with this camera.'); }
  paintTorch();
}
function paintTorch(){ const b=$('#camTorch'); if(!b) return; b.hidden=!(CAM.torchOk||CAM.torchMaybe); b.setAttribute('aria-pressed',String(!!CAM.torchOn)); const p=b.querySelector('svg'); if(p) p.setAttribute('fill',CAM.torchOn?'currentColor':'none'); }
// Dark photos: lift the brightness with a gamma curve on each channel (keeps the hue) so the average reaches about 45%.
function brighten(c){
  const x=c.getContext('2d',{willReadFrequently:true}), im=x.getImageData(0,0,c.width,c.height), d=im.data; let sum=0,n=0;
  for(let i=0;i<d.length;i+=16){ sum+=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; n++; }
  const mean=sum/n/255; if(mean>=0.33||mean<0.02) return {mean,lifted:false};
  const g=Math.max(0.45,Math.log(0.45)/Math.log(mean)); const lut=new Uint8ClampedArray(256); for(let v=0;v<256;v++) lut[v]=Math.round(255*Math.pow(v/255,g));
  for(let i=0;i<d.length;i+=4){ d[i]=lut[d[i]]; d[i+1]=lut[d[i+1]]; d[i+2]=lut[d[i+2]]; }
  x.putImageData(im,0,0); return {mean,lifted:true};
}
function cameraFallback(text){
  drawCamera(`<p>${text}</p><button class="btn primary" data-cam="gallery">Choose photos instead</button>`);
}
function stopStream(){ if(CAM.stream){ CAM.stream.getTracks().forEach(t=>t.stop()); CAM.stream=null; } }
function closeCamera(result){ stopStream(); $('#camRoot').innerHTML=''; const r=CAM.resolve; CAM.resolve=null; if(r) r(result||[]); }
async function shoot(){
  const v=$('#camVideo'); if(!v||!v.videoWidth||CAM.busy) return; CAM.busy=true;
  const cv=drawScaled(v,1280); const br=brighten(cv);
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.86));
  CAM.busy=false; if(!blob) return;
  if(br.lifted&&!CAM.darkTold){ CAM.darkTold=true; toast(CAM.torchOk&&!CAM.torchOn?'That photo was dark, so it was brightened. Tap the light button at the top for truer colors.':'That photo was dark, so it was brightened. More light (a window or a lamp) gives truer colors.',6000); }
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
  S.busy=true; let done=0, aiFail=0, aiStop=claudeOn()?'':'off'; const added=[];
  const list=blobs.slice(0,40);
  for(const b of list){
    job('Adding '+(done+1)+' of '+list.length+(aiStop?'':' · Claude is reading it'),done/list.length*100);
    let p; try{ p=await prepare(b); }catch(e){ continue; }
    const now=todayISO();
    const it={id:uuid(),name:'New item '+(done+1),cat:'top',colors:[],formality:2,occ:[],cond:4,notes:'',created:now,lastCheck:now,status:'active',worn:0,wearsSinceCheck:0,review:true,thumb:p.thumb};
    const path=await uploadPhoto(p.full); if(path) it.photo=path;
    if(!claudeOn()){ try{ const g=await guessColors(p.full); if(g.length){ it.colors=[g[0]]; it.colorGuess=g; } }catch(e){} }
    if(!aiStop){ try{ const r=await aiTag(p.full); if(r&&!r.error){ applyAi(it,r); await applyBox(it,p.full,r.box); } else aiFail++; }catch(e){ aiFail++; if(/not set up|API key|sign-in/.test(aiMsg(e))) aiStop=aiMsg(e); } }
    if(await writeItem(it)){ done++; added.push(it); }
  }
  S.busy=false; job(''); renderAll();
  if(claudeOn()) toast('Added '+done+' item'+(done===1?'':'s')+'. Open each one marked Review to confirm the details.'+(aiStop?' '+aiStop:(aiFail?' Claude could not read '+aiFail+'.':'')),7000);
  else toast('Added '+done+' item'+(done===1?'':'s')+'.',2500);
  goTab('closet');
  autoCuts(added.map(it=>byId(it.id)).filter(Boolean));
  if(!claudeOn()&&added.length) openQuick(added.map(it=>it.id));
}

/* ---------- rendering ---------- */
function renderAll(){ renderStatus(); renderOutfits(); renderCloset(); renderCare(); renderShop(); const v=$('#appVersion'); if(v) v.textContent='Wearcycle v'+APP_VERSION; }
function renderStatus(){
  const st=$('#status'); let b='';
  if(!S.online){ st.textContent='Offline'; st.className='status warn'; b='<div class="banner"><div><b>You are offline.</b> Showing the last saved copy. Changes and Claude need a connection.</div></div>'; }
  else if(S.fromCache){ st.textContent='Syncing'; st.className='status'; }
  else { st.textContent=''; st.className='status ok hidden'; }
  if(S.online && S.installEvt && !LS.get('wardrobe.installDismissed')) b+='<div class="banner" style="background:var(--accent-soft)"><div style="flex:1"><b style="color:var(--accent)">Install Wearcycle</b> to open it from your home screen like any app.</div><button class="btn sm primary" data-act="install">Install</button><button class="btn sm ghost" data-act="installNo">Later</button></div>';
  $('#banner').innerHTML=b;
  $('#addBtn').hidden=S.tab!=='closet';
  const n=allItems().filter(it=>(isActive(it)&&it.repair)||careFlags(it,Date.now(),S.settings).some(f=>f.kind==='retire'||f.kind==='check'||f.kind==='downgraded')).length;
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
function layerOn(){ return S.layerMode==='on'||(S.layerMode==='auto'&&(needsLayer(wxForScore())||S.occ==='formal'||(S.occ==='work'&&(S.settings.work||{}).code==='suits'))); }
function fitKeyNow(){ const w=wxForScore(); return (S.pin||'')+'|'+S.occ+'|'+(S.theme||'')+'|'+styleKey()+'|'+(S.settings.palette||'any')+'|'+layerOn()+'|'+(w?[Math.round(w.feelMin),Math.round(w.feelMax),w.rain,w.snow,w.off].join(','):'nowx')+'|'+allItems().filter(isActive).map(i=>i.id+':'+(i.cond??4)+':'+(i.occ||[]).join(',')+':'+(i.colors||[]).join(',')+':'+(i.formality??3)+':'+warmthOf(i)+':'+rainReady(i)+':'+canOpen(i)+canUnder(i)+needsBelt(i)+(i.dirty?'D':'')+(i.styles||[]).join('')+(i.kind||'')+(i.repair?(i.repairOk?'r':'R'):'')+':'+(i.thumb||'').length).sort().join(';'); }
function idsOf(o){ return {top:o.top?.id,under:o.under?.id,bottom:o.bottom?.id,onepiece:o.onepiece?.id,outer:o.outer?.id,shoes:o.shoes?.id,acc:(o.acc||[]).map(a=>a.id)}; }
function hydrate(ids){ const o={}; for(const k of ['top','under','bottom','onepiece','outer','shoes']) if(ids[k]&&byId(ids[k])) o[k]=byId(ids[k]); o.acc=(ids.acc||[]).map(byId).filter(Boolean); return o; }
/* "See outfits with this": the Outfits screen builds every outfit around one piece, and says why that piece
   is not in the usual picks (wash, repair, condition, occasions, dress code, or simply other pieces score higher). */
function pinWhy(it){
  if(!isActive(it)) return 'It is marked as donated or retired, so it is never suggested.';
  if(it.dirty) return 'It is in the wash, so it is left out of suggestions until you mark it clean.';
  if((it.cond??4)<=1) return 'Condition 1 puts it on the donate list, so it is left out.';
  const occs=effectiveOccasions(it);
  if(it.repair&&!repairOk(it,S.occ)) return 'It is marked as needing repair, so it is only suggested for sport, home and chores.';
  if(!occs.length) return 'It has no occasions set, so it is never suggested. Add some in its details.';
  if(!occs.includes(S.occ)) return 'It is not set for '+OCC[S.occ].label.toLowerCase()+' (it is for '+occs.map(o=>OCC[o].label.toLowerCase()).join(', ')+').';
  const r=suggest(allItems(),S.occ,ctx(),{n:4,layer:layerOn()}); const inTop=r.outfits.some(f=>coreOf(f.o).concat(f.o.acc||[]).some(x=>x.id===it.id));
  return inTop?'It is also in today\u2019s picks for '+OCC[S.occ].label.toLowerCase()+'.':'It fits '+OCC[S.occ].label.toLowerCase()+', but other pieces score higher today. Open Why this outfit? to see what holds it back.';
}
// Care: pieces that never make the suggestions, with the most likely reason and a way to see outfits with them.
let NP={key:'',list:[]};
function ctxFor(o){ return Object.assign(ctx(),{style:styleTarget(o),theme:null}); }
function notPickedReason(it,occs){
  if(it.dirty) return 'In the wash: it returns to suggestions when you mark it clean.';
  if(it.repair&&!occs.some(o=>repairOk(it,o))) return 'Marked as needing repair.';
  if(!occs.length) return 'No occasions set, so it is never suggested. Open it and pick where you would wear it.';
  if(!(it.colors||[]).length) return 'No color set, so it cannot be matched. Open it and pick its color.';
  const o=occs[0]; const r=suggest(allItems(),o,ctxFor(o),{n:1,layer:layerOn(),pin:it}); const f=r.outfits[0];
  if(!f) return 'Set for '+occs.map(x=>OCC[x].label.toLowerCase()).join(', ')+', but nothing to pair it with there yet.';
  const neg=(f.reasons||[]).filter(x=>x.neg).map(x=>x.t)[0];
  return 'Set for '+occs.map(x=>OCC[x].label.toLowerCase()).join(', ')+'; other pieces score higher'+(neg?'. Best outfit with it: '+neg.charAt(0).toLowerCase()+neg.slice(1):'')+'.';
}
function notPickedPanel(items){
  const act=items.filter(isActive); const key=fitKeyNow()+'|'+allLog().length; if(NP.key!==key){ NP={key,list:notPicked(allItems(),ctxFor,{n:8})}; }
  const extra=act.filter(i=>(i.cond??4)>1&&(i.dirty||!effectiveOccasions(i).length)&&['top','bottom','onepiece','outerwear','shoes'].includes(i.cat)&&!NP.list.some(x=>x.item.id===i.id)).map(i=>({item:i,occs:effectiveOccasions(i)}));
  const list=NP.list.filter(x=>(x.item.cond??4)>1).concat(extra).slice(0,12); if(!list.length) return '';
  return `<div class="panel"><div class="panel-h"><h3>Not getting picked</h3><span class="count">${list.length}</span></div><div class="panel-h"><p>Pieces that are in none of the top suggestions for any occasion right now, and why.</p></div>
    ${list.map(({item:it,occs})=>`<div class="li care">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>${esc(notPickedReason(it,occs))}</span></div><div class="acts">${occs.length&&!it.dirty?`<button class="btn sm" data-pinsee="${esc(it.id)}">See outfits</button>`:''}<button class="btn sm ghost" data-edit="${esc(it.id)}">Open</button></div></div>`).join('')}</div>`;
}
function pinCard(){ const it=S.pin&&byId(S.pin); if(!it) return '';
  return `<div class="pincard"><span class="pv">${visual(it)}</span><div class="txt"><b>Outfits with <span data-notr>${esc(it.name)}</span></b><span>${esc(pinWhy(it))}</span></div><button class="iconbtn" data-unpin aria-label="Show all outfits">✕</button></div>`; }
function pinSee(id){ const it=byId(id); if(!it) return; S.pin=id; const occs=effectiveOccasions(it);
  if(occs.length&&!occs.includes(S.occ)){ S.occ=occs[0]; S.theme=undefined; } S.sel=0; S.seed=0; S.fitKey=''; closeSheet(); goTab('outfits'); renderOutfits(); window.scrollTo(0,0); }
function regenerate(){
  const pin=S.pin&&byId(S.pin); if(S.pin&&!pin) S.pin=null;
  const r=suggest(allItems(),S.occ,ctx(),{n:4,jitter:S.seed?1.2:0,rng:makeRng(S.seed),layer:layerOn(),pin:pin||undefined});
  S.fits=r.outfits.map(f=>({ids:idsOf(f.o),score:f.score,reasons:f.reasons,style:f.style})).sort((a,b)=>b.score-a.score); S.fits.forEach((f,k)=>{f.rank=k+1;}); S.missing=r.missing; S.fitKey=fitKeyNow(); S.sel=0;
}
// Match label from the score (see "How Wearcycle decides"); bars give a quick visual of the same thing.
const MATCH=[[4,'Excellent match',5],[3,'Great match',4],[2,'Good match',3],[0.5,'Fair match',2],[-Infinity,'Weak match',1]];
// Each warning (red dot) lowers the label one step, so a high score can't hide a real problem.
function match(f){ const lv=Math.max(1,MATCH.find(x=>f.score>=x[0])[2]-(f.reasons||[]).filter(r=>r.neg).length); const m=MATCH.find(x=>x[2]===lv); return {label:m[1],bars:lv}; }
function bars(n){ return `<span class="bars" aria-hidden="true">${[1,2,3,4,5].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`; }
const WX_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 12 3 3 0 0 1 18 18H7Z"/></svg>';
function renderWx(){
  const box=$('#wx'); const w=wxSet();
  if(!wxOn()){ box.innerHTML=w.dismissed?'':`<button class="wxpill add" data-wx="edit">${WX_ICON}<span>Weather</span></button>`; return; }
  const d=WXC.data;
  if(!d){ box.innerHTML=`<button class="wxpill" data-wx="edit">${WX_ICON}<span>${WXC.busy?'…':'Weather'}</span></button>`; return; }
  const wet=d.snow?' · snow':d.rain?' · rain':'';
  box.innerHTML=`<button class="wxpill" data-wx="edit" aria-label="Weather: ${tdeg(d.tempMin)} to ${tdeg(d.tempMax)}, ${esc(d.sky)}. Change">${WX_ICON}<span>${tdeg(d.tempMin).replace(/[CF]$/,'')}–${tdeg(d.tempMax)}${wet}</span></button>`;
}
function greeting(){ const h=new Date().getHours(); const d=new Date().toLocaleDateString(I18N.locale,{weekday:'long'}); return esc(d)+`<small>${h<12?'Good morning':h<18?'Good afternoon':'Good evening'}</small>`; }
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
/* Laundry reminder. The app cannot see the washing machine, so after the set days (default 7, a weekly wash)
   it asks on the Outfits screen; automatic return is opt-in because a wrong guess would suggest dirty clothes. */
function washDays(){ return S.settings.washDays||7; }
function washSince(it){ return it.dirtyOn||it.lastWorn||null; }
function washAge(it){ const d=washSince(it); if(!d) return Infinity; return Math.floor((new Date(todayISO()+'T12:00')-new Date(d+'T12:00'))/864e5); }
function washDue(){ return allItems().filter(i=>isActive(i)&&i.dirty&&!isEx(i)&&washAge(i)>=washDays()); }
function sinceLabel(d){ if(!d) return 'a while'; const dt=new Date(d+'T12:00'); const age=Math.floor((new Date(todayISO()+'T12:00')-dt)/864e5);
  return age<7?dt.toLocaleDateString(I18N.locale,{weekday:'long'}):dt.toLocaleDateString(I18N.locale,{month:'short',day:'numeric'}); }
function washCard(){
  if(!laundryOn()||S.settings.washAuto) return ''; const due=washDue(); if(!due.length) return '';
  let snooze=''; try{ snooze=localStorage.getItem('wearcycle.washSnooze')||''; }catch(e){}
  if(snooze===todayISO()) return '';
  const oldest=due.map(washSince).filter(Boolean).sort()[0]; const n=allItems().filter(i=>isActive(i)&&i.dirty).length;
  return `<div class="askcard washcard"><b>${n} piece${n===1?'':'s'} in the wash since ${esc(sinceLabel(oldest))}. Washed already?</b><span>They stay out of your outfits until you mark them clean.</span>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-act="allClean">All clean</button><button class="btn sm" data-laundry-go="1">Choose</button><button class="btn sm ghost" data-act="washSnooze">Not yet</button></div></div>`;
}
async function autoWash(){
  if(!laundryOn()||!S.settings.washAuto||!canWrite()) return; const due=washDue(); if(!due.length) return;
  for(const it of due) await patchItem(it.id,{dirty:false,wearsSinceWash:0,dirtyOn:undefined});
  toast(due.length+' piece'+(due.length===1?'':'s')+' back from the wash after '+washDays()+' days.',5000);
}
function renderOutfits(){
  renderWx(); const g=$('#greet'); if(g) g.innerHTML=greeting();
  const hol=holidaysSoon(14); if(S.theme&&!themeNow()) S.theme=undefined;
  $('#occChips').innerHTML=hol.map(h=>`<button class="chip holchip" data-theme-occ="${h.id}" aria-pressed="${S.theme===h.id}">${h.label}</button>`).join('')+OCCASIONS.map(o=>`<button class="chip" data-occ="${o.id}" aria-pressed="${S.occ===o.id&&!S.theme}">${o.label}</button>`).join('');
  const th=$('#themeHint'); if(th){ const h=S.theme&&hol.concat(holidaysSoon(30)).find(x=>x.id===S.theme); th.hidden=!h; th.textContent=h?h.label+': '+whenLabel(h.inDays).toLowerCase()+'. '+h.tip:''; }
  const box=$('#fits');
  if(!S.loaded){ box.innerHTML='<p class="hint">Loading your closet…</p>'; return; }
  if(!allItems().length){ box.innerHTML=emptyCloset(); return; }
  if(S.fitKey!==fitKeyNow()) regenerate();
  renderStyleChips();
  if(!S.fits.length){
    const names={top:'tops',bottom:'bottoms',shoes:'shoes'}; const occ=OCC[S.occ];
    box.innerHTML=washCard()+`<div class="empty"><h3>Not enough for ${esc(occ.label.toLowerCase())} yet</h3>
      <p class="hint">Missing: ${(S.missing||[]).map(m=>names[m]).join(', ')} tagged for ${esc(occ.label.toLowerCase())} in condition ${occ.min}/5 or better. Tag existing items for this occasion in Closet, or see the Shop tab.</p>
      ${!washCard()&&allItems().some(i=>isActive(i)&&i.dirty)?`<p class="hint"><b>${(n=>n+(n===1?' piece is':' pieces are'))(allItems().filter(i=>isActive(i)&&i.dirty).length)} in the wash.</b> Mark them clean in Closet when they are ready.</p><div class="row"><button class="btn" data-laundry-go="1">Open laundry</button></div>`:''}
      <div class="row"><button class="btn" data-tab-go="shop">Open shopping list</button></div></div>`; return;
  }
  if(S.sel>=S.fits.length) S.sel=0;
  const others=S.fits.map((f,i)=>i===S.sel?'':altRow(f,i)).join('');
  setTimeout(hydrateCuts,0);
  const ask=S.occ==='work'&&!S.settings.work&&!S.examples.length?`<div class="askcard"><b>What is the dress code at your work?</b><span>Wearcycle sorts your clothes for Work from it. Change it any time in Settings.</span>
    <div class="chips" style="flex-wrap:wrap">${Object.entries(DRESS_CODES).map(([k,d])=>`<button class="chip" data-wcode="${k}">${esc(d.label)}</button>`).join('')}</div></div>`:'';
  box.innerHTML=ask+pinCard()+washCard()+todayLine()+heroCard(S.fits[S.sel],S.sel)+
    `<div class="alts"><div class="alts-h"><h3>${S.fits.length>1?'More options':'Only one outfit fits'}</h3><span class="spacer"></span><button class="btn sm" id="shuffleBtn">New ideas</button></div>
     ${S.fits.length>1?`<div class="altrow">${others}</div>`:`<p class="hint">Add or tag more pieces for ${esc(OCC[S.occ].label.toLowerCase())} to get more options.</p>`}</div>`;
}
const SWAP_ICON='<span class="swap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9h13l-4-4M20 15H7l4 4"/></svg></span>';
function tile(it,slot,i,size){
  if(!it) return '';
  const acc=slot.startsWith('acc');
  return `<button class="tile ${size||''}" data-swap="${i}" data-slot="${slot}" aria-label="${esc(CAT[it.cat].label)}: ${esc(it.name)}. Tap to see it">${acc?'':SWAP_ICON}<div class="vis">${visual(it)}</div><div class="cap"><span class="k">${esc(slot==='outer'?'Layer':slot==='under'?'Underneath':(slot==='top'&&size==='open')?'Top, worn open':CAT[it.cat].label)}</span>${esc(it.name)}</div></button>`;
}
const ADJ_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
const UNDO_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
function heroCard(f,i){
  const o=hydrate(f.ids); const m=match(f);
  const core=[o.outer&&['outer',o.outer],o.onepiece?['onepiece',o.onepiece]:o.top&&['top',o.top],o.under&&['under',o.under],!o.onepiece&&o.bottom&&['bottom',o.bottom],o.shoes&&['shoes',o.shoes]].filter(Boolean);
  const canAddUnder=o.top&&!o.under&&layeredOver(o.top)&&swapCandidates(o,'under',allItems(),S.occ,ctx()).length;
  const beltK=o.bottom?o.acc.findIndex(a=>a.cat==='belt'):-1; const rest=o.acc.map((a,k)=>[a,k]).filter(([a,k])=>k!==beltK);
  const title=f.edited?'Your version':i===0?'Today’s pick':'Option '+f.rank;
  const head=`<header class="fit-h"><span class="rank ${i===0&&!f.edited?'top':''}">${f.rank}</span><span class="rk-l"><b>${title}${f.style&&STYLES[f.style]?`<em class="stylepill">${STYLES[f.style].label}</em>`:''}</b><span>${m.label}${bars(m.bars)}</span></span>
    <button class="iconbtn" data-act="adjust" aria-label="Adjust: outer layer, view and palette">${ADJ_ICON}</button></header>`;
  const n=S.fits.length;
  const nav=n>1?`<div class="pager"><button class="pg" data-step-opt="-1" aria-label="Previous option">‹</button>${S.fits.map((x,k)=>`<button class="dot" data-sel="${k}" aria-label="Option ${k+1}" aria-current="${k===i}"></button>`).join('')}<button class="pg" data-step-opt="1" aria-label="Next option">›</button></div>`:'';
  const visual=S.view==='board'?flatlay(o,i):`<div class="board2 n${core.length}">${core.map(([k,it])=>k==='bottom'&&beltK>=0?beltOn(it,o.acc[beltK],beltK,i):tile(it,k,i,k==='top'&&o.under&&canOpen(o.top)?'open':'')).join('')}</div>
    ${rest.length?`<div class="accrow">${rest.map(([a,k])=>tile(a,'acc'+k,i,'xs')).join('')}</div>`:''}`;
  const tapbar=f.edited&&f.orig?`<div class="editbar"><span>You changed this outfit.</span><button class="btn sm" data-revert="${i}">${UNDO_ICON}Back to suggestion</button></div>`
    :`<p class="taphint">${SWAP_ICON}<span>Tap a piece to see it or swap it</span></p>`;
  return `<article class="fit hero">${head}${visual}${tapbar}${nav}${heroMeta(f,i,o,canAddUnder)}</article>`;
}
// The outfit's color story: one swatch per main piece (in wearing order) and the harmony rule it follows.
function paletteStrip(o){
  const core=coreOf(o); const h=WardrobeLogic.harmony(core.map(primary).filter(c=>COLORS[c]));
  const adv=adviceText();
  return `<div class="palette"><span class="sws">${core.filter(i=>COLORS[primary(i)]).map(i=>`<span class="sw" style="background:${COLORS[primary(i)].hex}" title="${esc(primary(i))}: ${esc(i.name)}"></span>`).join('')}</span>
    <span class="pl"><b>${esc(h.why)}</b>${adv?`<span>${esc(adv)}</span>`:''}</span></div>`;
}
function heroMeta(f,i,o,canAddUnder){
  const hw=WardrobeLogic.harmony(coreOf(o).map(primary).filter(c=>COLORS[c])).why;
  const rs=f.reasons.filter(r=>r.t!==hw); const warn=rs.filter(r=>r.neg).length;
  return `${paletteStrip(o)}
    <div class="ctarow">${f.worn?'<button class="worn-ok linkish" data-act="todaylog">✓ Logged as worn today · Correct</button>':`<button class="btn cta grow" data-wear="${i}">Wear this</button>`}
      <button class="btn iconb" data-act="share" aria-label="Share this outfit">${SHARE_ICON}</button></div>
    ${canAddUnder?`<button class="btn sm ghost addunder" data-addunder="${i}">+ Wear a t-shirt underneath</button>`:''}
    <details class="whybox"><summary>Why this outfit?${warn?` <span class="warnn">${warn} note${warn>1?'s':''}</span>`:''}</summary>
      <ul class="why">${rs.map(r=>`<li class="${r.neg?'neg':''}">${esc(r.t)}</li>`).join('')}</ul>
      <p class="hint">Ranked by color harmony, dress level, how long pieces have rested${wxForScore()?', today’s weather':''}${S.settings.palette&&S.settings.palette!=='any'?' and your palette':''}. Tap any piece to swap it.</p></details>
    <button class="linkbtn" data-act="logOther">Wore something else? Log it</button>`;
}
function openAdjust(){
  const auto=needsLayer(wxForScore()), pal=PALETTES[S.settings.palette||'any'];
  openSheet(sheetHead('Adjust')+`
   <div class="field"><span class="lab">Outer layer</span><div class="chips">${[['auto','Auto'+(wxForScore()?(auto?' (on today)':' (off today)'):'')],['on','Always add'],['off','None']].map(([k,l])=>`<button class="chip" data-layer="${k}" aria-pressed="${S.layerMode===k}">${l}</button>`).join('')}</div>
     <p class="hint">Auto adds a jacket or coat when it is below 15° or wet.</p></div>
   <div class="field"><span class="lab">Show outfits as</span><div class="chips"><button class="chip" data-view="board" aria-pressed="${S.view==='board'}">Flat-lay</button><button class="chip" data-view="pieces" aria-pressed="${S.view!=='board'}">Pieces</button></div></div>
   <div class="field"><span class="lab">Style palette</span><button class="btn" data-act="palettes" style="justify-content:space-between">${esc(pal.label)}<span class="hint">Change</span></button></div>`);
}
/* Flat-lay board, laid out in wearing order so every outfit reads the same way:
   left column = upper body (outer layer, top, t-shirt underneath) stacked top to bottom;
   right column = trousers, then shoes; accessories in a row under the left column.
   Each piece is fitted inside its own cell (no overlaps), so pieces keep consistent sizes. Units: % of a 4:5 board. */
function flCells(o){
  const upper=[o.outer&&['outer',o.outer],o.onepiece?['onepiece',o.onepiece]:o.top&&['top',o.top],o.under&&['under',o.under]].filter(Boolean);
  const bottom=!o.onepiece&&o.bottom?['bottom',o.bottom]:null;
  const acc=o.acc.map((a,k)=>['acc'+k,a]);
  const cells=[], G=2;
  const L={x:4,w:44}, R={x:52,w:44};
  const accH=acc.length?16:0, colBot=96-(accH?accH+G:0);
  const n=Math.max(1,upper.length), h=(colBot-4-(n-1)*G)/n;
  upper.forEach(([slot,it],k)=>cells.push({slot,it,x:L.x,y:4+k*(h+G),w:L.w,h}));
  if(acc.length){ const m=acc.length, w=Math.min(22,(92-(m-1)*G)/m), x0=4+(92-(m*w+(m-1)*G))/2;
    acc.forEach(([slot,it],k)=>cells.push({slot,it,x:x0+k*(w+G),y:96-accH,w,h:accH,small:1})); }
  const colH=colBot-4;
  if(bottom){ const sh=o.shoes?Math.round(colH*0.3):0; cells.push({slot:bottom[0],it:bottom[1],x:R.x,y:4,w:R.w,h:colH-(sh?sh+G:0)});
    if(o.shoes) cells.push({slot:'shoes',it:o.shoes,x:R.x,y:colBot-sh,w:R.w,h:sh}); }
  else if(o.shoes) cells.push({slot:'shoes',it:o.shoes,x:R.x,y:4+colH*0.35,w:R.w,h:colH*0.3});
  return cells;
}
function flatlay(o,i){
  const miss=[];
  const parts=flCells(o).map(c=>{ if(needsCut(c.it)) miss.push(c.it);
    return `<button class="fl ${c.small?'small':''} ${c.it.cut?'iscut':''}" style="left:${c.x}%;top:${c.y}%;width:${c.w}%;height:${c.h}%" data-swap="${i}" data-slot="${c.slot}" aria-label="${esc(CAT[c.it.cat].label)}: ${esc(c.it.name)}. Tap to see it">${flVisual(c.it)}</button>`; });
  const note=miss.length&&!CUT.busy?`<div class="cutnote"><span>${miss.length} piece${miss.length>1?'s':''} still on the floor photo.</span><button class="btn sm primary" data-act="cutOutfit">Make cut-outs</button></div>`:(CUT.busy?'<div class="cutnote"><span>Making cut-outs… you can keep using the app.</span></div>':'');
  return `<div class="flatlay" data-swipe="1">${parts.join('')}</div>${note}`;
}
function flVisual(it){ const src=thumbSrc(it); return `<img ${it.cut?`data-cut="${esc(it.id)}"`:''} src="${esc(src||'')}" alt="" ${src?'':'hidden'}>${src?'':glyph(it)}`; }
// After each render, swap in the transparent cut-outs (loaded from the phone's cache, or downloaded once).
function hydrateCuts(){ document.querySelectorAll('img[data-cut]').forEach(img=>{ const it=byId(img.dataset.cut); cutUrl(it).then(u=>{ if(u&&img.isConnected){ img.src=u; img.hidden=false; img.classList.add('cut'); CUT.missing.delete(it.id); }
    else if(!u&&it&&it.cut&&S.online&&!CUT.missing.has(it.id)){ CUT.missing.add(it.id); if(ED&&ED.id===it.id) drawEditor(); } }); }); }
// The belt is drawn as a band across the top of the trousers tile, where it is worn; it swaps on its own.
function beltOn(bottom,belt,k,i){
  return `<div class="withbelt">${tile(bottom,'bottom',i)}<button class="beltband" data-swap="${i}" data-slot="acc${k}" aria-label="Belt: ${esc(belt.name)}. Tap to see it"><span class="bimg">${visual(belt)}</span><span class="blab"><span class="k">Belt</span><span class="bn">${esc(belt.name)}</span></span></button></div>`;
}
function altRow(f,i){
  const o=hydrate(f.ids); const m=match(f);
  const cells=flCells(o).map(c=>`<span class="fl ${c.small?'small':''} ${c.it.cut?'iscut':''}" style="left:${c.x}%;top:${c.y}%;width:${c.w}%;height:${c.h}%">${flVisual(c.it)}</span>`).join('');
  const sws=coreOf(o).map(primary).filter(c=>COLORS[c]).map(c=>`<span class="sw" style="background:${COLORS[c].hex}"></span>`).join('');
  return `<button class="alt2" data-sel="${i}" aria-label="Option ${f.rank}, ${m.label}: ${esc(coreOf(o).map(x=>x.name).join(', '))}">
    <span class="flatlay mini">${cells}<span class="rank">#${f.rank}</span></span>
    <span class="alt2-l"><span class="sws">${sws}</span><span class="ml">${m.label}</span>${bars(m.bars)}</span></button>`;
}
function renderCloset(){ setTimeout(hydrateCuts,0);
  const items=allItems().filter(isActive);
  const counts={}; for(const it of items) counts[it.cat]=(counts[it.cat]||0)+1;
  const dirtyN=items.filter(i=>i.dirty).length;
  const cats=[{id:'all',label:'All'}].concat(dirtyN?[{id:'laundry',label:'In the wash'}]:[]).concat(CATS.filter(c=>counts[c.id]));
  if(!cats.find(c=>c.id===S.cat)) S.cat='all';
  $('#catChips').innerHTML=cats.map(c=>`<button class="chip" data-cat="${c.id}" aria-pressed="${S.cat===c.id}">${c.label}<span class="n">${c.id==='all'?items.length:c.id==='laundry'?dirtyN:counts[c.id]}</span></button>`).join('');
  $('#catChips').hidden=!items.length;
  const box=$('#closetGrid');
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():'<p class="hint">Loading…</p>'; return; }
  if(S.cat==='laundry'){ const ds=items.filter(i=>i.dirty);
    box.innerHTML=`<div class="panel"><div class="panel-h"><h3>In the wash</h3><span class="count">${ds.length}</span><span class="spacer"></span><button class="btn sm primary" data-act="allClean">Mark all clean</button></div>
      ${ds.map(it=>`<div class="li">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>Worn ${it.wearsSinceWash||1} time${(it.wearsSinceWash||1)===1?'':'s'} since washing${it.lastWorn?', last on '+esc(it.lastWorn):''}</span></div><div class="acts"><button class="btn sm" data-clean="${esc(it.id)}">Clean</button></div></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">Pieces in the wash are left out of outfit suggestions. Change how often a piece needs washing in its More details.</p>`;
    setTimeout(hydrateCuts,0); return; }
  const list=items.filter(it=>S.cat==='all'||it.cat===S.cat).sort((a,b)=>(b.review?1:0)-(a.review?1:0)||CATS.findIndex(c=>c.id===a.cat)-CATS.findIndex(c=>c.id===b.cat)||String(a.name).localeCompare(b.name));
  const now=Date.now(); const reviews=items.filter(i=>i.review).length;
  box.innerHTML=(reviews?`<div class="row" style="margin:0 0 12px"><p class="hint" style="margin:0;flex:1;min-width:200px">${reviews} item${reviews>1?'s':''} marked <span class="ex">Review</span>: check what Claude filled in. Open any item to correct it, or confirm them all.</p><button class="btn sm primary" data-act="confirmAll" ${S.busy?'disabled':''}>Confirm all ${reviews}</button></div>`:'')+
   (S.examples.length?`<div class="row" style="margin-bottom:12px"><span class="hint">Items marked <span class="ex">Example</span> are not saved.</span><span class="spacer"></span><button class="btn sm ghost" data-act="clearEx">Remove examples</button></div>`:'')+
   '<div class="grid">'+list.map(it=>{ const fl=careFlags(it,now,S.settings); const bad=fl.some(f=>f.kind==='retire'); return `<button class="card" data-edit="${esc(it.id)}">
    <div class="vis ${it.cut?'studio':''}">${it.cut?`<img data-cut="${esc(it.id)}" src="${esc(thumbSrc(it))}" alt="${esc(it.name)}" class="${it.box?'fitted':'cover'}">`:visual(it)}</div><div class="body"><div class="name">${esc(it.name)}</div>
    <div class="meta">${condTag(it)}${fl.length?`<span class="dot ${bad?'bad':''}" title="Needs attention"></span>`:''}${isEx(it)?'<span class="ex">Example</span>':''}${it.review?'<span class="ex">Review</span>':''}${it.dirty?'<span class="ex wash">In the wash</span>':''}${it.repair?'<span class="ex wash">Repair</span>':''}</div>
    <div class="meta">${(effectiveOccasions(it).map(o=>OCC[o].label).join(' · '))||'No occasion fits'}</div></div></button>`; }).join('')+'</div>';
}
function thumbBox(it){ return `<div class="thumb">${thumbSrc(it)?`<img src="${esc(thumbSrc(it))}" alt="">`:glyph(it)}</div>`; }
function careRow(it,f,acts){
  const cls=f.kind==='retire'?'stripe-retire':(f.kind==='downgraded'?'stripe-down':'');
  return `<div class="li care ${cls}">${thumbBox(it)}<div class="txt"><b>${esc(it.name)} ${isEx(it)?'<span class="ex">Example</span>':''}</b><span>${esc(f.text)}</span></div><div class="acts">${acts}</div></div>`;
}
// Drop-off finder. Opens a Google Maps search (Maps URLs need no API key and open the Maps app on Android).
// Near the weather place when one is set, otherwise "near me" so Maps uses the phone's own location.
// Google search on the Shopping tab (udm=28), in the app's language; opens only when tapped.
function shopQ(...parts){ const d={men:'men\'s',women:'women\'s'}[S.settings.dept]; return [d].concat(parts).filter(Boolean).map(p=>I18N.lang==='en'?p:I18N.tr(String(p))).join(' '); }
function shopUrl(q){ return 'https://www.google.com/search?udm=28&q='+encodeURIComponent(q); }
const SHOP_GO='<span class="go">Shop ›</span>';
const DEPTS=[['men',"Men's"],['women',"Women's"],['any','Any']];
function deptChips(){ return `<div class="chips" style="flex-wrap:wrap;margin-top:8px">${DEPTS.map(([k,l])=>`<button type="button" class="chip" data-dept="${k}" aria-pressed="${S.settings.dept===k}">${l}</button>`).join('')}</div>`; }
const DEPT_HINT='Used for what to buy and for shopping searches. Outfits from your own closet are not affected.';
function mapsSearch(what){ const w=wxSet(); const where=(w.on&&w.mode==='place'&&w.label)?' near '+w.label:' near me';
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(what+where); }
function dropOffRow(worn){
  return `<div class="li dropoff"><div class="txt"><b>Where to take them</b><span>${worn?'Many charities also take worn-out textiles and sell them for recycling. Ask first, bag them apart and label the bag.':'Check each place\u2019s hours and what it accepts. Never leave bags beside a full bin.'}</span>
   <div class="row" style="margin-top:8px;gap:8px"><a class="btn sm primary" target="_blank" rel="noopener" href="${esc(mapsSearch('clothing donation'))}">Donation drop-offs</a>${worn?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(mapsSearch('textile recycling'))}">Textile recycling</a>`:''}</div></div></div>`;
}
// Repair finder: same Maps search as donations, with the kind of shop that fixes this category.
function repairShop(it){ return ['shoes','belt','bag'].includes(it.cat)?{q:'shoe repair',l:'Find a cobbler'}:it.cat==='watch'?{q:'watch repair',l:'Find watch repair'}:{q:'tailor alterations',l:'Find a tailor'}; }
function repairPanel(items){
  const rs=items.filter(i=>isActive(i)&&i.repair); if(!rs.length) return '';
  return `<div class="panel"><div class="panel-h"><h3>To repair</h3><span class="count">${rs.length}</span></div><div class="panel-h"><p>Until fixed, these are suggested only for sport, home and chores, unless you said they are fine anywhere.</p></div>
   ${rs.map(it=>{ const sh=repairShop(it); return `<div class="li care">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>${esc(it.repairNote||'Needs repair')}${it.repairOn?' · since '+esc(it.repairOn):''}</span></div><div class="acts"><button class="btn sm" data-fixed="${esc(it.id)}">Fixed</button><a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(mapsSearch(sh.q))}">${sh.l}</a></div></div>`; }).join('')}</div>`;
}
function renderCare(){
  const now=Date.now(), items=allItems(); const box=$('#careBody');
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():''; return; }
  const groups={retire:[],unused:[],downgraded:[],check:[]};
  for(const it of items) for(const f of careFlags(it,now,S.settings)) groups[f.kind].push([it,f]);
  const panel=(title,desc,rows,n)=>`<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="count">${n??rows.length}</span></div>${desc?`<div class="panel-h"><p>${desc}</p></div>`:''}${rows.join('')}</div>`;
  const out=[]; const rp=repairPanel(items); if(rp) out.push(rp);
  const np=notPickedPanel(items); if(np) out.push(np);
  const donate=groups.retire.concat(groups.unused.filter(([it])=>!groups.retire.some(([r])=>r.id===it.id)));
  out.push(donate.length?panel('Donate or recycle','Retired items and anything not worn for '+Math.round(S.settings.unusedDays/MONTH)+'+ months.',donate.map(([it,f])=>careRow(it,f,`<button class="btn sm" data-donate="${esc(it.id)}">Mark donated</button><button class="btn sm ghost" data-edit="${esc(it.id)}">Open</button>`)).concat([dropOffRow(groups.retire.length>0)]),donate.length)
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
      <div class="opt">${n.colors.map(c=>`<a class="shopc" href="${shopUrl(shopQ(c.color,n.idea))}" target="_blank" rel="noopener"><span class="swatch" style="background:${COLORS[c.color].hex}"></span>${c.color} <em>${c.adds?'+'+c.adds+' outfit'+(c.adds===1?'':'s'):'pairs widely'}</em></a>`).join(' &nbsp;or&nbsp; ')}</div>
      <div class="opt"><a class="shoplink" href="${shopUrl(shopQ(n.idea))}" target="_blank" rel="noopener">Shop ${esc(n.idea)} ›</a></div></div>`).join('')
      :`<div class="need"><span class="done">Covered: ${x.have.top} tops, ${x.have.bottom} bottoms, ${x.have.shoes} shoes ready.</span></div>`;
    return `<div class="panel"><div class="panel-h"><h3>${o.label}</h3><span class="count">${x.needs.length?x.needs.length+' gap'+(x.needs.length>1?'s':''):'ready'}</span></div>${body}</div>`;
  });
  const retire=items.filter(it=>(it.cond??4)<=1);
  const repl=retire.length?`<div class="panel"><div class="panel-h"><h3>Replace</h3><span class="count">${retire.length}</span></div>${retire.map(it=>`<div class="li stripe-retire">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>Replace with a ${esc(primary(it)||'')} ${esc(CAT[it.cat].label.toLowerCase())} for ${esc((it.occ||[]).map(o=>OCC[o]?.label.toLowerCase()).filter(Boolean).join(', ')||'the same use')}.</span></div><div class="acts"><a class="btn sm" href="${shopUrl(shopQ(primary(it),CAT[it.cat].label.toLowerCase()))}" target="_blank" rel="noopener">Shop</a></div></div>`).join('')}</div>`:'';
  const list=ideasState.list;
  const ai=`<div class="panel"><div class="panel-h"><h3>Ideas from Claude</h3><span class="spacer"></span><button class="btn sm" data-act="ideas" ${ideasState.busy?'disabled':''}>${ideasState.busy?'Thinking…':(list?'Ask again':'Suggest purchases')}</button></div>
     ${ideasState.err?`<div class="li"><span class="hint">${esc(ideasState.err)}</span></div>`:''}
     ${list?list.map(x=>`<a class="idea shop" href="${shopUrl([x.color&&!String(x.item).toLowerCase().includes(String(x.color).toLowerCase())?(COLORS[x.color]?shopQ(x.color):x.color):'',x.item].filter(Boolean).join(' '))}" target="_blank" rel="noopener"><b>${esc(x.item)}${x.color?' · '+esc(x.color):''}</b><span>${esc(OCC[x.occasion]?.label||x.occasion||'')}${x.pairsWith&&x.pairsWith.length?' · pairs with '+esc(x.pairsWith.join(', ')):''}</span><span>${esc(x.why||'')}</span>${SHOP_GO}</a>`).join(''):`<div class="li"><span class="hint">Claude reads a summary of your closet and the gaps above, and suggests specific pieces. Billed to your Anthropic API account.</span></div>`}</div>`;
  const st=styleSet(); const lr=learned(); const keys=[...new Set(st.pick.length?st.pick.concat(st.work):lr.ids.concat(st.work))];
  const build=keys.length?keys.map(k=>{ const ess=STYLES[k]?essentials(k,items):essentials(looks().find(l=>l.id===k)||{},items); const have=ess.filter(e=>e.have).length;
      return `<div class="panel"><div class="panel-h"><h3 ${STYLES[k]?'':'data-notr'}>${esc(styleName(k))}</h3><span class="count">${have} of ${ess.length}</span></div>
       ${ess.map(e=>e.have?`<button class="li lirow ess have" data-edit="${esc(e.have.id)}"><span class="mark">✓</span><div class="txt"><b ${STYLES[k]?'':'data-notr'}>${esc(e.label)}</b><span data-notr>${esc(e.have.name)}</span></div><span class="chev">›</span></button>`
         :`<a class="li lirow ess shop" href="${shopUrl(shopQ(e.label))}" target="_blank" rel="noopener"><span class="mark">+</span><div class="txt"><b ${STYLES[k]?'':'data-notr'}>${esc(e.label)}</b></div>${SHOP_GO}</a>`).join('')}</div>`; }).join('')
    :`<div class="panel"><div class="li"><div class="txt"><b>Build toward a style</b><span>Pick a style to see which pieces would build it from what you own.</span></div><div class="acts"><button class="btn sm" data-act="styles">Pick</button></div></div></div>`;
  const buildH=`<div><h3 style="margin:0">Build toward a style</h3><p class="hint" style="margin:4px 0 0">${st.pick.length?'Essentials for the styles you picked. ✓ means you own one.':(lr.ids.length?'Learned from what you wear. ✓ means you own one.':'')}</p></div>`;
  const ask=S.settings.dept?'':`<div class="panel"><div class="li"><div class="txt"><b>Which department do you shop in?</b><span>${DEPT_HINT}</span>${deptChips()}</div></div></div>`;
  box.innerHTML='<div style="display:flex;flex-direction:column;gap:16px">'+ask+comingUp(items)+repl+blocks.join('')+(keys.length?buildH:'')+build+ai+'</div>';
}
async function askIdeas(){
  if(ideasState.busy) return; ideasState={busy:true,list:ideasState.list,err:''}; renderShop();
  const items=allItems().filter(isActive);
  const closet=items.map(it=>`- ${it.name} | ${it.cat} | colors: ${(it.colors||[]).join('/')} | formality ${it.formality??3} | condition ${it.cond??4} | for: ${effectiveOccasions(it).join(', ')||'none'}`).join('\n').slice(0,12000);
  const gapText=gaps(items).map(x=>`${x.occ}: `+(x.needs.map(n=>`${n.slot} ${n.have}/${n.target}`).join(', ')||'covered')).join('\n');
  const st=styleSet(); const t=(st.pick.length?st.pick:learned().ids).map(k=>STYLES[k]?STYLES[k].label+' ('+styleDesc(k)+')':(()=>{ const l=looks().find(x=>x.id===k); return l?l.label+' ('+l.pieces.join(', ')+')':''; })()).filter(Boolean).join('; ');
  const pl=seasonPlan(Date.now(),wxOn()?wxSet().lat:NaN); const season=[pl?SEASONS[pl.id].label+' ('+SEASONS[pl.id].desc+')':'',...holidaysSoon(30).map(h=>h.label+' on '+h.date+' ('+h.tip+')')].filter(Boolean).join('; ');
  try{ const r=await callClaude('ideas',{closet,gaps:gapText,style:t,season,dept:S.settings.dept||''}); ideasState={busy:false,list:Array.isArray(r)?r.slice(0,8):[],err:Array.isArray(r)?'':'No ideas came back. Try again.'}; }
  catch(e){ ideasState={busy:false,list:ideasState.list,err:aiMsg(e)}; }
  renderShop();
}

/* ---------- sheets ---------- */
function closeSheet(){ $('#sheetRoot').innerHTML=''; document.body.style.overflow=''; ED=null; CK=null; LG=null; DI=null; }
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
  ED={more:!base,id:base?base.id:null,it:base?Object.assign({},base):{name:'',cat:'top',colors:[],formality:2,occ:[],cond:4,bought:'',notes:''},blob:null,preview:'',full:'',ai:null,busy:false,confirmDel:false};
  drawEditor();
  if(base&&base.photo&&canWrite()) fullPhotoUrl(base.photo).then(u=>{ if(ED&&ED.id===base.id&&u){ ED.full=u; drawEditor(); } });
}
function drawEditor(){ setTimeout(hydrateCuts,0);
  const it=ED.it; const pv=ED.cropChanged?ED.thumb:(ED.preview||ED.full||thumbSrc(it)); const hasPic=!!(ED.blob||it.photo)&&!isEx(it); const cropped=ED.cropChanged?!!ED.newBox:!!it.box;
  const colorBtns=Object.entries(COLORS).map(([k,v])=>{ const ix=(it.colors||[]).indexOf(k); return `<button type="button" data-color="${k}" aria-pressed="${ix>=0}" aria-label="${k}${ix>=0?', choice '+(ix+1):''}" title="${k}" style="background:${v.hex}">${ix>=0?`<span class="ord">${ix+1}</span>`:''}</button>`; }).join('');
  const seg=(key,labels)=>`<div class="seg">${[1,2,3,4,5].map(n=>`<button type="button" data-seg="${key}" data-v="${n}" aria-pressed="${(it[key]??(key==='cond'?4:3))===n}"><b>${n}</b><span>${key==='cond'?labels[n]:labels[n].split(' ')[0]}</span></button>`).join('')}</div>`;
  openSheet(sheetHead(ED.id?(it.review?'Review item':'Edit item'):'New item')+`
   ${isEx(it)?'<p class="hint"><span class="ex">Example</span> Changes to example items are not saved.</p>':''}
   <div class="photo"><div class="pv ${it.cut&&!ED.blob&&!ED.cropChanged&&!CUT.missing.has(it.id)?'studio':''}">${pv?`<img ${it.cut&&!ED.blob&&!ED.cropChanged?`data-cut="${esc(it.id)}"`:''} src="${esc(pv)}" alt="">`:glyph(it)}</div>
     <div class="col"><button type="button" class="btn sm" data-photo="cam">Take photo</button><button type="button" class="btn sm ghost" data-photo="gal">Choose photo</button>
     ${ED.blob&&claudeOn()?`<button type="button" class="btn sm primary" data-ai="tag" ${ED.busy?'disabled':''}>${ED.busy?'Reading photo…':'Fill in with Claude'}</button>`:''}
     ${ED.id&&!ED.blob&&needsCut(it)?(CUT.queue.includes(it.id)?'<span class="hint">Cut-out in progress…</span>':`<button type="button" class="btn sm primary" data-cutmake="1">${it.cut?'Make cut-out again':'Make cut-out'}</button>${it.cut?'<span class="hint">The saved cut-out could not be loaded.</span>':''}${!it.photo?'<span class="hint">Only a small preview of this photo is saved, so the cut-out will be soft. Choose the photo again for a sharper one.</span>':''}${CUT.failed[it.id]?`<span class="hint">Last try failed: ${esc(CUT.failed[it.id].slice(0,80))}</span>`:''}`):(ED.id&&!ED.blob&&it.cut&&!isEx(it)?`<button type="button" class="btn sm" data-cutredo="1" ${CUT.busy?'disabled':''}>Redo cut-out</button>`:'')}
</div></div>
   ${ED.ai?`<div class="ai">${ED.ai}</div>`:''}
   ${ED.id&&!ED.blob&&it.cat!=='socks'?`<button type="button" class="btn sm" data-pinsee="${esc(it.id)}" style="align-self:flex-start;margin:0 0 10px">See outfits with this</button>`:''}
   <div class="field"><label for="f-name">Name</label><input type="text" id="f-name" value="${esc(it.name)}" placeholder="e.g. White oxford shirt" maxlength="60"></div>
   <div class="field"><label for="f-cat">Category</label><select id="f-cat">${CATS.map(c=>`<option value="${c.id}" ${it.cat===c.id?'selected':''}>${c.label}</option>`).join('')}</select></div>
   <div class="field"><span class="lab">Colors · tap in order, main color first</span><div class="colors">${colorBtns}</div></div>
   <details class="more" ${ED.more?'open':''}><summary><b>More details</b><span>${esc([FORM[it.formality??3],COND[it.cond??4],(it.occ||[]).map(o=>OCC[o]?.label).filter(Boolean).join(', ')||'no occasions'].join(' · '))}</span></summary>
   <div class="field"><span class="lab">Dress level · ${FORM[it.formality??3]}</span>${seg('formality',FORM)}</div>
   <div class="field"><span class="lab">Warmth · ${['','Light','Medium','Warm'][warmthOf(it)]}${it.warmth?'':' (guessed)'}</span><div class="seg s3">${[[1,'Light','tee, shorts'],[2,'Medium','shirt, jeans'],[3,'Warm','sweater, coat']].map(([n,l,e])=>`<button type="button" data-seg="warmth" data-v="${n}" aria-pressed="${warmthOf(it)===n}"><b>${l}</b><span>${e}</span></button>`).join('')}</div>
     ${['outerwear','shoes','hat','bag'].includes(it.cat)?`<label class="row hint"><input type="checkbox" id="f-rain" ${rainReady(it)?'checked':''}> Made for rain or snow</label>`:''}
     ${it.cat==='bottom'?`<label class="row hint"><input type="checkbox" id="f-belt" ${needsBelt(it)?'checked':''}> Worn with a belt</label>`:''}
     ${it.cat==='top'?`<label class="row hint"><input type="checkbox" id="f-open" ${canOpen(it)?'checked':''}> Can be worn open over a t-shirt</label><label class="row hint"><input type="checkbox" id="f-inner" ${canUnder(it)?'checked':''}> Works as a t-shirt under an open shirt</label><label class="row hint"><input type="checkbox" id="f-base" ${needsBase(it)?'checked':''}> Worn over a t-shirt (hoodies, sweatshirts, sweaters)</label>`:''}</div>
   <div class="field"><span class="lab">Occasions</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.map(o=>{ const rule=o.id==='work'||o.id==='formal'; const on=rule?effectiveOccasions(Object.assign({},it,{cond:Math.max(4,it.cond??4)})).includes(o.id):(it.occ||[]).includes(o.id); const ov=o.id==='work'?it.workOverride:o.id==='formal'?it.formalOverride:null;
       return `<button type="button" class="chip" data-occt="${o.id}" aria-pressed="${on}">${o.label}${rule&&!ov?' <span class="n">auto</span>':''}</button>`; }).join('')}</div>
     <p class="hint">Work follows your dress code (${esc(DRESS_CODES[(S.settings.work&&S.settings.work.code)||'casual'].label)}) and Formal takes suits, dress shirts and dress shoes. Tap either to override this piece.</p>
     ${['top','outerwear','onepiece'].includes(it.cat)?`<label class="row hint"><input type="checkbox" id="f-graphic" ${it.graphic?'checked':''}> Big logo, text or print (left out of Work unless your dress code allows it)</label>`:''}</div>
   ${['top','bottom','onepiece','outerwear','shoes'].includes(it.cat)?`<div class="field"><span class="lab">Styles${Array.isArray(it.styles)&&it.styles.length?'':' (guessed)'}</span><div class="chips" style="flex-wrap:wrap">${STYLE_IDS.map(k=>`<button type="button" class="chip" data-pstyle="${k}" aria-pressed="${pieceStyles(it).includes(k)}">${STYLES[k].label}</button>`).join('')}</div></div>`:''}
   <div class="field"><div class="row"><span class="lab" style="flex:1">Condition · ${COND[it.cond??4]}</span><button type="button" class="btn sm" data-isnew="1">Brand new</button></div>${seg('cond',COND)}<p class="hint">5 like new · 4 good, no visible wear · 3 visible wear (pilling, fading), fine for home · 2 worn out (stains, small holes), chores only · 1 unusable.</p></div>
   <div class="row2"><div class="field"><label for="f-bought">Bought (optional)</label><input type="month" id="f-bought" value="${esc(it.bought||'')}"></div>
   <div class="field"><label for="f-price">Price paid (optional)</label><input type="number" inputmode="decimal" min="0" step="0.01" id="f-price" value="${it.price!=null?esc(it.price):''}" placeholder="0.00"></div></div>
   ${['top','bottom','onepiece','socks','outerwear'].includes(it.cat)?`<div class="field"><span class="lab">Needs washing after</span><div class="chips" style="flex-wrap:wrap">${[[1,'Every wear'],[2,'2 wears'],[3,'3'],[5,'5'],[10,'10'],[0,'Never']].map(([v,l])=>`<button type="button" class="chip" data-washev="${v}" aria-pressed="${washEvery(it)===v}">${l}</button>`).join('')}</div>
     <label class="row hint"><input type="checkbox" id="f-dirty" ${it.dirty?'checked':''}> In the wash now (left out of suggestions)</label></div>`:''}
   <div class="field"><label class="row hint"><input type="checkbox" id="f-repair" ${it.repair?'checked':''}> Needs repair</label>
     ${it.repair?`<input type="text" id="f-repairNote" value="${esc(it.repairNote||'')}" placeholder="What needs fixing, e.g. left pocket torn" maxlength="80" style="margin-top:8px">
     <label class="row hint" style="margin-top:8px"><input type="checkbox" id="f-repairOk" ${it.repairOk?'checked':''}> Fine to wear anywhere until then (otherwise only sport, home and chores)</label>`:''}</div>
   <div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" maxlength="300" placeholder="Fit, care, where it came from">${esc(it.notes||'')}</textarea></div>
   ${hasPic||(ED.id&&ED.it.cut)?`<div class="field"><span class="lab">Photo tools</span><div class="row">
     ${hasPic?(cropped?`<button type="button" class="btn sm" data-uncrop="1" ${ED.busy?'disabled':''}>Show whole photo</button>`:`<button type="button" class="btn sm" data-ai="box" ${ED.busy?'disabled':''}>Crop to the clothes</button>`):''}
     ${ED.id&&ED.it.cut&&!ED.blob?`<button type="button" class="btn sm ghost" data-cutdel="1">Remove cut-out</button>`:''}</div></div>`:''}
   </details>
   ${ED.id&&!isEx(it)?`<p class="hint">Worn ${it.worn||0} time${it.worn===1?'':'s'}${it.lastWorn?', last on '+esc(it.lastWorn):''}.${it.price!=null?' '+(it.worn?money(it.price/it.worn)+' per wear so far.':'Not worn yet, so no cost per wear.'):''}${it.lastCheck?' Last condition check '+esc(it.lastCheck)+'.':''}</p>`:''}
   <div class="row sheet-actions"><button type="button" class="btn primary" data-save ${ED.busy?'disabled':''}>${it.review?'Confirm and save':'Save'}</button><button type="button" class="btn ghost" data-close>Cancel</button><span class="spacer"></span>
   ${ED.id?`<button type="button" class="btn danger sm" data-del>${ED.confirmDel?'Tap again to delete':'Delete'}</button>`:''}</div>`);
}
function readEditorFields(){ if(!ED) return; const it=ED.it, g=s=>$(s); if(g('#f-rain')) it.rain=g('#f-rain').checked; if(g('#f-open')) it.open=g('#f-open').checked; if(g('#f-belt')) it.belt=g('#f-belt').checked; if(g('#f-graphic')) it.graphic=g('#f-graphic').checked; if(g('#f-dirty')){ const d=g('#f-dirty').checked; if(d!==!!it.dirty){ it.dirty=d; if(d) it.dirtyOn=todayISO(); else { it.wearsSinceWash=0; delete it.dirtyOn; } } } if(g('#f-repair')){ const r=g('#f-repair').checked; if(r&&!it.repair){ it.repair=true; it.repairOn=todayISO(); } if(!r&&it.repair){ delete it.repair; delete it.repairNote; delete it.repairOn; delete it.repairOk; } } if(it.repair&&g('#f-repairNote')) it.repairNote=g('#f-repairNote').value.trim(); if(it.repair&&g('#f-repairOk')) it.repairOk=g('#f-repairOk').checked; if(g('#f-inner')) it.inner=g('#f-inner').checked; if(g('#f-base')) it.base=g('#f-base').checked; if(g('#f-name')) it.name=g('#f-name').value.trim(); if(g('#f-cat')) it.cat=g('#f-cat').value; if(g('#f-bought')) it.bought=g('#f-bought').value; if(g('#f-notes')) it.notes=g('#f-notes').value.trim(); if(g('#f-price')){ const v=parseFloat(g('#f-price').value); if(isFinite(v)&&v>=0) it.price=Math.round(v*100)/100; else delete it.price; } }
async function editorSetPhoto(blob){
  try{ const p=await prepare(blob); if(!ED) return; ED.blob=p.full; ED.thumb=p.thumb; ED.newBox=null; ED.cropChanged=false; if(ED.preview) URL.revokeObjectURL(ED.preview); ED.preview=URL.createObjectURL(p.full); ED.ai=null;
    if(!claudeOn()&&!(ED.it.colors||[]).length){ const g=await guessColors(p.full).catch(()=>[]); if(ED&&g.length){ ED.it.colors=[g[0]]; ED.ai='Main color guessed on your phone: '+g[0]+(g.length>1?' (or maybe '+g.slice(1).join(', ')+')':'')+'. Check it, then set the category and occasions.'; } } }
  catch(e){ toast('That image could not be opened.'); }
  if(ED) drawEditor();
}
async function saveEditor(){
  readEditorFields(); const it=ED.it;
  if(!it.name){ toast('Give the item a name.'); $('#f-name')?.focus(); return; }
  if(!it.colors||!it.colors.length){ toast('Pick at least one color.'); return; }
  if(!isEx(it)&&!canWrite()){ toast('You are offline. Changes need a connection.'); return; }
  ED.busy=true; const ED_hadBlob=!!ED.blob; drawEditor();
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
  if(ok){ if(oldPhoto) removePhoto(oldPhoto); closeSheet(); toast('Saved'); if(ED_hadBlob) autoCuts([byId(it.id)].filter(Boolean)); }
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
// Defaults from research (2026-10): a garment kept by one owner lasts about 5.3 years and 94 wears, and is worn about
// 30 times a year while under 2 years old (Laitala & Klepp 2021); UK clothing lasts 3.3 years on average (WRAP).
// So: check condition after 30 wears or 12 months; suggest donating after 2 years unworn (3 for coats and formal wear).
function settingsLoaded(){
  const st=S.settings;
  if(!st.v2){ if(st.checkEvery===25&&st.checkDays===180&&st.unusedDays===365){ st.checkEvery=30; st.checkDays=365; st.unusedDays=730; if(UID&&sb&&S.online) queueSettingsSave(); } st.v2=true; }
  setDressCode(st.work); setDept(st.dept);
}
const SETDEF={
  checkEvery:{label:'Check condition after',unit:v=>v+' wears',min:5,max:200,step:5,presets:[20,30,50,80],get:s=>s.checkEvery,set:(s,v)=>{s.checkEvery=v;}},
  checkDays:{label:'…or after',unit:v=>v+(v===1?' month':' months'),min:1,max:36,step:1,presets:[6,12,18,24],get:s=>Math.max(1,Math.round(s.checkDays/MONTH)),set:(s,v)=>{s.checkDays=Math.round(v*MONTH);}},
  washDays:{label:'Expect clothes back from the wash after',unit:v=>v+(v===1?' day':' days'),min:1,max:30,step:1,presets:[3,7,10,14],get:s=>s.washDays||7,set:(s,v)=>{s.washDays=v;}},
  unusedDays:{label:'Suggest donating clothes not worn for',unit:v=>v+' months',min:3,max:60,step:1,presets:[12,18,24,36],get:s=>Math.max(3,Math.round(s.unusedDays/MONTH)),set:(s,v)=>{s.unusedDays=Math.round(v*MONTH);}}};
function settingRow(k){
  const d=SETDEF[k], v=d.get(S.settings);
  return `<div class="setting"><span class="lab">${d.label}</span>
    <div class="stepper"><button type="button" class="stepbtn" data-step="${k}" data-d="-1" aria-label="Decrease">&minus;</button>
    <output id="out-${k}" aria-live="polite">${d.unit(v)}</output>
    <button type="button" class="stepbtn" data-step="${k}" data-d="1" aria-label="Increase">+</button></div>
    <div class="presets">${d.presets.map(p=>`<button type="button" class="chip" data-preset="${k}" data-v="${p}" aria-pressed="${p===v}">${d.unit(p)}</button>`).join('')}</div></div>`;
}
function langSelect(id){ return `<select id="${id}" class="langsel" data-notr aria-label="Language">${I18N.langs.map(([c,n])=>`<option value="${c}" ${c===I18N.lang?'selected':''}>${n}</option>`).join('')}</select>`; }
function themeGet(){ try{ return localStorage.getItem('wearcycle.theme')||'auto'; }catch(e){ return 'auto'; } }
function themeSet(t){ try{ localStorage.setItem('wearcycle.theme',t); }catch(e){}
  const r=document.documentElement; if(t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t);
  const dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{ m.removeAttribute('media'); m.setAttribute('content',dark?'#12161e':'#f6f4f1'); }); }
function styleSummary(){ const st=styleSet(), l=learned();
  const main=st.pick.length?st.pick.map(styleName).filter(Boolean).join(', ')
    :(l.ids.length?'Auto, learned from what you wear: '+l.ids.map(k=>STYLES[k].label).join(', '):'Auto: log '+Math.max(1,5-l.days)+' more outfits to learn it, or pick one.');
  return main+(st.work.length?' · '+'Work: '+st.work.map(styleName).filter(Boolean).join(', '):''); }
// Small original flat-lay for each style card: the style's typical pieces in its usual colors and patterns.
const STYLE_ART={
  classic:[['outerwear','#1f2e57'],['top','#9bbfe5'],['bottom','#b3a477'],['shoes','#6a4a2e']],
  heritage:[['outerwear','#b07a4a'],['top','#b9322e','plaid'],['bottom','#4b6589'],['shoes','#6a4a2e']],
  minimal:[['top','#f6f6f3'],['bottom','#1c1d20'],['shoes','#f6f6f3']],
  street:[['hat','#1c1d20'],['top','#8b9097'],['bottom','#1c1d20'],['shoes','#f6f6f3']],
  sporty:[['top','#2e8987'],['bottom','#1c1d20'],['shoes','#d6742a']],
  preppy:[['top','#e29ab0'],['top','#1f2e57','stripe'],['bottom','#b3a477'],['shoes','#6a4a2e']]};
function styleArt(k){
  const look=STYLES[k]?null:looks().find(l=>l.id===k); const hex=c=>COLORS[c]?COLORS[c].hex:'#9aa3ad';
  const parts=STYLES[k]?STYLE_ART[k]:[['top',hex((look.colors||[])[0])],['bottom',hex((look.colors||[])[1]||'denim')],['shoes',hex((look.colors||[])[2]||'brown')]];
  const id='sa-'+String(k).replace(/[^a-z0-9]/gi,''), pc=(parts.find(p=>p[2])||[])[1]||'#b9322e';
  const gap=4, sz=Math.min(56,(192-(parts.length-1)*gap)/parts.length), total=parts.length*sz+(parts.length-1)*gap, x0=(200-total)/2;
  const items=parts.map(([key,c,pat],n)=>`<g transform="translate(${x0+n*(sz+gap)},${(64-sz)/2}) scale(${sz/48})"><g fill="${pat?`url(#${id}-${pat})`:c}" stroke="rgba(120,130,140,.6)" stroke-width="1.2" stroke-linejoin="round">${GLYPH[key]}</g></g>`).join('');
  return `<svg class="styleart" viewBox="0 0 200 64" aria-hidden="true"><defs>
    <pattern id="${id}-plaid" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${pc}"/><path d="M0 2h8M2 0v8" stroke="#1c1d20" stroke-width="2" opacity=".75"/></pattern>
    <pattern id="${id}-stripe" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f6f6f3"/><rect width="6" height="3" fill="${pc}"/></pattern></defs>${items}</svg>`;
}
function styleCount(k){ return allItems().filter(i=>isActive(i)&&['top','bottom','onepiece','outerwear','shoes'].includes(i.cat)&&(STYLES[k]?pieceStyles(i).includes(k):WardrobeLogic.lookMatch(i,looks().find(l=>l.id===k)||{}))).length; }
function openStyles(){
  const st=styleSet(); const l=learned();
  const card=(k,label,desc,extra)=>`<button class="stylecard" data-style-tog="${esc(k)}" aria-pressed="${st.pick.includes(k)}">${styleArt(k)}<b ${extra?'data-notr':''}>${esc(label)}</b><span ${extra?'data-notr':''}>${esc(desc)}</span><em>${styleCount(k)===1?'You own 1 piece':'You own '+styleCount(k)+' pieces'}</em>${extra||''}</button>`;
  openSheet(sheetHead('Your style')+`
   <p class="hint">Pick any styles you like. Outfits for work and going out favor pieces in these styles, and the Shop tab shows what would build them. The fewer you pick, the more they shape the ranking. With none picked, Wearcycle learns from what you wear${l.ids.length?' (now: '+esc(l.ids.map(k=>STYLES[k].label).join(', '))+')':''}.</p>
   <div class="stylegrid">${STYLE_IDS.map(k=>card(k,STYLES[k].label,styleDesc(k))).join('')}
   ${looks().map(x=>card(x.id,x.label,(x.summary||'')+(x.pieces&&x.pieces.length?' · '+x.pieces.join(', '):''),`<span class="lookdel" role="button" data-look-del="${esc(x.id)}">Remove</span>`)).join('')}</div>
   <button class="btn" data-act="addLook">+ Add a look you like</button>
   <p class="hint">Use a photo of an outfit you like: yours, a colleague's or one from Instagram or a store. Claude describes only the clothes and saves that description as a style. The photo itself is not kept.</p>
   <div class="field"><span class="lab">For work</span><div class="chips" style="flex-wrap:wrap">${[['','Same as above'],...STYLE_IDS.map(k=>[k,STYLES[k].label]),...looks().map(x=>[x.id,x.label])].map(([k,lb])=>`<button class="chip" data-style-work="${esc(k)}" aria-pressed="${k?st.work.includes(k):!st.work.length}" ${looks().some(x=>x.id===k)?'data-notr':''}>${esc(lb)}</button>`).join('')}</div>
   <p class="hint">Pick one or more, or keep it the same as above. Your work dress code still decides which pieces count for Work.</p></div>`);
}
async function addLook(){
  if(!canWrite()){ toast('You are offline. Claude needs a connection.'); return; }
  const [f]=await pickFiles(false); if(!f) return;
  job('Reading the look…',40);
  try{ const r=await callClaude('look',{image:await blobToBase64(await shrink(f,1024))}); job('');
    if(!r||r.error||!Array.isArray(r.pieces)){ toast(r&&r.error?String(r.error):'Claude could not find clothes in that photo.',5000); return; }
    const look={id:'look-'+uuid().slice(0,8),label:String(r.name||'My look').slice(0,40),base:(r.styles||[]).filter(x=>STYLES[x]).slice(0,3),pieces:r.pieces.map(String).slice(0,10),colors:(r.colors||[]).filter(c=>COLORS[c]).slice(0,5),summary:String(r.summary||'').slice(0,160)};
    looks().push(look); const st=styleSet(); st.pick.push(look.id);
    saveCache(); queueSettingsSave(); S.fitKey=''; openStyles(); renderAll(); toast('Saved '+look.label+'. Outfits now favor it.',5000);
  }catch(e){ job(''); toast(aiMsg(e),6000); }
}
async function scanStyles(){
  if(S.busy) return; if(!canWrite()){ toast('You are offline.'); return; }
  const list=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&!Array.isArray(i.styles));
  if(!list.length){ toast('Every piece with a photo has its type and styles.'); return; }
  closeSheet(); S.busy=true; let n=0;
  for(const it of list){ job('Recognizing pieces '+(n+1)+' of '+list.length,n/list.length*100);
    try{ const blob=await photoBlob(it.photo); const r=await callClaude('style',{image:await blobToBase64(await shrink(blob,768))});
      if(r&&!r.error){ const p={}; applyStyleFields(p,r); if(typeof r.graphic==='boolean'&&typeof it.graphic!=='boolean') p.graphic=r.graphic; if(!p.styles) p.styles=[]; await patchItem(it.id,p); } n++; }
    catch(e){ S.busy=false; job(''); toast(aiMsg(e),6000); return; } }
  S.busy=false; job(''); S.fitKey=''; renderAll(); toast('Recognized '+n+' pieces.',5000);
}
function applyStyleFields(it,r){
  if(r.kind) it.kind=String(r.kind).slice(0,40);
  if(['solid','check','stripe','print','graphic','other'].includes(r.pattern)) it.pattern=r.pattern;
  if(r.material) it.material=String(r.material).slice(0,20);
  if(Array.isArray(r.styles)){ const v=r.styles.filter(x=>STYLES[x]).slice(0,3); if(v.length) it.styles=v; }
}
function openSettings(){
  openSheet(sheetHead('Settings')+`
   <div class="panel"><div class="li"><div class="txt"><b>${esc(EMAIL||'Signed in')}</b><span>Your closet syncs privately to your account.</span></div><div class="acts"><button class="btn sm" data-act="signout">Sign out</button></div></div>
   ${S.installEvt?'<div class="li"><div class="txt"><b>Install on this device</b><span>Adds Wearcycle to your home screen.</span></div><div class="acts"><button class="btn sm primary" data-act="install">Install</button></div></div>':''}</div>
   <h3>Appearance</h3>
   <div class="panel"><div class="li"><div class="txt"><b>Light or dark</b><span>Auto follows your phone's setting.</span>
     <div class="chips" style="margin-top:8px">${[['auto','Auto'],['light','Light mode'],['dark','Dark mode']].map(([k,l])=>`<button type="button" class="chip" data-theme-set="${k}" aria-pressed="${themeGet()===k}">${l}</button>`).join('')}</div></div></div>
   <div class="li"><div class="txt"><b>Language</b><span>Item names you typed stay as they are.</span></div><div class="acts">${langSelect('langSel')}</div></div></div>
   <h3>Style</h3>
   <div class="panel"><div class="li"><div class="txt"><b>Shopping department</b><span>${DEPT_HINT} Any: searches cover both; style lists use menswear pieces.</span>${deptChips()}</div></div>
   <button class="li lirow" data-act="styles"><div class="txt"><b>Your style</b><span>${esc(styleSummary())}</span></div><span class="chev">›</span></button>
   <div class="li"><div class="txt"><b>Recognize piece types</b><span>${(()=>{const n=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&!Array.isArray(i.styles)).length;return n?'Claude looks at '+n+' piece'+(n===1?'':'s')+' once to note the type, pattern, fabric and styles (one small request each). New photos get this when Claude reads them.':'Every piece with a photo has its type and styles.';})()}</span></div><div class="acts"><button class="btn sm" data-act="scanStyles">Check</button></div></div></div>
   <div class="panel"><div class="li"><div class="txt"><b>Palette: ${esc(PALETTES[S.settings.palette||'any'].label)}</b><span>${esc(PALETTES[S.settings.palette||'any'].desc)}</span></div><div class="acts"><button class="btn sm" data-act="palettes">Change</button></div></div></div>
   <h3>Weather</h3>
   <div class="panel"><div class="li"><div class="txt"><b>${wxOn()?esc(wxSet().label||'Your location'):'Off'}</b><span>${wxOn()?'Outfits follow today\u2019s forecast.':'Outfits ignore the weather.'}</span></div><div class="acts"><button class="btn sm" data-wx="edit">${wxOn()?'Change':'Set up'}</button></div></div></div>
   <h3>Photos</h3>
   <div class="panel"><div class="li"><div class="txt"><b>Crop photos to the clothes</b><span>${(()=>{const n=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&!i.box).length;return n?n+' photo'+(n===1?'':'s')+' show the background. Claude finds each piece and crops around it (one small request per photo).':'All photos are cropped. New photos are cropped when Claude reads them.';})()}</span></div><div class="acts"><button class="btn sm" data-act="cropAll">Crop</button></div></div>
   <div class="li"><div class="txt"><b>Flat-lay cut-outs</b><span>${(()=>{const n=[...S.items.values()].filter(needsCut).length;return n?n+' piece'+(n===1?'':'s')+' without a cut-out. Made on this phone (no AI cost); the first time downloads about 100 MB, then about 20 to 60 seconds per piece.':'Every piece with a photo has a cut-out.';})()}</span></div><div class="acts"><button class="btn sm" data-act="cutAll" ${CUT.busy?'disabled':''}>Make</button></div></div>
   <label class="li"><div class="txt"><b>Enhance how photos look</b><span>Brighter, clearer photos on screen, with each piece's brightness matched to its main color. Your saved photos are not changed.</span></div><input type="checkbox" id="enhanceT" ${enhanceOn()?'checked':''}></label>
   <label class="li"><div class="txt"><b>Make cut-outs automatically</b><span>Right after you add or re-photograph clothes.</span></div><input type="checkbox" id="autoCutT" ${S.settings.autoCut===false?'':'checked'}></label></div>
   <h3>Holidays</h3>
   <div class="panel"><div class="li"><div class="txt"><b>Themed outfits</b><span>Two weeks before each holiday you keep on, a chip on the Outfits screen suggests looks in its colors.</span>
     <div class="chips" style="flex-wrap:wrap;margin-top:8px">${Object.entries(HOLIDAYS).filter(([k,h])=>!h.region||h.region===region()).map(([k,h])=>`<button type="button" class="chip" data-hol-tog="${k}" aria-pressed="${!holidaysOff().includes(k)}">${h.label}</button>`).join('')}</div></div></div></div>
   <h3>Work dress code</h3>
   <div class="panel dresspanel"><div class="li" style="flex-direction:column;align-items:stretch;gap:10px">
     <div class="chips" style="flex-wrap:wrap">${Object.entries(DRESS_CODES).map(([k,d])=>`<button class="chip" data-wcode="${k}" aria-pressed="${((S.settings.work||{}).code||'casual')===k}">${esc(d.label)}</button>`).join('')}</div>
     <span class="hint">${esc(DRESS_CODES[(S.settings.work||{}).code||'casual'].desc)} Pieces are sorted into Work automatically from these rules.</span>
     ${[['tees','T-shirts allowed'],['hoodies','Hoodies allowed'],['shorts','Shorts allowed'],['graphics','Big logos, text or prints allowed']].map(([k,l])=>`<label class="row"><input type="checkbox" data-wflag="${k}" ${(Object.assign({},DRESS_CODES[(S.settings.work||{}).code||'casual'],S.settings.work||{}))[k]?'checked':''}> ${l}</label>`).join('')}
   </div>
   <div class="li"><div class="txt"><b>Find logos and prints</b><span>${(()=>{const n=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&['top','outerwear','onepiece'].includes(i.cat)&&typeof i.graphic!=='boolean').length;return n?'Claude looks at '+n+' top'+(n===1?'':'s')+' and jackets once (one small request each). New photos are checked when Claude reads them.':'All tops and jackets are checked.';})()}</span></div><div class="acts"><button class="btn sm" data-act="scanGraphics">Check</button></div></div></div>
   <h3>Laundry</h3>
   <div class="panel"><label class="li"><div class="txt"><b>Track what's in the wash</b><span>Pieces go to the wash after their set number of wears and leave suggestions until you mark them clean.</span></div><input type="checkbox" id="laundryT" ${laundryOn()?'checked':''}></label>
    <label class="li"><div class="txt"><b>Put them back automatically</b><span>Off: Wearcycle asks on the Outfits screen. On: pieces return to suggestions after the days below, even if you have not washed them yet.</span></div><input type="checkbox" id="washAutoT" ${S.settings.washAuto?'checked':''}></label></div>
   ${settingRow('washDays')}
   <h3>Reminders</h3>
   ${settingRow('checkEvery')}${settingRow('checkDays')}${settingRow('unusedDays')}
   <p class="hint" id="set-status">Changes save automatically.</p>
   <h3>Help</h3>
   <div class="panel"><button class="li lirow" data-act="help"><div class="txt"><b>How Wearcycle decides</b><span>The rules behind outfits, weather, socks, belts, palettes and donations.</span></div><span class="chev">›</span></button></div>
   <h3>Privacy and your data</h3>
   <div class="panel"><a class="li lirow" href="privacy.html" target="_blank" rel="noopener"><div class="txt"><b>Privacy notice</b><span>What is stored, where, who processes it, and your rights.</span></div><span class="chev">›</span></a>
   <label class="li"><div class="txt"><b>Claude features</b><span>Claude reads the photos you add, checks condition and suggests what to buy. Those photos, or a text list of your clothes, go to Anthropic in the United States, which deletes them within 30 days and does not train on them. Off: you set each piece's category, colors and occasions yourself (Wearcycle guesses the color on your phone). Outfits are only as good as those details.</span></div><input type="checkbox" id="claudeT" ${claudeOn()?'checked':''}></label>
   <button class="li lirow" data-act="export"><div class="txt"><b>Download my data</b><span>Your clothes, outfit log and settings as a file, plus your photos, in one .zip.</span></div><span class="chev">›</span></button>
   <button class="li lirow" data-act="wipe"><div class="txt"><b style="color:var(--bad)">Delete my data and account</b><span>Removes your clothes, photos, outfit log and settings from the server, and closes your account.</span></div><span class="chev">›</span></button></div>
   <div class="row">${FIXED_SERVER?'':'<button class="linkbtn" data-act="server" style="margin:0">Server settings</button>'}<span class="spacer"></span><span class="hint">Version ${APP_VERSION}</span></div>`);
}
function openHelp(){ openSheet(sheetHead('How Wearcycle decides')+`<div class="rules helpdoc">    <p><b>Outfit score.</b> +2 for an all-neutral palette or neutrals plus one accent color, +1 for two analogous or complementary accents, -2 or -3 for accents that compete. +1 when all pieces sit within one dress level, minus a point for each extra level apart. Up to +1.5 for pieces that have rested two weeks, -1 if something was worn yesterday (shoes worn today or yesterday: -3, so they get a day to dry out, as the NHS advises; the list also spreads your other pairs across the picks), -2 if the same top and bottom were worn together this week.</p>
    <p><b>Weather.</b> Uses the feels-like temperature from now until 9 pm, shifted by your "I usually feel" choice. Below 12° shorts lose 2 points (3 below 5°); below 16° they lose 1. Below 5° an outfit without an outer layer loses 2; a warm layer earns +1. Above 24° each warm piece loses 2 and an all-light outfit earns +1. With 50%+ rain or snow, a waterproof layer earns +1 and open shoes lose 1.5. In Auto, an outer layer is added below 15° or when it is wet. These thresholds are practical rules of thumb, not standards.</p>
    <p><b>Layered look.</b> Shirts that can be worn open (button-ups, flannels, overshirts, cardigans) are also suggested over a t-shirt, using the t-shirt that scores best. Worn open, the shirt counts as casual (dress level 2 at most) and the t-shirt is left out of the dress-level check. With weather on, the t-shirt adds +0.5 below 16° and costs 1 point above 24°. Which items count is guessed from their names; change it in each item's editor.</p>
    <p>Hoodies, sweatshirts and sweaters always get the best-matching t-shirt underneath when you have one. Change it per piece with \u201cWorn over a t-shirt\u201d in its More details.</p>
    <p><b>Belts.</b> Jeans, chinos, trousers and casual shorts always get a belt if you own one, even one not tagged for the occasion; joggers and athletic wear don't. With leather dress shoes the belt should match them (black with black, brown with brown) and a casual belt is flagged; with sneakers any belt that keeps the colors in harmony. If your only belt doesn't fit the rule it is still shown, with a warning. Change whether a bottom takes a belt in its editor.</p>
    <p><b>Socks.</b> One pair is suggested whenever the outfit has closed shoes. For work and going out: socks the color of the trousers first (it lengthens the leg line), then a shade darker than pale trousers, then socks matching the shoes; white socks with dress shoes are avoided. For casual days, any socks that keep the colors in harmony. Socks don't change an outfit's rank; tap them to swap.</p>
    <p><b>Style palette.</b> Optional. When set, an outfit whose main pieces all use palette colors gets +1, and each piece outside it -0.5. Palettes: muted classics, earth tones, monochrome, navy and white.</p>
    <p><b>Match label.</b> Excellent (score 4+), Great (3+), Good (2+), Fair (0.5+), Weak. Each warning, shown with a red dot, lowers the label one step. Options are listed from highest score down.</p>
    <p><b>Work dress code.</b> Casual: t-shirts, hoodies, jeans and casual jackets (dress levels 2 to 3), no shorts, no big logos. Business casual: shirts, polos, knits and chinos (levels 3 to 4), no t-shirts or hoodies. Suits: levels 4 to 5, and a jacket is added automatically. Each rule can be switched in Settings, and any piece can be overridden in its editor. Formal (interviews, weddings, graduations) takes pieces at level 4 or above and always adds a jacket.</p>
    <p><b>Reminders.</b> A garment kept by one owner lasts about 5.3 years and 94 wears, and is worn about 30 times a year while under 2 years old (Laitala and Klepp, Oslo Metropolitan University, 2021); UK clothing lasts 3.3 years on average (WRAP). So condition is checked after 30 wears or 12 months, and donating is suggested after 2 years unworn, 3 years for coats and formal wear, which can sit out a whole season or wait for the next wedding.</p>
    <p><b>Laundry.</b> Each wear counts toward a piece's wash point; when it is reached the piece goes to the wash and leaves suggestions until you mark it clean. Defaults follow laundry experts quoted by Reviewed and Scripps/KSHB: t-shirts, tank tops and socks after every wear; other shirts after 2; sweaters and knits after 5; jeans after 5; smart trousers after 4; shorts and joggers after 2. Anything worn for Sport goes straight to the wash. Jackets, shoes and accessories never go on their own. Change any piece in its More details. Wearcycle cannot tell when you do laundry, so after 7 days (a weekly wash; change it in Settings) the Outfits screen asks whether the wash is done. Returning pieces automatically is optional and off by default, because a wrong guess would suggest clothes that are still dirty.</p>
    <p><b>Neutrals.</b> Black, white, grey, navy, beige, khaki, brown, denim and olive pair with anything. This follows common menswear color guidance; it is a convention, not a law.</p>
    <p><b>Repairs.</b> Mark a piece \u201cNeeds repair\u201d in its More details and note what to fix. Until it is fixed it is suggested only for sport, home and chores, unless you say it is fine anywhere. The Care tab lists it with a link to tailors (or cobblers for shoes, belts and bags, watch repair for watches) near you. Repair pays off: wearing clothes nine months longer cuts their carbon, water and waste footprints by about 20 to 30% each (WRAP, 2015).</p>
    <p><b>Styles.</b> A style is a consistent set of piece types, fabrics and patterns: Classic, Heritage, Minimal, Street, Sporty and Preppy (common menswear conventions, not rules). Each piece's styles come from Claude's photo reading or, until then, from its name. For work and going out, an outfit gets up to +1.5 when all its main pieces fit your style and -0.5 when none do; with no style picked, Wearcycle learns it from what you logged (5+ outfits in 120 days) at half weight. Mixing street or sporty pieces with classic or preppy ones costs 1 point and shows a note. Looks added from a photo keep only Claude's description of the clothes, never the photo.</p>
    <p><b>Where to donate.</b> The Donate list links to a Google Maps search for clothing drop-offs near your weather place, or near you. Worn-out pieces are worth taking too: Value Village pays charities for textiles even when damaged, and those become insulation, matting or underlay (CBC News, 2017).</p>
    <p><b>Condition bars.</b> Work and going out need 4/5, sport and home 3/5, chores 2/5. A casual garment that drops to 3/5 or 2/5 moves to home and chores automatically. 1/5 goes to the donate list.</p>
    <p><b>Shopping targets.</b> Work: 5 tops (one per weekday), 3 bottoms, 2 shoes. Going out, sport and home: 3, 2, 1. Chores: 2, 1, 1. Colors are ranked by how many good combinations a new piece would create with what you own.</p>
</div>`); }
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

/* ---------- delete my data ---------- */
function openWipe(){
  openSheet(sheetHead('Delete my data')+`<p>This permanently deletes your ${S.items.size} pieces, their photos and cut-outs, your outfit log and settings. It cannot be undone. To keep a copy, use Download my data first.</p>
   <label class="row" style="margin:0 0 12px"><input type="checkbox" id="wipe-acct" checked> Also close my account (your email and password are deleted)</label>
   <div class="field"><label for="wipe-t">Type DELETE to confirm</label><input type="text" id="wipe-t" autocomplete="off"></div><p class="err" id="wipe-err"></p>
   <div class="row sheet-actions"><button class="btn danger" id="wipe-go">Delete everything</button><button class="btn ghost" data-close>Cancel</button></div>`);
  $('#wipe-go').onclick=async()=>{ if($('#wipe-t').value.trim()!=='DELETE'){ $('#wipe-err').textContent='Type DELETE in capitals.'; return; }
    if(!canWrite()){ $('#wipe-err').textContent='You are offline.'; return; }
    $('#wipe-go').disabled=true; $('#wipe-err').textContent='Deleting…';
    const paths=[...S.items.values()].flatMap(i=>[i.photo,i.cut]).filter(Boolean);
    for(let k=0;k<paths.length;k+=100) await sb.storage.from('photos').remove(paths.slice(k,k+100));
    const r=await Promise.all([sb.from('items').delete().eq('user_id',UID),sb.from('wears').delete().eq('user_id',UID),sb.from('settings').delete().eq('user_id',UID)]);
    const err=r.find(x=>x.error); if(err){ $('#wipe-err').textContent='Could not finish: '+err.error.message; $('#wipe-go').disabled=false; return; }
    try{ await caches.delete('wearcycle-cutouts'); }catch(e){}
    let closed=false;
    if($('#wipe-acct').checked){ $('#wipe-err').textContent='Closing your account…';
      try{ const {data,error}=await sb.functions.invoke('claude',{body:{task:'delete_account'}}); closed=!error&&data&&data.result&&data.result.deleted; }catch(e){} }
    LS.del(cacheKey()); try{ localStorage.removeItem('wearcycle.consent'); }catch(e){}
    if($('#wipe-acct').checked&&!closed){ $('#wipe-err').textContent='Your data is deleted, but the account could not be closed automatically. Email wearcycle.app@gmail.com from your account address and it will be closed.'; $('#wipe-go').hidden=true; return; }
    closeSheet(); await sb.auth.signOut().catch(()=>{}); if(closed) toast('Your data and account are deleted.',5000); };
}

/* ---------- privacy: consent record and data download ----------
   PIPEDA asks for meaningful consent that names what is collected, who it is shared with (Supabase, Anthropic),
   and that it may be processed outside Canada. Consent is recorded once per notice version in settings. */
function privacyCheck(){
  const c=S.settings.consent; if(c&&c.v===PRIVACY_V) return;
  let at=null; try{ at=localStorage.getItem('wearcycle.consent'); }catch(e){}
  if(at){ S.settings.consent={v:PRIVACY_V,at,how:'sign-up'}; saveCache(); queueSettingsSave(); return; }
  if($('#sheetRoot').innerHTML) return; // ask on a later open rather than over another screen
  openSheet(sheetHead('Your data and privacy')+`<ul class="plist">
    <li>Your clothes, photos, outfit log and settings are kept in your private Wearcycle account, hosted by Supabase. Only you can read them.</li>
    <li>When Claude reads a photo, checks condition or suggests what to buy, the photo or a text list of your clothes goes to Anthropic in the United States. Anthropic deletes it within 30 days and does not train on it.</li>
    <li>Data processed in another country can be accessed by that country's courts and authorities under its laws.</li>
    <li>You can download or delete everything, or turn Claude off, at any time in Settings.</li></ul>
   <p class="hint"><a href="privacy.html" target="_blank" rel="noopener">Read the full privacy notice</a></p>
   <div class="row sheet-actions" style="flex-direction:column;align-items:stretch"><button class="btn primary" data-act="privacyOk">I agree</button><button class="btn ghost" data-act="privacyNoClaude">Agree, but turn Claude off</button></div>
   <p class="hint">Without Claude, you set each piece's category, colors and occasions yourself, about 20 seconds per piece. Outfits are only as good as those details.</p>`);
}
function privacyAgree(claude){ S.settings.consent={v:PRIVACY_V,at:new Date().toISOString(),how:'notice'}; if(!claude) S.settings.claude=false;
  saveCache(); queueSettingsSave(); closeSheet(); toast(claude?'Thanks. You can change this in Settings.':'Claude features are off. When you add clothes, you will set their category, colors and occasions. Turn Claude on any time in Settings.',6000); }

// A plain .zip (stored, not compressed: photos are already JPEG/PNG) so no library is needed.
const CRC_T=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=CRC_T[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function makeZip(files){ // files: [{name, data:Uint8Array}]
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const d=new Date(), dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)), dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  for(const f of files){ const nm=enc.encode(f.name), crc=crc32(f.data), n=f.data.length;
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true);
    h.setUint16(10,dt,true); h.setUint16(12,dd,true); h.setUint32(14,crc,true); h.setUint32(18,n,true); h.setUint32(22,n,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
    c.setUint16(12,dt,true); c.setUint16(14,dd,true); c.setUint32(16,crc,true); c.setUint32(20,n,true); c.setUint32(24,n,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),nm); off+=30+nm.length+n; }
  const csize=central.reduce((a,b)=>a+b.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csize,true); e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'}); }
async function exportData(){
  if(!canWrite()){ toast('You are offline. Downloading your data needs a connection.'); return; }
  job('Gathering your data…',5);
  try{
    const items=await sb.from('items').select('id,body,updated_at'); if(items.error) throw items.error;
    const wears=[]; for(let from=0;;from+=1000){ const r=await sb.from('wears').select('date,occ,items,created_at').order('date',{ascending:true}).range(from,from+999); if(r.error) throw r.error; wears.push(...r.data); if(r.data.length<1000) break; }
    const se=await sb.from('settings').select('body').maybeSingle(); if(se.error) throw se.error;
    const files=[], enc=new TextEncoder(), paths=[...new Set(items.data.flatMap(r=>[r.body.photo,r.body.cut]).filter(Boolean))]; let miss=0;
    for(let k=0;k<paths.length;k++){ job('Adding photos '+(k+1)+' of '+paths.length,10+85*k/Math.max(1,paths.length));
      const {data}=await sb.storage.from('photos').download(paths[k]); if(!data){ miss++; continue; }
      files.push({name:'photos/'+paths[k].split('/').pop(),data:new Uint8Array(await data.arrayBuffer())}); }
    const doc={app:'Wearcycle',version:APP_VERSION,exported:new Date().toISOString(),account:{email:EMAIL,id:UID},
      note:'Photo paths in items point to files in the photos folder of this zip (same file name).',
      items:items.data.map(r=>Object.assign({id:r.id,updated_at:r.updated_at},r.body)),outfitLog:wears,settings:se.data?se.data.body:{}};
    files.unshift({name:'wearcycle-data.json',data:enc.encode(JSON.stringify(doc,null,1))});
    const blob=makeZip(files), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='wearcycle-data-'+todayISO()+'.zip';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    job(''); toast('Downloaded: '+items.data.length+' pieces, '+wears.length+' outfits, '+(paths.length-miss)+' photos.'+(miss?' '+miss+' photos could not be read.':''),6000);
  }catch(e){ job(''); toast('Could not download your data: '+(e&&e.message||'unknown error'),5000); }
}

/* ---------- without Claude: color guess on the phone and quick details ----------
   Colors: the middle of the photo (where the piece usually is) at 48 px, pixels close to the border color
   (the background) left out, each remaining pixel matched to the nearest app color in CIELAB.
   Returns up to 3 candidates (8%+ of the piece), most pixels first. Tested on 9 of the owner's photos: the first
   guess matched the piece's name for 3, and the right color was among the 3 for 6, so only the first is
   preselected and the others are offered as one-tap suggestions. Shadows on dark pieces often read as black. */
function rgb2lab(r,g,b){ const f=c=>{ c/=255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
  const R=f(r),G=f(g),B=f(b); let x=(R*0.4124+G*0.3576+B*0.1805)/0.95047, y=R*0.2126+G*0.7152+B*0.0722, z=(R*0.0193+G*0.1192+B*0.9505)/1.08883;
  const h=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116; x=h(x); y=h(y); z=h(z); return [116*y-16,500*(x-y),200*(y-z)]; }
let COLOR_LAB=null;
function nearestColor(lab){ if(!COLOR_LAB) COLOR_LAB=Object.entries(COLORS).map(([k,v])=>[k,rgb2lab(parseInt(v.hex.slice(1,3),16),parseInt(v.hex.slice(3,5),16),parseInt(v.hex.slice(5,7),16))]);
  let best=null,bd=Infinity; for(const [k,c] of COLOR_LAB){ const d=(c[0]-lab[0])**2+(c[1]-lab[1])**2+(c[2]-lab[2])**2; if(d<bd){bd=d;best=k;} } return best; }
async function guessColors(blob){
  const src=await decode(blob); const N=48, c=document.createElement('canvas'); c.width=N; c.height=N; const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(src,0,0,N,N); if(src.close) src.close(); const d=x.getImageData(0,0,N,N).data;
  const px=(i,j)=>{ const o=(j*N+i)*4; return [d[o],d[o+1],d[o+2]]; };
  const border=[]; for(let k=0;k<N;k++){ border.push(px(k,0),px(k,N-1),px(0,k),px(N-1,k)); }
  const bl=border.map(p=>rgb2lab(...p)); const bg=[0,1,2].map(q=>bl.map(v=>v[q]).sort((a,b)=>a-b)[bl.length>>1]);
  const counts={}; let total=0;
  for(let j=Math.round(N*0.15);j<Math.round(N*0.85);j++) for(let i=Math.round(N*0.2);i<Math.round(N*0.8);i++){
    const lab=rgb2lab(...px(i,j)); if((lab[0]-bg[0])**2+(lab[1]-bg[1])**2+(lab[2]-bg[2])**2<15*15) continue;
    const k=nearestColor(lab); counts[k]=(counts[k]||0)+1; total++; }
  if(total<40) return [];
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return top.filter(([k,n])=>n/total>=0.08).slice(0,3).map(([k])=>k);
}
const QD={ids:[],i:0,it:null};
const QD_CATS=['top','bottom','outerwear','onepiece','shoes','socks','belt','watch','hat','bag','other'];
function openQuick(ids){ QD.ids=ids; QD.i=0; quickStep(); }
function quickStep(){
  const id=QD.ids[QD.i]; const src=id&&byId(id); if(!src){ closeSheet(); toast('Done. Open any piece in Closet to add more details, like dress level and condition.',5000); return; }
  if(!(QD.it&&QD.it.id===id)){ QD.it=JSON.parse(JSON.stringify(src)); if(/^New item \d+$/.test(QD.it.name||'')) QD.it.cat=null; } const it=QD.it;
  const garment=!it.cat||GARMENT.includes(it.cat);
  openSheet(sheetHead('What is this?')+`<p class="hint" style="margin-top:-4px">${QD.i+1} of ${QD.ids.length} · Claude is off, so these details come from you. Outfits use them to pick and match pieces.</p>
   <div class="qd"><div class="pv">${visual(it)}</div><div class="field" style="flex:1;margin:0"><label for="qd-name">Name (optional)</label><input type="text" id="qd-name" value="${/^New item \d+$/.test(it.name)?'':esc(it.name)}" placeholder="e.g. Navy flannel shirt" maxlength="60">${I18N.lang==='en'?'<span class="hint">Words like flannel, hoodie or linen help Wearcycle guess style and warmth.</span>':''}</div></div>
   <div class="field"><span class="lab">Category</span><div class="chips" style="flex-wrap:wrap">${QD_CATS.map(c=>`<button type="button" class="chip" data-qdcat="${c}" aria-pressed="${it.cat===c}">${CAT[c].label}</button>`).join('')}</div></div>
   <div class="field"><span class="lab">Colors · main color first</span>${(it.colorGuess||[]).length?`<div class="chips" style="flex-wrap:wrap;margin:0 0 8px"><span class="hint" style="align-self:center">Looks like:</span>${it.colorGuess.map(k=>`<button type="button" class="chip" data-qdcol="${k}" aria-pressed="${(it.colors||[]).includes(k)}"><span class="sw" style="background:${COLORS[k].hex}"></span>${k}</button>`).join('')}</div>`:''}<div class="colors">${Object.entries(COLORS).map(([k,v])=>{ const ix=(it.colors||[]).indexOf(k); return `<button type="button" data-qdcol="${k}" aria-pressed="${ix>=0}" aria-label="${k}${ix>=0?', choice '+(ix+1):''}" title="${k}" style="background:${v.hex}">${ix>=0?`<span class="ord">${ix+1}</span>`:''}</button>`; }).join('')}</div></div>
   ${garment||['belt','watch','hat','bag','socks'].includes(it.cat)?`<div class="field"><span class="lab">Where would you wear it?</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.filter(o=>o.id!=='work'&&o.id!=='formal').map(o=>`<button type="button" class="chip" data-qdocc="${o.id}" aria-pressed="${(it.occ||[]).includes(o.id)}">${o.label}</button>`).join('')}</div>
     <p class="hint">Work and Formal follow your dress code automatically; change them in the piece's details.</p></div>`:''}
   <p class="err" id="qd-err"></p>
   <div class="row sheet-actions"><button class="btn primary" data-qd="save">${QD.i+1<QD.ids.length?'Save and next':'Save'}</button><button class="btn ghost" data-qd="skip">Skip for now</button></div>`);
}
async function quickSave(){
  const it=QD.it; if(!it.cat){ $('#qd-err').textContent='Pick a category.'; return; }
  const nm=($('#qd-name')||{}).value; const c0=(it.colors||[])[0]; it.name=(nm||'').trim()||(I18N.lang==='en'?(c0+' '+CAT[it.cat].label.toLowerCase()).replace(/^./,c=>c.toUpperCase()):I18N.tr(CAT[it.cat].label)+' ('+I18N.tr(c0)+')');
  if(!(it.colors||[]).length){ $('#qd-err').textContent='Pick at least one color.'; return; }
  if(GARMENT.includes(it.cat)&&!(it.occ||[]).length&&!$('#qd-err').dataset.warned){ $('#qd-err').dataset.warned='1'; $('#qd-err').textContent='No occasion picked: this piece will only be suggested for Work, if your dress code allows it. Tap Save again to keep it that way.'; return; }
  delete it._typed; delete it.colorGuess; it.review=false;
  if(await writeItem(it)){ QD.i++; QD.it=null; quickStep(); }
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-qdcat],[data-qdcol],[data-qdocc],[data-qd]'); if(!b||!QD.it) return;
  const it=QD.it, keepName=()=>{ const n=$('#qd-name'); if(n) it._typed=n.value; };
  if(b.dataset.qd==='save'){ quickSave(); return; }
  if(b.dataset.qd==='skip'){ QD.i++; QD.it=null; quickStep(); return; }
  keepName();
  if(b.dataset.qdcat) it.cat=b.dataset.qdcat;
  if(b.dataset.qdcol){ const k=b.dataset.qdcol, c=it.colors||(it.colors=[]); const ix=c.indexOf(k); if(ix>=0) c.splice(ix,1); else if(c.length<3) c.push(k); }
  if(b.dataset.qdocc){ const o=b.dataset.qdocc, c=it.occ||(it.occ=[]); const ix=c.indexOf(o); if(ix>=0) c.splice(ix,1); else c.push(o); }
  const y=$('.sheet')?$('.sheet').scrollTop:0; quickStep(); const n=$('#qd-name'); if(n&&it._typed!=null) n.value=it._typed; if($('.sheet')) $('.sheet').scrollTop=y; });

/* ---------- money ---------- */
const REGION_CUR={CA:'CAD',US:'USD',GB:'GBP',AU:'AUD',NZ:'NZD',MX:'MXN',BR:'BRL',IN:'INR',JP:'JPY',CH:'CHF',FR:'EUR',DE:'EUR',ES:'EUR',IT:'EUR',PT:'EUR',NL:'EUR',BE:'EUR',IE:'EUR',AT:'EUR',FI:'EUR'};
function laundryOn(){ return S.settings.laundry!==false; }
function currency(){ return S.settings.currency||REGION_CUR[((navigator.language||'').split('-')[1]||'').toUpperCase()]||'USD'; }
function money(v){ try{ return new Intl.NumberFormat(I18N.locale,{style:'currency',currency:currency(),maximumFractionDigits:v<10?2:0}).format(v); }catch(e){ return '$'+v.toFixed(2); } }

/* ---------- outfit diary: calendar of logged outfits, with undo ---------- */
let DI=null;
function outfitFromIds(ids){
  const o={acc:[]}; for(const it of ids.map(byId).filter(Boolean)){
    if(it.cat==='top'){ if(!o.top) o.top=it; else if(!o.under) o.under=canUnder(it)?it:(o.under||it); }
    else if(it.cat==='outerwear'&&!o.outer) o.outer=it; else if(it.cat==='bottom'&&!o.bottom) o.bottom=it;
    else if(it.cat==='onepiece'&&!o.onepiece) o.onepiece=it; else if(it.cat==='shoes'&&!o.shoes) o.shoes=it;
    else if(ACCESSORY.includes(it.cat)) o.acc.push(it); }
  if(o.under&&o.top&&canUnder(o.top)&&!canUnder(o.under)){ const t=o.top; o.top=o.under; o.under=t; }
  return o;
}
function miniBoard(o){ return `<span class="flatlay mini">${flCells(o).map(c=>`<span class="fl ${c.small?'small':''}" style="left:${c.x}%;top:${c.y}%;width:${c.w}%;height:${c.h}%">${flVisual(c.it)}</span>`).join('')}</span>`; }
function openDiary(y,m){
  const now=new Date(); DI={y:y??(DI?DI.y:now.getFullYear()),m:m??(DI?DI.m:now.getMonth()),day:DI&&DI.day||todayISO()}; drawDiary();
}
function drawDiary(){
  const {y,m}=DI; const first=new Date(y,m,1), days=new Date(y,m+1,0).getDate(), lead=(first.getDay()+6)%7;
  const key=d=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const log=allLog(); const byDay={}; for(const e of log){ (byDay[e.date]=byDay[e.date]||[]).push(e); }
  const monthCount=log.filter(e=>e.date.startsWith(key(1).slice(0,7))).length;
  const cells=[]; for(let k=0;k<lead;k++) cells.push('<span></span>');
  for(let d=1;d<=days;d++){ const k=key(d), n=(byDay[k]||[]).length; cells.push(`<button class="cal-d ${k===todayISO()?'today':''}" data-dday="${k}" aria-pressed="${DI.day===k}" aria-label="${k}${n?', '+n+' outfit'+(n>1?'s':''):''}">${d}${n?'<i></i>':''}</button>`); }
  const es=byDay[DI.day]||[];
  const title=first.toLocaleDateString(I18N.locale,{month:'long',year:'numeric'});
  openSheet(sheetHead('Outfit diary')+`
   <div class="cal-h"><button class="iconbtn" data-dmonth="-1" aria-label="Previous month">‹</button><b>${esc(title)}</b><button class="iconbtn" data-dmonth="1" aria-label="Next month">›</button></div>
   <p class="hint" style="text-align:center">${monthCount} outfit${monthCount===1?'':'s'} logged this month</p>
   <div class="cal">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(w=>`<span class="cal-w">${w}</span>`).join('')}${cells.join('')}</div>
   <h3>${esc(new Date(DI.day+'T12:00').toLocaleDateString(I18N.locale,{weekday:'long',month:'long',day:'numeric'}))}</h3>
   ${es.length?es.map((e,k)=>{ const o=outfitFromIds(e.items||[]); return `<div class="dentry">${miniBoard(o)}<div class="dtxt"><b>${esc(OCC[e.occ]?.label||e.occ)}</b><span>${esc(coreOf(o).map(i=>i.name).join(', '))}</span><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-dedit="${k}">Correct</button><button class="btn sm ghost" data-dremove="${k}">Remove this log</button></div></div></div>`; }).join('')
     :'<p class="hint">Nothing logged on this day.</p>'}`);
  setTimeout(hydrateCuts,0);
}
async function removeWear(e){
  const real=(e.items||[]).some(id=>!String(id).startsWith('ex-'));
  if(real){ if(!canWrite()){ toast('You are offline.'); return; }
    let q=sb.from('wears').delete(); q=e.id!=null?q.eq('id',e.id):q.eq('date',e.date).eq('occ',e.occ);
    const {error}=await q; if(error){ toast('Could not remove: '+error.message,4500); return; } }
  S.log=S.log.filter(x=>x!==e); S.exLog=S.exLog.filter(x=>x!==e);
  for(const id of e.items||[]){ const it=byId(id); if(!it) continue;
    const wsw=Math.max(0,(it.wearsSinceWash||0)-1); const undirty=it.dirty&&wsw<washEvery(it);
    await patchItem(id,Object.assign({wearsSinceWash:wsw},undirty?{dirty:false,dirtyOn:undefined}:{}));
    const last=allLog().filter(x=>(x.items||[]).includes(id)).map(x=>x.date).sort().pop();
    await patchItem(id,{worn:Math.max(0,(it.worn||0)-1),wearsSinceCheck:Math.max(0,(it.wearsSinceCheck||0)-1),lastWorn:last||null}); }
  saveCache(); S.fitKey=''; for(const f of S.fits) if(f.worn&&e.date===todayISO()) f.worn=false; renderAll(); drawDiary(); toast('Log removed.');
}

/* ---------- closet stats: wear counts and cost per wear ---------- */
function openStats(){
  const items=allItems().filter(isActive), now=Date.now();
  const priced=items.filter(i=>i.price!=null), spent=priced.reduce((a,i)=>a+i.price,0);
  const cpw=priced.filter(i=>i.worn>0).map(i=>({it:i,v:i.price/i.worn})).sort((a,b)=>a.v-b.v);
  const most=items.filter(i=>i.worn>0).sort((a,b)=>b.worn-a.worn).slice(0,5);
  const idle=items.filter(i=>daysSince(i.lastWorn||i.created,now)>=90);
  const row=(it,right)=>`<div class="li">${thumbBox(it)}<div class="txt"><b>${esc(it.name)}</b><span>${right}</span></div></div>`;
  openSheet(sheetHead('Closet stats')+`
   <div class="statgrid"><div><b>${items.length}</b><span>pieces</span></div><div><b>${allLog().length}</b><span>outfit${allLog().length===1?'':'s'} logged</span></div><div><b>${priced.length?money(spent):'–'}</b><span>spent${priced.length<items.length&&priced.length?' ('+priced.length+' priced)':''}</span></div></div>
   <div class="panel"><div class="panel-h"><h3>Most worn</h3></div>${most.length?most.map(i=>row(i,i.worn+' wear'+(i.worn>1?'s':'')+(i.price!=null?' · '+money(i.price/i.worn)+' per wear':''))).join(''):'<div class="li"><span class="hint">Log outfits to see your favourites.</span></div>'}</div>
   <div class="panel"><div class="panel-h"><h3>Cost per wear</h3></div>${cpw.length?cpw.slice(0,3).map(x=>row(x.it,'Best value: '+money(x.v)+' per wear')).join('')+cpw.slice(-2).reverse().filter(x=>!cpw.slice(0,3).includes(x)).map(x=>row(x.it,'Highest: '+money(x.v)+' per wear')).join(''):'<div class="li"><span class="hint">Add the price you paid in an item’s More details to see this. Price divided by times worn.</span></div>'}</div>
   <div class="panel"><div class="panel-h"><h3>Not worn in 90+ days</h3><span class="count">${idle.length}</span></div>${idle.slice(0,6).map(i=>row(i,i.lastWorn?'Last worn '+esc(i.lastWorn):'Never worn')).join('')||'<div class="li"><span class="done">Everything is in rotation.</span></div>'}</div>`);
  setTimeout(hydrateCuts,0);
}

/* ---------- share: the outfit as a 1080x1920 Story image ---------- */
function loadImg(src){ return new Promise(res=>{ if(!src){ res(null); return; } const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=src; }); }
async function pieceImage(it){
  const cu=it.cut?await cutUrl(it):''; if(cu){ const im=await loadImg(cu); if(im) return {im,cut:true}; }
  if(thumbSrc(it)){ const im=await loadImg(thumbSrc(it)); if(im) return {im,cut:false}; }
  const svg=glyph(it).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" ');
  const im=await loadImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)); return im?{im,cut:true}:null;
}
async function shareOutfit(){
  const f=S.fits[S.sel]; if(!f) return; const o=hydrate(f.ids);
  toast('Preparing the image…',0);
  const W=1080,H=1920, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
  const bg=g.createRadialGradient(W/2,H*0.42,80,W/2,H*0.45,H*0.8); bg.addColorStop(0,'#f7f4ef'); bg.addColorStop(0.7,'#efe9e0'); bg.addColorStop(1,'#e5dccf');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.fillStyle='#1b2433'; g.font='800 84px "Big Shoulders Display", Impact, sans-serif'; g.textBaseline='alphabetic';
  g.fillText(I18N.tr(OCC[S.occ].label).toUpperCase(),72,190);
  g.font='500 38px Figtree, system-ui, sans-serif'; g.fillStyle='#5b6270';
  g.fillText(new Date().toLocaleDateString(I18N.locale,{weekday:'long',month:'long',day:'numeric'}),72,250);
  const bx=40,by=300,bw=W-80,bh=Math.round(bw*1.25);
  for(const c of flCells(o)){
    const p=await pieceImage(c.it); if(!p) continue;
    const pad=c.small?8:18, x=bx+c.x/100*bw+pad, y=by+c.y/100*bh+pad, w=c.w/100*bw-2*pad, h=c.h/100*bh-2*pad;
    const k=Math.min(w/p.im.width,h/p.im.height), dw=p.im.width*k, dh=p.im.height*k, dx=x+(w-dw)/2, dy=y+(h-dh)/2;
    g.save(); g.shadowColor='rgba(50,35,20,.22)'; g.shadowBlur=24; g.shadowOffsetY=10;
    if(!p.cut){ g.beginPath(); g.roundRect?g.roundRect(dx,dy,dw,dh,16):g.rect(dx,dy,dw,dh); g.clip(); }
    g.drawImage(p.im,dx,dy,dw,dh); g.restore();
  }
  const cols=coreOf(o).map(primary).filter(c=>COLORS[c]); let x=72; const yy=by+bh+90;
  for(const c of cols){ g.beginPath(); g.arc(x+28,yy,28,0,7); g.fillStyle=COLORS[c].hex; g.fill(); g.lineWidth=4; g.strokeStyle='#f7f4ef'; g.stroke(); x+=48; }
  g.fillStyle='#1b2433'; g.font='600 34px Figtree, system-ui, sans-serif';
  g.fillText(I18N.tr(WardrobeLogic.harmony(cols).why),72,yy+90);
  const logo=await loadImg('icons/logo-icon.svg'); if(logo) g.drawImage(logo,72,H-150,72,72);
  g.font='800 52px "Big Shoulders Display", Impact, sans-serif'; g.fillText('WEARCYCLE',164,H-95);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  $('#toastRoot').innerHTML='';
  if(!blob){ toast('Could not make the image.'); return; }
  const file=new File([blob],'wearcycle-outfit.png',{type:'image/png'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:I18N.tr('My outfit'),text:I18N.tr('Picked with Wearcycle')}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='wearcycle-outfit.png'; document.body.appendChild(a); a.click(); a.remove();
  toast('Image saved to your downloads.');
}

/* ---------- style palette ---------- */
function openPalettes(){
  const cur=S.settings.palette||'any';
  openSheet(sheetHead('Style palette')+`<p class="hint">Outfits whose main colors all sit in your palette rank higher (+1); each piece outside it costs half a point. Color harmony still applies to every palette.</p>
   ${Object.entries(PALETTES).map(([k,p])=>`<button class="palopt" data-pal="${k}" aria-pressed="${cur===k}"><span class="sws">${(p.colors||['black','white','navy','olive','burgundy','khaki','lightblue']).map(c=>`<span class="sw" style="background:${COLORS[c].hex}"></span>`).join('')}</span><span class="pl"><b>${esc(p.label)}</b><span>${esc(p.desc)}</span></span></button>`).join('')}`);
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
async function scanGraphics(){
  if(S.busy) return; if(!canWrite()){ toast('You are offline.'); return; }
  const list=[...S.items.values()].filter(i=>isActive(i)&&i.photo&&['top','outerwear','onepiece'].includes(i.cat)&&typeof i.graphic!=='boolean');
  if(!list.length){ toast('All tops and jackets are already checked.'); return; }
  closeSheet(); S.busy=true; let n=0, found=0;
  for(const it of list){ job('Checking for logos '+(n+1)+' of '+list.length,n/list.length*100);
    try{ const blob=await photoBlob(it.photo); const r=await callClaude('graphic',{image:await blobToBase64(await shrink(blob,768))});
      if(r&&typeof r.graphic==='boolean'){ await patchItem(it.id,{graphic:r.graphic}); if(r.graphic) found++; } n++; }
    catch(e){ S.busy=false; job(''); toast(aiMsg(e),6000); return; } }
  S.busy=false; job(''); S.fitKey=''; renderAll(); toast('Checked '+n+'. '+found+' with a big logo, text or print; they are left out of Work unless your dress code allows it.',7000);
}
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
// Adds one wear to each piece (count, last worn, laundry); used when logging and when pieces are added to a log.
async function countWears(list,day,occ){
  const washed=[];
  for(const it of list){ const p={worn:(it.worn||0)+1,lastWorn:(it.lastWorn&&it.lastWorn>day)?it.lastWorn:day,wearsSinceCheck:(it.wearsSinceCheck||0)+1,wearsSinceWash:(it.wearsSinceWash||0)+1};
    const we=washEvery(it);
    if(laundryOn()&&we>0&&!it.dirty&&(p.wearsSinceWash>=we||(occ==='sport'&&!NOWASH.includes(it.cat)))){ p.dirty=true; p.dirtyOn=day; washed.push(it.name); }
    await patchItem(it.id,p); }
  if(washed.length) setTimeout(()=>toast('To the wash: '+washed.join(', ')+'. They return to suggestions when you mark them clean in Closet.',6500),900);
}
// Takes one wear off a piece that was logged but not worn (count, last worn, laundry if that wear sent it to the wash).
async function uncountWear(it,day){
  const wsw=Math.max(0,(it.wearsSinceWash||0)-1); const undirty=it.dirty&&it.dirtyOn===day&&wsw<washEvery(it);
  const last=allLog().filter(x=>(x.items||[]).includes(it.id)).map(x=>x.date).sort().pop();
  await patchItem(it.id,Object.assign({worn:Math.max(0,(it.worn||0)-1),wearsSinceCheck:Math.max(0,(it.wearsSinceCheck||0)-1),wearsSinceWash:wsw,lastWorn:last||null},undirty?{dirty:false,dirtyOn:undefined}:{}));
}
async function logWear(list,day,occ){
  const ids=list.map(x=>x.id); const real=ids.filter(id=>!String(id).startsWith('ex-'));
  if(real.length&&!canWrite()){ toast('You are offline. Logging needs a connection.'); return false; }
  await countWears(list,day,occ);
  const entry={date:day,occ,items:ids};
  if(!real.length) S.exLog.unshift(entry);
  else { const {data,error}=await sb.from('wears').insert(entry).select('id'); if(error){ toast('Could not log the outfit: '+error.message,4500); return false; }
    const row=Array.isArray(data)?data[0]:data; if(row&&row.id!=null) entry.id=row.id; S.log.unshift(entry); saveCache(); }
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
function openLog(empty){
  const f=S.fits[S.sel]; const o=f&&!empty?hydrate(f.ids):null;
  LG={day:todayISO(),occ:S.occ,sel:new Set(o?coreOf(o).concat(o.acc).map(x=>x.id):[]),adding:!!empty}; LG.first=new Set(LG.sel); drawLog();
}
function drawLog(){
  const items=allItems().filter(isActive); const groups=CATS.map(c=>[c,items.filter(i=>i.cat===c.id)]).filter(([c,l])=>l.length);
  openSheet(sheetHead(LG.edit?'Correct what I wore':'What I wore')+`
   <p class="hint">${LG.edit?'Shows what you logged. Tap pieces to add or remove them, then save. Wear counts are corrected.':LG.adding?'Tap what else you are wearing today, then log it.':'Starts with the outfit on screen. Tap pieces to add or remove them, then log.'}</p>
   ${LG.edit?'':`<div class="field"><span class="lab">Day</span><div class="chips"><button class="chip" data-lgday="${todayISO()}" aria-pressed="${LG.day===todayISO()}">Today</button><button class="chip" data-lgday="${yesterdayISO()}" aria-pressed="${LG.day===yesterdayISO()}">Yesterday</button></div></div>`}
   <div class="field"><span class="lab">Occasion</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.map(o=>`<button class="chip" data-lgocc="${o.id}" aria-pressed="${LG.occ===o.id}">${o.label}</button>`).join('')}</div></div>
   ${groups.map(([c,l])=>`<div class="field"><span class="lab">${esc(c.label)}</span><div class="pickrow">${l.slice().sort((a,b)=>(LG.first.has(b.id)?1:0)-(LG.first.has(a.id)?1:0)).map(it=>`<button class="pick" data-lgit="${esc(it.id)}" aria-pressed="${LG.sel.has(it.id)}" aria-label="${esc(it.name)}"><span class="mini">${visual(it)}</span><span class="pn">${esc(it.name)}</span></button>`).join('')}</div></div>`).join('')}
   <div class="row sheet-actions">${LG.edit?`<button class="btn primary" data-lgsave>${LG.sel.size?'Save changes':'Remove this log'}</button>`:`<button class="btn primary" data-lgsave ${LG.sel.size?'':'disabled'}>Log ${LG.sel.size} piece${LG.sel.size===1?'':'s'}</button>`}<button class="btn ghost" data-close>Cancel</button></div>`);
}
async function saveLog(){
  const list=[...LG.sel].map(byId).filter(Boolean); if(!list.length) return;
  const day=LG.day, occ=LG.occ; closeSheet();
  if(await logWear(list,day,occ)) toast('Logged '+list.length+' piece'+(list.length===1?'':'s')+' for '+(day===todayISO()?'today':'yesterday')+'.');
}
function todayLine(){
  const es=allLog().filter(e=>e.date===todayISO()); if(!es.length) return '';
  const names=[...new Set(es.flatMap(e=>e.items))].map(byId).filter(Boolean).filter(i=>!ACCESSORY.includes(i.cat)).map(i=>i.name);
  const all=[...new Set(es.flatMap(e=>e.items))].map(byId).filter(Boolean);
  return `<div class="todaycard"><div class="tc-h"><b>Wearing today</b><button class="btn sm" data-act="todaylog">Edit</button></div>
    <button class="tc-row" data-act="todaylog" aria-label="Logged today: ${esc(names.join(', '))}">${all.slice(0,8).map(it=>`<span class="tc-th">${visual(it)}</span>`).join('')}</button>
    <span class="hint">Logged today: ${esc(names.join(', ')||es.length+' outfit')}</span></div>`;
}
// An edited outfit remembers the suggestion it came from, so it can go back.
function editedFit(f,o){ const r=scoreOutfit(o,S.occ,ctx()); return {ids:idsOf(o),score:r.score,reasons:r.reasons,style:r.style,rank:f.rank,edited:true,orig:f.orig||f}; }
// Tapping a piece shows it large with its name; swapping is an explicit button (it changes the outfit).
function pieceAt(i,slot){ const f=S.fits[i]; if(!f) return null; const o=hydrate(f.ids); return slot.startsWith('acc')?o.acc[+slot.slice(3)]:o[slot]; }
function openPiece(i,slot,again){
  const it=pieceAt(i,slot); if(!it) return;
  const big=it.cut?`<img data-cut="${esc(it.id)}" src="${esc(thumbSrc(it))}" alt="${esc(it.name)}">`:(thumbSrc(it)?`<img id="pv-full" src="${esc(thumbSrc(it))}" alt="${esc(it.name)}">`:glyph(it));
  const worn=it.worn||0;
  const html=sheetHead(esc(it.name))+`
   <div class="piecebig ${it.cut?'studio':''}">${big}</div>
   <p class="hint" style="margin:0">${esc(CAT[it.cat].label)} · ${COND[it.cond??4]} · ${worn===1?'Worn 1 time':'Worn '+worn+' times'}${it.lastWorn?' · '+'Last worn '+esc(it.lastWorn):''}</p>
   ${it.notes?`<p class="hint" style="margin:0">${esc(it.notes)}</p>`:''}
   <div class="row sheet-actions"><button class="btn primary" data-pswap="${i}" data-slot="${esc(slot)}">${SWAP_ICON}Swap for another</button>${isEx(it)?'':`<button class="btn" data-edit="${esc(it.id)}">Open item</button>`}</div>
   ${S.fits[i]&&S.fits[i].worn?(loggedToday(it.id)?`<button class="linkbtn" data-punlog="${esc(it.id)}">I did not wear it today: remove it from today's log</button>`:'')
     :(DROPPABLE(slot)?`<button class="linkbtn" data-pdrop="${i}" data-slot="${esc(slot)}">Not wearing it: leave it out of this outfit</button>`:'')}`;
  if(again&&$('#sheetRoot').innerHTML){ const sh=document.querySelector('#sheetRoot .sheet'); if(sh) sh.innerHTML=html; } else openSheet(html);
  setTimeout(hydrateCuts,0);
  if(!it.cut&&it.photo&&!isEx(it)&&sb) fullPhotoUrl(it.photo).then(u=>{ const im=$('#pv-full'); if(u&&im) im.src=u; });
}
// Pieces that can be left out of an outfit: accessories (bag, scarf, hat, watch, belt, socks), the outer layer and
// the t-shirt underneath. Top, bottom and shoes are the outfit itself; swap those instead.
const DROPPABLE=slot=>slot.startsWith('acc')||slot==='outer'||slot==='under';
function dropPiece(i,slot){
  const f=S.fits[i]; if(!f||f.worn) return; const o=hydrate(f.ids); let gone=null;
  if(slot.startsWith('acc')){ const k=+slot.slice(3); gone=o.acc[k]; o.acc.splice(k,1); } else { gone=o[slot]; delete o[slot]; }
  if(!gone) return; S.fits[i]=editedFit(f,o); closeSheet(); renderOutfits();
  toast(gone.name+' left out. Wear this logs only the pieces shown; Back to suggestion brings it back.',5500);
}
// Today's log as a list: tap Remove on anything you did not actually wear (a bag, a scarf...).
// Today's log opens the "What I wore" picker with what was logged: tap to add or remove, then save.
function openTodayLog(){ const e=allLog().find(x=>x.date===todayISO()); if(e) openLogEdit(e); else closeSheet(); }
function openLogEdit(e){ LG={day:e.date,occ:e.occ,sel:new Set(e.items||[]),first:new Set(e.items||[]),edit:e}; drawLog(); }
async function saveLogEdit(){
  const e=LG.edit, items=[...LG.sel].filter(id=>byId(id)), before=new Set(e.items||[]);
  const added=items.filter(id=>!before.has(id)).map(byId), removed=[...before].filter(id=>!LG.sel.has(id)).map(byId).filter(Boolean);
  const real=items.concat([...before]).some(id=>!String(id).startsWith('ex-'));
  if(real){ if(!canWrite()){ toast('You are offline.'); return; }
    let q=items.length?sb.from('wears').update({items,occ:LG.occ}):sb.from('wears').delete(); q=e.id!=null?q.eq('id',e.id):q.eq('date',e.date).eq('occ',e.occ);
    const {error}=await q; if(error){ toast('Could not change the log: '+error.message,4500); return; } }
  const day=e.date, occ=LG.occ; closeSheet();
  if(items.length){ e.items=items; e.occ=occ; } else { S.log=S.log.filter(x=>x!==e); S.exLog=S.exLog.filter(x=>x!==e); for(const f of S.fits) if(f.worn&&day===todayISO()) f.worn=false; }
  for(const it of removed) await uncountWear(byId(it.id),day);
  if(added.length) await countWears(added,day,e.occ);
  saveCache(); S.fitKey=fitKeyNow(); renderAll();
  toast(items.length?'Log updated: '+items.length+' piece'+(items.length===1?'':'s')+'.':'Log removed.');
}
function loggedToday(id){ return allLog().some(e=>e.date===todayISO()&&(e.items||[]).includes(id)); }
// Takes one piece out of today's log (it was suggested and logged, but not worn): fixes the entry and the piece's counts.
async function unlogPiece(id){
  const e=allLog().find(x=>x.date===todayISO()&&(x.items||[]).includes(id)); const it=byId(id); if(!e||!it) return;
  const items=e.items.filter(x=>x!==id), real=!String(id).startsWith('ex-');
  if(real){ if(!canWrite()){ toast('You are offline.'); return; }
    let q=items.length?sb.from('wears').update({items}):sb.from('wears').delete(); q=e.id!=null?q.eq('id',e.id):q.eq('date',e.date).eq('occ',e.occ);
    const {error}=await q; if(error){ toast('Could not change the log: '+error.message,4500); return; } }
  if(items.length) e.items=items; else { S.log=S.log.filter(x=>x!==e); S.exLog=S.exLog.filter(x=>x!==e); }
  await uncountWear(it,todayISO());
  saveCache(); renderAll(); if(document.querySelector('#sheetRoot [data-punlog]')&&allLog().some(x=>x.date===todayISO())) openTodayLog(); else closeSheet(); toast(it.name+' removed from today\u2019s log.');
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
      S.fits[i]=editedFit(f,o); renderOutfits(); if(o.under) toast('Swapped in '+o.under.name+'.'); return; }
    if(cands.length<2){ toast('No other '+CAT[slot==='outer'?'outerwear':slot].label.toLowerCase()+' for this occasion.'); return; }
    o[slot]=cands[(cands.findIndex(x=>x.id===cur.id)+1)%cands.length];
    if(slot==='top'&&needsBase(o.top)&&!o.under){ const u=swapCandidates(o,'under',allItems(),S.occ,ctx())[0]; if(u) o.under=u; }
  }
  S.fits[i]=editedFit(f,o); renderOutfits();
  const now=slot.startsWith('acc')?o.acc[+slot.slice(3)]:o[slot]; if(now) toast('Swapped in '+now.name+'.');
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
    mk(28,'White dress shirt','top',['white'],4,['formal'],5,40), mk(29,'Navy suit trousers','bottom',['navy'],5,['formal'],5,40), mk(30,'Black oxford shoes','shoes',['black'],5,['formal'],5,40),
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
  const del=e.target.closest('[data-look-del]');
  if(del){ const id=del.dataset.lookDel, st=styleSet(); S.settings.looks=looks().filter(l=>l.id!==id); st.pick=st.pick.filter(k=>k!==id); st.work=st.work.filter(k=>k!==id);
    saveCache(); queueSettingsSave(); S.fitKey=''; openStyles(); renderAll(); toast('Look removed.'); return; }
  const t=e.target.closest('button,[data-scrim]'); if(!t) return;
  if(Date.now()-swiped<400 && t.closest('[data-swipe]')) return;
  const ds=t.dataset;
  // camera overlay
  if(ds.cam){
    if(ds.cam==='shoot') shoot();
    else if(ds.cam==='done') closeCamera(CAM.shots);
    else if(ds.cam==='cancel') closeCamera(CAM.mode==='batch'?CAM.shots:[]);
    else if(ds.cam==='flip'){ CAM.facing=CAM.facing==='environment'?'user':'environment'; startStream(); }
    else if(ds.cam==='torch') setTorch(!CAM.torchOn);
    else if(ds.cam==='gallery'){ const mode=CAM.mode; closeCamera(CAM.shots); const files=await pickFiles(mode==='batch'); if(mode==='batch') addPhotos(files); else if(files[0]) (ED?editorSetPhoto:checkSetPhoto)(files[0]); }
    return;
  }
  if(ds.scrim && e.target===t){ closeSheet(); return; }
  if(ds.close!==undefined){ closeSheet(); return; }
  if(ds.tab){ goTab(ds.tab); return; }
  if(ds.tabGo){ goTab(ds.tabGo); return; }
  if(ds.laundryGo){ S.cat='laundry'; goTab('closet'); renderCloset(); return; }
  if(ds.themeOcc||ds.themeGo){ S.theme=ds.themeOcc||ds.themeGo; S.occ='out'; S.seed=0; S.fitKey=''; if(ds.themeGo) goTab('outfits'); renderOutfits(); window.scrollTo(0,0); return; }
  if(ds.holTog){ const off=holidaysOff(), k=ds.holTog; S.settings.holidaysOff=off.includes(k)?off.filter(x=>x!==k):off.concat([k]); saveCache(); queueSettingsSave(); S.fitKey=''; renderAll(); const b_=document.querySelector(`[data-hol-tog="${k}"]`); if(b_) b_.setAttribute('aria-pressed',String(!S.settings.holidaysOff.includes(k))); return; }
  if(ds.pinsee){ pinSee(ds.pinsee); return; }
  if(ds.unpin!==undefined){ S.pin=null; S.fitKey=''; renderOutfits(); return; }
  if(ds.occ){ S.theme=undefined; S.occ=ds.occ; S.seed=0; LS.set('wearcycle.occ',{day:todayISO(),occ:S.occ}); renderOutfits(); return; }
  if(t.id==='shuffleBtn'){ S.seed=(Date.now()%100000)+1; S.fitKey=''; renderOutfits(); toast('New combinations, still ranked best first.'); return; }
  if(DI&&$('#sheetRoot').innerHTML){
    if(ds.dday){ DI.day=ds.dday; drawDiary(); return; }
    if(ds.dmonth){ let m=DI.m+(+ds.dmonth), y=DI.y; if(m<0){m=11;y--;} if(m>11){m=0;y++;} DI.y=y; DI.m=m; drawDiary(); return; }
    if(ds.dedit!==undefined){ const e=allLog().filter(x=>x.date===DI.day)[+ds.dedit]; if(e){ DI=null; openLogEdit(e); } return; }
    if(ds.dremove!==undefined){ const es=allLog().filter(e=>e.date===DI.day); const e=es[+ds.dremove]; if(e){ if(ds.confirm==='1'||t.dataset.armed){ removeWear(e); } else { t.dataset.armed='1'; t.textContent='Tap again to remove'; } } return; }
  }
  if(ds.dept){ S.settings.dept=ds.dept; setDept(ds.dept); saveCache(); queueSettingsSave(); ideasState.list=null; renderAll(); document.querySelectorAll('[data-dept]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.dept===ds.dept)); return; }
  if(ds.wcode){ S.settings.work={code:ds.wcode}; setDressCode(S.settings.work); saveCache(); queueSettingsSave(); S.fitKey=''; renderAll(); if($('#sheetRoot').innerHTML&&document.querySelector('.dresspanel')) openSettings(); else closeSheet(); toast('Work dress code: '+DRESS_CODES[ds.wcode].label+'. Your closet was re-sorted.'); return; }
  if(ds.pal){ S.settings.palette=ds.pal; saveCache(); queueSettingsSave(); S.fitKey=''; closeSheet(); renderOutfits(); toast(ds.pal==='any'?'No palette preference.':'Ranking now favors '+PALETTES[ds.pal].label.toLowerCase()+'.'); return; }
  if(ds.view){ S.view=ds.view; LS.set('wearcycle.view',S.view); renderOutfits(); if($('#sheetRoot').innerHTML) openAdjust(); return; }
  if(ds.layer){ S.layerMode=ds.layer; renderOutfits(); if($('#sheetRoot').innerHTML) openAdjust(); return; }
  if(ds.sel!==undefined){ S.sel=+ds.sel; if(S.sel) guard(); renderOutfits(); document.querySelector('.fit.hero')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(ds.addunder!==undefined){ const f=S.fits[+ds.addunder]; if(!f) return; const o=hydrate(f.ids); const c=swapCandidates(o,'under',allItems(),S.occ,ctx()); if(!c.length) return;
    o.under=c[0]; S.fits[+ds.addunder]=editedFit(f,o); renderOutfits(); return; }
  if(ds.stepOpt){ S.sel=(S.sel+(+ds.stepOpt)+S.fits.length)%S.fits.length; if(S.sel) guard(); renderOutfits(); return; }
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
    case 'palettes': openPalettes(); return;
    case 'styles': openStyles(); return;
    case 'addLook': addLook(); return;
    case 'scanStyles': scanStyles(); return;
    case 'adjust': openAdjust(); return;
    case 'help': openHelp(); return;
    case 'wipe': openWipe(); return;
    case 'todaylog': openTodayLog(); return;
    case 'todayadd': openTodayLog(); return;
    case 'export': exportData(); return;
    case 'privacyOk': privacyAgree(true); return;
    case 'privacyNoClaude': privacyAgree(false); return;
    case 'scanGraphics': scanGraphics(); return;
    case 'washSnooze': { try{ localStorage.setItem('wearcycle.washSnooze',todayISO()); }catch(e){} renderOutfits(); toast('I will ask again tomorrow.'); return; }
    case 'allClean': { const ds=allItems().filter(i=>isActive(i)&&i.dirty); for(const it of ds) await patchItem(it.id,{dirty:false,wearsSinceWash:0,dirtyOn:undefined}); S.cat='all'; renderAll(); toast(ds.length+' piece'+(ds.length===1?'':'s')+' back in rotation.'); return; }
    case 'diary': DI=null; openDiary(); return;
    case 'stats': openStats(); return;
    case 'share': shareOutfit(); return;
    case 'cutOutfit': { const f=S.fits[S.sel]; if(!f) return; const o=hydrate(f.ids); makeCuts(coreOf(o).concat(o.acc)); return; }
    case 'cutAll': makeCuts([...S.items.values()]); return;
    case 'install': if(S.installEvt){ const ev=S.installEvt; S.installEvt=null; closeSheet(); renderStatus(); ev.prompt(); let out='';
      try{ out=(await ev.userChoice).outcome; }catch(err){}
      if(out==='accepted') toast('Installing Wearcycle. The icon appears on your home screen in a few seconds.',6000);
      else toast('Not installed. You can install any time from Chrome\u2019s menu: Install app or Add to Home screen.',6000); }
    else toast('To install, open Chrome\u2019s menu and choose Install app or Add to Home screen.',6000);
    return;
    case 'installNo': LS.set('wardrobe.installDismissed',true); renderStatus(); return;
    case 'signout': closeSheet(); LS.del(cacheKey()); try{ await caches.delete('wearcycle-cutouts'); }catch(e){} await sb.auth.signOut(); return;
    case 'server': closeSheet(); showSetup(true); return;
  }
  if(LG && $('#sheetRoot').innerHTML){
    if(ds.lgday){ LG.day=ds.lgday; drawLog(); return; }
    if(ds.lgocc){ LG.occ=ds.lgocc; drawLog(); return; }
    if(ds.lgit){ const sc=document.querySelector('.sheet')?.scrollTop||0; LG.sel.has(ds.lgit)?LG.sel.delete(ds.lgit):LG.sel.add(ds.lgit); drawLog(); const sh=document.querySelector('.sheet'); if(sh) sh.scrollTop=sc; return; }
    if(ds.lgsave!==undefined){ if(LG&&LG.edit) saveLogEdit(); else saveLog(); return; }
  }
  if(ds.themeSet){ themeSet(ds.themeSet); document.querySelectorAll('[data-theme-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeSet===ds.themeSet))); return; }
  if(ds.pstyle){ readEditorFields(); const cur=pieceStyles(ED.it); ED.it.styles=cur.includes(ds.pstyle)?cur.filter(x=>x!==ds.pstyle):cur.concat([ds.pstyle]); if(!ED.it.styles.length) ED.it.styles=[]; drawEditor(); return; }
  if(ds.stoday!==undefined){ setStyleToday(ds.stoday); return; }
  if(ds.styleTog){ const st=styleSet(), k=ds.styleTog; if(st.pick.includes(k)) st.pick=st.pick.filter(x=>x!==k); else st.pick.push(k);
    saveCache(); queueSettingsSave(); S.fitKey=''; openStyles(); renderAll(); return; }
  if(ds.styleWork!==undefined){ const st=styleSet(), k=ds.styleWork; st.work=!k?[]:(st.work.includes(k)?st.work.filter(x=>x!==k):st.work.concat([k])); saveCache(); queueSettingsSave(); S.fitKey=''; openStyles(); renderAll(); return; }
  if(ds.revert!==undefined){ const k=+ds.revert, f=S.fits[k]; if(f&&f.orig){ S.fits[k]=Object.assign({},f.orig,{worn:f.worn||f.orig.worn}); renderOutfits(); toast('Back to the suggested outfit.'); } return; }
  if(ds.fixed){ if(await patchItem(ds.fixed,{repair:undefined,repairNote:undefined,repairOn:undefined,repairOk:undefined})) toast('Fixed. Back in every outfit it suits.'); return; }
  if(ds.clean){ if(await patchItem(ds.clean,{dirty:false,wearsSinceWash:0,dirtyOn:undefined})){ if(!allItems().some(i=>i.dirty)) S.cat='all'; renderAll(); toast('Back in rotation.'); } return; }
  if(ds.cat){ S.cat=ds.cat; renderCloset(); return; }
  if(ds.edit){ closeSheet(); openEditor(ds.edit); return; }
  if(ds.wear){ wear(+ds.wear); return; }
  if(ds.swap!==undefined){ openPiece(+ds.swap,ds.slot); return; }
  if(ds.pdrop!==undefined){ dropPiece(+ds.pdrop,ds.slot); return; }
  if(ds.punlog){ unlogPiece(ds.punlog); return; }
  if(ds.pswap!==undefined){ const k=+ds.pswap, sl=ds.slot; const before=pieceAt(k,sl); swap(k,sl); const after=pieceAt(k,sl);
    if(after&&before&&after.id!==before.id) openPiece(k,sl,true); return; }
  if(ds.donate){ if(await patchItem(ds.donate,{status:'donated',donatedOn:todayISO()})) toast('Marked as donated'); return; }
  if(ds.restore){ if(await patchItem(ds.restore,{status:'active'})) toast('Back in your closet'); return; }
  if(ds.check){ openCheck(ds.check); return; }
  if(ds.step){ changeSetting(ds.step, SETDEF[ds.step].get(S.settings)+(+ds.d)*SETDEF[ds.step].step); return; }
  if(ds.preset){ changeSetting(ds.preset,+ds.v); return; }
  if(ED){
    if(ds.color){ readEditorFields(); const c=ED.it.colors=(ED.it.colors||[]).slice(); const ix=c.indexOf(ds.color); if(ix>=0) c.splice(ix,1); else if(c.length<3) c.push(ds.color); else toast('Up to three colors.'); drawEditor(); return; }
    if(ds.seg){ readEditorFields(); ED.it[ds.seg]=+ds.v; drawEditor(); return; }
    if(ds.washev!==undefined){ readEditorFields(); ED.it.washEvery=+ds.washev; drawEditor(); return; }
    if(ds.isnew){ readEditorFields(); ED.it.cond=5; ED.it.bought=todayISO().slice(0,7); drawEditor(); toast('Set to Like new, bought '+ED.it.bought+'.'); return; }
    if(ds.occt){ readEditorFields();
      if(ds.occt==='work'||ds.occt==='formal'){ const k=ds.occt==='work'?'workOverride':'formalOverride'; const on=effectiveOccasions(Object.assign({},ED.it,{cond:Math.max(4,ED.it.cond??4)})).includes(ds.occt);
        const auto=ds.occt==='work'?workOk(ED.it):formalOk(ED.it); const want=!on; ED.it[k]=(want===auto)?undefined:(want?'yes':'no'); if(ED.it[k]===undefined) delete ED.it[k]; drawEditor(); return; }
      const o=ED.it.occ=(ED.it.occ||[]).slice(); const ix=o.indexOf(ds.occt); if(ix>=0) o.splice(ix,1); else o.push(ds.occt); drawEditor(); return; }
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
    if(ds.cutdel){ const it=byId(ED.id); if(it&&it.cut&&await patchItem(it.id,{cut:null})){ removePhoto(it.cut); ED.it.cut=null; drawEditor(); toast('Cut-out removed. The board shows the photo instead.'); } return; }
    if(ds.cutmake){ const it=byId(ED.id); if(it) makeCuts([it]); return; }
    if(ds.cutredo){ const it=byId(ED.id); if(!it) return; const old=it.cut; if(await patchItem(it.id,{cut:null})){ if(old) removePhoto(old); makeCuts([byId(it.id)]); } return; }
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
document.addEventListener('toggle',e=>{ if(ED&&e.target.matches&&e.target.matches('details.more')) ED.more=e.target.open; },true);
document.addEventListener('change',e=>{ if(e.target&&(e.target.id==='langSel'||e.target.id==='g-lang')){ I18N.setLang(e.target.value); return; } if(e.target&&e.target.id==='f-repair'&&ED){ readEditorFields(); drawEditor(); return; } if(e.target&&e.target.dataset&&e.target.dataset.wflag){ const w=S.settings.work=Object.assign({code:'casual'},S.settings.work||{}); w[e.target.dataset.wflag]=e.target.checked; setDressCode(w); saveCache(); queueSettingsSave(); S.fitKey=''; renderAll(); return; }
  if(e.target&&e.target.id==='washAutoT'){ S.settings.washAuto=e.target.checked; saveCache(); queueSettingsSave(); if(e.target.checked) autoWash(); return; }
  if(e.target&&e.target.id==='laundryT'){ S.settings.laundry=e.target.checked; saveCache(); queueSettingsSave(); if(!e.target.checked) toast('Laundry tracking off. Pieces already in the wash stay there until you mark them clean.',5000); return; }
  if(e.target&&e.target.id==='autoCutT'){ S.settings.autoCut=e.target.checked; saveCache(); queueSettingsSave(); return; }
  if(e.target&&e.target.id==='enhanceT'){ S.settings.enhance=e.target.checked; saveCache(); queueSettingsSave(); for(const u of CUT.urls.values()) URL.revokeObjectURL(u); CUT.urls.clear(); ENH.clear(); renderAll(); return; }
  if(e.target&&e.target.id==='claudeT'){ S.settings.claude=e.target.checked; saveCache(); queueSettingsSave(); toast(e.target.checked?'Claude features on.':'Claude features off. Nothing more is sent to Anthropic. When you add clothes, you will set their category, colors and occasions.',6000); } });
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
const FIXED_SERVER=!!(window.WARDROBE_CONFIG&&window.WARDROBE_CONFIG.supabaseUrl);
function showLogin(msg,mode){
  mode=mode||'up';
  const up=mode==='up', reset=mode==='reset';
  showGate(`<div class="welcome"><h1>Get dressed in seconds.</h1>
    <p>Photograph your clothes once. Every day, Wearcycle lays out the best outfit from your own closet, for the weather and the occasion, and tells you what to repair, donate or buy.</p>
    <ul class="perks"><li>Ranked outfits with a reason for each</li><li>Flat-lay view of every look</li><li>Care, donate and shopping lists from what you own</li></ul></div>
   <div class="card2"><div class="seg2" role="tablist"><button role="tab" aria-selected="${up}" id="g-mode-up">Create account</button><button role="tab" aria-selected="${!up}" id="g-mode-in">Sign in</button></div>
    <div class="field"><label for="g-email">Email</label><input type="email" id="g-email" autocomplete="email"></div>
    ${reset?'':`<div class="field"><label for="g-pass">Password${up?' (8+ characters)':''}</label><input type="password" id="g-pass" autocomplete="${up?'new-password':'current-password'}" minlength="8"></div>`}
    ${up?`<label class="consent"><input type="checkbox" id="g-agree"><span>I agree to the <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a>: my clothes, photos and outfit log are stored with Supabase, and Claude (Anthropic, United States) reads the photos I add. I am 13 or older.</span></label>`
      :'<p class="hint">How your data is handled: <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a>.</p>'}
    <p class="err" id="g-err">${esc(msg||'')}</p>
    ${reset?'<button class="btn primary" id="g-reset">Send reset link</button><button class="linkbtn" id="g-back" style="margin:0">Back to sign in</button>'
      :`<button class="btn primary cta" id="${up?'g-up':'g-in'}">${up?'Create account':'Sign in'}</button>${up?'':'<button class="linkbtn" id="g-forgot" style="margin:0">Forgot password?</button>'}`}
</div>
    ${FIXED_SERVER?'':'<button class="btn ghost sm" id="g-server" style="align-self:flex-start">Server settings</button>'}<div class="row" style="justify-content:space-between;align-items:center"><p class="hint">Wearcycle v${APP_VERSION}</p>${langSelect('g-lang')}</div>`);
  const creds=()=>({email:$('#g-email').value.trim(),password:($('#g-pass')||{}).value||''});
  $('#g-mode-up').onclick=()=>showLogin('','up'); $('#g-mode-in').onclick=()=>showLogin('','in');
  if($('#g-in')) $('#g-in').onclick=async()=>{ const c=creds(); if(!c.email||!c.password){ $('#g-err').textContent='Enter your email and password.'; return; }
    $('#g-in').disabled=true; const {error}=await sb.auth.signInWithPassword(c); if($('#g-in')) $('#g-in').disabled=false;
    if(error) $('#g-err').textContent=error.message==='Invalid login credentials'?'Email or password is wrong.':error.message; };
  if($('#g-up')) $('#g-up').onclick=async()=>{ const c=creds(); if(!c.email||c.password.length<8){ $('#g-err').textContent='Enter an email and a password of at least 8 characters.'; return; }
    if(!$('#g-agree').checked){ $('#g-err').textContent='Check the box to agree to the privacy notice first.'; return; }
    try{ localStorage.setItem('wearcycle.consent',new Date().toISOString()); }catch(e){}
    $('#g-up').disabled=true; const {data,error}=await sb.auth.signUp({email:c.email,password:c.password,options:{emailRedirectTo:location.origin+location.pathname}}); if($('#g-up')) $('#g-up').disabled=false;
    if(error){ $('#g-err').textContent=/not allowed|disabled/i.test(error.message)?'New accounts are not open yet. If someone created an account for you, use the Sign in tab.':error.message; return; }
    if(!data.session) $('#g-err').textContent='Almost there: open the confirmation email, tap the link, then sign in here.'; };
  if($('#g-forgot')) $('#g-forgot').onclick=()=>showLogin('','reset');
  if($('#g-back')) $('#g-back').onclick=()=>showLogin('','in');
  if($('#g-reset')) $('#g-reset').onclick=async()=>{ const e=$('#g-email').value.trim(); if(!e){ $('#g-err').textContent='Enter your email.'; return; }
    const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname}); $('#g-err').textContent=error?error.message:'If that email has an account, a reset link is on its way.'; };
  if($('#g-server')) $('#g-server').onclick=()=>showSetup(true);
}
async function askNewPassword(){
  openSheet(sheetHead('Choose a new password')+`<div class="field"><label for="np">New password (8+ characters)</label><input type="password" id="np" autocomplete="new-password"></div><p class="err" id="np-err"></p><div class="row sheet-actions"><button class="btn primary" id="np-save">Save password</button></div>`);
  $('#np-save').onclick=async()=>{ const v=$('#np').value; if(v.length<8){ $('#np-err').textContent='Use at least 8 characters.'; return; }
    const {error}=await sb.auth.updateUser({password:v}); if(error){ $('#np-err').textContent=error.message; return; } closeSheet(); toast('Password updated.'); };
}
function defaultStyleToday(){ const v=LS.get('wearcycle.styleDay'); return v&&v.day===todayISO()&&v.k?v.k:undefined; }
function defaultOcc(){
  const saved=LS.get('wearcycle.occ'); if(saved&&saved.day===todayISO()&&OCC[saved.occ]) return saved.occ;
  const d=new Date(), wd=d.getDay(), h=d.getHours(), weekend=wd===0||wd===6;
  if(!weekend&&h<17) return 'work'; if(h>=17&&(wd===5||wd===6)) return 'out'; if(weekend&&h<17) return 'out'; return 'home'; // weekday evenings and Sunday evening: home
}
function startApp(session){
  if(UID===session.user.id) return;
  UID=session.user.id; EMAIL=session.user.email||''; S.occ=defaultOcc(); S.styleToday=defaultStyleToday(); LS.set('wearcycle.known',true);
  $('#gate').hidden=true; $('#appRoot').hidden=false;
  loadCache(); renderAll(); loadWeather();
  if(S.online) loadRemote(); else renderAll();
}
async function boot(){
  if(!CFG.url||!CFG.key||!window.supabase){ showSetup(false); return; }
  sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((event,session)=>{
    if(session&&session.user) setTimeout(()=>startApp(session),0);
    else if(event==='SIGNED_OUT'){ if(UID) LS.del(cacheKey()); UID=null; S.items=new Map(); S.log=[]; S.loaded=false; showLogin('','in'); }
    else if(event==='PASSWORD_RECOVERY'){ setTimeout(askNewPassword,0); }
  });
  const {data}=await sb.auth.getSession();
  if(data&&data.session) startApp(data.session); else showLogin('',LS.get('wearcycle.known')?'in':'up');
}
boot();
