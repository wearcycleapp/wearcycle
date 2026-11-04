/* Theme before first paint: Auto follows the phone; Light or Dark is remembered on this device. */
(function(){ var t='auto'; try{ t=localStorage.getItem('wearcycle.theme')||'auto'; }catch(e){}
  if(t==='light'||t==='dark'){ document.documentElement.setAttribute('data-theme',t);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.setAttribute('content',t==='dark'?'#12161e':'#f6f4f1'); m.removeAttribute('media'); }); } })();
/* Android (Phase 13): the on-screen keyboard shrinks the page, so a sheet's buttons stay above it (Chrome 108 and later
   otherwise only shrink the visual viewport). WebKit does not know the viewport key and logs an error for it, so the key is
   added only where the VirtualKeyboard API shows the Chromium engine (Chrome and Edge 94 and later). */
(function(){ if(!('virtualKeyboard' in navigator)) return; var m=document.querySelector('meta[name="viewport"]');
  if(m&&m.content.indexOf('interactive-widget')<0) m.setAttribute('content',m.content+',interactive-widget=resizes-content'); })();
