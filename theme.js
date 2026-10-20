/* Theme before first paint: Auto follows the phone; Light or Dark is remembered on this device. */
(function(){ var t='auto'; try{ t=localStorage.getItem('wearcycle.theme')||'auto'; }catch(e){}
  if(t==='light'||t==='dark'){ document.documentElement.setAttribute('data-theme',t);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.setAttribute('content',t==='dark'?'#12161e':'#f6f4f1'); m.removeAttribute('media'); }); } })();
