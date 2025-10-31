/* CUI Gamepad Mapper (active control picker + dropdown mapping)
 * - FAB launcher
 * - Overlay with realtime axes/buttons monitor (activity highlighting)
 * - Click/assign active control → dropdown of discovered inputs
 * - Double-exponential easing (alpha,beta) + smoothing (tau)
 * - Persist/restore mappings to localStorage
 * - Engine writes to inputs and dispatches input/change events
 */
(() => {
  "use strict";

  // -------------------- namespace / constants --------------------
  const CUI = (window.CUI = window.CUI || {});
  const NS  = (CUI.gamepads = CUI.gamepads || {});
  const LS_KEY = "CUI.gp.mapper.v2";
  const ACT_THRESH = 0.035;   // activity threshold (post-deadzone normalized [0..1])
  const DEADZ_DEF  = 0.08;
  const ALPHA_DEF  = 3.0;
  const BETA_DEF   = 3.0;
  const TAU_DEF    = 35;      // ms

  // -------------------- utils --------------------
  const clamp = (x,a,b)=>x<a?a:x>b?b:x;
  const lerp  = (a,b,t)=>a+(b-a)*t;
  const on    = (el,ev,fn)=>el.addEventListener(ev,fn,{passive:true});
  const de    = (t)=>document.createElement(t);
  const $$    = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const byId  = (id)=>document.getElementById(id);
  const uid   = ()=> (typeof crypto!=="undefined" && typeof crypto.randomUUID==="function")
                      ? crypto.randomUUID()
                      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function easeDoubleExp01(t, alpha=ALPHA_DEF, beta=BETA_DEF){
    t = clamp(t,0,1);
    const E=(u,k)=>k>0?(1-Math.exp(-k*u))/(1-Math.exp(-k)):u;
    return t<.5 ? .5*E(t*2,alpha) : .5+.5*E((t-.5)*2,beta);
  }
  function smoother(tauMs=0){
    let y=null, last=performance.now();
    return (x)=>{
      const now=performance.now(), dt=now-last; last=now;
      if(y==null){ y=x; return y; }
      const a = tauMs>0 ? 1-Math.exp(-dt/tauMs) : 1;
      y += a*(x-y); return y;
    };
  }
  function normAxis(x, dead=DEADZ_DEF, invert=false){
    const v = (invert?-1:1)*x, ax=Math.abs(v);
    if(ax<dead) return .5;
    const y=(ax-dead)/(1-dead);
    return v>=0? .5+.5*y : .5-.5*y;
  }
  function readPads(){ return Array.from(navigator.getGamepads?.()||[]).filter(Boolean); }

  // -------------------- input discovery + writer --------------------
  function discoverInputs(root=document){
    return $$("input, select, textarea", root).filter(el=>{
      if(el.disabled || el.type==="hidden") return false;
      const t=(el.getAttribute("type")||"").toLowerCase();
      if(el.matches("input[type=file]")) return false;
      const allowed = ["range","number","checkbox","text","search"];
      return allowed.includes(t) || el.tagName.toLowerCase()==="select";
    }).map(el=>{
      const label = labelFor(el);
      return { el, name: label, selector: cssSelector(el) };
    });
  }
  function labelFor(el){
    const id=el.id;
    let s="";
    if(id){ const l=document.querySelector(`label[for="${CSS.escape(id)}"]`); if(l) s=l.textContent.trim(); }
    if(!s){ const p=el.closest("label"); if(p) s=p.textContent.trim(); }
    return (s || el.name || el.id || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g," ");
  }
  function cssSelector(el){
    if(el.id) return `#${CSS.escape(el.id)}`;
    const path=[]; let n=el;
    while(n && n.nodeType===1){
      let seg=n.nodeName.toLowerCase();
      if(n.id){ seg+=`#${n.id}`; path.unshift(seg); break; }
      const sibs=Array.from(n.parentNode?.children||[]).filter(c=>c.nodeName===n.nodeName);
      if(sibs.length>1){ seg+=`:nth-of-type(${sibs.indexOf(n)+1})`; }
      path.unshift(seg); n=n.parentElement;
    }
    return path.join(">");
  }
  function writeInput(el, v){
    const tag=el.tagName.toLowerCase();
    const type=(el.getAttribute("type")||"").toLowerCase();
    if(tag==="input" && (type==="range"||type==="number")){
      const min=el.min!==""?+el.min:0, max=el.max!==""?+el.max:1;
      const val=clamp(v,min,max);
      if(el.valueAsNumber!==val){ el.value=String(val); el.dispatchEvent(new Event("input",{bubbles:true})); }
      return;
    }
    if(tag==="input" && type==="checkbox"){
      const on=!!v;
      if(el.checked!==on){ el.checked=on; el.dispatchEvent(new Event("input",{bubbles:true})); }
      return;
    }
    if(tag==="select"){
      const n=el.options.length||1;
      const idx=clamp(Math.round(clamp(+v,0,1)*(n-1)),0,n-1);
      if(el.selectedIndex!==idx){ el.selectedIndex=idx; el.dispatchEvent(new Event("change",{bubbles:true})); }
      return;
    }
    if(tag==="input" && (type==="text"||type==="search")){
      const s=String(v); if(el.value!==s){ el.value=s; el.dispatchEvent(new Event("input",{bubbles:true})); }
      return;
    }
    el.textContent=String(v);
  }

  // -------------------- persistence --------------------
  function loadState(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); }catch{ return {}; } }
  function saveState(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
  const state = Object.assign(
    { ui:{alpha:ALPHA_DEF,beta:BETA_DEF,dead:DEADZ_DEF,tau:TAU_DEF}, mappings:[] },
    loadState()
  );

  // -------------------- mapping engine --------------------
  // mapping: { id, enabled, src:{pad,type:'axis'|'button'|'hat',index,dead,invert}, dst:{selector,min,max}, curve:{alpha,beta}, smoothing:{tau} }
  const active = new Map(); // id -> {el,smooth,step}
  let raf=0;

  function resolveMapping(m){
    const el=document.querySelector(m.dst.selector);
    if(!el) return null;
    const alpha=+m.curve?.alpha ?? state.ui.alpha;
    const beta =+m.curve?.beta  ?? state.ui.beta;
    const dead =+m.src?.dead    ?? state.ui.dead;
    const inv  =!!m.src?.invert;
    const min  = (m.dst.min!=null)? +m.dst.min : (el.min!==""?+el.min:0);
    const max  = (m.dst.max!=null)? +m.dst.max : (el.max!==""?+el.max:1);
    const smooth = smoother(+m.smoothing?.tau ?? state.ui.tau);

    function readSrc(){
      const pads=readPads(); const gp=pads[m.src.pad]; if(!gp) return null;
      if(m.src.type==="axis"){ const x=gp.axes[m.src.index]??0; return normAxis(x,dead,inv); }
      if(m.src.type==="button"){ const b=gp.buttons[m.src.index]; if(!b) return 0; return clamp(b.value!=null?b.value:(b.pressed?1:0),0,1); }
      if(m.src.type==="hat"){ const L=gp.buttons[14]?.pressed?1:0, R=gp.buttons[15]?.pressed?1:0; return .5+.5*(R-L); }
      return null;
    }

    return {
      el, step(){
        const r=readSrc(); if(r==null) return;
        const t=easeDoubleExp01(clamp(r,0,1), alpha, beta);
        writeInput(el, smooth(lerp(min,max,t)));
      }
    };
  }

  function rebuildActive(){
    active.clear();
    for(const m of state.mappings){
      if(m.enabled===false) continue;
      const rt=resolveMapping(m);
      if(rt) active.set(m.id, rt);
    }
  }
  function tick(){
    for(const rt of active.values()) rt.step();
    raf = window.requestAnimationFrame(tick);
  }
  function start(){ if(!raf){ rebuildActive(); raf = window.requestAnimationFrame(tick); } }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }

  // -------------------- activity monitor (UI model) --------------------
  // Track per-frame deltas to highlight "active" controls
  const act = {
    axes: new Map(),   // key "pad:axis:i" -> {val, last, activeTS}
    btns: new Map(),   // key "pad:btn:i"  -> {val, last, activeTS}
  };
  function markActivity(map, key, v){
    const o=map.get(key) || {val:0,last:0,activeTS:0};
    const dv=Math.abs((v??0) - (o.last??0));
    o.val=v; o.activeTS = dv>ACT_THRESH ? performance.now() : o.activeTS;
    o.last=v; map.set(key,o); return o;
  }

  // -------------------- UI (FAB + overlay) --------------------
  injectStyles();
  const fab = makeFAB(); document.body.appendChild(fab);
  let root=null;

  function openUI(){
    if(root) return;
    root = de("div"); root.id="cui-gp-ovl"; root.onclick=(e)=>{ if(e.target===root) closeUI(); };
    const panel = de("div"); panel.id="cui-gp-pan";

    panel.appendChild(header());
    const body = de("div"); body.id="cui-gp-body";
    body.appendChild(statusRow());
    body.appendChild(activeControls());
    body.appendChild(addMappingBox());
    body.appendChild(mappingsBox());
    body.appendChild(inventoryBox());
    panel.appendChild(body);

    root.appendChild(panel);
    document.body.appendChild(root);
    renderUI();
  }
  function closeUI(){ if(root){ root.remove(); root=null; } }

  function header(){
    const h=de("div"); h.className="hdr";
    const l=de("div"); l.className="ttl"; l.textContent="Gamepad Mapper";
    const r=de("div");
    r.append(
      btn("Rescan", renderUI),
      btn("Start", start),
      btn("Stop", stop),
      btn("Close", closeUI)
    );
    h.append(l,r); return h;
  }
  function statusRow(){
    const row=de("div"); row.className="row";
    const pads=de("div"); pads.id="cui-gp-pads";
    const cfg=de("div"); cfg.className="cfg";

    const alpha=inum("α", "cui-alpha", state.ui.alpha, v=>{ state.ui.alpha=+v; saveState(state); });
    const beta =inum("β", "cui-beta",  state.ui.beta,  v=>{ state.ui.beta=+v; saveState(state); });
    const dead =inum("dead", "cui-dead", state.ui.dead, v=>{ state.ui.dead=+v; saveState(state); });
    const tau  =inum("τ(ms)", "cui-tau", state.ui.tau,  v=>{ state.ui.tau=+v; saveState(state); });

    cfg.append(alpha,beta,dead,tau);
    row.append(pads,cfg); return row;
  }

  function activeControls(){
    const card=cardBox("Active Controls (live)");
    const grid=de("div"); grid.id="cui-active"; grid.className="grid3";
    card.appendChild(grid); return card;
  }

  function addMappingBox(){
    const card=cardBox("Add Mapping");
    const grid=de("div"); grid.className="grid";
    const srcPad = inum("Pad","m-src-pad",0);
    const srcType= sel("Type","m-src-type",[["axis","axis"],["button","button"],["hat","hat"]]);
    const srcIdx = inum("Index","m-src-idx",0);
    const srcInv = checkbox("Invert","m-src-inv",false);
    const srcDz  = inum("Deadzone","m-src-dead", state.ui.dead);

    const inputs = discoverInputs();
    const dstSel = sel("Target","m-dst-sel", inputs.map(d=>[d.selector, `${d.name} (${d.selector})`]));
    const dstMin = inum("Min","m-dst-min","");
    const dstMax = inum("Max","m-dst-max","");

    const curveA= inum("α","m-cur-a", state.ui.alpha);
    const curveB= inum("β","m-cur-b", state.ui.beta);
    const tauMs = inum("τ(ms)","m-tau", state.ui.tau);

    const b=btn("Add", ()=>{
      const selector = valueOf(dstSel);
      if(!document.querySelector(selector)) return;
      const m={
        id: uid(),
        enabled:true,
        src:{ pad:+valueOf(srcPad), type:valueOf(srcType), index:+valueOf(srcIdx), dead:+valueOf(srcDz), invert:checked(srcInv) },
        dst:{ selector, min: numOr(dstMin), max: numOr(dstMax) },
        curve:{ alpha:+valueOf(curveA), beta:+valueOf(curveB) },
        smoothing:{ tau:+valueOf(tauMs) }
      };
      state.mappings.push(m); saveState(state); rebuildActive(); renderUI();
    });

    grid.append(srcPad,srcType,srcIdx,srcInv,srcDz,dstSel,dstMin,dstMax,curveA,curveB,tauMs,b);
    card.appendChild(grid); return card;
  }

  function mappingsBox(){
    const card=cardBox("Mappings");
    const list=de("div"); list.id="cui-map-list";
    card.appendChild(list); return card;
  }

  function inventoryBox(){
    const card=cardBox("Inputs on Page");
    const list=de("div"); list.id="cui-inputs";
    card.appendChild(list); return card;
  }

  function renderUI(){
    // pads
    const pads=readPads();
    const p=byId("cui-gp-pads");
    if(p) p.textContent = `Pads ${pads.length} ${pads.map(g=>`[${g.index}] ${g.id}`).join(" | ")}`;

    // active controls grid
    const grid=byId("cui-active");
    if(grid){
      grid.innerHTML="";
      const now=performance.now();
      for(const g of pads){
        // axes
        g.axes.forEach((x,i)=>{
          const t=normAxis(x,state.ui.dead,false);
          const key=`${g.index}:axis:${i}`;
          const rec=markActivity(act.axes,key,t);
          const cell=activeCell(`Pad ${g.index} axis${i}`, t, (now-rec.activeTS)<600);
          // per-cell assign dropdown
          cell.appendChild(assignControls({pad:g.index,type:"axis",index:i}));
          grid.appendChild(cell);
        });
        // buttons
        g.buttons.forEach((b,i)=>{
          const v = b.value!=null ? b.value : (b.pressed?1:0);
          const key=`${g.index}:btn:${i}`;
          const rec=markActivity(act.btns,key,v);
          const cell=activeCell(`Pad ${g.index} b${i}`, v, (now-rec.activeTS)<600);
          cell.appendChild(assignControls({pad:g.index,type:"button",index:i}));
          grid.appendChild(cell);
        });
      }
      // dpad "hat" convenience
      for(const g of pads){
        const L=g.buttons[14]?.pressed?1:0, R=g.buttons[15]?.pressed?1:0;
        const hat = .5+.5*(R-L);
        const key=`${g.index}:hat:LR`;
        const rec=markActivity(act.axes,key,hat);
        const cell=activeCell(`Pad ${g.index} hatX`, hat, (performance.now()-rec.activeTS)<600);
        cell.appendChild(assignControls({pad:g.index,type:"hat",index:0}));
        grid.appendChild(cell);
      }
    }

    // inputs inventory
    const inv=byId("cui-inputs");
    if(inv){
      inv.innerHTML="";
      for(const d of discoverInputs()){
        const row=de("div"); row.className="row";
        const label=de("code"); label.textContent=`${d.name} (${d.selector})`;
        const pick=btn("Pick", ()=>{
          const sel=byId("m-dst-sel").querySelector("select");
          sel.value=d.selector; sel.dispatchEvent(new Event("change"));
          const min=d.el.min!==""?d.el.min:""; const max=d.el.max!==""?d.el.max:"";
          byId("m-dst-min").querySelector("input").value=min;
          byId("m-dst-max").querySelector("input").value=max;
        });
        row.append(label,pick); inv.append(row);
      }
    }

    // mappings list
    const ml=byId("cui-map-list");
    if(ml){
      ml.innerHTML="";
      if(!state.mappings.length){ ml.textContent="None"; }
      for(const m of state.mappings){
        const row=de("div"); row.className="row wrap";
        const info=de("div"); info.className="grow";
        info.textContent = `[${m.src.type}:${m.src.index}@pad${m.src.pad}] → ${m.dst.selector}  min:${m.dst.min??"auto"} max:${m.dst.max??"auto"} α:${m.curve.alpha} β:${m.curve.beta} τ:${m.smoothing.tau} dz:${m.src.dead}${m.src.invert?" inv":""}`;
        const tog=btn(m.enabled===false?"Enable":"Disable", ()=>{
          m.enabled = m.enabled===false; saveState(state); rebuildActive(); renderUI();
        });
        const test=btn("Write now", ()=>{
          const rt=resolveMapping(m); if(rt) rt.step();
        });
        const del=btn("Delete", ()=>{
          const i=state.mappings.findIndex(x=>x.id===m.id);
          if(i>=0) state.mappings.splice(i,1);
          saveState(state); rebuildActive(); renderUI();
        });
        row.append(info,tog,test,del); ml.append(row);
      }
    }
  }

  function assignControls(src){
    // per-active-control mini form: dropdown of inputs + Add
    const box=de("div"); box.className="mini-map";
    const inputs=discoverInputs();
    const selEl = selRaw(inputs.map(d=>[d.selector, d.name]));
    const a=inumRaw(state.ui.alpha); const b=inumRaw(state.ui.beta); const t=inumRaw(state.ui.tau);
    const dz=inumRaw(state.ui.dead);
    const add=btn("Assign", ()=>{
      const selector=selEl.value;
      if(!document.querySelector(selector)) return;
      const m={
        id: uid(), enabled:true,
        src:{ pad:src.pad, type:src.type, index:src.index, dead:+dz.value, invert:false },
        dst:{ selector, min:undefined, max:undefined },
        curve:{ alpha:+a.value, beta:+b.value },
        smoothing:{ tau:+t.value }
      };
      state.mappings.push(m); saveState(state); rebuildActive(); renderUI();
    });
    box.append(selEl, add);
    return box;
  }

  // -------------------- DOM helpers --------------------
  function cardBox(title){ const c=de("div"); c.className="card"; const h=de("div"); h.className="st"; h.textContent=title; c.appendChild(h); return c; }
  function btn(txt,fn){ const b=de("button"); b.textContent=txt; b.onclick=fn; return b; }
  function wrap(label,id,el){ const box=de("div"); box.className="f"; const l=de("label"); l.textContent=label; l.htmlFor=id; el.id=id; box.append(l,el); return box; }
  function inum(label,id,val,cb){ const i=de("input"); i.type="number"; i.step="any"; if(val!=="") i.value=val; if(cb) on(i,"change",()=>cb(i.value)); const w=wrap(label,id,i); w.querySelector("label").className="muted"; return w; }
  function inumRaw(val){ const i=de("input"); i.type="number"; i.step="any"; if(val!=="") i.value=val; i.className="mini"; return i; }
  function sel(label,id,opts){ const s=selRaw(opts); const w=wrap(label,id,s); w.querySelector("label").className="muted"; return w; }
  function selRaw(opts){ const s=de("select"); for(const [v,t] of opts){ const o=de("option"); o.value=v; o.textContent=t; s.appendChild(o); } return s; }
  function checkbox(label,id,checked=false){ const i=de("input"); i.type="checkbox"; i.checked=checked; const w=wrap(label,id,i); w.querySelector("label").className="muted"; return w; }
  function valueOf(box){ return box.querySelector("input,select").value; }
  function checked(box){ return box.querySelector("input[type=checkbox]").checked; }

  function activeCell(name, val01, isActive){
    const cell=de("div"); cell.className="cell"+(isActive?" on":"");
    const head=de("div"); head.className="cell-h";
    const nm=de("div"); nm.className="nm"; nm.textContent=name;
    const vv=de("div"); vv.className="vv"; vv.textContent=val01.toFixed(3);
    head.append(nm,vv);
    const bar=de("div"); bar.className="bar";
    const fill=de("div"); fill.className="fill";
    fill.style.left = val01>=0.5 ? "50%" : `${val01*100}%`;
    fill.style.width = `${Math.abs(val01-0.5)*100}%`;
    bar.append(fill);
    cell.append(head,bar);
    return cell;
  }

  function makeFAB(){
    const b=de("button"); b.id="cui-gp-fab"; b.textContent="GP";
    b.title="Gamepad Mapper"; b.onclick=openUI; return b;
  }

  function injectStyles(){
    if(byId("cui-gp-css")) return;
    const css = `
#cui-gp-fab{position:fixed;top:8px;right:8px;z-index:2147483647;border-radius:999px;border:1px solid #2f2f2f;background:#111;color:#e6e6e6;width:44px;height:44px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)}
#cui-gp-fab:hover{background:#1a1a1a}
#cui-gp-ovl{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:2147483646;display:flex;align-items:flex-start;justify-content:center;padding:24px}
#cui-gp-pan{background:#121212;color:#e6e6e6;border:1px solid #2a2a2a;border-radius:12px;min-width:min(980px,96vw);max-width:96vw;max-height:90vh;overflow:auto;padding:12px 12px 16px;box-shadow:0 8px 30px rgba(0,0,0,.6);font:12px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
#cui-gp-pan .hdr{display:flex;justify-content:space-between;align-items:center;margin:4px 0 8px}
#cui-gp-pan .ttl{font-weight:600}
#cui-gp-pan button{background:#1f1f1f;border:1px solid #323232;color:#e6e6e6;border-radius:6px;padding:6px 10px;cursor:pointer;margin:2px}
#cui-gp-pan button:hover{background:#262626}
#cui-gp-pan input, #cui-gp-pan select{background:#0c0c0c;color:#e6e6e6;border:1px solid #2a2a2a;border-radius:6px;padding:6px}
#cui-gp-pan .row{display:flex;gap:10px;align-items:center;justify-content:space-between;margin:6px 0;flex-wrap:wrap}
#cui-gp-pan .cfg{display:flex;gap:8px;align-items:center}
#cui-gp-pan .card{border:1px solid #262626;border-radius:8px;padding:10px;margin:10px 0;background:#0e0e0e}
#cui-gp-pan .st{font-weight:600;margin-bottom:6px}
#cui-gp-pan .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;align-items:end}
#cui-gp-pan .grid3{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
#cui-gp-pan .f{display:grid;grid-template-rows:auto auto;gap:4px}
#cui-gp-pan label.muted{color:#9aa0a6}
#cui-gp-pan .wrap{flex-wrap:wrap}
#cui-gp-pan .grow{flex:1 1 auto;min-width:300px}
.cell{border:1px solid #262626;border-radius:8px;padding:8px;background:#0b0b0b}
.cell.on{box-shadow:0 0 0 1px #3a86ff inset}
.cell-h{display:flex;justify-content:space-between;margin-bottom:6px}
.cell .bar{position:relative;height:10px;background:#141414;border:1px solid #2a2a2a;border-radius:999px;overflow:hidden}
.cell .bar .fill{position:absolute;top:0;bottom:0;background:#3a86ff}
.mini-map{display:flex;gap:6px;align-items:center;margin-top:6px}
.mini{width:70px}
    `.trim();
    const s=de("style"); s.id="cui-gp-css"; s.textContent=css; document.head.appendChild(s);
  }

  // -------------------- events / boot --------------------
  window.addEventListener("gamepadconnected", renderUI, {passive:true});
  window.addEventListener("gamepaddisconnected", renderUI, {passive:true});
  rebuildActive(); start();

  // public hooks
  NS.open = openUI; NS.close = closeUI; NS.start = start; NS.stop = stop; NS.render = renderUI;
})();
