/* Standalone pages: language links, dates in the reader's language, and the translation note. No inline scripts (CSP). */
(function(){
  var I=window.I18N; if(!I) return;
  var nav=document.getElementById('langs');
  if(nav){ nav.innerHTML=I.langs.map(function(l){ return '<a href="?lang='+l[0]+'" lang="'+l[0]+'"'+(l[0]===I.lang?' aria-current="page"':'')+'>'+l[1]+'</a>'; }).join(''); }
  var back=document.querySelectorAll('a[data-back]'); for(var i=0;i<back.length;i++) back[i].setAttribute('href','./');
  var t=document.querySelectorAll('time[datetime]');
  for(var j=0;j<t.length;j++){ var d=new Date(t[j].getAttribute('datetime')+'T12:00:00');
    try{ t[j].textContent=d.toLocaleDateString(I.locale,{year:'numeric',month:'long',day:'numeric'}); }catch(e){} }
  var note=document.getElementById('trnote'); if(note) note.hidden=I.lang==='en';
  document.title=I.t(document.title);
})();
