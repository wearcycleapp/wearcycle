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
  {id:'out',label:'Going out',min:4,formality:3,ceiling:4},
  {id:'sport',label:'Sport',min:3,formality:1,ceiling:2},
  {id:'home',label:'Home',min:3,formality:1,ceiling:3},
  {id:'chores',label:'Chores',min:2,formality:1,ceiling:3},
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
// Women's department versions of the buying ideas (common womenswear conventions, not standards).
const IDEAS_W={
  work:{top:'blouse or fine knit',bottom:'tailored trousers or a midi skirt',shoes:'loafers, flats or low block heels'},
  out:{top:'blouse, bodysuit or fine knit',bottom:'dark jeans or a skirt',shoes:'clean sneakers, ankle boots or flats'},
  sport:{top:'moisture-wicking top or sports bra',bottom:'leggings or athletic shorts',shoes:'training or running shoes'},
  home:{top:'soft t-shirt',bottom:'lounge pants or leggings',shoes:'slippers'},
  chores:{top:'durable t-shirt',bottom:'work pants or sturdy leggings',shoes:'sturdy sneakers or work boots'},
  formal:{top:'silk blouse or shell top (or a dress)',bottom:'tailored trousers or a skirt',shoes:'pumps or dressy flats'}};
// Department the person shops in: men, women or any. Changes buying ideas, style essentials and searches, not outfit scoring.
let DEPT='any';
function setDept(d){ DEPT=d==='men'||d==='women'?d:'any'; }
function ideaFor(occ,slot){ return ((DEPT==='women'?IDEAS_W:IDEAS)[occ]||{})[slot]||''; }
const SHOP_COLORS={top:['white','lightblue','navy','grey','black','olive','burgundy'],bottom:['navy','khaki','grey','black','denim','olive','beige'],shoes:['brown','black','white','grey','navy']};
const DAY=86400000;

