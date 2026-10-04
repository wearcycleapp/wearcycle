/* Wearcycle app: UI, camera, Supabase storage and Claude calls. Pure scoring rules live in logic.js. */
'use strict';
const {CATS,CAT,ACCESSORY,GARMENT,OCCASIONS,OCC,COND,FORM,COLORS,DAY,
  daysSince,isActive,primary,effectiveOccasions,eligible,coreOf,scoreOutfit,makeRng,suggest,swapCandidates,careFlags,gaps}=WardrobeLogic;

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
const S={items:new Map(),examples:[],log:[],exLog:[],settings:{checkEvery:25,checkDays:180,unusedDays:365},
  occ:'work',layer:false,fits:[],fitKey:'',seed:Date.now()%100000,cat:'all',tab:'outfits',
  loaded:false,online:navigator.onLine,fromCache:false,busy:false,installEvt:null};
function allItems(){ return [...S.items.values(),...S.examples]; }
function allLog(){ return S.log.concat(S.exLog); }
function byId(id){ return S.items.get(id)||S.examples.find(e=>e.id===id); }
function ctx(){ return {now:Date.now(),log:allLog()}; }
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
  watch:'<rect x="19" y="4" width="10" height="40" rx="3"/><circle cx="24" cy="24" r="10"/>',
  belt:'<rect x="3" y="19" width="42" height="10" rx="2"/><rect x="17" y="16" width="11" height="16" rx="2" fill="none" stroke-width="2.5"/>',
  hat:'<path d="M9 31c0-10 7-17 15-17s15 7 15 17Z"/><rect x="3" y="30" width="42" height="5" rx="2"/>',
  bag:'<path d="M9 18h30l-3 24H12L9 18Z"/><path d="M18 18v-4a6 6 0 0 1 12 0v4" fill="none" stroke-width="2.5"/>',
  other:'<circle cx="24" cy="24" r="13"/>'};
function glyph(it){ const c=COLORS[primary(it)]?.hex||'#9aa3ad'; return `<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true" fill="${c}" stroke="rgba(120,130,140,.55)" stroke-width="1.2" stroke-linejoin="round">${GLYPH[it.cat]||GLYPH.other}</svg>`; }
function thumbSrc(it){ return it.thumb||it._localUrl||''; }
function visual(it){ const src=thumbSrc(it); return src?`<img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy">`:glyph(it); }
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
  const cs=(res.colors||[]).filter(c=>COLORS[c]).slice(0,3); if(cs.length) it.colors=cs;
  if(res.formality>=1&&res.formality<=5) it.formality=Math.round(res.formality);
  const oc=(res.occasions||[]).filter(o=>OCC[o]); if(oc.length) it.occ=oc;
  if(res.condition>=1&&res.condition<=5) it.cond=Math.round(res.condition);
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
  S.fromCache=false; S.loaded=true; saveCache(); renderAll();
}
function loadCache(){ const c=LS.get(cacheKey()); if(!c) return false;
  S.items=new Map((c.items||[]).map(r=>[r.id,r])); S.log=c.log||[]; if(c.settings) Object.assign(S.settings,c.settings);
  S.loaded=true; S.fromCache=true; return true; }

/* ---------- camera ---------- */
const CAM={stream:null,mode:'single',shots:[],resolve:null,facing:'environment',busy:false};
function openCamera(mode){
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
    if(!aiStop){ try{ const r=await aiTag(p.full); if(r&&!r.error) applyAi(it,r); else aiFail++; }catch(e){ aiFail++; if(/not set up|API key|sign-in/.test(aiMsg(e))) aiStop=aiMsg(e); } }
    if(await writeItem(it)) done++;
  }
  S.busy=false;
  toast('Added '+done+' item'+(done===1?'':'s')+'. Open each one marked Review to confirm the details.'+(aiStop?' '+aiStop:(aiFail?' Claude could not read '+aiFail+'.':'')),7000);
  goTab('closet');
}

