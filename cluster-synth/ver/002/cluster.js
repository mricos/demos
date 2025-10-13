(function bootLoader(global){
  global.CLUSTER = global.CLUSTER || {};
  const NS = global.CLUSTER;

  // ---------- Utils ----------
  (function(){
    const U = {};
    U.$ = (sel, root=document) => root.querySelector(sel);
    U.$all = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    U.dbToGain = db => Math.pow(10, db/20);
    U.clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
    U.fmt = v => (Math.abs(v)>=10? v.toFixed(1): v.toFixed(3));
    U.log = (...a)=>{ const el=U.$('#cl-maplog'); if(el){ el.textContent += a.join(' ')+"\n"; el.scrollTop=el.scrollHeight; }};
    NS.Utils = U;
  })();

  // ---------- Audio / Synth ----------
  (function(){
    const {dbToGain, clamp} = NS.Utils; 
    const A = { AC:null, master:null, analyser:null, fx:{}, L:null, R:null };

    function makePeriodicWave(morph){
      const N=64; const re=new Float32Array(N), im=new Float32Array(N);
      im[1] = (1-morph);
      for(let k=1;k<N;k++){ im[k] += morph * ((k%2?1:-1)*(1/k)); }
      return A.AC.createPeriodicWave(re,im,{disableNormalization:false});
    }
    function waveshaper(amount){
      const n=2048,s=new Float32Array(n); const a=Math.max(0.0001,amount);
      for(let i=0;i<n;i++){ const x=(i/(n-1))*2-1; const fold=Math.sin(3*x); const sat=Math.tanh(2.5*x); s[i]=(1-a)*sat + a*fold; }
      const sh=A.AC.createWaveShaper(); sh.curve=s; sh.oversample='4x'; return sh;
    }
    function makeCluster(prefix){
      const get = k=> +document.querySelector(`[data-param="${prefix+k}"]`).value;
      const baseHz=get('freq'), count=get('count')|0, spread=get('spread'), morph=get('morph'), fmCents=get('fmIndex');
      const out=A.AC.createGain(); out.gain.value=1.0;
      const mod=A.AC.createOscillator(); mod.type='sine'; mod.frequency.value=baseHz; const modGain=A.AC.createGain(); modGain.gain.value=fmCents; mod.connect(modGain);
      const pw=makePeriodicWave(morph);
      const osc=[];
      for(let i=0;i<count;i++){
        const o=A.AC.createOscillator(); o.setPeriodicWave(pw); o.frequency.value=baseHz;
        const frac=(i-(count-1)/2)/Math.max(1,(count-1)); const det=frac*spread;
        const sum=A.AC.createGain(); sum.gain.value=1.0; const dc=A.AC.createConstantSource(); dc.offset.value=det; dc.start(); dc.connect(sum); modGain.connect(sum); sum.connect(o.detune);
        const sh=waveshaper(get('fold')); const biq=A.AC.createBiquadFilter(); biq.type='lowpass'; biq.frequency.value=get('cut'); biq.Q.value=get('q'); const pan=A.AC.createStereoPanner(); pan.pan.value=get('pan');
        o.connect(sh).connect(biq).connect(pan).connect(out); o.start(); osc.push({o,sh,biq,pan,sum,dc});
      }
      mod.start();
      return {group:out,osc,mod,modGain};
    }

    function buildFX(){
      const fx={}; fx.pre=A.AC.createGain(); fx.pre.gain.value=1;
      fx.delayL=A.AC.createDelay(1.5); fx.delayR=A.AC.createDelay(1.5);
      function allpass(){ const ap=A.AC.createBiquadFilter(); ap.type='allpass'; ap.frequency.value=1000+3000*Math.random(); ap.Q.value=1.2; return ap; }
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
      fx.wet.connect(master); fx.dry.connect(master); master.connect(A.AC.destination);
      A.analyser=A.AC.createAnalyser(); A.analyser.fftSize=2048; master.connect(A.analyser);
      fx.modL.type='sine'; fx.modR.type='sine'; fx.modL.frequency.value=+document.querySelector('[data-param="modRate"]').value; fx.modR.frequency.value=fx.modL.frequency.value*1.01;
      fx.modGainL.gain.value=(+document.querySelector('[data-param="modDepth"]').value)/1000; fx.modGainR.gain.value=fx.modGainL.gain.value;
      fx.modL.connect(fx.modGainL).connect(fx.delayL.delayTime); fx.modR.connect(fx.modGainR).connect(fx.delayR.delayTime); fx.modL.start(); fx.modR.start();
      fx.shiftOscL.frequency.value=+document.querySelector('[data-param="shiftHz"]').value; fx.shiftOscR.frequency.value=fx.shiftOscL.frequency.value*1.003; fx.shiftGainL.gain.value=+document.querySelector('[data-param="shiftMix"]').value; fx.shiftGainR.gain.value=fx.shiftGainL.gain.value; fx.shiftOscL.start(); fx.shiftOscR.start();
      // live params
      const bind=(name,fn)=> document.querySelector(`[data-param="${name}"]`).addEventListener('input',fn);
      bind('fxTime',()=>{ fx.delayL.delayTime.value=+document.querySelector('[data-param="fxTime"]').value; fx.delayR.delayTime.value=+document.querySelector('[data-param="fxTime"]').value; });
      bind('feedback',()=>{ const g=clamp(+document.querySelector('[data-param="feedback"]').value,0,0.97); fx.fbL.gain.value=g; fx.fbR.gain.value=g; });
      bind('diffuse',()=>{ const d=+document.querySelector('[data-param="diffuse"]').value; [fx.apL1,fx.apL2,fx.apR1,fx.apR2].forEach((ap,i)=> ap.Q.value=0.5+(i+1)*0.5*d); });
      bind('modRate',()=>{ fx.modL.frequency.value=+document.querySelector('[data-param="modRate"]').value; fx.modR.frequency.value=fx.modL.frequency.value*1.01; });
      bind('modDepth',()=>{ fx.modGainL.gain.value=(+document.querySelector('[data-param="modDepth"]').value)/1000; fx.modGainR.gain.value=fx.modGainL.gain.value; });
      bind('shiftHz',()=>{ fx.shiftOscL.frequency.value=+document.querySelector('[data-param="shiftHz"]').value; fx.shiftOscR.frequency.value=fx.shiftOscL.frequency.value*1.003; });
      bind('shiftMix',()=>{ fx.shiftGainL.gain.value=+document.querySelector('[data-param="shiftMix"]').value; fx.shiftGainR.gain.value=fx.shiftGainL.gain.value; });
      bind('mix',()=>{ const m=+document.querySelector('[data-param="mix"]').value; fx.wet.gain.value=m; fx.dry.gain.value=1-m; });
      bind('outGain',()=>{ master.gain.setTargetAtTime(dbToGain(+document.querySelector('[data-param="outGain"]').value), A.AC.currentTime, 0.01); });
      A.fx=fx;
    }

    function rebuild(which){
      const p = which==='L'?'L_':'R_';
      if (A[which]){ try{ A[which].mod.stop(); }catch{} A[which].osc.forEach(x=>{ try{x.o.stop();}catch{} }); }
      const made=makeCluster(p); A[which]=made; const lvl=A.AC.createGain(); lvl.gain.value=dbToGain(+document.querySelector(`[data-param="${p}level"]`).value); made.group.connect(lvl).connect(A.fx.pre); A[which].lvl=lvl;
    }

    function updateContinuous(which){
      const p = which==='L'?'L_':'R_'; const S=A[which]; if(!S) return;
      const get = k=> +document.querySelector(`[data-param="${p+k}"]`).value;
      const freq=get('freq'), morph=get('morph'), fold=get('fold'), cut=get('cut'), q=get('q'), pan=get('pan'), lvl=dbToGain(get('level')), fmix=get('fmIndex');
      if(S.mod){ S.mod.frequency.setTargetAtTime(freq,A.AC.currentTime,0.01); S.modGain.gain.setTargetAtTime(fmix,A.AC.currentTime,0.02); }
      const pw=(function(){ const N=64,re=new Float32Array(N),im=new Float32Array(N); im[1]=(1-morph); for(let k=1;k<N;k++){ im[k]+=morph*((k%2?1:-1)*(1/k)); } return A.AC.createPeriodicWave(re,im,{disableNormalization:false}); })();
      S.osc.forEach(x=>{ x.o.setPeriodicWave(pw); x.biq.frequency.setTargetAtTime(cut,A.AC.currentTime,0.01); x.biq.Q.setTargetAtTime(q,A.AC.currentTime,0.01); x.pan.pan.setTargetAtTime(pan,A.AC.currentTime,0.01); const sh=waveshaper(fold); x.o.disconnect(); x.o.connect(sh).connect(x.biq).connect(x.pan); });
      S.lvl.gain.setTargetAtTime(lvl, A.AC.currentTime, 0.02);
    }

    function scope(){
      const cvs=document.getElementById('cl-scope'); const c=cvs.getContext('2d'); const W=cvs.width,H=cvs.height; const buf=new Float32Array(A.analyser.fftSize); const meter=document.getElementById('cl-mbar');
      function draw(){ requestAnimationFrame(draw); A.analyser.getFloatTimeDomainData(buf); c.clearRect(0,0,W,H); c.strokeStyle='#7aa2f7'; c.lineWidth=1.5; c.beginPath(); let peak=0; for(let i=0;i<W;i++){ const idx=(i*buf.length/W)|0; const v=buf[idx]; peak=Math.max(peak,Math.abs(v)); const y=(0.5 - v*0.45)*H; i?c.lineTo(i,y):c.moveTo(i,y);} c.stroke(); meter.style.width=(Math.min(1,peak)*100)+'%'; }
      draw();
    }

    A.start = async function start(){ if (A.AC) return; A.AC = new (window.AudioContext||window.webkitAudioContext)({sampleRate:48000}); buildFX(); rebuild('L'); rebuild('R');
      const bindList=(which)=>{ ['freq','morph','fold','cut','q','pan','level','fmIndex'].forEach(k=>{ document.querySelector(`[data-param="${which+'_'+k}"]`).addEventListener('input',()=>updateContinuous(which)); }); ['count','spread'].forEach(k=>{ document.querySelector(`[data-param="${which+'_'+k}"]`).addEventListener('change',()=>rebuild(which)); }); };
      bindList('L'); bindList('R'); scope(); };
    NS.Audio = A;
  })();

  // ---------- UI (value mirrors, basic events) ----------
  (function(){
    const { $, $all, fmt } = NS.Utils; const UI={};
    UI.init = function(){
      $all('[data-param]').forEach(inp=>{
        const name=inp.getAttribute('data-param'); const tag=$(`[data-val="${name}"]`);
        const render=()=>{ let v=inp.value; if(inp.type==='range'){ const step=+inp.step||1; v=(Math.abs(step)>=1? (+v).toFixed(1): (+v).toFixed(3)); } if(tag) tag.textContent=v; };
        inp.addEventListener('input',render); render();
      });
      $('#cl-start').addEventListener('click', async ()=>{ await NS.Audio.start(); $('#cl-start').disabled=true; $('#cl-start').textContent='Running'; });
    };
    NS.UI = UI;
  })();

  // ---------- Gamepad + Mapper ----------
  (function(){
    const { $, $all, clamp, log } = NS.Utils; const GP={};
    const storeKey='cluster.gpmaps.v1';
    const state={ maps: JSON.parse(localStorage.getItem(storeKey)||'{}'), mode:'off', dead:0.1, learningTarget:null };

    function save(){ localStorage.setItem(storeKey, JSON.stringify(state.maps)); }

    function listGamepads(){ return (navigator.getGamepads? Array.from(navigator.getGamepads()||[]): []).filter(Boolean); }

    function setParam(name, value){ const el = document.querySelector(`[data-param="${name}"]`); if(!el) return; // assume range
      const min=+el.min, max=+el.max; const v = clamp(value,0,1)*(max-min)+min; el.value=v; el.dispatchEvent(new Event('input', {bubbles:true})); }

    function poll(){ const pads=listGamepads(); if(!pads.length){ requestAnimationFrame(poll); return; }
      pads.forEach((gp, gi)=>{
        // axes
        gp.axes.forEach((ax, ai)=>{
          const key=`g${gi}.axis${ai}`; const binds=state.maps[key]; if(!binds) return; const val = Math.abs(ax)<state.dead? 0 : (ax*0.5+0.5); // -1..1 → 0..1
          binds.forEach(map=> setParam(map.param, val));
        });
        // buttons
        gp.buttons.forEach((bt, bi)=>{
          const key=`g${gi}.btn${bi}`; const binds=state.maps[key]; if(!binds) return; const val = bt.value; binds.forEach(map=> setParam(map.param, val));
        });
      });
      requestAnimationFrame(poll);
    }

    function enterLearn(targetParam){ state.mode='learn'; state.learningTarget=targetParam; $('#cl-mapmode').value='learn'; log('Learning for', targetParam, '… move an axis or press a button'); }

    function onGamepadEvent(e){ if(state.mode!=='learn') return; const pads=listGamepads(); for(let gi=0; gi<pads.length; gi++){ const gp=pads[gi];
        for(let ai=0; ai<gp.axes.length; ai++){ const ax=gp.axes[ai]; if(Math.abs(ax)>state.dead){ const key=`g${gi}.axis${ai}`; state.maps[key]=state.maps[key]||[]; state.maps[key].push({param:state.learningTarget}); save(); log('Mapped', key, '→', state.learningTarget); state.mode='off'; state.learningTarget=null; $('#cl-mapmode').value='off'; return; } }
        for(let bi=0; bi<gp.buttons.length; bi++){ const bt=gp.buttons[bi]; if(bt.pressed){ const key=`g${gi}.btn${bi}`; state.maps[key]=state.maps[key]||[]; state.maps[key].push({param:state.learningTarget}); save(); log('Mapped', key, '→', state.learningTarget); state.mode='off'; state.learningTarget=null; $('#cl-mapmode').value='off'; return; } }
      } }

    function attachUI(){ const fab=$('#cl-mapfab'), dock=$('#cl-mapdock'); fab.onclick=()=>{ dock.hidden=!dock.hidden; };
      $('#cl-closemap').onclick=()=>{ dock.hidden=true; };
      $('#cl-deadzone').addEventListener('input', (e)=>{ state.dead=+e.target.value; $('[data-val="dead"]').textContent=state.dead.toFixed(2); }); $('[data-val="dead"]').textContent=state.dead.toFixed(2);
      $('#cl-mapmode').addEventListener('change',(e)=>{ state.mode=e.target.value; });
      // learn by clicking any control label or slider
      $all('[data-param]').forEach(inp=>{
        inp.addEventListener('contextmenu',(ev)=>{ ev.preventDefault(); enterLearn(inp.getAttribute('data-param')); });
      });
      window.addEventListener('gamepadconnected', (e)=>{ log('Gamepad connected:', e.gamepad.id); });
      window.addEventListener('gamepaddisconnected', (e)=>{ log('Gamepad disconnected:', e.gamepad.id); });
      // scan buttons to capture mapping while learning
      window.addEventListener('keydown', onGamepadEvent);
      window.addEventListener('mousemove', onGamepadEvent);
      requestAnimationFrame(poll);
    }

    GP.init = function(){ attachUI(); };
    NS.Gamepad = GP;
  })();

  // ---------- Boot ----------
  (function(){
    const Boot={};
    Boot.init = function(){ NS.UI.init(); NS.Gamepad.init(); };
    window.addEventListener('DOMContentLoaded', Boot.init);
    NS.Boot = Boot;
  })();

})(window);