// Whole local days between a YYYY-MM-DD date and now (0 = today, 1 = yesterday).
function localDayGap(iso,now){ if(!iso) return Infinity; const d=new Date(String(iso).slice(0,10)+'T00:00'); if(isNaN(d)) return Infinity; const t=new Date(now); t.setHours(0,0,0,0); return Math.round((t-d)/DAY); }
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
// Waiting for repair: kept for sport, home and chores (a torn pocket is fine for errands, not for work),
// unless the owner marks it fine to wear anywhere.
const REPAIR_OCC=['sport','home','chores'];
function repairOk(it,occ){ return !it.repair||!!it.repairOk||!occ||REPAIR_OCC.includes(occ); }
function available(it,occ){ return isActive(it) && !it.dirty && repairOk(it,occ); }
function eligible(items,occ,inclDirty){ return items.filter(it=>(inclDirty?isActive(it):available(it,occ)) && effectiveOccasions(it).includes(occ)); }

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
// Pieces worn over a t-shirt (not open): hoodies, sweatshirts, sweaters and knits. The t-shirt is a base layer.
const MID_RX=/\b(hoodies?|hooded|sweatshirts?|sweaters?|jumpers?|pullovers?|crew ?neck knit|knit sweater|fleece|quarter[- ]zip|half[- ]zip)\b/i;
function needsBase(it){ if(!it||it.cat!=='top') return false; if(typeof it.base==='boolean') return it.base; return !canOpen(it) && !canUnder(it) && MID_RX.test(String(it.name||'')+' '+String(it.kind||'')); }
function layeredOver(top){ return !!top&&(canOpen(top)||needsBase(top)); }

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
  if(o.under && canOpen(o.top||{}) && hi>=24){ s-=1; r.push({t:'Two layers on top at '+deg(hi),neg:1}); }
  else if(o.under && canOpen(o.top||{}) && lo<16) { s+=0.5; r.push({t:'The t-shirt adds warmth at '+deg(lo)}); }
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
  if(o.under&&canOpen(o.top)) reasons.push({t:'Open '+o.top.name+' over '+o.under.name+': a relaxed layered look'});
  else if(o.under) reasons.push({t:o.under.name+' under '+o.top.name});
  else if(needsBase(o.top)) reasons.push({t:'Nothing under '+o.top.name+'; add a t-shirt if you have one'});
  const f=core.filter(i=>i!==o.under).map(i=>i===o.top&&o.under&&canOpen(o.top)?Math.min(2,i.formality??3):(i.formality??3)); const lo=Math.min(...f), hi=Math.max(...f);
  if(hi-lo<=1){ s+=1; reasons.push({t:'Pieces sit at the same dress level'}); }
  else { s-=(hi-lo-1); reasons.push({t:'Dress levels clash ('+FORM[lo]+' with '+FORM[hi]+')',neg:true}); }
  const target=ctx.theme?ctx.theme.formality:OCC[occ].formality; const avg=f.reduce((a,b)=>a+b,0)/f.length, dev=Math.abs(avg-target);
  if(dev>1){ s-=(dev-1); reasons.push({t:(avg>target?'Dressier':'More casual')+' than usual for '+(ctx.theme?ctx.theme.label:OCC[occ].label.toLowerCase()),neg:true}); }
  // Dress ceiling: pieces above the occasion's top level (suit trousers, dress oxfords for going out) cost 1 point
  // each, up to 3, so a style bonus (for example Classic) cannot turn going out into a formal outfit.
  const ceil=ctx.theme?ctx.theme.formality+1:OCC[occ].ceiling;
  if(ceil){ const over=core.filter(i=>i!==o.under&&(i===o.top&&o.under&&canOpen(o.top)?Math.min(2,i.formality??3):(i.formality??3))>ceil);
    if(over.length){ s-=Math.min(3,over.length); reasons.push({t:'Dressier than '+(ctx.theme?ctx.theme.label:OCC[occ].label.toLowerCase())+' needs: '+over.map(i=>i.name).join(', '),neg:true}); } }
  const rest=core.map(i=>Math.min(14,daysSince(i.lastWorn,now)));
  const avgRest=rest.reduce((a,b)=>a+b,0)/rest.length; s+=avgRest/14*1.5;
  // Shoes need a day to dry out between wears (NHS: do not wear the same shoes 2 days in a row), so a pair worn
  // today or yesterday costs 3 points, enough to rotate to another pair that fits. Days count in local time.
  const shoeGap=o.shoes?localDayGap(o.shoes.lastWorn,now):Infinity;
  if(shoeGap<=1&&ctx.shoeAlt!==false){ s-=3; reasons.push({t:o.shoes.name+' were worn '+(shoeGap===0?'today':'yesterday')+'; give them a day to dry out',neg:true}); }
  if(core.some((i,k)=>i!==o.shoes&&rest[k]<=1)){ s-=1; reasons.push({t:'Includes something worn in the last day',neg:true}); }
  else if(avgRest>=5) reasons.push({t:'Pieces have rested '+Math.round(avgRest)+(avgRest>=14?'+':'')+' days on average'});
  // New pieces get a nudge so they enter the rotation: never worn and added in the last 30 days, +0.5 once.
  const fresh=core.find(i=>!(i.worn>0)&&!i.lastWorn&&i.created&&daysSince(i.created,now)<=30);
  if(fresh){ s+=0.5; reasons.push({t:'Includes something new: '+fresh.name}); }
  if(o.top && o.bottom && log.some(e=>daysSince(e.date,now)<7 && (e.items||[]).includes(o.top.id) && (e.items||[]).includes(o.bottom.id))){
    s-=2; reasons.push({t:'Same top and bottom already worn together this week',neg:true}); }
  const belt=(o.acc||[]).find(a=>a.cat==='belt'); if(belt){ const bf=beltFit(o,belt,occ); reasons.push({t:bf.why,neg:bf.neg}); }
  const sock=(o.acc||[]).find(a=>a.cat==='socks'); if(sock){ const sf=sockFit(o,sock,occ,ctx.wx); if(sf.why) reasons.push({t:sf.why,neg:sf.neg}); }
  const st=styleScore(o,ctx.style); s+=st.s; reasons.push(...st.r);
  if(ctx.theme){ const th=themeScore(o,ctx.theme); s+=th.s; reasons.push(...th.r); }
  return {score:Math.round(s*100)/100,reasons,style:outfitStyle(o,ctx.style&&ctx.style.ids)};
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
function beltPool(all,occ){ return (all||[]).filter(i=>i.cat==='belt'&&available(i,occ)&&(i.cond??4)>=Math.min(3,OCC[occ].min)); }

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
  // Pinned piece (from "See outfits with this"): every outfit is built around it, even if it is not normally
  // picked for this occasion; the app explains why separately.
  const pin=opts.pin;
  if(pin){ const c=pin.cat;
    if(c==='top') by.top=[pin]; else if(c==='bottom'){ by.bottom=[pin]; by.onepiece=[]; } else if(c==='onepiece'){ by.onepiece=[pin]; by.top=[]; by.bottom=[]; }
    else if(c==='shoes') by.shoes=[pin]; else if(c==='outerwear'){ by.outerwear=[pin]; opts=Object.assign({},opts,{layer:true}); } }
  const tops=by.top||[], bottoms=by.bottom||[], ones=by.onepiece||[];
  const missing=[];
  const bases=[]; for(const t of tops) for(const b of bottoms) bases.push({top:t,bottom:b}); for(const o of ones) bases.push({onepiece:o});
  if(!bases.length){ if(!tops.length&&!ones.length) missing.push('top'); if(!bottoms.length&&!ones.length) missing.push('bottom'); }
  const needShoes=occ!=='home'; let shoes=by.shoes||[];
  if(!shoes.length){ if(needShoes) missing.push('shoes'); shoes=[null]; } else if(!needShoes) shoes=shoes.concat([null]);
  if(missing.length) return {outfits:[],missing};
  ctx=Object.assign({},ctx,{shoeAlt:shoes.filter(Boolean).length>1});
  // A t-shirt worn under an open shirt only needs to be in good enough condition; it need not be tagged for the occasion.
  const allUnders=items.filter(i=>available(i,occ)&&i.cat==='top'&&canUnder(i)&&(i.cond??4)>=OCC[occ].min);
  const unders=LAYER_OCC.includes(occ)?allUnders:[];
  const bestUnder=(b,pool)=>{ let best=null,bs=-Infinity; for(const u of pool){ if(u.id===b.top.id) continue; const r=scoreOutfit(Object.assign({},b,{under:u}),occ,ctx).score; if(r>bs){bs=r;best=u;} } return best; };
  for(const b of bases){ if(b.top && needsBase(b.top) && allUnders.length){ const u=bestUnder(b,allUnders); if(u) b.under=u; } }
  const bases2=bases.slice(); for(const b of bases){ if(b.top && canOpen(b.top) && unders.length){
    let best=null,bs=-Infinity; for(const u of unders){ const r=scoreOutfit(Object.assign({},b,{under:u}),occ,ctx).score; if(r>bs){bs=r;best=u;} }
    bases2.push(Object.assign({},b,{under:best})); } }
  let combos=[]; for(const b of bases2) for(const sh of shoes) combos.push(Object.assign({},b,sh?{shoes:sh}:{}));
  if(combos.length>3000){ combos=combos.map(c=>[rnd(),c]).sort((a,b)=>a[0]-b[0]).slice(0,3000).map(x=>x[1]); }
  const outers=opts.layer?(by.outerwear||[]):[];
  const scored=combos.map(c=>{
    if(outers.length){ let best=null,bs=-Infinity; for(const ow of outers){ const r=scoreOutfit(Object.assign({},c,{outer:ow}),occ,ctx); if(r.score>bs){bs=r.score;best=ow;} } c.outer=best; }
    const r=scoreOutfit(c,occ,ctx); return {o:c,...r,rank:r.score+(rnd()-.5)*jitter}; }).sort((a,b)=>b.rank-a.rank);
  // One outfit per top and bottom. Among its shoe options, a pair already used higher in the list loses 0.75 per use,
  // so the list shows different shoes when another pair scores close to the best.
  const keyOf=c=>c.o.onepiece?'o'+c.o.onepiece.id:c.o.top.id+'|'+c.o.bottom.id+(c.o.under?'|u':'');
  const groups=new Map(); for(const c of scored){ const k=keyOf(c); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(c); }
  const out=[], used=new Map();
  for(const list of groups.values()){
    let c=list[0], best=-Infinity; for(const x of list){ const v=x.rank-0.75*(x.o.shoes?(used.get(x.o.shoes.id)||0):0); if(v>best){best=v;c=x;} }
    if(c.o.shoes) used.set(c.o.shoes.id,(used.get(c.o.shoes.id)||0)+1);
    const o=c.o;
    o.acc=pickAccessories(o,by,occ,ctx.now,ctx.wx,items);
    if(pin&&ACCESSORY.includes(pin.cat)) o.acc=o.acc.filter(a=>a.cat!==pin.cat).concat([pin]);
    const r=scoreOutfit(o,occ,ctx); out.push({o,score:r.score,reasons:r.reasons,style:r.style});
    if(out.length>=n) break;
  }
  return {outfits:out,missing:[]};
}