/* ---------- rendering ---------- */
function renderAll(){ renderStatus(); renderOutfits(); renderCloset(); renderCare(); renderShop(); }
function renderStatus(){
  const st=$('#status'); let b='';
  if(!S.online){ st.textContent='Offline'; st.className='status warn'; b='<div class="banner"><div><b>You are offline.</b> Showing the last saved copy. Changes and Claude need a connection.</div></div>'; }
  else if(S.fromCache){ st.textContent='Syncing'; st.className='status'; }
  else { st.textContent='Saved'; st.className='status ok'; }
  if(S.online && S.installEvt && !LS.get('wardrobe.installDismissed')) b+='<div class="banner" style="background:var(--accent-soft)"><div style="flex:1"><b style="color:var(--accent)">Install Wearcycle</b> to open it from your home screen like any app.</div><button class="btn sm primary" data-act="install">Install</button><button class="btn sm ghost" data-act="installNo">Later</button></div>';
  $('#banner').innerHTML=b;
  $('#addBtn').hidden=S.tab==='shop';
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
function fitKeyNow(){ return S.occ+'|'+S.layer+'|'+allItems().filter(isActive).map(i=>i.id+':'+(i.cond??4)+':'+(i.occ||[]).join(',')+':'+(i.colors||[]).join(',')+':'+(i.formality??3)).sort().join(';'); }
function idsOf(o){ return {top:o.top?.id,bottom:o.bottom?.id,onepiece:o.onepiece?.id,outer:o.outer?.id,shoes:o.shoes?.id,acc:(o.acc||[]).map(a=>a.id)}; }
function hydrate(ids){ const o={}; for(const k of ['top','bottom','onepiece','outer','shoes']) if(ids[k]&&byId(ids[k])) o[k]=byId(ids[k]); o.acc=(ids.acc||[]).map(byId).filter(Boolean); return o; }
function regenerate(){
  const r=suggest(allItems(),S.occ,ctx(),{n:4,jitter:S.seed?1.2:0,rng:makeRng(S.seed),layer:S.layer});
  S.fits=r.outfits.map(f=>({ids:idsOf(f.o),score:f.score,reasons:f.reasons})); S.missing=r.missing; S.fitKey=fitKeyNow();
}
function renderOutfits(){
  $('#occChips').innerHTML=OCCASIONS.map(o=>`<button class="chip" data-occ="${o.id}" aria-pressed="${S.occ===o.id}">${o.label}</button>`).join('');
  const lb=$('#layerBtn'); lb.setAttribute('aria-pressed',S.layer); lb.textContent='Add outerwear: '+(S.layer?'on':'off');
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
  box.innerHTML='<div class="fits">'+S.fits.map((f,i)=>fitCard(f,i)).join('')+'</div>';
}
const SWAP_ICON='<span class="swap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9h13l-4-4M20 15H7l4 4"/></svg></span>';
function tile(it,slot,i,size){
  if(!it) return '';
  return `<button class="tile ${size||''}" data-swap="${i}" data-slot="${slot}" aria-label="${esc(CAT[it.cat].label)}: ${esc(it.name)}. Tap to swap">${slot.startsWith('acc')?'':SWAP_ICON}<div class="vis">${visual(it)}</div><div class="cap">${esc(it.name)}</div></button>`;
}
function fitCard(f,i){
  const o=hydrate(f.ids);
  const upper=o.onepiece?tile(o.onepiece,'onepiece',i):tile(o.top,'top',i);
  const pair=o.outer?`<div class="pair two">${tile(o.outer,'outer',i)}${upper}</div>`:`<div class="pair">${upper}</div>`;
  const hat=o.acc.find(a=>a.cat==='hat'); const side=o.acc.filter(a=>a.cat!=='hat');
  return `<article class="fit"><div class="board">
    <div class="main">${hat?tile(hat,'acc'+o.acc.indexOf(hat),i,'xs'):''}${pair}${o.onepiece?'':tile(o.bottom,'bottom',i)}${o.shoes?tile(o.shoes,'shoes',i,'sm'):''}</div>
    <div class="side">${side.map(a=>tile(a,'acc'+o.acc.indexOf(a),i,'xs')).join('')}</div></div>
    <div class="fit-meta">
      <div class="score"><span class="num">${f.score.toFixed(1)}</span><span class="lbl">match score<br>higher is better</span></div>
      <ul class="why">${f.reasons.map(r=>`<li class="${r.neg?'neg':''}">${esc(r.t)}</li>`).join('')}</ul>
      <div class="row">${f.worn?'<span class="worn-ok">Logged as worn today</span>':`<button class="btn primary sm" data-wear="${i}">Wear today</button>`}</div>
    </div></article>`;
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
  box.innerHTML=(reviews?`<p class="hint" style="margin:0 0 12px">${reviews} item${reviews>1?'s':''} marked <span class="ex">Review</span>: check what Claude filled in, then save.</p>`:'')+
   (S.examples.length?`<div class="row" style="margin-bottom:12px"><span class="hint">Items marked <span class="ex">Example</span> are not saved.</span><span class="spacer"></span><button class="btn sm ghost" data-act="clearEx">Remove examples</button></div>`:'')+
   '<div class="grid">'+list.map(it=>{ const fl=careFlags(it,now,S.settings); const bad=fl.some(f=>f.kind==='retire'); return `<button class="card" data-edit="${esc(it.id)}">
    <div class="vis">${visual(it)}</div><div class="body"><div class="name">${esc(it.name)}</div>
    <div class="meta">${condTag(it)}${fl.length?`<span class="dot ${bad?'bad':''}" title="Needs attention"></span>`:''}${isEx(it)?'<span class="ex">Example</span>':''}${it.review?'<span class="ex">Review</span>':''}</div>
    <div class="meta">${(effectiveOccasions(it).map(o=>OCC[o].label).join(' · '))||'No occasion fits'}</div></div></button>`; }).join('')+'</div>';
}
function thumbBox(it){ return `<div class="thumb">${thumbSrc(it)?`<img src="${esc(thumbSrc(it))}" alt="">`:glyph(it)}</div>`; }
function careRow(it,f,acts){
  const cls=f.kind==='retire'?'stripe-retire':(f.kind==='downgraded'?'stripe-down':'');
  return `<div class="li ${cls}">${thumbBox(it)}<div class="txt"><b>${esc(it.name)} ${isEx(it)?'<span class="ex">Example</span>':''}</b><span>${esc(f.text)}</span></div><div class="acts">${acts}</div></div>`;
}
function renderCare(){
  const now=Date.now(), items=allItems(); const box=$('#careBody');
  if(!items.length){ box.innerHTML=S.loaded?emptyCloset():''; return; }
  const groups={retire:[],unused:[],downgraded:[],check:[]};
  for(const it of items) for(const f of careFlags(it,now,S.settings)) groups[f.kind].push([it,f]);
  const panel=(title,desc,rows)=>`<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="count">${rows.length}</span></div>${desc?`<div class="panel-h"><p>${desc}</p></div>`:''}${rows.join('')}</div>`;
  const out=[];
  const donate=groups.retire.concat(groups.unused.filter(([it])=>!groups.retire.some(([r])=>r.id===it.id)));
  out.push(donate.length?panel('Donate or recycle','Retired items and anything unused for '+S.settings.unusedDays+'+ days.',donate.map(([it,f])=>careRow(it,f,`<button class="btn sm" data-donate="${esc(it.id)}">Mark donated</button><button class="btn sm ghost" data-edit="${esc(it.id)}">Open</button>`)))
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
function closeSheet(){ $('#sheetRoot').innerHTML=''; document.body.style.overflow=''; ED=null; CK=null; }
function openSheet(html){ $('#sheetRoot').innerHTML=`<div class="scrim" data-scrim="1"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`; document.body.style.overflow='hidden'; }
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
  const it=ED.it; const pv=ED.preview||ED.full||thumbSrc(it);
  const colorBtns=Object.entries(COLORS).map(([k,v])=>{ const ix=(it.colors||[]).indexOf(k); return `<button type="button" data-color="${k}" aria-pressed="${ix>=0}" aria-label="${k}${ix>=0?', choice '+(ix+1):''}" title="${k}" style="background:${v.hex}">${ix>=0?`<span class="ord">${ix+1}</span>`:''}</button>`; }).join('');
  const seg=(key,labels)=>`<div class="seg">${[1,2,3,4,5].map(n=>`<button type="button" data-seg="${key}" data-v="${n}" aria-pressed="${(it[key]??(key==='cond'?4:3))===n}"><b>${n}</b>${labels[n].split(' ')[0]}</button>`).join('')}</div>`;
  openSheet(sheetHead(ED.id?(it.review?'Review item':'Edit item'):'New item')+`
   ${isEx(it)?'<p class="hint"><span class="ex">Example</span> Changes to example items are not saved.</p>':''}
   <div class="photo"><div class="pv">${pv?`<img src="${esc(pv)}" alt="">`:glyph(it)}</div>
     <div class="col"><button type="button" class="btn sm" data-photo="cam">Take photo</button><button type="button" class="btn sm ghost" data-photo="gal">Choose photo</button>
     ${ED.blob?`<button type="button" class="btn sm primary" data-ai="tag" ${ED.busy?'disabled':''}>${ED.busy?'Reading photo…':'Fill in with Claude'}</button>`:''}</div></div>
   ${ED.ai?`<div class="ai">${ED.ai}</div>`:''}
   <div class="field"><label for="f-name">Name</label><input type="text" id="f-name" value="${esc(it.name)}" placeholder="e.g. White oxford shirt" maxlength="60"></div>
   <div class="field"><label for="f-cat">Category</label><select id="f-cat">${CATS.map(c=>`<option value="${c.id}" ${it.cat===c.id?'selected':''}>${c.label}</option>`).join('')}</select></div>
   <div class="field"><span class="lab">Colors · tap in order, main color first</span><div class="colors">${colorBtns}</div></div>
   <div class="field"><span class="lab">Dress level · ${FORM[it.formality??3]}</span>${seg('formality',FORM)}</div>
   <div class="field"><span class="lab">Occasions</span><div class="chips" style="flex-wrap:wrap">${OCCASIONS.map(o=>`<button type="button" class="chip" data-occt="${o.id}" aria-pressed="${(it.occ||[]).includes(o.id)}">${o.label}</button>`).join('')}</div></div>
   <div class="field"><span class="lab">Condition · ${COND[it.cond??4]}</span>${seg('cond',COND)}<p class="hint">5 like new · 4 good, no visible wear · 3 visible wear (pilling, fading), fine for home · 2 worn out (stains, small holes), chores only · 1 unusable.</p></div>
   <div class="field"><label for="f-bought">Bought (month, optional)</label><input type="month" id="f-bought" value="${esc(it.bought||'')}"></div>
   <div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" maxlength="300" placeholder="Fit, care, where it came from">${esc(it.notes||'')}</textarea></div>
   ${ED.id&&!isEx(it)?`<p class="hint">Worn ${it.worn||0} times${it.lastWorn?', last on '+esc(it.lastWorn):''}.${it.lastCheck?' Last condition check '+esc(it.lastCheck)+'.':''}</p>`:''}
   <div class="row"><button type="button" class="btn primary" data-save ${ED.busy?'disabled':''}>${it.review?'Confirm and save':'Save'}</button><button type="button" class="btn ghost" data-close>Cancel</button><span class="spacer"></span>
   ${ED.id?`<button type="button" class="btn danger sm" data-del>${ED.confirmDel?'Tap again to delete':'Delete'}</button>`:''}</div>`);
}
function readEditorFields(){ if(!ED) return; const it=ED.it, g=s=>$(s); if(g('#f-name')) it.name=g('#f-name').value.trim(); if(g('#f-cat')) it.cat=g('#f-cat').value; if(g('#f-bought')) it.bought=g('#f-bought').value; if(g('#f-notes')) it.notes=g('#f-notes').value.trim(); }
async function editorSetPhoto(blob){
  try{ const p=await prepare(blob); if(!ED) return; ED.blob=p.full; ED.thumb=p.thumb; if(ED.preview) URL.revokeObjectURL(ED.preview); ED.preview=URL.createObjectURL(p.full); ED.ai=null; }
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
  if(ED.blob){
    it.thumb=ED.thumb;
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
    <button type="button" class="btn sm primary" data-ai="check" ${!CK.blob||CK.busy?'disabled':''}>${CK.busy?'Assessing…':'Assess with Claude'}</button></div></div>
   ${CK.err?`<p class="err">${esc(CK.err)}</p>`:''}
   ${r?`<div class="ai"><span class="k">Claude's read · ${esc(r.confidence||'')} confidence</span><div><b>${esc(COND[r.condition]||'')} (${esc(r.condition)}/5)</b>, recommends ${esc(r.recommendation||'')}. ${esc(r.summary||'')}</div>${(r.issues||[]).length?`<ul>${r.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<span class="hint">A photo can miss odors, fit and fabric thinning. Adjust the rating if you know better.</span></div>`:''}
   <div class="field"><span class="lab">Your rating · ${COND[CK.cond]}</span><div class="seg">${[1,2,3,4,5].map(n=>`<button type="button" data-ckc="${n}" aria-pressed="${CK.cond===n}"><b>${n}</b>${COND[n].split(' ')[0]}</button>`).join('')}</div></div>
   ${CK.blob&&!isEx(it)?`<label class="row hint"><input type="checkbox" id="ck-use" ${CK.usePhoto?'checked':''}> Use this photo as the item photo</label>`:''}
   <div class="row"><button type="button" class="btn primary" data-cksave ${CK.busy?'disabled':''}>Save check</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
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
  if(use&&CK.blob&&canWrite()&&!isEx(it)){ const path=await uploadPhoto(CK.blob); if(path){ old=it.photo; patch.photo=path; patch.thumb=CK.thumb; } }
  const cond=CK.cond; closeSheet();
  if(await patchItem(it.id,patch)){ if(old) removePhoto(old); toast(cond<=1?'Saved. It is now on the donate list.':'Check saved'); }
}

function openSettings(){
  const s=S.settings;
  openSheet(sheetHead('Settings')+`
   <div class="panel"><div class="li"><div class="txt"><b>${esc(EMAIL||'Signed in')}</b><span>Your closet syncs to your own Supabase project.</span></div><div class="acts"><button class="btn sm" data-act="signout">Sign out</button></div></div>
   ${S.installEvt?'<div class="li"><div class="txt"><b>Install on this device</b><span>Adds Wearcycle to your home screen.</span></div><div class="acts"><button class="btn sm primary" data-act="install">Install</button></div></div>':''}</div>
   <div class="field"><label for="s-ce">Condition check after this many wears</label><input type="number" id="s-ce" min="5" max="200" value="${s.checkEvery}"></div>
   <div class="field"><label for="s-cd">…or after this many days</label><input type="number" id="s-cd" min="30" max="730" value="${s.checkDays}"></div>
   <div class="field"><label for="s-ud">Suggest donating after this many days unworn</label><input type="number" id="s-ud" min="90" max="1095" value="${s.unusedDays}"></div>
   <div class="row"><button type="button" class="btn primary" data-ssave>Save settings</button></div>
   <h3>How it decides</h3>
   <div class="rules">
    <p><b>Outfit score.</b> +2 for an all-neutral palette or neutrals plus one accent color, +1 for two analogous or complementary accents, -2 or -3 for accents that compete. +1 when all pieces sit within one dress level, minus a point for each extra level apart. Up to +1.5 for pieces that have rested two weeks, -1 if something was worn yesterday, -2 if the same top and bottom were worn together this week.</p>
    <p><b>Neutrals.</b> Black, white, grey, navy, beige, khaki, brown, denim and olive pair with anything. This follows common menswear color guidance; it is a convention, not a law.</p>
    <p><b>Condition bars.</b> Work and going out need 4/5, sport and home 3/5, chores 2/5. A casual garment that drops to 3/5 or 2/5 moves to home and chores automatically. 1/5 goes to the donate list.</p>
    <p><b>Shopping targets.</b> Work: 5 tops (one per weekday), 3 bottoms, 2 shoes. Going out, sport and home: 3, 2, 1. Chores: 2, 1, 1. Colors are ranked by how many good combinations a new piece would create with what you own.</p>
   </div>
   <div class="row"><button class="btn sm ghost" data-act="server">Change server settings</button><span class="spacer"></span><span class="hint">Version 1.2.1</span></div>`);
}
async function saveSettings(){
  const v=(id,lo,hi,d)=>{ const n=parseInt($(id).value,10); return isNaN(n)?d:Math.max(lo,Math.min(hi,n)); };
  const s={checkEvery:v('#s-ce',5,200,25),checkDays:v('#s-cd',30,730,180),unusedDays:v('#s-ud',90,1095,365)};
  if(!canWrite()){ toast('You are offline. Changes need a connection.'); return; }
  const {error}=await sb.from('settings').upsert({user_id:UID,body:s});
  if(error){ toast('Could not save settings: '+error.message,4500); return; }
  S.settings=s; saveCache(); closeSheet(); renderAll(); toast('Settings saved');
}

/* ---------- actions ---------- */
async function wear(i){
  const f=S.fits[i]; if(!f||f.worn) return;
  const o=hydrate(f.ids); const list=coreOf(o).concat(o.acc); const day=todayISO(); const ids=list.map(x=>x.id);
  const real=ids.filter(id=>!String(id).startsWith('ex-'));
  if(real.length&&!canWrite()){ toast('You are offline. Logging needs a connection.'); return; }
  f.worn=true; renderOutfits();
  for(const it of list){ await patchItem(it.id,{worn:(it.worn||0)+1,lastWorn:day,wearsSinceCheck:(it.wearsSinceCheck||0)+1}); }
  const entry={date:day,occ:S.occ,items:ids};
  if(!real.length) S.exLog.unshift(entry);
  else { const {error}=await sb.from('wears').insert(entry); if(error) toast('Could not log the outfit: '+error.message,4500); else { S.log.unshift(entry); saveCache(); } }
  S.fitKey=fitKeyNow(); renderAll(); toast('Logged as worn today');
}
function swap(i,slot){
  const f=S.fits[i]; if(!f) return; const o=hydrate(f.ids);
  if(slot.startsWith('acc')){
    const k=+slot.slice(3); const cur=o.acc[k]; if(!cur) return;
    const opts=eligible(allItems(),S.occ).filter(x=>x.cat===cur.cat); if(opts.length<2){ toast('No other '+CAT[cur.cat].label.toLowerCase()+' for this occasion.'); return; }
    o.acc[k]=opts[(opts.findIndex(x=>x.id===cur.id)+1)%opts.length];
  } else {
    const cands=swapCandidates(o,slot,allItems(),S.occ,ctx()); const cur=o[slot];
    if(cands.length<2){ toast('No other '+CAT[slot==='outer'?'outerwear':slot].label.toLowerCase()+' for this occasion.'); return; }
    o[slot]=cands[(cands.findIndex(x=>x.id===cur.id)+1)%cands.length];
  }
  const r=scoreOutfit(o,S.occ,ctx()); S.fits[i]={ids:idsOf(o),score:r.score,reasons:r.reasons}; renderOutfits();
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
    mk(13,'Brown belt','belt',['brown'],3,['work','out'],4,3), mk(14,'Steel watch','watch',['grey'],3,['work','out'],5,1),
    mk(15,'Navy blazer','outerwear',['navy'],4,['work','out'],5,12), mk(16,'Old work jeans','bottom',['denim'],1,['chores'],2,30),
    mk(17,'Stained paint tee','top',['white'],1,['chores'],1,40), mk(18,'Green rain jacket','outerwear',['green'],2,['out','chores'],3,90,{lastCheck:d(250)}),
    mk(19,'Teal swim shorts','bottom',['teal'],1,['sport'],4,420)];
  renderAll(); toast('Example closet loaded. It is not saved.');
}
function goTab(tab){
  S.tab=tab;
  for(const b of document.querySelectorAll('nav.tabs button')){ if(b.dataset.tab===tab) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }
  for(const s of document.querySelectorAll('section.tab')) s.hidden=s.id!=='tab-'+tab;
  renderStatus(); window.scrollTo(0,0);
}

document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-scrim]'); if(!t) return;
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
  if(t.id==='shuffleBtn'){ S.seed=(Date.now()%100000)+1; S.fitKey=''; renderOutfits(); return; }
  if(t.id==='layerBtn'){ S.layer=!S.layer; renderOutfits(); return; }
  if(t.id==='addBtn'){ if(S.busy) toast('Still adding the last batch…'); else openAddMenu(); return; }
  if(t.id==='rulesBtn'){ openSettings(); return; }
  switch(ds.act){
    case 'camBatch': { closeSheet(); if(S.busy) return; const shots=await openCamera('batch'); addPhotos(shots); return; }
    case 'bulk': { closeSheet(); if(S.busy) return; const files=await pickFiles(true); addPhotos(files); return; }
    case 'add': closeSheet(); openEditor(null); return;
    case 'examples': loadExamples(); return;
    case 'clearEx': S.examples=[]; S.exLog=[]; renderAll(); return;
    case 'ideas': askIdeas(); return;
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
  if(ds.cat){ S.cat=ds.cat; renderCloset(); return; }
  if(ds.edit){ closeSheet(); openEditor(ds.edit); return; }
  if(ds.wear){ wear(+ds.wear); return; }
  if(ds.swap!==undefined){ swap(+ds.swap,ds.slot); return; }
  if(ds.donate){ if(await patchItem(ds.donate,{status:'donated',donatedOn:todayISO()})) toast('Marked as donated'); return; }
  if(ds.restore){ if(await patchItem(ds.restore,{status:'active'})) toast('Back in your closet'); return; }
  if(ds.check){ openCheck(ds.check); return; }
  if(ds.ssave!==undefined){ saveSettings(); return; }
  if(ED){
    if(ds.color){ readEditorFields(); const c=ED.it.colors=(ED.it.colors||[]).slice(); const ix=c.indexOf(ds.color); if(ix>=0) c.splice(ix,1); else if(c.length<3) c.push(ds.color); else toast('Up to three colors.'); drawEditor(); return; }
    if(ds.seg){ readEditorFields(); ED.it[ds.seg]=+ds.v; drawEditor(); return; }
    if(ds.occt){ readEditorFields(); const o=ED.it.occ=(ED.it.occ||[]).slice(); const ix=o.indexOf(ds.occt); if(ix>=0) o.splice(ix,1); else o.push(ds.occt); drawEditor(); return; }
    if(ds.photo){ readEditorFields(); if(ds.photo==='cam'){ const [b]=await openCamera('single'); if(b) editorSetPhoto(b); } else { const [f]=await pickFiles(false); if(f) editorSetPhoto(f); } return; }
    if(ds.ai==='tag'){ readEditorFields(); ED.busy=true; ED.ai=null; drawEditor();
      try{ const res=await aiTag(ED.blob); if(!ED) return;
        if(res&&res.error) ED.ai=`<span class="k">Claude</span><div>${esc(res.error)}</div>`;
        else if(res){ applyAi(ED.it,res); ED.ai=`<span class="k">Filled in by Claude · ${esc(res.confidence||'')} confidence</span><div>Check each field below before saving.</div>${(res.issues||[]).length?`<ul>${res.issues.slice(0,6).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`; }
      }catch(err){ if(ED) ED.ai=`<span class="k">Claude</span><div>${esc(aiMsg(err))}</div>`; }
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
    <button class="btn ghost sm" id="g-server" style="align-self:flex-start">Change server settings</button>`);
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
  loadCache(); renderAll();
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
