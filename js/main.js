/* Junkyard Joyride - start-up */
(function () {
  'use strict';
  function start() {
    if (!window.planck) {
      document.body.innerHTML = '<p style="font:16px sans-serif;color:#fff;padding:20px">Could not load the physics engine (js/lib/planck.min.js). Check that the file was uploaded.</p>';
      return;
    }
    JJ.Game.boot();
    if (JJ.Admin) JJ.Admin.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
