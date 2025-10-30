(function () {
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  // Panels
  function mountLeft() {
    const left = document.getElementById('left');
    IPAMatrix.mount(left);
  }

  function mountRight(engine) {
    const right = document.getElementById('right');
    const box = el('div','stack');
    // Controls card
    const card = el('div','card');
    card.appendChild(el('h3',null,'Phonovox Controls (baseline hum)'));
    const form = el('div','kv');

    const rows = [
      { key:'vol', label:'Volume', min:0, max:0.8, step:0.01, val:0.15, fmt:v=>(+v).toFixed(2) },
      { key:'f0',  label:'f₀ (Hz)', min:60, max:300, step:1, val:EPM.baseline().f0, fmt:v=>Math.round(v) },
      { key:'f1',  label:'F1 (Hz)', min:200,max:1000,step:5, val:EPM.baseline().f1, fmt:v=>Math.round(v) },
      { key:'f2',  label:'F2 (Hz)', min:600,max:3000,step:10,val:EPM.baseline().f2, fmt:v=>Math.round(v) },
      { key:'f3',  label:'F3 (Hz)', min:1000,max:3600,step:10,val:EPM.baseline().f3, fmt:v=>Math.round(v) }
    ];
    rows.forEach(r=>{
      const lab = el('label',null,r.label);
      const rng = el('input'); rng.type='range'; rng.min=r.min; rng.max=r.max; rng.step=r.step; rng.value=r.val;
      const out = el('output',null,r.fmt(r.val));
      rng.addEventListener('input', ()=>{
        out.textContent = r.fmt(rng.value);
        if (r.key==='vol') engine.setVolume(+rng.value);
        else {
          const base = EPM.baseline();
          base.f0 = +form.querySelector('input[type=range]').value; // not exact; we handle below
        }
      });
      rng.addEventListener('change', ()=>{
        const base = EPM.baseline();
        base.f0 = +form.querySelectorAll('input[type=range]')[1].value;
        base.f1 = +form.querySelectorAll('input[type=range]')[2].value;
        base.f2 = +form.querySelectorAll('input[type=range]')[3].value;
        base.f3 = +form.querySelectorAll('input[type=range]')[4].value;
        engine.setBaseline(base);
      });
      form.appendChild(lab); form.appendChild(rng); form.appendChild(out);
    });
    card.appendChild(form);

    // Log view
    const logCard = el('div','card');
    logCard.appendChild(el('h3',null,'Log'));
    const sink = el('pre','log'); sink.id='log-sink';
    logCard.appendChild(sink);

    box.appendChild(card);
    box.appendChild(logCard);
    right.appendChild(box);
  }

  // Boot
  window.addEventListener('DOMContentLoaded', async () => {
    const epBase = EPM.baseline();
    const engine = new Phonovox(epBase);

    document.getElementById('sr').textContent = `${engine.sr} Hz`;

    // Audio policy buttons
    const audioBtn = document.getElementById('audio-btn');
    const muteBtn  = document.getElementById('mute-btn');
    let muted=false;

    audioBtn.addEventListener('click', async ()=>{
      await engine.resume();
      audioBtn.textContent='Audio Enabled';
      audioBtn.disabled=true;
      Log.info('Audio resumed');
    });
    muteBtn.addEventListener('click', ()=>{
      muted=!muted;
      engine.setVolume(muted?0:0.15);
      muteBtn.textContent = muted?'Unmute':'Mute';
    });

    mountLeft();
    mountRight(engine);

    Log.info('App ready');
  });
})();
