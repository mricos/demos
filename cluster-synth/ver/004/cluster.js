(function(global){
  'use strict';
  global.CLUSTER = global.CLUSTER || {};
  const NS = global.CLUSTER;

  /* ---------------- Bus (pub/sub) ---------------- */
  (function(){
    const listeners = new Map(); // topic -> Set(fn)
    function on(topic, fn){ (listeners.get(topic) || listeners.set(topic,new Set()).get(topic)).add(fn); return ()=>off(topic,fn); }
    function off(topic, fn){ const s=listeners.get(topic); if(s){ s.delete(fn); if(!s.size) listeners.delete(topic);} }
    function emit(topic, data){ const s=listeners.get(topic); if(s){ s.forEach(fn=>{ try{ fn(data); }catch(e){ console.error(e); } }); } }
    NS.Bus = { on, off, emit };
  })();

  /* ---------------- Utils ---------------- */
  (function(){
    const U = {};
    U.$ = (sel, root=document) => root.querySelector(sel);
    U.$all = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    U.dbToGain = db => Math.pow(10, db/20);
    U.clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
    U.lerp = (a,b,t)=>a+(b-a)*t;
    U.fmt = v => (Math.abs(v)>=10? v.toFixed(1): v.toFixed(3));
    U.log = (...a)=>{ const el=U.$('#gp-events'); if(el){ el.textContent += a.join(' ')+"\n"; el.scrollTop=el.scrollHeight; }};
    U.ariaValue = (el, unit) => { const v = (el.value??'').toString(); el.setAttribute('aria-valuetext', unit? `${v} ${unit}`: v); };
    NS.Utils = U;
  })();

  /* ---------------- Audio / Synth ---------------- */
  (function(){
    const {dbToGain, clamp} = NS.Utils; 
    const A = { AC:null, master:null, analyserL:null, analyserR:null, fx:{}, L:null, R:null, meterNode:null };

    function periodicWave(context, morph){
      const N=64; const re=new Float32Array(N), im=new Float32Array(N);
      im[1] = (1-morph);
      for(let k=1;k<N;k++) im[k] += morph * ((k%2?1:-1)*(1/k));
      return context.createPeriodicWave(re,im,{disableNormalization:false});
    }
    function waveshaper(context, amount){
      const n=2048,s=new Float32Array(n); const a=Math.max(0.0001,amount);
      for(let i=0;i<n;i++){ const x=(i/(n-1))*2-1; const fold=Math.sin(3*x); const sat=Math.tanh(2.5*x); s[i]=(1-a)*sat + a*fold; }
      const sh=context.createWaveShaper(); sh.curve=s; sh.oversample='4x'; return sh;
    }
    function makeCluster(prefix){
      const g = k=> +document.querySelector(`[data-param="${prefix+k}"]`).value;
      const baseHz=g('freq'), count=g('count')|0, spread=g('spread'), morph=g('morph'), fmCents=g('fmIndex');
      const out=A.AC.createGain(); out.gain.value=1.0;
      const mod=A.AC.createOscillator(); mod.type='sine'; mod.frequency.value=baseHz; const modGain=A.AC.createGain(); modGain.gain.value=fmCents; mod.connect(modGain);
      const pw=periodicWave(A.AC,morph);
      const osc=[];
      for(let i=0;i<count;i++){
        const o=A.AC.createOscillator(); o.setPeriodicWave(pw); o.frequency.value=baseHz;
        const frac=(i-(count-1)/2)/Math.max(1,(count-1)); const det=frac*spread;
        const sum=A.AC.createGain(); sum.gain.value=1.0; const dc=A.AC.createConstantSource(); dc.offset.value=det; dc.start(); dc.connect(sum); modGain.connect(sum); sum.connect(o.detune);
        const sh=waveshaper(A.AC,g('fold')); const biq=A.AC.createBiquadFilter(); biq.type='lowpass'; biq.frequency.value=g('cut'); biq.Q.value=g('q'); const pan=A.AC.createStereoPanner(); pan.pan.value=g('pan');
        o.connect(sh).connect(biq).connect(pan).connect(out); o.start(); osc.push({o,sh,biq,pan,sum,dc});
      }
      mod.start();
      return {group:out,osc,mod,modGain};
    }

    function buildFX(){
      const fx={}; fx.pre=A.AC.createGain(); fx.pre.gain.value=1;
      fx.delayL=A.AC.createDelay(1.5); fx.delayR=A.AC.createDelay(1.5);
      function allpass(){ const ap=A.AC.createBiquadFilter(); ap.type='allpass'; ap.frequency.value=2000; ap.Q.value=1.2; return ap; }
      fx.apL1=allpass(); fx.apL2=allpass(); fx.apR1=allpass(); fx.apR2=allpass();
      fx.fbL=A.AC.createGain(); fx.fbR=A.AC.createGain();
      fx.shiftOscL=A.AC.createOscillator(); fx.shiftOscR=A.AC.createOscillator(); fx.shiftOscL.type='sine'; fx.shiftOscR.type='sine'; fx.shiftGainL=A.AC.createGain(); fx.shiftGainR=A.AC.createGain();
      fx.mulL=A.AC.createGain(); fx.mulR=A.AC.createGain(); fx.mulL.gain.value=0; fx.mulR.gain.value=0;
      fx.wet=A.AC.createGain(); fx.dry=A.AC.createGain();
      fx.modL=A.AC.createOscillator(); fx.modR=A.AC.createOscillator(); fx.modGainL=A.AC.createGain(); fx.modGainR=A.AC.createGain();
      fx.split=A.AC.createChannelSplitter(2); fx.merge=A.AC.createChannelMerger(2);
      fx.pre.connect(fx.split);
      fx.split.connect(fx.delayL,0); fx.delayL.connect(fx.apL1).connect(fx.apL2).connect(fx.fbL).connect(fx.mulL).connect(fx.merge,0,0);
      fx.split.connect(fx.delayR,1); fx.delayR.connect(fx.apR1).connect(fx.apR2).connect(fx.fbR).connect(fx.mulR).connect(fx.merge,0,1);
      fx.apL2.connect(fx.delayL); fx.apR2.connect(fx.delayR);
      fx.shiftOscL.connect(fx.shiftGainL).connect(fx.mulL.gain); fx.shiftOscR.connect(fx.shiftGainR).connect(fx.mulR.gain);
      fx.merge.connect(fx.wet); fx.pre.connect(fx.dry);
      const master=A.master=A.AC.createGain(); master.gain.value=dbToGain(+document.querySelector('[data-param="outGain"]').value);
      const mix=+document.querySelector('[data-param="mix"]').value; fx.wet.gain.value=mix; fx.dry.gain.value=1-mix;
      fx.wet.connect(master); fx.dry.connect(master);

      // Split to per-channel analysers
      const toScope=A.AC.createChannelSplitter(2);
      master.connect(toScope);
      A.analyserL=A.AC.createAnalyser(); A.analyserR=A.AC.createAnalyser();
      A.analyserL.fftSize=2048; A.analyserR.fftSize=2048;
      toScope.connect(A.analyserL,0); toScope.connect(A.analyserR,1);

      // Peak meter via ScriptProcessor-style using Analyser
      A.meterNode = { getPeak: () => {
        const buf=new Float32Array(2048);
        A.analyserL.getFloatTimeDomainData(buf);
        let p=0; for(let i=0;i<buf.length;i++){ const v=Math.abs(buf[i]); if(v>p)p=v; }
        return p;
      }};

      master.connect(A.AC.destination);
      fx.modL.type='sine'; fx.modR.type='sine';
      fx.modL.frequency.value=+document.querySelector('[data-param="modRate"]').value; fx.modR.frequency.value=fx.modL.frequency.value*1.01;
      fx.modGainL.gain.value=(+document.querySelector('[data-param="modDepth"]').value)/1000; fx.modGainR.gain.value=fx.modGainL.gain.value;
      fx.modL.connect(fx.modGainL).connect(fx.delayL.delayTime); fx.modR.connect(fx.modGainR).connect(fx.delayR.delayTime); fx.modL.start(); fx.modR.start();
      fx.shiftOscL.frequency.value=+document.querySelector('[data-param="shiftHz"]').value; fx.shiftOscR.frequency.value=fx.shiftOscL.frequency.value*1.003;
      fx.shiftGainL.gain.value=+document.querySelector('[data-param="shiftMix"]').value; fx.shiftGainR.gain.value=fx.shiftGainL.gain.value; fx.shiftOscL.start(); fx.shiftOscR.start();

      // bindings
      const bind=(name,fn)=> document.querySelector(`[data-param="${name}"]`).addEventListener('input',fn);
      bind('fxTime',()=>{ const v=+document.querySelector('[data-param="fxTime"]').value; fx.delayL.delayTime.value=v; fx.delayR.delayTime.value=v; });
      bind('feedback',()=>{ const g=clamp(+document.querySelector('[data-param="feedback"]').value,0,0.97); fx.fbL.gain.value=g; fx.fbR.gain.value=g; });
      bind('diffuse',()=>{ const d=+document.querySelector('[data-param="diffuse"]').value; [fx.apL1,fx.apL2,fx.apR1,fx.apR2].forEach((ap,i)=> ap.Q.value=0.5+(i+1)*0.5*d); });
      bind('modRate',()=>{ fx.modL.frequency.value=+document.querySelector('[data-param="modRate"]').value; fx.modR.frequency.value=fx.modL.frequency.value*1.01; });
      bind('modDepth',()=>{ const g=(+document.querySelector('[data-param="modDepth"]').value)/1000; fx.modGainL.gain.value=g; fx.modGainR.gain.value=g; });
      bind('shiftHz',()=>{ const f=+document.querySelector('[data-param="shiftHz"]').value; fx.shiftOscL.frequency.value=f; fx.shiftOscR.frequency.value=f*1.003; });
      bind('shiftMix',()=>{ const m=+document.querySelector('[data-param="shiftMix"]').value; fx.shiftGainL.gain.value=m; fx.shiftGainR.gain.value=m; });
      bind('mix',()=>{ const m=+document.querySelector('[data-param="mix"]').value; fx.wet.gain.value=m; fx.dry.gain.value=1-m; });
      bind('outGain',()=>{ master.gain.setTargetAtTime(dbToGain(+document.querySelector('[data-param="outGain"]').value), A.AC.currentTime, 0.01); });

      A.fx=fx;
      NS.Bus.emit('audio:ready', { analyserL:A.analyserL, analyserR:A.analyserR, meter:A.meterNode });
    }

    function rebuild(which){
      const p = which==='L'?'L_':'R_';
      if (A[which]){ try{ A[which].mod.stop(); }catch(e){} A[which].osc.forEach(x=>{ try{x.o.stop();}catch(e){} }); }
      const made=makeCluster(p); A[which]=made; const lvl=A.AC.createGain(); lvl.gain.value=dbToGain(+document.querySelector(`[data-param="${p}level"]`).value); made.group.connect(lvl).connect(A.fx.pre); A[which].lvl=lvl;
    }

    function updateContinuous(which){
      const p = which==='L'?'L_':'R_'; const S=A[which]; if(!S) return;
      const g = k=> +document.querySelector(`[data-param="${p+k}"]`).value;
      const freq=g('freq'), morph=g('morph'), fold=g('fold'), cut=g('cut'), q=g('q'), pan=g('pan'), lvl=dbToGain(g('level')), fmix=g('fmIndex');
      if(S.mod){ S.mod.frequency.setTargetAtTime(freq,A.AC.currentTime,0.01); S.modGain.gain.setTargetAtTime(fmix,A.AC.currentTime,0.02); }
      const pw=periodicWave(A.AC,morph);
      S.osc.forEach(x=>{ x.o.setPeriodicWave(pw); x.biq.frequency.setTargetAtTime(cut,A.AC.currentTime,0.01); x.biq.Q.setTargetAtTime(q,A.AC.currentTime,0.01); x.pan.pan.setTargetAtTime(pan,A.AC.currentTime,0.01); const sh=waveshaper(A.AC,fold); x.o.disconnect(); x.o.connect(sh).connect(x.biq).connect(x.pan); });
      S.lvl.gain.setTargetAtTime(lvl, A.AC.currentTime, 0.02);
    }

    A.start = async function start(){ if (A.AC) return;
      A.AC = new (window.AudioContext||window.webkitAudioContext)({sampleRate:48000}); buildFX(); rebuild('L'); rebuild('R');
      const bindList=(which)=>{ ['freq','morph','fold','cut','q','pan','level','fmIndex'].forEach(k=>{ document.querySelector(`[data-param="${which+'_'+k}"]`).addEventListener('input',()=>updateContinuous(which)); }); ['count','spread'].forEach(k=>{ document.querySelector(`[data-param="${which+'_'+k}"]`).addEventListener('change',()=>rebuild(which)); }); };
      bindList('L'); bindList('R');
      NS.Bus.emit('audio:started',{});
      // UI meter pump via bus
      const meterEl = document.getElementById('cl-mbar');
      const raf = ()=>{ if(A.meterNode){ const p=A.meterNode.getPeak(); meterEl.style.width=(Math.min(1,p)*100)+'%'; } requestAnimationFrame(raf); }; raf();
    };
    NS.Audio = A;
  })();

  /* ---------------- UI ---------------- */
  (function(){
    const { $, $all, fmt, ariaValue } = NS.Utils;
    const UI = {};
    function renderVal(el){
      const name = el.getAttribute('data-param');
      const tag = $(`[data-val="${name}"]`);
      const step = +el.step || 1;
      let v = el.value;
      if (el.type==='range'){
        v = (Math.abs(step)>=1? (+v).toFixed(1): (+v).toFixed(3));
      }
      if (tag) tag.textContent = v;
      ariaValue(el);
      NS.Bus.emit('ui:paramView', { name, value:+el.value });
    }
    UI.init = function(){
      $all('[data-param]').forEach(inp=>{
        inp.addEventListener('input', ()=>renderVal(inp));
        renderVal(inp);
      });
      $('#cl-start').addEventListener('click', async ()=>{ await NS.Audio.start(); $('#cl-start').disabled=true; $('#cl-start').textContent='Running'; });
      // Panels/FABs
      function openPanel(id){ document.body.classList.add('panel-open'); $(id).classList.add('active'); }
      function closePanel(id){ $(id).classList.remove('active'); if(!$('.panel.active')) document.body.classList.remove('panel-open'); }
      $('#fab-scope').onclick = ()=>openPanel('#panel-scope');
      $('#fab-lab').onclick   = ()=>openPanel('#panel-lab');
      $('#fab-map').onclick   = ()=>openPanel('#panel-map');
      $all('[data-close]').forEach(btn=> btn.addEventListener('click', ()=> closePanel(btn.getAttribute('data-close')) ));
      // Keyboard navigation aid
      document.addEventListener('keydown', (e)=>{
        if (e.key==='Tab') return; // default
        if (e.key==='ArrowDown' || e.key==='ArrowRight'){
          e.preventDefault();
          const list=$all('[data-param]'); const i=list.indexOf(document.activeElement); const n=list[(i+1+list.length)%list.length] || list[0]; n.focus();
        } else if (e.key==='ArrowUp' || e.key==='ArrowLeft'){
          e.preventDefault();
          const list=$all('[data-param]'); const i=list.indexOf(document.activeElement); const n=list[(i-1+list.length*2)%list.length] || list[0]; n.focus();
        }
      });
    };
    NS.UI = UI;
  })();

  /* ---------------- Oscilloscope ---------------- */
  (function(){
    const O = {};
    function drawScope(analyser, canvas, color){
      const c = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const buf = new Float32Array(analyser.fftSize);
      function tick(){
        requestAnimationFrame(tick);
        analyser.getFloatTimeDomainData(buf);
        c.clearRect(0,0,W,H);
        c.strokeStyle = color;
        c.lineWidth = 1.5;
        c.beginPath();
        for(let i=0;i<W;i++){
          const idx=(i*buf.length/W)|0; const v=buf[idx];
          const y=(0.5 - v*0.45)*H;
          if(i===0) c.moveTo(i,y); else c.lineTo(i,y);
        }
        c.stroke();
      }
      tick();
    }
    O.initSmall = function(nodes){
      drawScope(nodes.analyserL, document.getElementById('scopeL'), '#7aa2f7');
      drawScope(nodes.analyserR, document.getElementById('scopeR'), '#8bd5ca');
    };
    O.initFull = function(nodes){
      drawScope(nodes.analyserL, document.getElementById('scopeFullL'), '#7aa2f7');
      drawScope(nodes.analyserR, document.getElementById('scopeFullR'), '#8bd5ca');
    };
    NS.Oscilloscope = O;
    NS.Bus.on('audio:ready', (nodes)=>{ O.initSmall(nodes); O.initFull(nodes); });
  })();

  /* ---------------- Gamepad (cursor, derivatives, flicks) ---------------- */
  (function(){
    const { $, clamp, log } = NS.Utils;
    const GP = {
      dead: 0.08,
      speed: 900, // px/s at full deflection
      cursor: { x: 200, y: 200 },
      maps: JSON.parse(localStorage.getItem('cluster.gpmaps.v2') || '{}'), // {source:[{param,scale,offset,invert,dead}]}
      learn: null,
      buf: { // time series for axes (left stick 0,1)
        t: [], ax: [], ay: [], vx: [], vy: [], ax2: [], ay2: [], N: 256
      }
    };
    function save(){ localStorage.setItem('cluster.gpmaps.v2', JSON.stringify(GP.maps)); }
    function listPads(){ return (navigator.getGamepads? Array.from(navigator.getGamepads()||[]): []).filter(Boolean); }

    function pushSeries(dt, ax, ay){
      const B = GP.buf; const N = B.N;
      // velocity (first derivative) simple diff
      const lastAx = B.ax.length? B.ax[B.ax.length-1] : 0;
      const lastAy = B.ay.length? B.ay[B.ay.length-1] : 0;
      const vx = (ax-lastAx)/dt, vy = (ay-lastAy)/dt;
      // acceleration (second derivative)
      const lastVx = B.vx.length? B.vx[B.vx.length-1] : 0;
      const lastVy = B.vy.length? B.vy[B.vy.length-1] : 0;
      const ax2 = (vx-lastVx)/dt, ay2 = (vy-lastVy)/dt;

      B.t.push((B.t.length? B.t[B.t.length-1]+dt : 0));
      B.ax.push(ax); B.ay.push(ay);
      B.vx.push(vx); B.vy.push(vy);
      B.ax2.push(ax2); B.ay2.push(ay2);
      if (B.t.length>N){ ['t','ax','ay','vx','vy','ax2','ay2'].forEach(k=>B[k].splice(0,B[k].length-N)); }
      detectFlick(ax, ay, vx, vy, ax2, ay2);
      NS.Bus.emit('gamepad:series', { ...B });
    }

    function detectFlick(ax, ay, vx, vy, ax2, ay2){
      // simple condition: high accel over brief interval with velocity sign change soon after
      const A = Math.hypot(ax2, ay2);
      const V = Math.hypot(vx, vy);
      if (A>50 && V>5){ // heuristics tuned by trial
        const dir = Math.abs(vx)>Math.abs(vy) ? (vx>0?'right':'left') : (vy>0?'down':'up');
        NS.Bus.emit('gamepad:flick', { dir, A, V, ts: performance.now() });
        log('[flick]', dir, 'A=', A.toFixed(1), 'V=', V.toFixed(1));
      }
    }

    function drawSeries(canvasId, seriesKeys){
      const el = $('#'+canvasId); if(!el) return;
      const c = el.getContext('2d'); const W=el.width, H=el.height;
      const colors = ['#7aa2f7','#8bd5ca','#f6c177','#eb6f92'];
      function norm(arr){ // min/max normalize to [-1,1]
        let mn=1e9,mx=-1e9; arr.forEach(v=>{ if(v<mn)mn=v; if(v>mx)mx=v; });
        const d = (mx-mn)||1; return arr.map(v=> ((v-mn)/d)*2-1 );
      }
      function tick(){
        requestAnimationFrame(tick);
        c.clearRect(0,0,W,H);
        seriesKeys.forEach((key, idx)=>{
          const arr = norm(GP.buf[key]);
          c.strokeStyle = colors[idx%colors.length];
          c.beginPath();
          for(let i=0;i<arr.length;i++){
            const x = (i/(GP.buf.N-1))*W;
            const y = (0.5 - arr[i]*0.45) * H;
            if(i===0) c.moveTo(x,y); else c.lineTo(x,y);
          }
          c.stroke();
        });
      }
      tick();
    }

    function applyMappings(sourceKey, value01){
      const binds = GP.maps[sourceKey]; if(!binds) return;
      binds.forEach(m=>{
        const el = document.querySelector(`[data-param="${m.param}"]`); if(!el) return;
        const min=+el.min, max=+el.max;
        const sign = m.invert? -1: 1;
        const v = clamp((value01-m.dead)*sign*m.scale + m.offset, 0, 1);
        const out = v*(max-min)+min;
        el.value = out;
        el.dispatchEvent(new Event('input', {bubbles:true}));
      });
    }

    function nearestControl(x,y){
      const rect = (el)=> el.getBoundingClientRect();
      const all = Array.from(document.querySelectorAll('[data-param]'));
      let best=null, bd=1e9;
      all.forEach(el=>{
        const r=rect(el); const cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
        const d = Math.hypot(cx-x, cy-y);
        if(d<bd){ bd=d; best=el; }
      });
      return best;
    }

    function focusNearest(){
      const c = $('#gp-cursor'); const r = c.getBoundingClientRect();
      const el = nearestControl(r.left, r.top);
      if (el){ el.focus(); }
    }

    function learn(param){
      GP.learn = param;
      NS.Utils.log('[learn] param=', param);
    }

    function bindEvent(source, param){
      GP.maps[source] = GP.maps[source] || [];
      GP.maps[source].push({param, scale:1, offset:0, invert:false, dead:GP.dead});
      save();
      NS.Utils.log('[bind]', source, '→', param);
      NS.Bus.emit('mapper:changed', GP.maps);
    }

    function updateMapTable(){
      const body = document.getElementById('map-body'); if(!body) return;
      body.innerHTML='';
      Object.keys(GP.maps).forEach(src=>{
        GP.maps[src].forEach((m,idx)=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${src}</td>
          <td>${m.param}</td>
          <td><input type="number" step="0.01" value="${m.scale}" data-map="${src}:${idx}:scale"/></td>
          <td><input type="number" step="0.01" value="${m.offset}" data-map="${src}:${idx}:offset"/></td>
          <td><input type="checkbox" ${m.invert?'checked':''} data-map="${src}:${idx}:invert"/></td>
          <td><input type="number" step="0.01" value="${m.dead}" data-map="${src}:${idx}:dead"/></td>
          <td><button data-del="${src}:${idx}">🗑️</button></td>`;
          body.appendChild(tr);
        });
      });
      body.querySelectorAll('[data-map]').forEach(el=>{
        el.addEventListener('input', (e)=>{
          const [src, iStr, key] = e.target.getAttribute('data-map').split(':');
          const i = (+iStr)|0;
          const val = key==='invert'? e.target.checked : parseFloat(e.target.value);
          GP.maps[src][i][key]=val; save();
        });
      });
      body.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const [src, iStr] = btn.getAttribute('data-del').split(':'); const i=(+iStr)|0;
          GP.maps[src].splice(i,1); if(!GP.maps[src].length) delete GP.maps[src]; save(); updateMapTable();
        });
      });
    }

    function attachUI(){
      // Right-click learn on any control
      NS.Utils.$all('[data-param]').forEach(inp=>{
        inp.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); learn(inp.getAttribute('data-param')); });
      });
      // Clear mappings
      const clear = document.getElementById('map-clear'); if(clear){
        clear.onclick = ()=>{ GP.maps = {}; save(); updateMapTable(); };
      }
      updateMapTable();
    }

    // Cursor & polling
    function start(){
      const cursor = $('#gp-cursor'); let lastTS = performance.now();
      function step(){
        const now = performance.now();
        const dt = Math.max(0.001, (now-lastTS)/1000); lastTS=now;
        const pads = listPads(); if(pads.length){
          const gp = pads[0];
          const ax = Math.abs(gp.axes[0])<GP.dead? 0 : gp.axes[0];
          const ay = Math.abs(gp.axes[1])<GP.dead? 0 : gp.axes[1];
          // move cursor (invert Y for screen)
          GP.cursor.x = clamp(GP.cursor.x + ax*GP.speed*dt, 0, window.innerWidth);
          GP.cursor.y = clamp(GP.cursor.y + ay*GP.speed*dt, 0, window.innerHeight);
          cursor.style.transform = `translate(${GP.cursor.x}px, ${GP.cursor.y}px) translate(-7px,-7px)`;

          // series + flick detection
          pushSeries(dt, ax, ay);

          // buttons -> focus/learn/tab
          gp.buttons.forEach((bt, bi)=>{
            if (!bt.pressed) return;
            const key = `g0.btn${bi}`;
            // Learn bind on first press
            if (GP.learn){ bindEvent(key, GP.learn); GP.learn=null; }
          });

          // A button (0) -> focus nearest
          if (gp.buttons[0] && gp.buttons[0].pressed) focusNearest();
          // D-pad tabbing: up(12) down(13) left(14) right(15)
          const focusList = NS.Utils.$all('[data-param]');
          function focusShift(dir){
            const i = focusList.indexOf(document.activeElement);
            const n = focusList[(i+dir+focusList.length)%focusList.length] || focusList[0];
            n.focus();
          }
          if (gp.buttons[13] && gp.buttons[13].pressed) focusShift(+1);
          if (gp.buttons[12] && gp.buttons[12].pressed) focusShift(-1);

          // Apply mapping for analog sources
          applyMappings('g0.axis0', ax*0.5+0.5);
          applyMappings('g0.axis1', ay*0.5+0.5);
          gp.buttons.forEach((bt, bi)=> applyMappings(`g0.btn${bi}`, bt.value) );
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // Lab canvases
    NS.Bus.on('audio:started', ()=>{
      drawSeries('gp-axes', ['ax','ay']);
      drawSeries('gp-deriv', ['vx','vy','ax2','ay2']);
    });

    window.addEventListener('gamepadconnected', (e)=>{ NS.Utils.log('[gamepad] connected:', e.gamepad.id); });
    window.addEventListener('gamepaddisconnected', (e)=>{ NS.Utils.log('[gamepad] disconnected:', e.gamepad.id); });

    GP.init = function(){ attachUI(); start(); };
    NS.Gamepad = GP;
  })();

  /* ---------------- Mapper (learn UI integration) ---------------- */
  (function(){
    const M = {};
    NS.Bus.on('mapper:changed', ()=>{/* placeholder if other modules need it */});
    M.init = function(){ /* mapping table is managed in Gamepad */ };
    NS.Mapper = M;
  })();

  /* ---------------- Boot ---------------- */
  (function(){
    const { $, $all } = NS.Utils;
    const Boot = {};
    Boot.init = function(){
      NS.UI.init();
      NS.Gamepad.init();
      // Open/Close panels toggle body class
      $all('.panel').forEach(p=>{
        p.addEventListener('transitionend', ()=>{ if(!p.classList.contains('active') && !$('.panel.active')) document.body.classList.remove('panel-open'); });
      });
      // Start oscilloscope when audio ready (handled in Oscilloscope)
    };
    window.addEventListener('DOMContentLoaded', Boot.init);
    NS.Boot = Boot;
  })();

})(window);