/* Pieces that never make the picks: for each occasion a piece is set for, the top `n` suggestions are built
   (with the same context the app uses); garments that appear in none of them are returned, each with the
   occasions it is set for. Pieces in the wash, needing repair, retired or with no occasions are reported too. */
function notPicked(items,ctxFor,opts){
  opts=opts||{}; const n=opts.n||8, seen=new Set(), garments=['top','bottom','onepiece','outerwear','shoes'];
  for(const o of OCCASIONS.map(x=>x.id)){ const r=suggest(items,o,ctxFor(o),{n,layer:true});
    for(const f of r.outfits) for(const i of coreOf(f.o)) seen.add(i.id); }
  return items.filter(i=>isActive(i)&&garments.includes(i.cat)&&!seen.has(i.id)).map(i=>({item:i,occs:effectiveOccasions(i)}));
}
function swapCandidates(o,slot,items,occ,ctx){
  const cat=slot==='outer'?'outerwear':slot==='under'?'top':slot;
  let pool=eligible(items,occ).filter(i=>i.cat===cat);
  if(slot==='under') pool=items.filter(i=>available(i,occ)&&i.cat==='top'&&canUnder(i)&&(i.cond??4)>=OCC[occ].min&&(!o.top||i.id!==o.top.id));
  if(slot==='top'&&o.under) pool=pool.filter(i=>layeredOver(i));
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
      needs.push({slot,have:have[slot],target:t,idea:ideaFor(o.id,slot),colors:opts.slice(0,2)});
    }
    out.push({occ:o.id,have,needs});
  }
  return out;
}

/* ---------- styles ----------
   A style is a consistent set of piece types, fabrics and patterns (common menswear conventions, not standards).
   Each piece gets its styles from Claude's photo reading ("styles" field) or, until then, from its name and details.
   Outfits whose pieces share the wanted style rank higher; mixing street or sporty pieces with smart ones gets a note. */
const STYLES={
  classic:{label:'Classic',desc:'Oxford shirts, chinos, knits, blazers, loafers or derbies.'},
  heritage:{label:'Heritage',desc:'Flannel, denim, chore or duffle coats, boots, leather.'},
  minimal:{label:'Minimal',desc:'Plain neutrals, no patterns, clean sneakers, simple shapes.'},
  street:{label:'Street',desc:'Hoodies, graphic tees, joggers, sneakers, caps.'},
  sporty:{label:'Sporty',desc:'Technical fabrics, track pieces, running shoes.'},
  preppy:{label:'Preppy',desc:'Polos, cable knits, stripes, boat shoes.'}};
const STYLES_W={
  classic:'Button-up shirts, tailored trousers, knits, blazers, flats or pumps.',
  heritage:'Flannel, denim, corduroy, wool coats, ankle boots, leather.',
  minimal:'Plain neutrals, no patterns, clean sneakers, simple shapes.',
  street:'Hoodies, graphic tees, cargo pants, chunky sneakers, caps.',
  sporty:'Technical fabrics, leggings, track pieces, running shoes.',
  preppy:'Polos, cable knits, stripes, pleated skirts, loafers.'};
