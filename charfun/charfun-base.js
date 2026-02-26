/* charfun-base.js — shared utilities for charfun explorer pages */
var CF = (function(){
  var CF = {};

  // ── Math utilities ────────────────────────────────────────

  CF.canvasSize = function(canvas){
    var r = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var bw = Math.round(r.width * dpr);
    var bh = Math.round(r.height * dpr);
    if(canvas.width !== bw || canvas.height !== bh){
      canvas.width = bw;
      canvas.height = bh;
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {w:r.width, h:r.height, ctx:ctx};
  };

  CF.complexPow = function(re, im, n){
    if(n === 0) return {re:1, im:0};
    if(n === 1) return {re:re, im:im};
    var mag = Math.sqrt(re*re + im*im);
    if(mag < 1e-15) return {re:0, im:0};
    var ang = Math.atan2(im, re);
    var magN = Math.pow(mag, n);
    return {re: magN*Math.cos(n*ang), im: magN*Math.sin(n*ang)};
  };

  CF.complexMul = function(a, b){
    return {re: a.re*b.re - a.im*b.im, im: a.re*b.im + a.im*b.re};
  };

  CF.cfWithMean = function(dist, t, sig, mu){
    var re0 = dist.cf_re(t, sig);
    var im0 = dist.cf_im(t, sig);
    var cosmt = Math.cos(mu*t);
    var sinmt = Math.sin(mu*t);
    return {
      re: re0*cosmt - im0*sinmt,
      im: re0*sinmt + im0*cosmt
    };
  };

  CF.mgfWithMean = function(dist, t, sig, mu){
    var m0 = dist.mgf(t, sig);
    return m0 * Math.exp(mu*t);
  };

  CF.percentile95 = function(arr){
    var s = arr.slice().sort(function(a,b){return a-b;});
    return s[Math.min(Math.floor(s.length*0.95), s.length-1)] || 1;
  };

  var FACTORIALS = [1];
  for(var i=1; i<=25; i++) FACTORIALS[i] = FACTORIALS[i-1]*i;
  CF.factorial = function(n){
    return n < FACTORIALS.length ? FACTORIALS[n] : Infinity;
  };

  CF.binomCoeff = function(n, k){
    if(k<0||k>n) return 0;
    if(k===0||k===n) return 1;
    var r = 1;
    for(var i=0; i<k; i++) r = r*(n-i)/(i+1);
    return Math.round(r);
  };

  // ── Interaction setup ─────────────────────────────────────

  CF.setupResizeHandle = function(handleId, gridId, updateFn, scaleFn){
    var handle = document.getElementById(handleId);
    var grid = document.getElementById(gridId);
    var dragging = false;

    handle.addEventListener("mousedown", function(e){
      e.preventDefault();
      dragging = true;
      handle.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", function(e){
      if(!dragging) return;
      var gridRect = grid.getBoundingClientRect();
      var sidebarW = gridRect.right - e.clientX;
      sidebarW = Math.max(180, Math.min(sidebarW, gridRect.width * 0.6));
      document.documentElement.style.setProperty("--sidebar-w", sidebarW + "px");
      if(scaleFn) scaleFn();
      updateFn();
    });

    window.addEventListener("mouseup", function(){
      if(!dragging) return;
      dragging = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  };

  CF.setupPlayPause = function(btnId, stepFn){
    var btn = document.getElementById(btnId);
    var ctrl = {animating:false, animId:null};

    ctrl.stop = function(){
      ctrl.animating = false;
      btn.innerHTML = "&#9654;";
      if(ctrl.animId){ cancelAnimationFrame(ctrl.animId); ctrl.animId = null; }
    };

    btn.addEventListener("click", function(){
      ctrl.animating = !ctrl.animating;
      btn.innerHTML = ctrl.animating ? "&#9646;&#9646;" : "&#9654;";
      if(ctrl.animating) stepFn();
      else ctrl.stop();
    });

    return ctrl;
  };

  CF.setupCanvasHover = function(canvasEl, range, sliderEl, updateFn, opts){
    opts = opts || {};
    canvasEl.style.cursor = "crosshair";
    canvasEl.addEventListener("mousemove", function(e){
      if(opts.animatingFn && opts.animatingFn()) return;
      var r = typeof range === "function" ? range() : range;
      var rect = canvasEl.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var ml = opts.marginLeft || 0;
      var pw = rect.width - ml - (opts.marginRight || 0);
      var frac = (mx - ml) / pw;
      frac = Math.max(0, Math.min(1, frac));
      var val = r[0] + frac * (r[1] - r[0]);
      sliderEl.value = val.toFixed(2);
      updateFn();
    });
  };

  CF.setupKeyboard = function(sliderEl, step, updateFn, playBtnId){
    window.addEventListener("keydown", function(e){
      if(e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if(e.code === "Space" && playBtnId){
        e.preventDefault();
        document.getElementById(playBtnId).click();
      } else if(e.code === "ArrowRight"){
        e.preventDefault();
        var s = typeof step === "function" ? step() : step;
        var max = parseFloat(sliderEl.max);
        sliderEl.value = Math.min(max, parseFloat(sliderEl.value) + s).toFixed(2);
        updateFn();
      } else if(e.code === "ArrowLeft"){
        e.preventDefault();
        var s = typeof step === "function" ? step() : step;
        var min = parseFloat(sliderEl.min);
        sliderEl.value = Math.max(min, parseFloat(sliderEl.value) - s).toFixed(2);
        updateFn();
      }
    });
  };

  // ── Sidebar ───────────────────────────────────────────────

  CF.scaleSidebarFont = function(theoryColEl){
    var w = theoryColEl.offsetWidth;
    var sz = Math.max(11, 12 + (w - 280) * 0.06);
    theoryColEl.style.fontSize = sz + "px";
    var katexEls = theoryColEl.querySelectorAll(".katex");
    for(var i=0; i<katexEls.length; i++){
      katexEls[i].style.fontSize = (sz * 0.92) + "px";
    }
  };

  return CF;
})();
