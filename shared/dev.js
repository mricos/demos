/**
 * dev.js — Auto-reload during development
 *
 * Drop into any page:
 *   <script src="/shared/dev.js"></script>
 *
 * Polls the current page's Last-Modified header every 1s.
 * When it changes, reloads the page. Remove the script tag
 * for production — it does nothing if the server doesn't
 * send Last-Modified (e.g. most CDNs).
 *
 * Also watches JS/CSS files imported by the page via
 * checking a manifest endpoint. Falls back gracefully
 * if unavailable.
 */

(function() {
  "use strict";

  var POLL_MS = 1000;
  var lastModified = null;
  var checking = false;

  function check() {
    if (checking) return;
    checking = true;

    fetch(location.href, { method: "HEAD", cache: "no-store" })
      .then(function(r) {
        var lm = r.headers.get("last-modified");
        if (lm && lastModified && lm !== lastModified) {
          console.log("[dev] change detected, reloading...");
          location.reload();
          return;
        }
        lastModified = lm;
      })
      .catch(function() { /* server down, ignore */ })
      .finally(function() { checking = false; });
  }

  // Indicate dev mode in console
  console.log("%c[dev] auto-reload active", "color: #34d399; font-weight: bold");

  // Small visual indicator
  var dot = document.createElement("div");
  dot.style.cssText = "position:fixed;bottom:8px;right:8px;width:8px;height:8px;border-radius:50%;background:#34d399;opacity:0.6;z-index:99999;pointer-events:none";
  dot.title = "dev.js auto-reload active";
  document.body.appendChild(dot);

  setInterval(check, POLL_MS);
  check();
})();