function styleDesc(k){ return DEPT==='women'&&STYLES_W[k]?STYLES_W[k]:(STYLES[k]||{}).desc||''; }
const STYLE_IDS=Object.keys(STYLES);
const STYLE_RX={
  classic:/\b(oxford|dress shirt|button[- ]?(down|up)|chinos?|khakis?|trousers?|slacks|blazers?|sport coat|suit|loafers?|derby|derbies|brogues?|dress shoes?|leather shoes?|cardigan|merino|fine knit|overcoat|trench|blouse|pencil skirt|sheath|pumps?|ballet flats?|kitten heels?)\b/i,
  heritage:/\b(flannel|plaid|check(ed)?|buffalo|tartan|jeans|denim|chore|field jacket|duffle|duffel|pea ?coat|waxed|work boots?|boots?|henley|corduroy|cords|suede|canvas|shacket|overshirt|chambray|selvedge|moc toe|wool|leather|prairie|ankle boots?)\b/i,
  street:/\b(hoodies?|hooded|sweatshirts?|graphic|joggers?|sweatpants|cargo|bomber|puffer|varsity|coach jacket|caps?|beanie|high-?tops?|oversized|streetwear|crop(ped)? tops?|bucket hat|chunky sneakers?)\b/i,
  sporty:/\b(athletic|running|training|gym|track|technical|performance|moisture|leggings|windbreaker|trainers?|sport|swim|fleece|quarter[- ]zip|half[- ]zip|sports? bra|yoga|bike shorts)\b/i,
  preppy:/\b(polo|cable|stripes?|striped|rugby|boat shoes?|deck shoes?|loafers?|quarter[- ]zip|v-?neck|madras|button[- ]?down|seersucker|blazer|pleated|breton|tennis skirt|ballet flats?|headband)\b/i};
const NEUTRALS=['black','white','grey','navy','beige','khaki','brown','denim','olive'];
function itemText(it){ return [it.name,it.kind,it.material,it.pattern].filter(Boolean).join(' '); }
function pieceStyles(it){
  if(Array.isArray(it.styles)&&it.styles.length) return it.styles.filter(x=>STYLES[x]);
  const n=itemText(it), out=[];
  for(const k of ['classic','heritage','street','sporty','preppy']) if(STYLE_RX[k].test(n)) out.push(k);
  const patterned=/\b(plaid|check|stripe|print|graphic|floral|camo|pattern)/i.test(n)||(it.pattern&&it.pattern!=='solid')||it.graphic;
  if(!patterned && (!primary(it)||NEUTRALS.includes(primary(it))) && !out.includes('sporty') && !out.includes('street')) out.push('minimal');
  if(!out.length){ const f=it.formality??3; if(f>=4) out.push('classic'); else if(f<=1) out.push('sporty'); }
  return out;
}
// Does a piece of the closet match a described piece such as "camel duffle coat"? The last word (the type) must match,
// and so must one defining word (like "duffle" or "flannel") when there is one; colors and light/dark are optional.
const SOFT_WORDS=new Set(Object.keys(COLORS).concat(['light','dark','camel','tan','cream','ivory','charcoal','plain','slim','classic','simple','casual','white','black','with','and']));
const SYN={};
[['check','checked','plaid','buffalo','tartan','gingham'],['tee','t-shirt','tshirt'],['t-shirt','tee','tshirt'],['derby','derbie','derbies'],['sneaker','trainer'],['trainer','sneaker'],
 ['jogger','sweatpant','track'],['trouser','pant','slack'],['pant','trouser','slack'],['jumper','sweater','knit'],['sweater','jumper','knit'],['coat','overcoat','parka']].forEach(g=>{ SYN[g[0]]=g; });
const sing=w=>w.length>3&&/s$/.test(w)&&!/ss$/.test(w)?w.slice(0,-1):w;
function pieceMatch(it,piece){
  const words=String(piece).toLowerCase().replace(/[^a-z\s-]/g,' ').split(/\s+/).filter(Boolean).map(sing); if(!words.length) return false;
  const text=' '+itemText(it).toLowerCase().replace(/[^a-z\s-]/g,' ').split(/\s+/).map(sing).join(' ')+' ';
  const has=w=>(SYN[w]||[w]).some(x=>text.includes(' '+x+' '));
  const head=words[words.length-1]; if(!has(head)) return false;
  const defining=words.slice(0,-1).filter(w=>!SOFT_WORDS.has(w));
  return !defining.length||defining.some(has);
}
// A style target: {ids:[style ids], looks:[custom looks], weight}. Custom looks come from a photo: base styles plus piece words.
function lookMatch(it,look){ const n=itemText(it).toLowerCase(); if((look.base||[]).some(b=>pieceStyles(it).includes(b))) return true;
  return (look.pieces||[]).some(p=>pieceMatch(it,p)); }
