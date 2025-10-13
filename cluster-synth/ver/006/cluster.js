(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};

  /* ---------- Bus ---------- */
  (function(){
    const listeners = new Map();
    function on(topic, fn){ (listeners.get(topic)||listeners.set(topic,new Set()).get(topic)).add(fn); return ()=>off(topic,fn); }
    function off(topic, fn){ const s=listeners.get(topic); if(s){ s.delete(fn); if(!s.size) listeners.delete(topic);} }
    function emit(topic, data){
      const s=listeners.get(topic); if(s){ s.forEach(fn=>{ try{ fn(data);}catch(e){console.error(e);} }); }
      // mirror to log stream
      NS.Log && NS.Log.push(topic, data);
      NS.PubSubCanvas && NS.PubSubCanvas.pulse(topic);
    }
    NS.Bus = { on, off, emit };
  })();

  /* ---------- Utils (time, dom, math, stats) ---------- */
  (function(){
    const U = {};
    U.$ = (sel, root=document)=>root.querySelector(sel);
    U.$all = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
    U.dbToGain = db => Math.pow(10, db/20);
    U.clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
    U.lerp = (a,b,t)=>a+(b-a)*t;
    U.now = ()=> performance.now();
    U.localTime = ()=> new Date().toLocaleTimeString();
    U.isoTime = ()=> new Date().toISOString();
    U.hmsms = (ms)=>{ const s=ms/1000|0, m=(s/60)|0, h=(m/60)|0; const ss=(s%60).toString().padStart(2,'0'); const mm=(m%60).toString().padStart(2,'0'); const hh=h.toString().padStart(2,'0'); const ms3=(ms|0)%1000; return `${hh}:${mm}:${ss}.${ms3.toString().padStart(3,'0')}`; };
    U.beats = (ms, bpm)=> (bpm/60000)*ms;
    U.frame = (ms, fps=60)=> (ms/1000*fps)|0;
    U.fmt = v => (Math.abs(v)>=10? v.toFixed(1): v.toFixed(3));
    // Welford running stats
    class RunningStats{
      constructor(){ this.n=0; this.mean=0; this.M2=0; }
      push(x){ this.n++; const d=x-this.mean; this.mean+=d/this.n; this.M2+=d*(x-this.mean); }
      var(){ return this.n>1? this.M2/(this.n-1): 0; }
      std(){ return Math.sqrt(this.var()); }
    }
    // EMA
    class EMA{ constructor(alpha){ this.a=alpha; this.y=0; this.init=false; } step(x){ if(!this.init){ this.y=x; this.init=true; } else { this.y = this.a*x + (1-this.a)*this.y; } return this.y; } }
    U.RunningStats = RunningStats;
    U.EMA = EMA;
    U.copyParamsJSON = ()=>{
      const map={}; U.$all('[data-param]').forEach(el=>{ map[el.getAttribute('data-param')] = (el.type==='range'||el.type==='number')? +el.value : el.value; });
      return JSON.stringify(map,null,2);
    };
    NS.Utils=U;
  })();

  /* ---------- Audio / Synth ---------- */
  (function(){
    const U = NS.Utils;
    const A = { AC:null, fx:null, L:null, R:null, analyserL:null, analyserR:null, meter:null };
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
      const baseHz=g('freq'), count=g('count')|0, spread=g('spread'), morph=g('morph'), fmC=g('fmIndex');
      const out=A.AC.createGain(); out.gain.value=1;
      const mod=A.AC.createOscillator(); mod.type='sine'; mod.frequency.value=baseHz; const modGain=A.AC.createGain(); modGain.gain.value=fmC; mod.connect(modGain);
      const pw=periodicWave(A.AC,morph); const osc=[];
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
      function AP(){ const b=A.AC.createBiquadFilter(); b.type='allpass'; b.frequency.value=2000; b.Q.value=1.2; return b; }
      fx.apL1=AP(); fx.apL2=AP(); fx.apR1=AP(); fx.apR2=AP();
      fx.fbL=A.AC.createGain(); fx.fbR=A.AC.createGain();
      fx.shiftOscL=A.AC.createOscillator(); fx.shiftOscR=A.AC.createOscillator(); fx.shiftGainL=A.AC.createGain(); fx.shiftGainR=A.AC.createGain();
      fx.mulL=A.AC.createGain(); fx.mulR=A.AC.createGain(); fx.mulL.gain.value=0; fx.mulR.gain.value=0;
      fx.wet=A.AC.createGain(); fx.dry=A.AC.createGain();
      fx.modL=A.AC.createOscillator(); fx.modR=A.AC.createOscillator(); fx.modGainL=A.AC.createGain(); fx.modGainR=A.AC.createGain();
      fx.split=A.AC.createChannelSplitter(2); fx.merge=A.AC.createChannelMerger(2);
      fx.pre.connect(fx.split);
      fx.split.connect(fx.delayL,0); fx.delayL.connect(fx.apL1).connect(fx.apL2).connect(fx.fbL).connect(fx.mulL).connect(fx.merge,0,0);
      fx.split.connect(fx.delayR,1); fx.delayR.connect(fx.apR1).connect(fx.apR2).connect(fx.fbR).connect(fx.mulR).connect(fx.merge,0,1);
      fx.apL2.connect(fx.delayL); fx.apR2.connect(fx.delayR);
      fx.shiftOscL.type='sine'; fx.shiftOscR.type='sine';
      fx.shiftOscL.connect(fx.shiftGainL).connect(fx.mulL.gain);
      fx.shiftOscR.connect(fx.shiftGainR).connect(fx.mulR.gain);
      fx.merge.connect(fx.wet); fx.pre.connect(fx.dry);
      const master=A.master=A.AC.createGain();
      fx.wet.connect(master); fx.dry.connect(master);
      const toScope=A.AC.createChannelSplitter(2);
      master.connect(toScope);
      A.analyserL=A.AC.createAnalyser(); A.analyserR=A.AC.createAnalyser(); A.analyserL.fftSize=2048; A.analyserR.fftSize=2048;
      toScope.connect(A.analyserL,0); toScope.connect(A.analyserR,1);
      A.meter = { getPeak:()=>{ const buf=new Float32Array(2048); A.analyserL.getFloatTimeDomainData(buf); let p=0; for(let i=0;i<buf.length;i++){ const v=Math.abs(buf[i]); if(v>p)p=v; } return p; } };
      master.connect(A.AC.destination);
      A.fx=fx;
    }
    function wireParams(){
      const gSel = sel=> document.querySelector(`[data-param="${sel}"]`);
      const fx=A.fx;
      const bind = (name, fn) => gSel(name).addEventListener('input', fn);
      bind('fxTime', ()=>{ const v=+gSel('fxTime').value; fx.delayL.delayTime.value=v; fx.delayR.delayTime.value=v; });
      bind('feedback', ()=>{ const v=+gSel('feedback').value; fx.fbL.gain.value=v; fx.fbR.gain.value=v; });
      bind('diffuse', ()=>{ const d=+gSel('diffuse').value; [fx.apL1,fx.apL2,fx.apR1,fx.apR2].forEach((ap,i)=> ap.Q.value=0.5+(i+1)*0.5*d); });
      bind('modRate', ()=>{ const r=+gSel('modRate').value; fx.modL.frequency.value=r; fx.modR.frequency.value=r*1.01; });
      bind('modDepth', ()=>{ const g=(+gSel('modDepth').value)/1000; fx.modGainL.gain.value=g; fx.modGainR.gain.value=g; });
      bind('shiftHz', ()=>{ const f=+gSel('shiftHz').value; fx.shiftOscL.frequency.value=f; fx.shiftOscR.frequency.value=f*1.003; });
      bind('shiftMix', ()=>{ const m=+gSel('shiftMix').value; fx.shiftGainL.gain.value=m; fx.shiftGainR.gain.value=m; });
      bind('mix', ()=>{ const m=+gSel('mix').value; fx.wet.gain.value=m; fx.dry.gain.value=1-m; });
      bind('outGain', ()=>{ A.master.gain.setTargetAtTime(NS.Utils.dbToGain(+gSel('outGain').value), A.AC.currentTime, 0.01); });
      // init dependent
      const r=+gSel('modRate').value; fx.modL.frequency.value=r; fx.modR.frequency.value=r*1.01;
      const g=(+gSel('modDepth').value)/1000; fx.modGainL.gain.value=g; fx.modGainR.gain.value=g;
      const f=+gSel('shiftHz').value; fx.shiftOscL.frequency.value=f; fx.shiftOscR.frequency.value=f*1.003;
      const m=+gSel('shiftMix').value; fx.shiftGainL.gain.value=m; fx.shiftGainR.gain.value=m;
      const mix=+gSel('mix').value; fx.wet.gain.value=mix; fx.dry.gain.value=1-mix;
      A.master.gain.value=NS.Utils.dbToGain(+gSel('outGain').value);
    }
    function rebuild(which){
      const p = which==='L'?'L_':'R_';
      if (A[which]){ try{ A[which].mod.stop(); }catch(e){} A[which].osc.forEach(x=>{ try{x.o.stop();}catch(_){}}); }
      const made=makeCluster(p); A[which]=made;
      const lvl=A.AC.createGain(); lvl.gain.value=NS.Utils.dbToGain(+document.querySelector(`[data-param="${p}level"]`).value);
      made.group.connect(lvl).connect(A.fx.pre); A[which].lvl=lvl;
    }
    function updateContinuous(which){
      const p = which==='L'?'L_':'R_';
      const g = k=> +document.querySelector(`[data-param="${p+k}"]`).value;
      const S=A[which]; if(!S) return;
      const freq=g('freq'), morph=g('morph'), fold=g('fold'), cut=g('cut'), q=g('q'), pan=g('pan'), lvl=NS.Utils.dbToGain(g('level')), fmix=g('fmIndex');
      if(S.mod){ S.mod.frequency.setTargetAtTime(freq,A.AC.currentTime,0.01); S.modGain.gain.setTargetAtTime(fmix,A.AC.currentTime,0.02); }
      const pw=periodicWave(A.AC,morph);
      S.osc.forEach(x=>{ x.o.setPeriodicWave(pw); x.biq.frequency.setTargetAtTime(cut,A.AC.currentTime,0.01); x.biq.Q.setTargetAtTime(q,A.AC.currentTime,0.01); x.pan.pan.setTargetAtTime(pan,A.AC.currentTime,0.01); const sh=waveshaper(A.AC,fold); x.o.disconnect(); x.o.connect(sh).connect(x.biq).connect(x.pan); });
      S.lvl.gain.setTargetAtTime(lvl, A.AC.currentTime, 0.02);
    }
    A.start = async ()=>{
      if (A.AC) return;
      A.AC = new (window.AudioContext||window.webkitAudioContext)({sampleRate:48000});
      buildFX(); wireParams(); rebuild('L'); rebuild('R');
      const bindList=(W)=>{ ['freq','morph','fold','cut','q','pan','level','fmIndex'].forEach(k=>{ document.querySelector(`[data-param="${W+'_'+k}"]`).addEventListener('input',()=>updateContinuous(W)); }); ['count','spread'].forEach(k=>{ document.querySelector(`[data-param="${W+'_'+k}"]`).addEventListener('change',()=>rebuild(W)); }); };
      bindList('L'); bindList('R');
      NS.Bus.emit('audio:started',{});
      // meter
      const bar = document.getElementById('cl-mbar');
      const raf = ()=>{ if(A.meter){ const p=A.meter.getPeak(); bar.style.width=(Math.min(1,p)*100)+'%'; } requestAnimationFrame(raf); }; raf();
      NS.Bus.emit('audio:ready',{ analyserL:A.analyserL, analyserR:A.analyserR });
    };
    NS.Audio = A;
  })();

  /* ---------- UI ---------- */
  (function(){
    const U = NS.Utils;
    const UI = {};
    function renderVal(el){
      const name=el.getAttribute('data-param'); const tag=U.$(`[data-val="${name}"]`);
      if (tag) tag.textContent = (el.step && Math.abs(+el.step)>=1)? (+el.value).toFixed(1): (+el.value).toFixed(3);
      el.setAttribute('aria-valuetext', el.value);
      NS.Bus.emit('ui:paramView', { name, value:+el.value });
    }
    UI.init = function(){
      U.$all('[data-param]').forEach(inp=>{ inp.addEventListener('input', ()=>renderVal(inp)); renderVal(inp); });
      U.$('#btn-audio').onclick = async()=>{ await NS.Audio.start(); U.$('#btn-audio').disabled=true; U.$('#status-audio').textContent='audio: on'; };
      // open/close
      U.$all('.fab').forEach(b=> b.addEventListener('click', ()=> openPanel(b.getAttribute('data-open')) ));
      U.$all('[data-close]').forEach(b=> b.addEventListener('click', ()=> closePanel(b.getAttribute('data-close')) ));
      function openPanel(id){ U.$(id).classList.add('active'); }
      function closePanel(id){ U.$(id).classList.remove('active'); }
      // keyboard param focus with dpad simulated by arrows
      document.addEventListener('keydown', (e)=>{
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const list=U.$all('[data-param]'); const i=list.indexOf(document.activeElement); const step=(e.key==='ArrowDown'||e.key==='ArrowRight')?+1:-1;
        const n=list[(i+step+list.length)%list.length] || list[0]; n.focus();
      });
      // mapper export
      const exp = U.$('#map-export'); if(exp){ exp.onclick=()=>{ U.$('#params-json').value=U.copyParamsJSON(); }; }
    };
    NS.UI=UI;
  })();

  /* ---------- Scope ---------- */
  (function(){
    const O = {};
    function draw(analyser, canvas, color){
      const c=canvas.getContext('2d'); const W=canvas.width, H=canvas.height; const buf=new Float32Array(analyser.fftSize);
      function tick(){ requestAnimationFrame(tick); analyser.getFloatTimeDomainData(buf); c.clearRect(0,0,W,H); c.strokeStyle=color; c.beginPath(); for(let i=0;i<W;i++){ const idx=(i*buf.length/W)|0, v=buf[idx]; const y=(0.5 - v*0.45)*H; if(i===0) c.moveTo(i,y); else c.lineTo(i,y);} c.stroke(); }
      tick();
    }
    NS.Bus.on('audio:ready', nodes=>{
      const L=document.getElementById('scopeL'), R=document.getElementById('scopeR'); if(L&&R){ draw(nodes.analyserL,L,'#7aa2f7'); draw(nodes.analyserR,R,'#8bd5ca'); }
    });
    NS.Scope=O;
  })();

  /* ---------- Gamepad ---------- */
  (function(){
    const U = NS.Utils;
    const GP = {
      dead: 0.08, speed: 900,
      cursor: {x:200,y:200},
      buf: { t:[], ax:[], ay:[], vx:[], vy:[], ax2:[], ay2:[], N:256 },
      stats: { ax:new U.RunningStats(), ay:new U.RunningStats(), vx:new U.RunningStats(), vy:new U.RunningStats() },
      emaAx: new U.EMA(0.25), emaAy: new U.EMA(0.25),
      spring: new U.EMA(0.05), // heuristic "return rate"
      learnParam: null,
      maps: JSON.parse(localStorage.getItem('cluster.gpmaps.v3')||'{}')
    };
    function save(){ localStorage.setItem('cluster.gpmaps.v3', JSON.stringify(GP.maps)); }
    function listPads(){ return (navigator.getGamepads? Array.from(navigator.getGamepads()||[]): []).filter(Boolean); }
    function pushSeries(dt, ax, ay){
      const B=GP.buf, N=B.N;
      const lastAx=B.ax.length?B.ax[B.ax.length-1]:0; const lastAy=B.ay.length?B.ay[B.ay.length-1]:0;
      const vx=(ax-lastAx)/dt, vy=(ay-lastAy)/dt;
      const lastVx=B.vx.length?B.vx[B.vx.length-1]:0; const lastVy=B.vy.length?B.vy[B.vy.length-1]:0;
      const ax2=(vx-lastVx)/dt, ay2=(vy-lastVy)/dt;
      B.t.push((B.t.length? B.t[B.t.length-1]+dt:0)); B.ax.push(ax); B.ay.push(ay); B.vx.push(vx); B.vy.push(vy); B.ax2.push(ax2); B.ay2.push(ay2);
      if(B.t.length>N){ ['t','ax','ay','vx','vy','ax2','ay2'].forEach(k=>B[k].splice(0,B[k].length-N)); }
      GP.stats.ax.push(ax); GP.stats.ay.push(ay); GP.stats.vx.push(vx); GP.stats.vy.push(vy);
      // "springiness": when |axis| decreases, measure rate
      const mag=Math.hypot(ax,ay), vmag=Math.hypot(vx,vy);
      if (vmag<0) GP.spring.step(-vmag); else GP.spring.step(0);
      NS.Bus.emit('gamepad:series', {...B});
      detectFlick(ax, ay, vx, vy, ax2, ay2);
    }
    function detectFlick(ax, ay, vx, vy, ax2, ay2){
      const A=Math.hypot(ax2,ay2), V=Math.hypot(vx,vy);
      if (A>50 && V>5){ const dir = Math.abs(vx)>Math.abs(vy)? (vx>0?'right':'left') : (vy>0?'down':'up'); NS.Bus.emit('gamepad:flick', {dir,A,V,ts:U.now()}); }
    }
    function drawSeries(canvasId, keys){
      const el=U.$('#'+canvasId); if(!el) return; const c=el.getContext('2d'); const W=el.width, H=el.height;
      const colors=['#7aa2f7','#8bd5ca','#f6c177','#eb6f92'];
      function norm(arr){ let mn=1e9,mx=-1e9; for(const v of arr){ if(v<mn)mn=v; if(v>mx)mx=v;} const d=(mx-mn)||1; return arr.map(v=> ((v-mn)/d)*2-1 ); }
      function tick(){ requestAnimationFrame(tick); c.clearRect(0,0,W,H); keys.forEach((k,i)=>{ const arr=norm(GP.buf[k]); c.strokeStyle=colors[i%colors.length]; c.beginPath(); for(let j=0;j<arr.length;j++){ const x=(j/(GP.buf.N-1))*W; const y=(0.5 - arr[j]*0.45)*H; if(j===0) c.moveTo(x,y); else c.lineTo(x,y);} c.stroke(); }); }
      tick();
    }
    function nearestControl(x,y){
      let best=null, bd=1e9; NS.Utils.$all('[data-param]').forEach(el=>{ const r=el.getBoundingClientRect(); const cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2; const d=Math.hypot(cx-x,cy-y); if(d<bd){ bd=d; best=el; } }); return best;
    }
    function focusNearest(){ const c=U.$('#gp-cursor').getBoundingClientRect(); const el=nearestControl(c.left,c.top); if(el) el.focus(); }
    function bindLearn(source, param){
      GP.maps[source]=GP.maps[source]||[]; GP.maps[source].push({param, scale:1, offset:0, invert:false, dead:GP.dead}); save(); NS.Bus.emit('mapper:changed', GP.maps);
    }
    function applyMappings(sourceKey, value01){
      const binds = GP.maps[sourceKey]; if(!binds) return;
      binds.forEach(m=>{
        const el=document.querySelector(`[data-param="${m.param}"]`); if(!el) return;
        const min=+el.min, max=+el.max, sign=m.invert?-1:1;
        const v=NS.Utils.clamp( (value01-m.dead)*sign*m.scale + m.offset, 0, 1);
        const out = v*(max-min)+min; el.value=out; el.dispatchEvent(new Event('input',{bubbles:true}));
      });
    }
    function updateStatsView(){
      const s = GP.stats;
      const txt =
`ax μ=${s.ax.mean.toFixed(4)} σ=${s.ax.std().toFixed(4)}
ay μ=${s.ay.mean.toFixed(4)} σ=${s.ay.std().toFixed(4)}
vx μ=${s.vx.mean.toFixed(4)} σ=${s.vy.std().toFixed(4)}
spring=${GP.spring.y.toFixed(4)}`;
      const el=U.$('#gp-stats'); if(el) el.textContent=txt;
    }
    function attachUI(){
      // learn with contextmenu on any control
      U.$all('[data-param]').forEach(inp=>{
        inp.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); GP.learnParam = inp.getAttribute('data-param'); NS.Bus.emit('log:learn',{param:GP.learnParam}); });
      });
      const clear=U.$('#map-clear'); if(clear){ clear.onclick=()=>{ GP.maps={}; save(); NS.Mapper.updateTable(GP.maps); }; }
      document.getElementById('gp-calib')?.addEventListener('click', ()=>{ GP.stats.ax=new U.RunningStats(); GP.stats.ay=new U.RunningStats(); GP.stats.vx=new U.RunningStats(); GP.stats.vy=new U.RunningStats(); NS.Bus.emit('log:calibrate',{}); });
    }
    function start(){
      attachUI();
      // draw series when audio started (guarantees raf)
      NS.Bus.on('audio:started', ()=>{ drawSeries('gp-axes',['ax','ay']); drawSeries('gp-deriv',['vx','vy','ax2','ay2']); });
      const cursor=U.$('#gp-cursor');
      let last=U.now(); let selNode=0; // for PubSub selection
      function step(){
        const now=U.now(), dt=Math.max(0.001,(now-last)/1000); last=now;
        const pads=listPads();
        if(pads.length){
          U.$('#status-gp').textContent='gamepad: 1';
          const gp=pads[0];
          const ax=Math.abs(gp.axes[0])<GP.dead?0:gp.axes[0];
          const ay=Math.abs(gp.axes[1])<GP.dead?0:gp.axes[1];
          const dax=GP.emaAx.step(ax), day=GP.emaAy.step(ay);
          const springK = NS.Utils.clamp(0.5 + GP.spring.y, 0.05, 1.2);
          GP.cursor.x = NS.Utils.clamp(GP.cursor.x + dax*GP.speed*dt*springK, 0, window.innerWidth);
          GP.cursor.y = NS.Utils.clamp(GP.cursor.y + day*GP.speed*dt*springK, 0, window.innerHeight);
          cursor.style.transform=`translate(${GP.cursor.x}px,${GP.cursor.y}px) translate(-7px,-7px)`;
          pushSeries(dt, ax, ay); updateStatsView();
          // Apply analog mappings
          applyMappings('g0.axis0', ax*0.5+0.5); applyMappings('g0.axis1', ay*0.5+0.5);
          // Buttons
          gp.buttons.forEach((bt,bi)=>{
            if(!bt.pressed) return;
            const key=`g0.btn${bi}`;
            if(GP.learnParam){ bindLearn(key, GP.learnParam); GP.learnParam=null; NS.Mapper.updateTable(GP.maps); }
            applyMappings(key, bt.value);
          });
          // focus nearest on A(0)
          if (gp.buttons[0]?.pressed) focusNearest();
          // select PubSub node via D-pad left/right
          if (gp.buttons[14]?.pressed) selNode = Math.max(0, selNode-1);
          if (gp.buttons[15]?.pressed) selNode = selNode+1;
          // LB(4) to drag selected node with stick
          if (gp.buttons[4]?.pressed){ NS.PubSubCanvas && NS.PubSubCanvas.dragByIndex(selNode, ax*12, ay*12); }
        } else {
          U.$('#status-gp').textContent='gamepad: none';
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    GP.start = start;
    NS.Gamepad = GP;
  })();

  /* ---------- Mapper ---------- */
  (function(){
    const U = NS.Utils;
    const M = {};
    M.updateTable = (maps)=>{
      const body=U.$('#map-body'); if(!body) return; body.innerHTML='';
      Object.keys(maps).forEach(src=>{
        maps[src].forEach((m,i)=>{
          const tr=document.createElement('tr');
          tr.innerHTML=`<td>${src}</td>
<td>${m.param}</td>
<td><input type="number" step="0.01" value="${m.scale}" data-map="${src}:${i}:scale"/></td>
<td><input type="number" step="0.01" value="${m.offset}" data-map="${src}:${i}:offset"/></td>
<td><input type="checkbox" ${m.invert?'checked':''} data-map="${src}:${i}:invert"/></td>
<td><input type="number" step="0.01" value="${m.dead}" data-map="${src}:${i}:dead"/></td>
<td><button data-del="${src}:${i}">🗑️</button></td>`;
          body.appendChild(tr);
        });
      });
      body.querySelectorAll('[data-map]').forEach(el=>{
        el.addEventListener('input',(e)=>{
          const [src,idx,key]=e.target.getAttribute('data-map').split(':'); const i=(+idx)|0;
          const val = key==='invert'? e.target.checked : parseFloat(e.target.value);
          NS.Gamepad.maps[src][i][key]=val; localStorage.setItem('cluster.gpmaps.v3', JSON.stringify(NS.Gamepad.maps));
        });
      });
      body.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const [src,idx]=btn.getAttribute('data-del').split(':'); const i=(+idx)|0;
          NS.Gamepad.maps[src].splice(i,1); if(!NS.Gamepad.maps[src].length) delete NS.Gamepad.maps[src];
          localStorage.setItem('cluster.gpmaps.v3', JSON.stringify(NS.Gamepad.maps));
          M.updateTable(NS.Gamepad.maps);
        });
      });
    };
    NS.Mapper=M;
    // Bootstrap table once DOM is ready
    document.addEventListener('DOMContentLoaded', ()=> M.updateTable(NS.Gamepad?.maps||{}) );
  })();

  /* ---------- Log (time formats, Δt, BPM) ---------- */
  (function(){
    const U = NS.Utils;
    const L = { lastTs: U.now(), bpm: 120 };
    function row(topic, payload){
      const t=U.now(); const dt=t-L.lastTs; L.lastTs=t;
      const beat=(U.beats(dt, L.bpm)).toFixed(3);
      const tr=document.createElement('tr');
      const payloadStr = (typeof payload==='object')? JSON.stringify(payload) : String(payload);
      tr.innerHTML = `<td>${topic}</td><td>${U.localTime()}</td><td>${new Date().toISOString()}</td><td>${dt.toFixed(2)}</td><td>${beat}</td><td class="payload">${payloadStr}</td>`;
      return tr;
    }
    L.push = (topic, data)=>{
      const body = document.getElementById('log-body'); if(!body) return;
      const tr = row(topic, data);
      body.appendChild(tr);
      while(body.children.length>300) body.removeChild(body.firstChild);
      body.parentElement.scrollTop = body.parentElement.scrollHeight;
    };
    L.init = ()=>{
      const bpmEl=document.getElementById('log-bpm'); if(bpmEl){ bpmEl.addEventListener('input',()=>{ L.bpm=+bpmEl.value; document.getElementById('status-bpm').textContent='bpm: '+L.bpm; }); }
      const clr=document.getElementById('log-clear'); if(clr){ clr.onclick=()=>{ document.getElementById('log-body').innerHTML=''; }; }
    };
    document.addEventListener('DOMContentLoaded', L.init);
    NS.Log=L;
  })();

  /* ---------- PubSub Canvas (draggable nodes, joystick control) ---------- */
  (function(){
    const U = NS.Utils;
    const PSC = { nodes:[], lookup:new Map(), canvas:null, ctx:null, pulses:[] };
    function addNode(name, x, y){
      const n={name,x,y,vx:0,vy:0,r:52,color:'#2a2f45',last:0};
      PSC.nodes.push(n); PSC.lookup.set(name,n);
    }
    PSC.pulse = (topic)=>{ const n=PSC.lookup.get(topic.split(':')[0]) || PSC.lookup.get(topic); if(n){ n.last=U.now(); } };
    PSC.dragByIndex = (i, dx, dy)=>{ if(PSC.nodes.length===0) return; const idx=((i%PSC.nodes.length)+PSC.nodes.length)%PSC.nodes.length; const n=PSC.nodes[idx]; n.x = U.clamp(n.x + dx, 60, PSC.canvas.width-60); n.y = U.clamp(n.y + dy, 60, PSC.canvas.height-60); };
    function drawNode(n, now){
      const c=PSC.ctx;
      const age = Math.min(1, (now-n.last)/400);
      const glow = 1 - age;
      c.save();
      c.translate(n.x, n.y);
      c.fillStyle = n.color;
      c.strokeStyle = '#3c4565';
      c.lineWidth = 1;
      c.beginPath(); c.arc(0,0,n.r,0,Math.PI*2); c.fill(); c.stroke();
      if (glow>0){
        c.beginPath(); c.arc(0,0,n.r+8*glow,0,Math.PI*2);
        c.strokeStyle = `rgba(122,162,247,${0.6*glow})`; c.lineWidth = 6*glow; c.stroke();
      }
      c.fillStyle = '#cfe1ff';
      c.font = '12px ui-monospace,monospace';
      c.textAlign='center'; c.textBaseline='middle';
      c.fillText(n.name, 0, 0);
      c.restore();
    }
    function draw(){
      const c=PSC.ctx, W=PSC.canvas.width, H=PSC.canvas.height, now=U.now();
      c.clearRect(0,0,W,H);
      // light grid
      c.strokeStyle='#162032'; c.lineWidth=1; c.globalAlpha=0.6;
      for(let x=0;x<W;x+=80){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
      for(let y=0;y<H;y+=80){ c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }
      c.globalAlpha=1;
      PSC.nodes.forEach(n=> drawNode(n, now));
      requestAnimationFrame(draw);
    }
    PSC.init = ()=>{
      const can = document.getElementById('bus-canvas'); if(!can) return; PSC.canvas=can; PSC.ctx=can.getContext('2d');
      // default topics
      ['audio','gamepad','mapper','ui','log','pubsub'].forEach((t,i)=> addNode(t, 160+i*220, 200+((i%2)?160:0)));
      // mouse drag
      let dragging=null, offx=0, offy=0;
      can.addEventListener('mousedown',(e)=>{ const r=can.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top; dragging = PSC.nodes.find(n=> Math.hypot(n.x-x,n.y-y) < n.r); if(dragging){ offx=dragging.x-x; offy=dragging.y-y; } });
      can.addEventListener('mousemove',(e)=>{ if(!dragging) return; const r=can.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top; dragging.x=U.clamp(x+offx,60,can.width-60); dragging.y=U.clamp(y+offy,60,can.height-60); });
      window.addEventListener('mouseup',()=> dragging=null);
      draw();
    };
    document.addEventListener('DOMContentLoaded', PSC.init);
    NS.PubSubCanvas = PSC;
  })();

  /* ---------- Boot ---------- */
  (function(){
    const U = NS.Utils;
    function tickFPS(){
      let last=U.now(), frames=0, acc=0;
      function raf(){
        const now=U.now(); const dt=now-last; last=now; frames++; acc+=dt;
        if (acc>=500){ const fps = Math.round(frames*1000/acc); const el=document.getElementById('status-fps'); if(el) el.textContent = 'fps: '+fps; frames=0; acc=0; }
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
    function boot(){
      NS.UI.init();
      NS.Gamepad.start();
      tickFPS();
      // param value mirrors
      U.$all('[data-param]').forEach(el=>{
        el.addEventListener('input', ()=> NS.Bus.emit('ui:param', {name:el.getAttribute('data-param'), value:+el.value}) );
      });
    }
    window.addEventListener('DOMContentLoaded', boot);
  })();

})(window);
