/* Wardrobe logic: pure functions, no DOM. Shared by app.js and tests. */
const WardrobeLogic=(function(){
'use strict';
const CATS=[
  {id:'top',label:'Top'},{id:'bottom',label:'Bottom'},{id:'onepiece',label:'One-piece'},{id:'outerwear',label:'Outerwear'},
  {id:'shoes',label:'Shoes'},{id:'socks',label:'Socks'},{id:'watch',label:'Watch'},{id:'belt',label:'Belt'},{id:'hat',label:'Hat'},{id:'bag',label:'Bag'},{id:'other',label:'Other accessory'}];
const CAT=Object.fromEntries(CATS.map(c=>[c.id,c]));
const ACCESSORY=['socks','watch','belt','bag','hat','other'];
const GARMENT=['top','bottom','onepiece','outerwear','shoes'];
// min = lowest condition (1-5) acceptable for the occasion; formality = target on a 1-5 scale
const OCCASIONS=[
  {id:'work',label:'Work',min:4,formality:3},
  {id:'out',label:'Going out',min:4,formality:3},
  {id:'sport',label:'Sport',min:3,formality:1},
  {id:'home',label:'Home',min:3,formality:1},
  {id:'chores',label:'Chores',min:2,formality:1},
  {id:'formal',label:'Formal',min:4,formality:4.5}];
const OCC=Object.fromEntries(OCCASIONS.map(o=>[o.id,o]));
const COND={5:'Like new',4:'Good',3:'Worn',2:'Worn out',1:'Retire'};
const FORM={1:'Athletic / lounge',2:'Casual',3:'Smart casual',4:'Business',5:'Formal'};
// Neutrals (n) pair with anything; chromatic colors carry a hue (h, degrees) for harmony checks.
const COLORS={
  black:{hex:'#1c1d20',n:1},white:{hex:'#f6f6f3',n:1},grey:{hex:'#8b9097',n:1},navy:{hex:'#1f2e57',n:1},
  beige:{hex:'#d8c6a3',n:1},khaki:{hex:'#b3a477',n:1},brown:{hex:'#6a4a2e',n:1},denim:{hex:'#4b6589',n:1},olive:{hex:'#5d6a38',n:1},
  red:{hex:'#b9322e',h:0},burgundy:{hex:'#6e1f2f',h:345},pink:{hex:'#e29ab0',h:340},orange:{hex:'#d6742a',h:28},
  yellow:{hex:'#e0be42',h:50},green:{hex:'#3e8a4d',h:130},teal:{hex:'#2e8987',h:178},lightblue:{hex:'#9bbfe5',h:210},
  blue:{hex:'#3566c4',h:220},purple:{hex:'#6a4a9c',h:275}};
// Optional style palettes the owner can prefer. Outfits whose main colors all sit in the palette rank higher.
const PALETTES={
  any:{label:'Any colors',colors:null,desc:'No preference: only color harmony counts.'},
  muted:{label:'Muted classics',colors:['black','white','grey','navy','beige','khaki','brown','denim','olive','burgundy','lightblue'],desc:'Neutral base with one muted accent such as olive, burgundy or light blue.'},
  earth:{label:'Earth tones',colors:['beige','khaki','brown','olive','white','burgundy','denim'],desc:'Cream, tan, brown, olive and rust-like warmth.'},
  mono:{label:'Monochrome',colors:['black','white','grey'],desc:'Black, white and grey only.'},
  navy:{label:'Navy and white',colors:['navy','white','denim','lightblue','grey','beige'],desc:'Nautical: navy, white, light blue and soft neutrals.'}};
const TARGETS={work:{top:5,bottom:3,shoes:2},out:{top:3,bottom:2,shoes:1},sport:{top:3,bottom:2,shoes:1},home:{top:3,bottom:2,shoes:1},chores:{top:2,bottom:1,shoes:1},formal:{top:1,bottom:1,shoes:1}};
const IDEAS={
  work:{top:'button-up shirt or knit polo',bottom:'chinos or trousers',shoes:'leather shoes or clean minimal sneakers'},
  out:{top:'casual shirt or fine knit',bottom:'dark jeans or chinos',shoes:'clean sneakers or boots'},
  sport:{top:'moisture-wicking t-shirt',bottom:'athletic shorts or joggers',shoes:'training or running shoes'},
  home:{top:'soft t-shirt',bottom:'lounge pants',shoes:'slippers'},
  chores:{top:'durable t-shirt',bottom:'work pants',shoes:'work boots or sturdy sneakers'},
  formal:{top:'white or light blue dress shirt',bottom:'suit trousers in navy or charcoal',shoes:'black or dark brown oxford shoes'}};
const SHOP_COLORS={top:['white','lightblue','navy','grey','black','olive','burgundy'],bottom:['navy','khaki','grey','black','denim','olive','beige'],shoes:['brown','black','white','grey','navy']};
const DAY=86400000;

function daysSince(iso,now){ if(!iso) return Infinity; const t=Date.parse(iso); return isNaN(t)?Infinity:Math.floor((now-t)/DAY); }
function isActive(it){ return (it.status||'active')==='active'; }
function primary(it){ return (it.colors||[])[0]; }
function hueDist(a,b){ const d=Math.abs(a-b)%360; return Math.min(d,360-d); }
function group(list){ const g={}; for(const it of list){ (g[it.cat]=g[it.cat]||[]).push(it); } return g; }

/* ---------- work dress code ----------
   Work and Formal are decided by rules rather than per-item tags, so every new photo is classified the same way.
   A piece can still be forced in or out in its editor (workOverride / formalOverride: 'yes' | 'no'). */
const DRESS_CODES={
  casual:{label:'Casual',desc:'T-shirts, hoodies, jeans, casual jackets.',target:2,minF:2,maxF:3,shorts:false,tees:true,hoodies:true,graphics:false},
  smart:{label:'Business casual',desc:'Shirts, polos, knits, chinos; no t-shirts or hoodies.',target:3,minF:3,maxF:4,shorts:false,tees:false,hoodies:false,graphics:false},
  suits:{label:'Suits',desc:'Suit, dress shirt and dress shoes.',target:4.5,minF:4,maxF:5,shorts:false,tees:false,hoodies:false,graphics:false}};
let DRESS=Object.assign({code:'casual'},DRESS_CODES.casual);
function setDressCode(w){ const base=DRESS_CODES[(w&&w.code)||'casual']||DRESS_CODES.casual; DRESS=Object.assign({code:(w&&w.code)||'casual'},base,w||{}); OCC.work.formality=base.target; }
const SHORTS_RX=/\bshorts\b/i, HOODIE_RX=/\b(hoodies?|hooded sweatshirt|zip-?up)\b/i;
function workOk(it,w){
  w=w||DRESS; const f=it.formality??3, n=String(it.name||'');
  if(it.graphic&&!w.graphics) return false;
  if(['top','bottom','onepiece','outerwear','shoes'].includes(it.cat)){
    if(it.cat==='bottom'&&SHORTS_RX.test(n)&&!w.shorts) return false;
    if(it.cat==='top'&&UNDER_RX.test(n)&&!w.tees) return false;
    if((it.cat==='top'||it.cat==='outerwear')&&HOODIE_RX.test(n)) return !!w.hoodies;
    return f>=w.minF&&f<=w.maxF;
  }
  return f>=w.minF-1&&f<=w.maxF; // socks, belts, watches, bags: one level of slack
}
function formalOk(it){ const f=it.formality??3; return ['top','bottom','onepiece','outerwear','shoes'].includes(it.cat)?f>=4:f>=3&&!it.graphic; }
function effectiveOccasions(it){
  const c=it.cond??4; if(c<=1) return [];
  const set=new Set();
  for(const o of (it.occ||[])) if(OCC[o] && o!=='work' && o!=='formal' && c>=OCC[o].min) set.add(o);
  if(c>=OCC.work.min && (it.workOverride==='yes' || (it.workOverride!=='no' && workOk(it)))) set.add('work');
  if(c>=OCC.formal.min && (it.formalOverride==='yes' || (it.formalOverride!=='no' && formalOk(it)))) set.add('formal');
  // Worn garments that were casual enough move down to home and chores instead of being thrown out
  if((c===3||c===2) && GARMENT.includes(it.cat) && (it.formality??3)<=3){ if(c>=OCC.home.min) set.add('home'); set.add('chores'); }
  return [...set];
}
/* ---------- laundry ----------
   Pieces in the wash are left out of suggestions (but still count for the shopping list, since you own them).
   Default wears before washing, from laundry experts quoted by Reviewed and Scripps/KSHB: t-shirts and socks every wear,
   jeans 4-10, smart trousers 4-5, sweaters 3-10, other tops 1-3. Jackets, shoes and accessories are not washed after wearing. */
const NOWASH=['outerwear','shoes','watch','belt','hat','bag','other'];
function washEvery(it){
  if(it.washEvery>=0&&it.washEvery!==undefined&&it.washEvery!==null) return it.washEvery; // 0 = never goes to the wash on its own
  if(NOWASH.includes(it.cat)) return 0;
  const n=String(it.name||'');
  if(it.cat==='socks') return 1;
  if(it.cat==='top'){ if(/\b(sweaters?|jumpers?|knit|cardigans?|hoodies?|sweatshirts?|fleece)\b/i.test(n)) return 5; if(UNDER_RX.test(n)||(it.formality??3)<=1) return 1; return 2; }
  if(it.cat==='bottom'){ if(/\bjeans\b/i.test(n)) return 5; if((it.formality??3)<=1||/\b(shorts|joggers?|leggings?|sweat\w*)\b/i.test(n)) return 2; return 4; }
  if(it.cat==='onepiece') return 2;
  return 0;
}
function available(it){ return isActive(it) && !it.dirty; }
function eligible(items,occ,inclDirty){ return items.filter(it=>(inclDirty?isActive(it):available(it)) && effectiveOccasions(it).includes(occ)); }

function harmony(colorNames){
  const chrom=[...new Set(colorNames.filter(c=>COLORS[c] && COLORS[c].h!==undefined))];
  if(chrom.length===0) return {s:2,why:'All-neutral palette'};
  if(chrom.length===1) return {s:2,why:'Neutral base with one accent color ('+chrom[0]+')'};
  if(chrom.length===2){
    const d=hueDist(COLORS[chrom[0]].h,COLORS[chrom[1]].h);
    if(d<=45) return {s:1,why:'Analogous colors ('+chrom.join(' + ')+')'};
    if(d>=150) return {s:1,why:'Complementary colors ('+chrom.join(' + ')+')'};
    return {s:-2,why:'Two accent colors that compete ('+chrom.join(' + ')+')',neg:1};
  }
  return {s:-3,why:'Three or more accent colors',neg:1};
}
function coreOf(o){ return [o.top,o.under,o.bottom,o.onepiece,o.outer,o.shoes].filter(Boolean); }

/* ---------- layered look: an open shirt over a t-shirt ---------- */
// Set by the owner in the editor; otherwise guessed from the name.
const OPEN_RX=/\b(button[- ]?(up|down)|flannel|plaid|overshirt|shacket|cardigan|chambray|camp[- ]collar|oxford|linen shirt|denim shirt|hawaiian)\b/i;
const UNDER_RX=/\b(t-?shirts?|tees?|tank( top)?|henley|undershirt)\b/i;
function canOpen(it){ if(typeof it.open==='boolean') return it.open; return it.cat==='top' && (it.formality??3)<=3 && OPEN_RX.test(String(it.name||'')); }
function canUnder(it){ if(typeof it.inner==='boolean') return it.inner; return it.cat==='top' && !canOpen(it) && UNDER_RX.test(String(it.name||'')); }
const LAYER_OCC=['work','out','home','chores'];

/* ---------- weather ---------- */
// Warmth 1 light, 2 medium, 3 warm. Set by Claude or the owner; otherwise guessed from the name.
const WARM_RX=/\b(sweaters?|jumpers?|hoodies?|sweatshirts?|fleece|wool|woolen|knit|cardigans?|flannel|thermal|turtleneck|coat|overcoat|parka|puffer|down jacket|boots?)\b/i;
const LIGHT_RX=/\b(t-?shirts?|tees?|tanks?|tank top|shorts|linen|sandals?|flip[- ]?flops?|slides|swim\w*|sleeveless|short[- ]sleeved?|polo)\b/i;
const RAIN_RX=/\b(rain\w*|waterproof|shell|anorak|trench|gore-?tex|boots?)\b/i;
function warmthOf(it){ if(it.warmth>=1&&it.warmth<=3) return it.warmth; const n=String(it.name||''); if(WARM_RX.test(n)) return 3; if(LIGHT_RX.test(n)) return 1; return 2; }
function rainReady(it){ if(typeof it.rain==='boolean') return it.rain; return RAIN_RX.test(String(it.name||'')); }
// Temperatures are °C feels-like, shifted by the owner's "I run cold/warm" offset.
function wxFeel(wx){ const off=wx.off||0; return {lo:wx.feelMin+off,hi:wx.feelMax+off}; }
function wxWet(wx){ return !!(wx.rain||wx.snow); }
function needsLayer(wx){ if(!wx) return false; return wxFeel(wx).lo<15 || wxWet(wx); }
const deg=t=>Math.round(t)+'°';
function weatherScore(o,wx){
  const r=[]; let s=0; const {lo,hi}=wxFeel(wx);
  const body=[o.top,o.bottom,o.onepiece].filter(Boolean), outer=o.outer;
  if(lo<12){
    if(o.bottom && warmthOf(o.bottom)===1){ s-=lo<5?3:2; r.push({t:o.bottom.name+' is too light for '+deg(lo),neg:1}); }
    if(!outer){
      const tw=Math.min(3,warmthOf(o.top||o.onepiece||{})+(o.under?1:0));
      if(lo<5){ s-=2; r.push({t:'No outer layer for '+deg(lo),neg:1}); }
      else if(tw<3){ s-=1; r.push({t:'May feel cool at '+deg(lo)+' without a layer',neg:1}); }
    } else {
      const need=lo<5?3:2;
      if(warmthOf(outer)>=need){ s+=1; r.push({t:outer.name+' suits '+deg(lo)}); }
      else { s-=1; r.push({t:outer.name+' is light for '+deg(lo),neg:1}); }
    }
  }
  else if(lo<16 && o.bottom && warmthOf(o.bottom)===1){ s-=1; r.push({t:o.bottom.name+' may feel cool at '+deg(lo),neg:1}); }
  if(outer && warmthOf(outer)===3 && lo>=10){ s-=1.5; r.push({t:outer.name+' is heavy for '+deg(lo)+' to '+deg(hi),neg:1}); }
  if(o.under && hi>=24){ s-=1; r.push({t:'Two layers on top at '+deg(hi),neg:1}); }
  else if(o.under && lo<16) { s+=0.5; r.push({t:'The t-shirt adds warmth at '+deg(lo)}); }
  if(hi>=24){
    const heavy=body.concat(outer?[outer]:[]).filter(i=>warmthOf(i)===3);
    if(heavy.length){ s-=2*heavy.length; r.push({t:heavy.map(i=>i.name).join(' and ')+' too warm for '+deg(hi),neg:1}); }
    else if(body.length && body.every(i=>warmthOf(i)===1)){ s+=1; r.push({t:'Light pieces for '+deg(hi)}); }
  }
  if(wxWet(wx)){
    if(outer && rainReady(outer)){ s+=1; r.push({t:outer.name+' handles '+(wx.snow?'snow':'rain')}); }
    if(o.shoes && warmthOf(o.shoes)===1){ s-=1.5; r.push({t:'Open shoes on a '+(wx.snow?'snowy':'wet')+' day',neg:1}); }
  }
  return {s,r};
}

function scoreOutfit(o,occ,ctx){
  const now=ctx.now, log=ctx.log||[]; const core=coreOf(o); const reasons=[]; let s=0;
  if(ctx.wx){ const w=weatherScore(o,ctx.wx); s+=w.s; reasons.push(...w.r); }
  const pal=ctx.palette&&PALETTES[ctx.palette]&&PALETTES[ctx.palette].colors;
  if(pal){ const out=core.filter(i=>primary(i)&&!pal.includes(primary(i)));
    if(!out.length){ s+=1; reasons.push({t:'Fits your '+PALETTES[ctx.palette].label.toLowerCase()+' palette'}); }
    else { s-=0.5*out.length; reasons.push({t:[...new Set(out.map(i=>primary(i)))].join(' and ')+(new Set(out.map(i=>primary(i))).size>1?' are':' is')+' outside your '+PALETTES[ctx.palette].label.toLowerCase()+' palette',neg:true}); } }
  const h=harmony(core.map(primary).filter(Boolean)); s+=h.s; reasons.push({t:h.why,neg:!!h.neg});
  if(o.top && o.bottom && primary(o.top)==='denim' && primary(o.bottom)==='denim'){ s-=1; reasons.push({t:'Double denim',neg:true}); }
  if(o.under) reasons.push({t:'Open '+o.top.name+' over '+o.under.name+': a relaxed layered look'});
  const f=core.filter(i=>i!==o.under).map(i=>i===o.top&&o.under?Math.min(2,i.formality??3):(i.formality??3)); const lo=Math.min(...f), hi=Math.max(...f);
  if(hi-lo<=1){ s+=1; reasons.push({t:'Pieces sit at the same dress level'}); }
  else { s-=(hi-lo-1); reasons.push({t:'Dress levels clash ('+FORM[lo]+' with '+FORM[hi]+')',neg:true}); }
  const avg=f.reduce((a,b)=>a+b,0)/f.length, dev=Math.abs(avg-OCC[occ].formality);
  if(dev>1){ s-=(dev-1); reasons.push({t:(avg>OCC[occ].formality?'Dressier':'More casual')+' than usual for '+OCC[occ].label.toLowerCase(),neg:true}); }
  const rest=core.map(i=>Math.min(14,daysSince(i.lastWorn,now)));
  const avgRest=rest.reduce((a,b)=>a+b,0)/rest.length; s+=avgRest/14*1.5;
  if(rest.some(d=>d<=1)){ s-=1; reasons.push({t:'Includes something worn in the last day',neg:true}); }
  else if(avgRest>=5) reasons.push({t:'Pieces have rested '+Math.round(avgRest)+(avgRest>=14?'+':'')+' days on average'});
  if(o.top && o.bottom && log.some(e=>daysSince(e.date,now)<7 && (e.items||[]).includes(o.top.id) && (e.items||[]).includes(o.bottom.id))){
    s-=2; reasons.push({t:'Same top and bottom already worn together this week',neg:true}); }
  const belt=(o.acc||[]).find(a=>a.cat==='belt'); if(belt){ const bf=beltFit(o,belt,occ); reasons.push({t:bf.why,neg:bf.neg}); }
  const sock=(o.acc||[]).find(a=>a.cat==='socks'); if(sock){ const sf=sockFit(o,sock,occ,ctx.wx); if(sf.why) reasons.push({t:sf.why,neg:sf.neg}); }
  return {score:Math.round(s*100)/100,reasons};
}

/* ---------- socks ----------
   Dressier outfits: match the trousers (longer leg line), else the shoes; with pale trousers a shade darker;
   no white socks with dress shoes. Casual outfits: any color that keeps the palette in harmony.
   Sources: Permanent Style "Your socks should match your trousers"; Darn Tough dress sock color guide. */
const OPEN_SHOE_RX=/\b(sandals?|slides|flip[- ]?flops?|espadrilles?|slippers?)\b/i;
const DARKER={beige:['khaki','brown'],khaki:['brown','olive'],white:['grey','beige'],grey:['navy','black'],lightblue:['navy','blue']};
function sockFit(o,sock,occ,wx){
  const b=o.bottom||o.onepiece, sh=o.shoes, sc=primary(sock), bc=b&&primary(b), shc=sh&&primary(sh);
  const fs=coreOf(o).filter(i=>i!==o.under).map(i=>i.formality??3); const dressy=OCC[occ].formality>=3 && fs.reduce((a,c)=>a+c,0)/fs.length>=2.5;
  let s=0, why='', neg=false;
  if(dressy){
    if(sc==='white' && sh && (sh.formality??3)>=3){ s-=3; why='White socks with dress shoes'; neg=true; }
    else if(sc && sc===bc){ s+=2; why=sock.name+' match the '+(b.name||'trousers'); }
    else if(bc && (DARKER[bc]||[]).includes(sc)){ s+=1.5; why=sock.name+': a shade darker than the '+b.name; }
    else if(sc && sc===shc){ s+=1; why=sock.name+' match the shoes'; }
    else { const d=harmony(coreOf(o).map(primary).filter(Boolean).concat(sc||[])).s-harmony(coreOf(o).map(primary).filter(Boolean)).s; s+=d>=0?0.5:d; why=sock.name+(d>=0?' fit the colors':' clash with the outfit'); neg=d<0; }
  } else {
    const d=harmony(coreOf(o).map(primary).filter(Boolean).concat(sc||[])).s-harmony(coreOf(o).map(primary).filter(Boolean)).s;
    s+=d; why=sock.name+(d>=0?' go with the outfit':' clash with the outfit'); neg=d<0;
  }
  const f=sock.formality??2; if(Math.abs(f-OCC[occ].formality)>1){ s-=1; if(!neg){ why=sock.name+(f>OCC[occ].formality?' are dressy':' are casual')+' for '+OCC[occ].label.toLowerCase(); neg=true; } }
  if(wx){ const {lo,hi}=wxFeel(wx); const w=warmthOf(sock); if(lo<5&&w===3) s+=0.5; if(hi>=24&&w===3){ s-=1; } }
  return {s,why,neg};
}

/* ---------- belts ----------
   Bottoms with belt loops (jeans, chinos, trousers...) always get a belt when you own one, even if it is not tagged
   for the occasion. With leather shoes the belt should match them (black with black, brown with brown), and a casual
   belt should not go with dress shoes; with sneakers the rules relax. Source: Florsheim style guide on men's belts. */
const BELT_RX=/\b(jeans|chinos?|khakis|trousers|slacks|pants|cords|corduroys?|shorts)\b/i;
const NOBELT_RX=/\b(joggers?|sweat\w*|lounge|track|leggings?|pyjamas?|pajamas?|athletic|gym|swim\w*|running|training)\b/i;
function needsBelt(b){ if(!b||b.cat!=='bottom') return false; if(typeof b.belt==='boolean') return b.belt; const n=String(b.name||''); return (b.formality??3)>=2 && BELT_RX.test(n) && !NOBELT_RX.test(n); }
function beltFit(o,belt,occ){
  const sh=o.shoes, bc=primary(belt), sc=sh&&primary(sh), leather=['black','brown'];
  let s=0, why=belt.name+' goes with the outfit', neg=false;
  if(sh && (sh.formality??3)>=3 && leather.includes(sc)){
    if(bc===sc){ s+=2; why=belt.name+' matches the '+sh.name; }
    else if(leather.includes(bc)){ s-=2; why=belt.name+' with '+sh.name+': black and brown leather clash'; neg=true; }
    else { s-=0.5; why=belt.name+' with dress shoes: a '+sc+' belt would match better'; neg=true; }
    if((belt.formality??3)<=2 && !neg){ s-=1.5; why='Casual '+belt.name+' with dress shoes'; neg=true; }
  } else {
    const base=coreOf(o).map(primary).filter(Boolean); const d=harmony(base.concat(bc||[])).s-harmony(base).s;
    s+=d+(bc&&bc===sc?0.5:0); if(bc&&bc===sc) why=belt.name+' matches the shoes'; if(d<0){ why=belt.name+' clashes with the colors'; neg=true; }
  }
  return {s,why,neg};
}
function beltPool(all,occ){ return (all||[]).filter(i=>i.cat==='belt'&&available(i)&&(i.cond??4)>=Math.min(3,OCC[occ].min)); }

function pickAccessories(o,by,occ,now,wx,all){
  const acc=[]; const baseColors=coreOf(o).map(primary).filter(Boolean); const baseH=harmony(baseColors).s;
  if(needsBelt(o.bottom)){
    let best=null,bs=-Infinity; for(const a of beltPool(all||[].concat(...Object.values(by)),occ)){ const v=beltFit(o,a,occ).s+Math.min(14,daysSince(a.lastWorn,now))/14; if(v>bs){bs=v;best=a;} }
    if(best) acc.push(best);
  }
  for(const cat of ACCESSORY){
    if(cat==='belt') continue;
    const list=by[cat]; if(!list||!list.length) continue;
    if(cat==='belt' && !o.bottom) continue;
    if(cat==='hat' && occ==='work') continue;
    if(cat==='socks'){
      if(!o.shoes || OPEN_SHOE_RX.test(String(o.shoes.name||''))) continue;
      let best=null,bs=-Infinity; for(const a of list){ const v=sockFit(o,a,occ,wx).s+Math.min(14,daysSince(a.lastWorn,now))/14; if(v>bs){bs=v;best=a;} }
      if(best) acc.push(best); continue;
    }
    let best=null,bestS=-Infinity;
    for(const a of list){
      let s=Math.min(14,daysSince(a.lastWorn,now))/14;
      s+=harmony(baseColors.concat(primary(a)||[])).s-baseH;
      if(cat==='belt' && o.shoes){ const sc=primary(o.shoes), bc=primary(a); if(['black','brown'].includes(sc)&&['black','brown'].includes(bc)) s+= sc===bc?1:-2; }
      const f=a.formality??3; if(Math.abs(f-OCC[occ].formality)>1) s-=1;
      if(s>bestS){bestS=s;best=a;}
    }
    if(best && bestS>-1.5) acc.push(best);
  }
  return acc;
}

function makeRng(seed){ let x=(seed>>>0)||1; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }

function suggest(items,occ,ctx,opts){
  opts=opts||{}; const n=opts.n||4, jitter=opts.jitter||0, rnd=opts.rng||Math.random;
  const pool=eligible(items,occ); const by=group(pool);
  const tops=by.top||[], bottoms=by.bottom||[], ones=by.onepiece||[];
  const missing=[];
  const bases=[]; for(const t of tops) for(const b of bottoms) bases.push({top:t,bottom:b}); for(const o of ones) bases.push({onepiece:o});
  if(!bases.length){ if(!tops.length&&!ones.length) missing.push('top'); if(!bottoms.length&&!ones.length) missing.push('bottom'); }
  const needShoes=occ!=='home'; let shoes=by.shoes||[];
  if(!shoes.length){ if(needShoes) missing.push('shoes'); shoes=[null]; } else if(!needShoes) shoes=shoes.concat([null]);
  if(missing.length) return {outfits:[],missing};
  // A t-shirt worn under an open shirt only needs to be in good enough condition; it need not be tagged for the occasion.
  const unders=LAYER_OCC.includes(occ)?items.filter(i=>available(i)&&i.cat==='top'&&canUnder(i)&&(i.cond??4)>=OCC[occ].min):[];
  const bases2=bases.slice(); for(const b of bases){ if(b.top && canOpen(b.top) && unders.length){
    let best=null,bs=-Infinity; for(const u of unders){ const r=scoreOutfit(Object.assign({},b,{under:u}),occ,ctx).score; if(r>bs){bs=r;best=u;} }
    bases2.push(Object.assign({},b,{under:best})); } }
  let combos=[]; for(const b of bases2) for(const sh of shoes) combos.push(Object.assign({},b,sh?{shoes:sh}:{}));
  if(combos.length>3000){ combos=combos.map(c=>[rnd(),c]).sort((a,b)=>a[0]-b[0]).slice(0,3000).map(x=>x[1]); }
  const outers=opts.layer?(by.outerwear||[]):[];
  const scored=combos.map(c=>{
    if(outers.length){ let best=null,bs=-Infinity; for(const ow of outers){ const r=scoreOutfit(Object.assign({},c,{outer:ow}),occ,ctx); if(r.score>bs){bs=r.score;best=ow;} } c.outer=best; }
    const r=scoreOutfit(c,occ,ctx); return {o:c,...r,rank:r.score+(rnd()-.5)*jitter}; }).sort((a,b)=>b.rank-a.rank);
  const out=[], seen=new Set();
  for(const c of scored){
    const key=c.o.onepiece?'o'+c.o.onepiece.id:c.o.top.id+'|'+c.o.bottom.id+(c.o.under?'|u':''); if(seen.has(key)) continue; seen.add(key);
    const o=c.o;
    o.acc=pickAccessories(o,by,occ,ctx.now,ctx.wx,items);
    const r=scoreOutfit(o,occ,ctx); out.push({o,score:r.score,reasons:r.reasons});
    if(out.length>=n) break;
  }
  return {outfits:out,missing:[]};
}

function swapCandidates(o,slot,items,occ,ctx){
  const cat=slot==='outer'?'outerwear':slot==='under'?'top':slot;
  let pool=eligible(items,occ).filter(i=>i.cat===cat);
  if(slot==='under') pool=items.filter(i=>available(i)&&i.cat==='top'&&canUnder(i)&&(i.cond??4)>=OCC[occ].min&&(!o.top||i.id!==o.top.id));
  if(slot==='top'&&o.under) pool=pool.filter(i=>canOpen(i));
  return pool.map(i=>{ const t=Object.assign({},o,{[slot]:i}); return {item:i,score:scoreOutfit(t,occ,ctx).score}; }).sort((a,b)=>b.score-a.score).map(x=>x.item);
}

function careFlags(it,now,s){
  if(!isActive(it)) return [];
  const f=[], c=it.cond??4;
  if(c<=1) f.push({kind:'retire',text:'Condition 1/5. Donate it if it is still wearable; if torn or stained, take it to textile recycling.'});
  else if(c<=3 && (it.occ||[]).some(o=>o==='work'||o==='out')) f.push({kind:'downgraded',text:'Condition '+c+'/5 is below the 4/5 bar for work and going out.'+(GARMENT.includes(it.cat)&&(it.formality??3)<=3?' It now counts for home and chores.':'')});
  if(c>1){
    const ws=it.wearsSinceCheck||0, dc=daysSince(it.lastCheck||it.created,now);
    if(ws>=s.checkEvery) f.push({kind:'check',text:'Worn '+ws+' times since the last condition check.'});
    else if(isFinite(dc) && dc>=s.checkDays) f.push({kind:'check',text:'Last checked '+dc+' days ago.'});
    const du=daysSince(it.lastWorn||it.created,now);
    const special=it.cat==='outerwear'||(it.formality??3)>=4; // coats sit out a whole season; suits wait for weddings and interviews
    if(isFinite(du) && du>=(special?Math.max(s.unusedDays,1095):s.unusedDays)) f.push({kind:'unused',text:(it.lastWorn?'Not worn in ':'Never worn in the ')+du+' days since '+(it.lastWorn?'last use':'you added it')+'.'});
  }
  return f;
}

function goodCombo(core){ const h=harmony(core.map(primary).filter(Boolean)); const f=core.map(i=>i.formality??3); return h.s>0 && Math.max(...f)-Math.min(...f)<=1; }
function combosWith(h,pool,occ){
  const by=group(pool.concat([h])); const shoes=(by.shoes||[]).length?by.shoes:(occ==='home'?[null]:[]);
  const bases=[]; for(const t of by.top||[]) for(const b of by.bottom||[]) bases.push([t,b]); for(const o of by.onepiece||[]) bases.push([o]);
  let n=0; for(const base of bases) for(const s of shoes){ const core=s?base.concat([s]):base; if(core.includes(h)&&goodCombo(core)) n++; }
  return n;
}
function gaps(items){
  const out=[];
  for(const o of OCCASIONS){
    const pool=eligible(items,o.id,true), by=group(pool), one=(by.onepiece||[]).length;
    const have={top:(by.top||[]).length+one,bottom:(by.bottom||[]).length+one,shoes:(by.shoes||[]).length};
    const needs=[];
    for(const slot of ['top','bottom','shoes']){
      const t=TARGETS[o.id][slot]; if(have[slot]>=t) continue;
      const owned=c=>pool.filter(i=>(i.cat===slot||(slot!=='shoes'&&i.cat==='onepiece'))&&primary(i)===c).length;
      const opts=SHOP_COLORS[slot].map(c=>({color:c,owned:owned(c),adds:combosWith({id:'__h',cat:slot,colors:[c],formality:o.formality,occ:[o.id],cond:5},pool,o.id)})).sort((a,b)=>b.adds-a.adds||a.owned-b.owned);
      needs.push({slot,have:have[slot],target:t,idea:IDEAS[o.id][slot],colors:opts.slice(0,2)});
    }
    out.push({occ:o.id,have,needs});
  }
  return out;
}

return {PALETTES,CATS,CAT,ACCESSORY,GARMENT,OCCASIONS,OCC,COND,FORM,COLORS,TARGETS,IDEAS,SHOP_COLORS,DAY,
  daysSince,isActive,primary,hueDist,group,effectiveOccasions,eligible,harmony,coreOf,scoreOutfit,
  warmthOf,rainReady,canOpen,canUnder,washEvery,DRESS_CODES,setDressCode,workOk,formalOk,available,NOWASH,sockFit,needsBelt,beltFit,beltPool,wxFeel,wxWet,needsLayer,weatherScore,pickAccessories,makeRng,suggest,swapCandidates,careFlags,goodCombo,combosWith,gaps};
})();
if(typeof module!=='undefined') module.exports=WardrobeLogic;