function fitsTarget(it,t){ return pieceStyles(it).some(x=>t.ids.includes(x)) || (t.looks||[]).some(l=>lookMatch(it,l)); }
const SMART=['classic','preppy'], CASUALX=['street','sporty'];
function styleScore(o,t){
  const core=coreOf(o).filter(i=>i!==o.under); const r=[]; let s=0;
  const only=(it,grp)=>{ const st=pieceStyles(it).filter(x=>x!=='minimal'); return st.length>0 && st.every(x=>grp.includes(x)); };
  const a=core.find(i=>only(i,CASUALX)), b=core.find(i=>only(i,SMART));
  if(a&&b){ s-=1; r.push({t:a.name+' with '+b.name+' mixes casual and smart styles',neg:1}); }
  // Pieces with no recognisable style (no style words, not neutral, no styles from Claude) count as neutral:
  // they neither help nor hurt, so a new piece is not held back just because its style is unknown.
  const known=t?core.filter(i=>pieceStyles(i).length||fitsTarget(i,t)):[];
  if(t&&(t.ids.length||(t.looks||[]).length)&&known.length){
    const m=known.filter(i=>fitsTarget(i,t)).length/known.length, w=(t.weight||1)*known.length/core.length;
    s+=(2*m-0.5)*w;
    // name the picked style (or look) this outfit fits best
    const opts=t.ids.map(id=>[STYLES[id].label,core.filter(i=>pieceStyles(i).includes(id)).length]).concat((t.looks||[]).map(l=>[l.label,core.filter(i=>lookMatch(i,l)).length]));
    const name=(opts.sort((x,y)=>y[1]-x[1])[0]||[t.label||''])[0];
    if(m>=0.75&&name) r.push({t:'Fits your '+name+' style'});
    else if(m<0.4&&name&&!t.learned) r.push({t:'Few '+name+' pieces'}); // informational: the score already reflects it
  }
  return {s,r};
}
// The outfit's style: the style most of its main pieces share.
function outfitStyle(o,prefer){ const core=coreOf(o).filter(i=>i!==o.under); if(!core.length) return null; const c={};
  for(const i of core) for(const x of pieceStyles(i)) c[x]=(c[x]||0)+1;
  // the style you asked for wins when most pieces fit it
  const need=Math.ceil(core.length/2); const p=(prefer||[]).filter(k=>(c[k]||0)>=need).sort((a,b)=>c[b]-c[a])[0]; if(p) return p;
  const best=Object.entries(c).filter(([k])=>k!=='minimal'||Object.keys(c).length===1).sort((a,b)=>b[1]-a[1])[0]||Object.entries(c).sort((a,b)=>b[1]-a[1])[0];
  return best&&best[1]>=Math.ceil(core.length/2)?best[0]:null; }
// Learned from what was worn in the last 120 days (5+ logged outfits): styles making up at least a quarter of worn pieces.
function learnStyles(items,log,now){
  const by=new Map(items.map(i=>[i.id,i])); const c={}; let n=0, days=0;
  for(const e of log||[]){ if(daysSince(e.date,now)>120) continue; days++;
    for(const id of e.items||[]){ const it=by.get(id); if(!it||!GARMENT.includes(it.cat)) continue; n++; for(const x of pieceStyles(it)) c[x]=(c[x]||0)+1; } }
  if(days<5||!n) return {ids:[],days};
  const ids=Object.entries(c).filter(([k,v])=>v/n>=0.25).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  return {ids,days};
}
// Essentials per style for the shopping list: what a small, working wardrobe in that style usually has.
const ESSENTIALS={
  classic:[['White or light blue oxford shirt','top',/oxford|dress shirt|button[- ]?(down|up)/],['Fine knit sweater','top',/merino|knit|sweater|jumper|cardigan/],['Navy blazer','outerwear',/blazer|sport coat|suit jacket/],['Chinos','bottom',/chino|khaki/],['Grey or navy trousers','bottom',/trouser|slack|dress pant/],['Leather derbies or oxfords','shoes',/derb|oxford|brogue|dress shoe/],['Loafers','shoes',/loafer/],['Wool overcoat or trench','outerwear',/overcoat|trench|wool coat|duffle|pea ?coat/],['Leather belt','belt',/./]],
  heritage:[['Flannel or check shirt','top',/flannel|plaid|check|buffalo|tartan/],['Henley or plain tee','top',/henley|t-?shirt|\btee/],['Chunky or wool knit','top',/wool|knit|sweater|cable|jumper/],['Dark jeans','bottom',/jeans|denim/],['Chore, field or denim jacket','outerwear',/chore|field|denim jacket|trucker|shacket|overshirt/],['Duffle, pea or waxed coat','outerwear',/duffle|duffel|pea ?coat|waxed|wool coat/],['Leather boots','shoes',/boot/],['Brown leather shoes','shoes',/derb|leather|moc|brogue/],['Brown leather belt','belt',/./]],
  minimal:[['Plain white tee','top',/t-?shirt|\btee/,['white']],['Plain black or grey tee','top',/t-?shirt|\btee/,['black','grey']],['Grey or navy crewneck knit','top',/knit|sweater|crew|jumper/],['Black or navy trousers','bottom',/trouser|chino|pant/,['black','navy','grey']],['Dark jeans','bottom',/jeans|denim/],['Clean white sneakers','shoes',/sneaker|trainer/,['white']],['Simple overcoat','outerwear',/coat|overcoat/],['Plain watch','watch',/./]],
  street:[['Hoodie','top',/hood/],['Graphic tee','top',/^(?!.*(hood|sweat|crew ?neck|jumper|sweater|cardigan)).*(graphic|print)/],['Joggers or cargo pants','bottom',/jogger|cargo|sweatpant/],['Relaxed jeans','bottom',/jeans|denim/],['Bomber or puffer jacket','outerwear',/bomber|puffer|varsity|coach/],['Statement sneakers','shoes',/sneaker|trainer|high-?top/],['Cap or beanie','hat',/./],['Crossbody bag','bag',/./]],
  sporty:[['Technical t-shirt','top',/technical|performance|moisture|athletic|training|running|gym|dri/],['Track or quarter-zip top','top',/track|quarter[- ]zip|half[- ]zip|zip-?up/],['Joggers or track pants','bottom',/jogger|track|sweatpant/],['Athletic shorts','bottom',/short/],['Windbreaker or shell','outerwear',/windbreaker|shell|anorak|rain/],['Running shoes','shoes',/running|trainer|training|sneaker/],['Sport watch','watch',/./],['Cap','hat',/./]],
  preppy:[['Polo shirt','top',/polo/],['Oxford button-down','top',/oxford|button[- ]?down/],['Cable or V-neck knit','top',/cable|v-?neck|sweater|cardigan|quarter[- ]zip/],['Striped shirt or tee','top',/stripe/],['Chinos','bottom',/chino|khaki/],['Navy blazer','outerwear',/blazer/],['Boat shoes or loafers','shoes',/boat|loafer|deck/],['Leather or webbing belt','belt',/./]]};
