/* load-tools.js — loads each tool file from the manifest in order, then boots
 * the UI. Sequential onload chaining keeps execution order deterministic and
 * works from a plain file:// open as well as from a web server. */
(function () {
  var files = (window.PET && PET.TOOL_FILES) || [];
  var i = 0;

  function boot() { if (window.PET && PET.boot) PET.boot(); }

  function next() {
    if (i >= files.length) { boot(); return; }
    var s = document.createElement("script");
    s.src = "js/tools/" + files[i++];
    s.async = false;
    s.onload = next;
    s.onerror = function () { console.error("Process Toolkit: failed to load", s.src); next(); };
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", next);
  } else {
    next();
  }
})();
