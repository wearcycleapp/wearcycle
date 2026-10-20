/* Registers the service worker (kept out of index.html so the Content-Security-Policy needs no inline scripts). */
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
