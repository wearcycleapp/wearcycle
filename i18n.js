/* Wearcycle translations. The app is written in English; this layer translates text as it reaches the screen,
   so screens, messages and help need no per-string code. Dictionaries live in i18n/<lang>.js (key = English text).
   Lookup order for a piece of text: exact match, then with numbers as {0},{1}..., then templates with {a},{b}
   (names, dates, places), then lists split on " · " or ", ". Anything unmatched stays in English. */
(function(){
  'use strict';
  var LANGS=[['en','English'],['es','Español'],['fr','Français'],['tl','Tagalog'],['hi','हिन्दी'],['ja','日本語'],['ko','한국어']];
  var CODES=LANGS.map(function(l){ return l[0]; });
  function stored(){ try{ return localStorage.getItem('wearcycle.lang'); }catch(e){ return null; } }
  function existingUser(){ try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(/^(wardrobe\.|wearcycle\.)/.test(k)) return true; } }catch(e){} return false; }
  function pick(){
    var s=stored(); if(s&&CODES.indexOf(s)>=0) return s;
    if(existingUser()) return 'en'; // people already using the app keep English until they choose
    var nav=(navigator.languages||[navigator.language||'en']);
    for(var i=0;i<nav.length;i++){ var c=String(nav[i]||'').toLowerCase().split('-')[0]; if(c==='fil') c='tl'; if(CODES.indexOf(c)>=0) return c; }
    return 'en';
  }
  var lang=pick();
  var LOCALES={en:'en',es:'es',fr:'fr-CA',tl:'fil',hi:'hi-IN',ja:'ja-JP',ko:'ko-KR'};
  var I={langs:LANGS,lang:lang,locale:LOCALES[lang]||'en',dict:{},templates:[],missing:null};
  window.I18N=I;
  try{ if(localStorage.getItem('wearcycle.i18nDebug')) I.missing=new Set(); }catch(e){}
  document.documentElement.setAttribute('lang',lang==='tl'?'fil':lang);
  if(lang!=='en'){ document.write('<script src="i18n/'+lang+'.js"><\/script>'); }

  var NUM=/\d{4}-\d{2}-\d{2}|\d+(?:[.,]\d+)*/g;
  function fill(str,vals){ return str.replace(/\{(\w+)\}/g,function(m,k){ return vals[k]!=null?vals[k]:m; }); }
  function build(){
    I.templates=[];
    for(var k in I.dict){ if(!/\{[a-z]\}/.test(k)) continue;
      var names=[], re='^'+k.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{([a-z]|\d+)\}/g,function(m,n){ names.push(n); return /\d/.test(n)?'(\\d{4}-\\d{2}-\\d{2}|\\d+(?:[.,]\\d+)*)':'((?:(?![.!?] ).)+?)'; })+'$';
      try{ I.templates.push({re:new RegExp(re),names:names,key:k,len:k.length}); }catch(e){} }
    I.templates.sort(function(a,b){ return b.len-a.len; }); // most specific first
  }
  var CASED=/^(es|fr|tl)$/;
  function look(s){ var d=I.dict[s]; if(d!=null) return d;
    if(/^[a-z]/.test(s)){ var c=I.dict[s.charAt(0).toUpperCase()+s.slice(1)]; // labels shown in lower case mid-sentence
      if(c!=null) return CASED.test(lang)?c.charAt(0).toLowerCase()+c.slice(1):c; }
    return null; }
  function exact(s){ var d=look(s); if(d!=null) return d;
    var nums=[]; var k=s.replace(NUM,function(m){ nums.push(m); return '{'+(nums.length-1)+'}'; });
    if(nums.length){ var e=look(k); if(e!=null) return fill(e,nums); }
    return null; }
  function tr(s,depth){
    if(!s||!/[A-Za-z]/.test(s)) return s;
    var lead=s.match(/^\s*/)[0], tail=s.match(/\s*$/)[0], core=s.trim(); if(!core) return s;
    var r=exact(core);
    if(r==null&&depth<3){
      for(var i=0;i<I.templates.length&&r==null;i++){ var T=I.templates[i], m=core.match(T.re); if(!m) continue;
        var vals={}; for(var j=0;j<T.names.length;j++) vals[T.names[j]]=/\d/.test(T.names[j])?m[j+1]:tr(m[j+1],depth+1);
        r=fill(I.dict[T.key],vals); }
      if(r==null&&depth===0){ var sents=core.split(/(?<=[.!?…])\s+(?=\S)/);
        if(sents.length>1){ var hit=false; for(var q=0;q<sents.length;q++){ var y=tr(sents[q],depth+1); if(y!==sents[q]) hit=true; sents[q]=y; }
          if(hit) r=sents.join(/^(ja|ko)$/.test(lang)?' ':' '); } }
      if(r==null){ var sep=core.indexOf(' · ')>=0?' · ':(core.indexOf(', ')>=0?', ':(depth>0&&core.indexOf(' + ')>=0?' + ':(depth>0&&core.indexOf(' and ')>=0?' and ':null)));
        if(sep){ var parts=core.split(sep), any=false; for(var p=0;p<parts.length;p++){ var x=tr(parts[p],depth+1); if(x!==parts[p]) any=true; parts[p]=x; }
          if(any) r=parts.join(sep===' and '?(lang==='ja'?(look('and')||'と'):' '+(look('and')||'and')+' '):(sep===', '&&lang==='ja'?'、':sep)); } }
    }
    if(r==null){ if(I.missing&&depth===0&&/[A-Za-z]{3}/.test(core)) I.missing.add(core); return s; }
    return lead+r+tail;
  }
  /** t('English text with {a} or {0}', {a:..}) for text drawn outside the page (canvas, document title). */
  I.t=function(s,vals){ var r=lang==='en'?s:(I.dict[s]!=null?I.dict[s]:s); return vals?fill(r,vals):r; };
  I.tr=function(s){ return lang==='en'?s:tr(s,0); };

  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,CODE:1,svg:1,SVG:1};
  var ATTRS=['placeholder','aria-label','title','alt'];
  var done=new WeakMap(), adone=new WeakMap();
  function attr(el,name){ var at=el.getAttribute(name); if(!at||!/[A-Za-z]/.test(at)) return;
    var m=adone.get(el); if(m&&m[name]===at) return; // already ours
    var o=tr(at,0); if(!m){ m={}; adone.set(el,m); } m[name]=o; if(o!==at) el.setAttribute(name,o); }
  function node(n){
    if(n.nodeType===3){ var v=n.nodeValue; if(done.get(n)===v) return; var o=tr(v,0); if(o!==v) n.nodeValue=o; done.set(n,n.nodeValue); return; }
    if(n.nodeType!==1||SKIP[n.nodeName]||(n.closest&&n.closest('[data-notr]'))) return;
    for(var a=0;a<ATTRS.length;a++) attr(n,ATTRS[a]);
    if(n.nodeName==='INPUT'&&(n.type==='button'||n.type==='submit')&&n.value){ n.value=tr(n.value,0); }
    for(var c=n.firstChild;c;c=c.nextSibling) node(c);
  }
  I.translate=function(root){ if(lang!=='en') node(root||document.body); };
  I.setLang=function(code){ try{ localStorage.setItem('wearcycle.lang',code); }catch(e){} location.reload(); };
  I.load=function(code,dict){ if(code!==lang) return; I.dict=dict||{}; build(); };
  if(lang!=='en'){
    var obs=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i];
      if(m.type==='characterData') node(m.target);
      else if(m.type==='attributes') attr(m.target,m.attributeName);
      else for(var j=0;j<m.addedNodes.length;j++) node(m.addedNodes[j]); } });
    var start=function(){ node(document.body); obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS}); };
    if(document.body) start(); else document.addEventListener('DOMContentLoaded',start);
  }
})();