const ESSENTIALS_W={
  classic:[['White button-up shirt','top',/button|oxford|shirt|blouse/,['white','lightblue']],['Fine knit sweater or cardigan','top',/merino|knit|sweater|jumper|cardigan/],['Navy or black blazer','outerwear',/blazer|suit jacket/],['Tailored trousers','bottom',/trouser|slack|dress pant|pant/],['Pencil or A-line skirt','bottom',/skirt/],['Sheath or little black dress','onepiece',/dress/],['Ballet flats or loafers','shoes',/flat|loafer/],['Pumps','shoes',/pump|heel/],['Trench coat','outerwear',/trench|overcoat|wool coat/]],
  heritage:[['Flannel or check shirt','top',/flannel|plaid|check|buffalo|tartan/],['Chunky or cable knit','top',/wool|knit|sweater|cable|jumper/],['Dark jeans','bottom',/jeans|denim/],['Corduroy skirt or trousers','bottom',/cord/],['Denim or chore jacket','outerwear',/chore|field|denim jacket|trucker|shacket|overshirt/],['Wool or waxed coat','outerwear',/wool coat|waxed|duffle|duffel|pea ?coat/],['Leather ankle boots','shoes',/boot/],['Leather belt','belt',/./]],
  minimal:[['Plain white tee','top',/t-?shirt|\btee/,['white']],['Plain black or grey tee','top',/t-?shirt|\btee/,['black','grey']],['Grey or camel crewneck knit','top',/knit|sweater|crew|jumper/],['Black or navy trousers','bottom',/trouser|pant/,['black','navy','grey']],['Simple slip or shift dress','onepiece',/dress/],['Clean white sneakers','shoes',/sneaker|trainer/,['white']],['Simple long coat','outerwear',/coat|overcoat/],['Simple tote bag','bag',/./]],
  street:[['Hoodie','top',/hood/],['Graphic tee','top',/^(?!.*(hood|sweat|crew ?neck|jumper|sweater|cardigan)).*(graphic|print)/],['Cargo pants or joggers','bottom',/jogger|cargo|sweatpant/],['Relaxed jeans','bottom',/jeans|denim/],['Bomber or puffer jacket','outerwear',/bomber|puffer|varsity|coach/],['Chunky sneakers','shoes',/sneaker|trainer|high-?top/],['Cap or beanie','hat',/./],['Crossbody bag','bag',/./]],
  sporty:[['Technical top','top',/technical|performance|moisture|athletic|training|running|gym|dri|tank/],['Sports bra','top',/bra/],['Leggings','bottom',/legging|tights/],['Track or quarter-zip top','top',/track|quarter[- ]zip|half[- ]zip|zip-?up/],['Windbreaker or shell','outerwear',/windbreaker|shell|anorak|rain/],['Running shoes','shoes',/running|trainer|training|sneaker/],['Sport watch','watch',/./],['Cap','hat',/./]],
  preppy:[['Polo shirt','top',/polo/],['Oxford button-down','top',/oxford|button[- ]?down/],['Cable knit or cardigan','top',/cable|v-?neck|sweater|cardigan|quarter[- ]zip/],['Striped or Breton top','top',/stripe|breton/],['Chinos','bottom',/chino|khaki/],['Pleated or A-line skirt','bottom',/skirt/],['Navy blazer','outerwear',/blazer/],['Loafers or ballet flats','shoes',/loafer|flat|boat|deck/]]};
function essentials(styleOrLook,items){
  const own=items.filter(isActive);
  if(typeof styleOrLook==='string'){ const used=new Set();
    return ((DEPT==='women'?ESSENTIALS_W:ESSENTIALS)[styleOrLook]||[]).map(([label,cat,rx,cols])=>{ const it=own.find(i=>!used.has(i)&&i.cat===cat&&rx.test(itemText(i).toLowerCase())&&(!cols||cols.includes(primary(i))));
      if(it) used.add(it); return {label,cat,have:it||null}; }); }
  const look=styleOrLook, used=new Set();
  return (look.pieces||[]).slice(0,10).map(p=>{
    const pw=String(p).toLowerCase().split(/\s+/);
    const it=own.filter(i=>!used.has(i)&&pieceMatch(i,p)).sort((a,b)=>{ const sc=i=>pw.filter(w=>SOFT_WORDS.has(w)&&(itemText(i).toLowerCase().includes(w)||primary(i)===w)).length; return sc(b)-sc(a); })[0];
    if(it) used.add(it); return {label:p,have:it||null}; });
}

/* ---------- seasons ----------
   Meteorological seasons (winter Dec-Feb in the north, flipped in the south). Near the equator (|lat| < 23.5)
   seasons are not about temperature, so no season list is shown. The "typical day" temperatures are rough
   temperate values (St. Catharines normals, Environment Canada 1981-2010: January 0 / -7 °C, July 27 / 17 °C). */
