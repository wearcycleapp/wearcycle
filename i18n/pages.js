/* Standalone pages (whats-new.html, privacy.html): load the page texts for the chosen language after the app dictionary.
   Runs in <head> right after i18n.js, so document.write keeps the scripts in order. */
(function(){ var l=window.I18N&&I18N.lang; if(l&&l!=='en') document.write('<script src="i18n/pages-'+l+'.js"><\/script>'); })();