const SEASONS={
  winter:{label:'Winter',wx:{feelMin:-10,feelMax:-2,rain:false,snow:true,off:0},desc:'Typical winter day: about -10° to -2° feels-like, with snow.'},
  spring:{label:'Spring',wx:{feelMin:3,feelMax:13,rain:true,snow:false,off:0},desc:'Typical spring day: about 3° to 13°, often wet.'},
  summer:{label:'Summer',wx:{feelMin:17,feelMax:28,rain:false,snow:false,off:0},desc:'Typical summer day: about 17° to 28°.'},
  fall:{label:'Fall',wx:{feelMin:4,feelMax:13,rain:true,snow:false,off:0},desc:'Typical fall day: about 4° to 13°, often wet.'}};
const SEASON_ORDER=['winter','spring','summer','fall'];
function seasonOf(month,south){ const n=month===11||month<=1?'winter':month<=4?'spring':month<=7?'summer':'fall'; return south?SEASON_ORDER[(SEASON_ORDER.indexOf(n)+2)%4]:n; }
// The season to plan for: the next one when it starts within 60 days, otherwise the current one.
function seasonPlan(now,lat){
  if(isFinite(lat)&&Math.abs(lat)<23.5) return null;
  const south=isFinite(lat)&&lat<0, d=new Date(now), m=d.getMonth();
  const cur=seasonOf(m,south), next=seasonOf((m+3)%12,south), y=d.getFullYear();
  const firstM=[2,5,8,11].find(x=>x>m)??2; const start=new Date(firstM>m?y:y+1,firstM,1); // first month of the next meteorological season
  const days=Math.round((start-d)/864e5);
  return days<=60?{id:next,current:cur,startsIn:days,start:start.toISOString().slice(0,10),upcoming:true}:{id:cur,current:cur,startsIn:0,upcoming:false};
}
const isShorts=i=>/\bshorts?\b/i.test(String(i.name||''));
const SEASON_NEEDS={
  winter:[['Warm coat or parka',1,i=>i.cat==='outerwear'&&warmthOf(i)===3],['Waterproof or insulated boots',1,i=>i.cat==='shoes'&&(rainReady(i)||/boot/i.test(i.name||''))],
    ['Warm knits, hoodies or fleeces',3,i=>i.cat==='top'&&warmthOf(i)===3],['Warm trousers or jeans',3,i=>i.cat==='bottom'&&warmthOf(i)>=2&&!isShorts(i)],
    ['Hat or beanie',1,i=>i.cat==='hat'],['Scarf',1,i=>/scarf|snood/i.test(i.name||'')],['Gloves or mittens',1,i=>/glove|mitt/i.test(i.name||'')],['Warm socks',2,i=>i.cat==='socks'&&/wool|merino|thermal|warm|hiking/i.test(i.name||'')]],
  spring:[['Rain jacket or shell',1,i=>i.cat==='outerwear'&&rainReady(i)],['Light jacket',1,i=>i.cat==='outerwear'&&warmthOf(i)<=2],['Mid layers (knits, overshirts)',3,i=>i.cat==='top'&&warmthOf(i)>=2],
    ['Shoes for wet days',1,i=>i.cat==='shoes'&&(rainReady(i)||/boot/i.test(i.name||''))],['Long trousers or jeans',3,i=>i.cat==='bottom'&&!isShorts(i)]],
  summer:[['Light tops (tees, polos, linen)',5,i=>i.cat==='top'&&warmthOf(i)===1],['Shorts',2,i=>i.cat==='bottom'&&isShorts(i)],['Light trousers (linen, chinos)',1,i=>i.cat==='bottom'&&!isShorts(i)&&warmthOf(i)===1],
    ['Breathable shoes (sneakers, loafers, sandals)',1,i=>i.cat==='shoes'&&warmthOf(i)<=2&&!/boot/i.test(i.name||'')],['Cap or sun hat',1,i=>i.cat==='hat']],
  fall:[['Rain jacket or shell',1,i=>i.cat==='outerwear'&&rainReady(i)],['Warm jacket',1,i=>i.cat==='outerwear'&&warmthOf(i)>=2],['Knits, hoodies or overshirts',3,i=>i.cat==='top'&&warmthOf(i)>=2],
    ['Shoes for wet days',1,i=>i.cat==='shoes'&&(rainReady(i)||/boot/i.test(i.name||''))],['Long trousers or jeans',3,i=>i.cat==='bottom'&&!isShorts(i)]]};
function seasonChecklist(id,items){ const own=items.filter(i=>isActive(i)&&(i.cond??4)>=2);
  return (SEASON_NEEDS[id]||[]).map(([label,need,test])=>{ const have=own.filter(test); return {label,need,have}; }); }
// Pieces to bring out for the coming season (fit it, not worn for 4+ months) and pieces that can be stored.
function seasonRotation(id,items,now){
  const own=items.filter(i=>isActive(i)&&GARMENT.concat(['hat']).includes(i.cat));
  const fits={winter:i=>warmthOf(i)===3||(i.cat==='shoes'&&/boot/i.test(i.name||'')),summer:i=>warmthOf(i)===1||isShorts(i),spring:i=>rainReady(i)||warmthOf(i)===2,fall:i=>rainReady(i)||warmthOf(i)>=2}[id]||(()=>false);
  const off={winter:i=>isShorts(i)||/sandal|flip|slide|linen|tank/i.test(i.name||''),summer:i=>warmthOf(i)===3&&['outerwear','top'].includes(i.cat),spring:()=>false,fall:i=>/sandal|flip|slide|tank/i.test(i.name||'')}[id]||(()=>false);
  return {bringOut:own.filter(i=>fits(i)&&daysSince(i.lastWorn||i.created,now)>=120),store:own.filter(i=>off(i)&&!fits(i))};
}

/* ---------- holidays ----------
   Themed looks for upcoming holidays: color sets and a dress level. Dates: fixed, nth weekday, or tables checked
   against published calendars (Lunar New Year, Diwali); Easter by the Gregorian computus. */
const nthWeekday=(y,m,wd,n)=>{ const d=new Date(y,m,1); let c=0; for(;;){ if(d.getDay()===wd&&++c===n) return d; d.setDate(d.getDate()+1); } };
function easterDate(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y,mo-1,da); }
const TABLE=(t)=>y=>t[y]?new Date(t[y]+'T12:00'):null;
const HOLIDAYS={
  halloween:{label:'Halloween',colors:['black','orange','purple','green'],formality:2,date:y=>new Date(y,9,31),tip:'Black base with an orange or purple accent.'},
  thanksgiving_ca:{label:'Thanksgiving (Canada)',colors:['brown','orange','burgundy','olive','beige','khaki'],formality:3,date:y=>nthWeekday(y,9,1,2),region:'CA',tip:'Warm earth tones and a cozy knit.'},
  thanksgiving_us:{label:'Thanksgiving (US)',colors:['brown','orange','burgundy','olive','beige','khaki'],formality:3,date:y=>nthWeekday(y,10,4,4),region:'US',tip:'Warm earth tones and a cozy knit.'},
  diwali:{label:'Diwali',colors:['orange','yellow','red','pink','purple','green'],formality:4,date:TABLE({2026:'2026-11-08',2027:'2027-10-29',2028:'2028-10-17'}),tip:'Bright, festive colors, dressed up.'},
  christmas:{label:'Christmas',colors:['red','green','white','burgundy'],formality:3,date:y=>new Date(y,11,25),tip:'Red or green, ideally with a festive knit.'},
  nye:{label:'New Year’s Eve',colors:['black','white','navy','burgundy'],formality:4,date:y=>new Date(y,11,31),tip:'Dress up: dark tones and a sharp layer.'},
  lunar:{label:'Lunar New Year',colors:['red','burgundy','yellow'],formality:3,date:TABLE({2027:'2027-02-06',2028:'2028-01-26'}),tip:'Red is the traditional color for luck.'},
  valentines:{label:'Valentine’s Day',colors:['red','pink','burgundy','white'],formality:3,date:y=>new Date(y,1,14),tip:'A touch of red or pink.'},
  stpatricks:{label:'St. Patrick’s Day',colors:['green','olive','teal'],formality:2,date:y=>new Date(y,2,17),tip:'Wear something green.'},
  easter:{label:'Easter',colors:['pink','lightblue','yellow','white','beige'],formality:3,date:easterDate,tip:'Light, soft colors.'},
  canada_day:{label:'Canada Day',colors:['red','white'],formality:2,date:y=>new Date(y,6,1),region:'CA',tip:'Red and white.'},
  july4:{label:'Independence Day (US)',colors:['red','white','navy','blue'],formality:2,date:y=>new Date(y,6,4),region:'US',tip:'Red, white and blue.'}};
// Holidays within the next `days` days (including today), soonest first.
function upcomingHolidays(now,days,region,off){
  const t0=new Date(now); t0.setHours(0,0,0,0); const out=[];
  for(const [id,h] of Object.entries(HOLIDAYS)){ if((off||[]).includes(id)) continue; if(h.region&&region&&h.region!==region) continue;
    for(const y of [t0.getFullYear(),t0.getFullYear()+1]){ const d=h.date(y); if(!d) continue; d.setHours(0,0,0,0);
      const n=Math.round((d-t0)/864e5); if(n>=0&&n<=days){ out.push({id,label:h.label,colors:h.colors,formality:h.formality,tip:h.tip,date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),inDays:n}); break; } } }
  return out.sort((a,b)=>a.inDays-b.inDays);
}
function themeScore(o,th){
  const core=coreOf(o).filter(i=>i!==o.under), acc=(o.acc||[]);
  const hit=core.concat(acc).filter(i=>th.colors.includes(primary(i))); const r=[]; let s=0;
  if(hit.length){ s+=1+Math.min(2,(hit.length-1)*0.6); r.push({t:th.label+' colors: '+[...new Set(hit.map(primary))].join(', ')}); }
  else { s-=1.5; r.push({t:'No '+th.label+' colors yet: '+th.colors.slice(0,3).join(', '),neg:1}); }
  return {s,r};
}

return {PALETTES,CATS,CAT,ACCESSORY,GARMENT,OCCASIONS,OCC,COND,FORM,COLORS,TARGETS,IDEAS,IDEAS_W,SHOP_COLORS,DAY,setDept,styleDesc,ideaFor,
  daysSince,localDayGap,notPicked,isActive,primary,hueDist,group,effectiveOccasions,eligible,harmony,coreOf,scoreOutfit,
  SEASONS,seasonPlan,seasonChecklist,seasonRotation,HOLIDAYS,upcomingHolidays,themeScore,easterDate,warmthOf,rainReady,canOpen,canUnder,needsBase,layeredOver,washEvery,STYLES,STYLE_IDS,ESSENTIALS,pieceStyles,styleScore,outfitStyle,learnStyles,essentials,fitsTarget,lookMatch,pieceMatch,DRESS_CODES,setDressCode,workOk,formalOk,available,repairOk,REPAIR_OCC,NOWASH,sockFit,needsBelt,beltFit,beltPool,wxFeel,wxWet,needsLayer,weatherScore,pickAccessories,makeRng,suggest,swapCandidates,careFlags,goodCombo,combosWith,gaps};
})();
if(typeof module!=='undefined') module.exports=WardrobeLogic;
