// js/script.js

const pubsub = {
  events: {},
  subscribe(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  },
  publish(event, data) {
    if (this.events[event]) this.events[event].forEach(callback => callback(data));
  },
};

/* MODULE 1: DataModel */
const DataModel = (function(){
  let c = {
    boxCount: 5,
    arrowCount: 5,
    arrowZVal: 0,
    boxSpread: 200,
    arrowLengthFactor: 1.0,
    boxScales: [1,0.95,0.9,0.85,0.8,0.75,0.7,0.65],
    arrowZMinWidth: 1,
    arrowZMaxWidth: 10,
    storageKey: 'diagramConfigV4',
    boxes: [],
    arrows: []
  };
  function save(){ localStorage.setItem(c.storageKey, JSON.stringify(c)); }
  function load(){
    let stored = localStorage.getItem(c.storageKey);
    if(stored) c = Object.assign(c, JSON.parse(stored));
  }
  function getConfig(){ return c; }
  function setConfig(newC){ c = Object.assign(c, newC); }
  return { getConfig, setConfig, save, load };
})();

/* MODULE 2: BoxManager */
const BoxManager = (function(){
  let cur = null, offX=0, offY=0;
  function createBoxes(rnd){
    const cfg = DataModel.getConfig();
    if(rnd) cfg.boxes = [];
    if(!cfg.boxes.length){
      for(let i=0; i<cfg.boxCount; i++){
        const x = (window.innerWidth/2)+(Math.random()-0.5)*cfg.boxSpread;
        const y = (window.innerHeight/2)+(Math.random()-0.5)*cfg.boxSpread;
        cfg.boxes.push({x,y});
      }
    }
    const s = cfg.boxScales[cfg.arrowZVal]||1.0;
    let out=[];
    for(let i=0; i<cfg.boxes.length; i++){
      const d = cfg.boxes[i];
      const el = document.createElement('div');
      el.className='box';
      el.style.left = d.x+'px';
      el.style.top = d.y+'px';
      el.style.transform='scale('+s+')';
      el.style.background=(i%2===0)?'var(--color3)':'var(--color4)';
      el.addEventListener('mousedown', dragStart);
      out.push(el);
    }
    return out;
  }
  function dragStart(e){
    cur=e.target; offX=e.offsetX; offY=e.offsetY;
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragStop);
  }
  function dragMove(e){
    if(!cur)return;
    cur.style.left=(e.clientX-offX)+'px';
    cur.style.top=(e.clientY-offY)+'px';
  }
  function dragStop(){
    if(!cur)return;
    const cfg = DataModel.getConfig();
    let idx=[...cur.parentNode.children].indexOf(cur)-1; 
    if(idx>=0 && idx<cfg.boxes.length){
      cfg.boxes[idx].x=parseInt(cur.style.left);
      cfg.boxes[idx].y=parseInt(cur.style.top);
      DataModel.save();
      pubsub.publish("config:changed", cfg);
      pubsub.publish("state:updated", cfg);
    }
    cur=null;
    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('mouseup', dragStop);
  }
  return { createBoxes };
})();

/* MODULE 3: ArrowManager */
const ArrowManager=(function(){
  function generateArrows(rnd){
    const cfg=DataModel.getConfig();
    if(rnd) cfg.arrows=[];
    if(!cfg.arrows.length){
      for(let i=0;i<cfg.arrowCount;i++){
        const x=(window.innerWidth/2)+(Math.random()-0.5)*100;
        const y=(window.innerHeight/2)+(Math.random()-0.5)*100;
        const angle=Math.random()*360;
        cfg.arrows.push({x,y,angle});
      }
    }
    let arr=[];
    for(let i=0;i<cfg.arrows.length;i++){
      const ad=cfg.arrows[i];
      const el=buildArrow();
      applyParams(el,ad);
      arr.push(el);
    }
    return arr;
  }
  function buildArrow(){
    let c=document.createElement('div');
    c.className='arrowContainer';
    let b=document.createElement('div');
    b.className='arrowBody';
    let h=document.createElement('div');
    h.className='arrowHead';
    b.appendChild(h);
    c.appendChild(b);
    return c;
  }
  function applyParams(div, data){
    const cfg=DataModel.getConfig();
    div.style.left=data.x+'px';
    div.style.top=data.y+'px';
    let lenBase=100*cfg.arrowLengthFactor;
    let lenAdj=lenBase-cfg.arrowZVal*5;
    let wMax=cfg.arrowZMaxWidth;
    let wMin=cfg.arrowZMinWidth;
    let cW=wMax-((wMax-wMin)*(cfg.arrowZVal/7));
    let bd=div.querySelector('.arrowBody');
    bd.style.width=lenAdj+'px';
    bd.style.height=cW+'px';
    bd.style.top=-(cW/2)+'px';
    bd.style.transform=`rotate(${data.angle}deg) skewX(${-5*cfg.arrowZVal}deg)`;
  }
  return { generateArrows };
})();

/* MODULE 4: FieldEngine */
const FieldEngine=(function(){
  function applyField(boxes,arrows){/* placeholder */}
  return { applyField };
})();

/* MODULE 5: ChatPill */
const ChatPill=(function(){
  function initPill(pubsub){
    fetch("./html/chat-area.html")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load chat-area.html");
        return response.text();
      })
      .then(html => {
        document.getElementById("chatPill").innerHTML = html;
        ChatArea.init(pubsub);
      })
      .catch(e => console.error(e));
  }
  return { initPill };
})();

/* MODULE 6: ChatArea */
const ChatArea=(function(){
  let pubsub;
  let chatInput, chatSendBtn, chatOutput, chatStatus;

  function init(p){
    pubsub = p;

    chatInput = document.getElementById("chatInput");
    chatSendBtn = document.getElementById("chatSendBtn");
    chatOutput = document.getElementById("chatOutput");
    chatStatus = document.getElementById("chatStatus");

    function sendMessage() {
      const message = chatInput.value.trim();
      if (message) {
        pubsub.publish("chat:message", message);
        appendOutput(`You: ${message}`);
        chatInput.value = "";
      }
    }

    function appendOutput(message) {
      const div = document.createElement("div");
      div.textContent = message;
      chatOutput.appendChild(div);
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    pubsub.subscribe("diagram:updated", (data) => {
      appendOutput(`Diagram updated: ${JSON.stringify(data)}`);
    });

    pubsub.subscribe("config:changed", (data) => {
      appendOutput(`Config changed: ${JSON.stringify(data)}`);
    });

    chatSendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    pubsub.publish("chat:initialized", { status: "ready" });
  }

  return { init };
})();

/* MODULE 7: JSONViewer */
const JSONViewer = (function(){
  let viewer;
  let pubsub;

  function init(p){
    pubsub = p;
    viewer = document.getElementById("jsonViewer");

    pubsub.subscribe("state:updated", (data) => {
      viewer.textContent = JSON.stringify(data, null, 2);
    });

    viewer.addEventListener("dragover", (e) => e.preventDefault());
    viewer.addEventListener("drop", (e) => {
      e.preventDefault();
      const text = e.dataTransfer.getData("text");
      try {
        const json = JSON.parse(text);
        pubsub.publish("state:updated", json);
      } catch {
        console.error("Invalid JSON dropped");
      }
    });
  }

  return { init };
})();

/* MODULE 8: UIInteraction */
const UIInteraction=(function(){
  let diag, toggle, configPanel, jsonViewer;
  let bCount, aCount, aZ, bSpread, aLen;
  let appBtn, showModel, modModal, modJson, modClose;
  let pubsubInstance;

  function init(pubsub){
    pubsubInstance = pubsub;
    DataModel.load();
    cacheElements();
    applyConfigToUI();
    generateScene(false);
    setupEvents();
    ChatPill.initPill(pubsub);
    JSONViewer.init(pubsub);
  }

  function cacheElements(){
    diag = document.getElementById('diagram');
    toggle = document.getElementById('configToggle');
    configPanel = document.getElementById('configPanel');
    bCount = document.getElementById('boxCount');
    aCount = document.getElementById('arrowCount');
    aZ = document.getElementById('arrowZSlider');
    bSpread = document.getElementById('boxSpread');
    aLen = document.getElementById('arrowLengthFactor');
    appBtn = document.getElementById('applyBtn');
    showModel = document.getElementById('showModelBtn');
    modModal = document.getElementById('modelModal');
    modJson = document.getElementById('modelJsonOutput');
    modClose = document.getElementById('closeModelBtn');
    jsonViewer = document.getElementById('jsonViewer');
  }

  function setupEvents(){
    toggle.addEventListener('click',()=>{
      configPanel.style.display=(configPanel.style.display==='none')?'block':'none';
    });
    [bCount, aCount, aZ, bSpread, aLen].forEach(e=>{
      e.addEventListener('input',()=>{
        updateConfig();
        DataModel.save();
        generateScene(false);
        pubsubInstance.publish("config:changed", DataModel.getConfig());
        pubsubInstance.publish("state:updated", DataModel.getConfig());
      });
    });
    appBtn.addEventListener('click',()=>{
      updateConfig();
      DataModel.save();
      generateScene(true);
      pubsubInstance.publish("config:changed", DataModel.getConfig());
      pubsubInstance.publish("state:updated", DataModel.getConfig());
    });
    showModel.addEventListener('click', showJSON);
    modClose.addEventListener('click',()=>{modModal.style.display='none';});
  }

  function generateScene(rnd){
    while(diag.firstChild) diag.removeChild(diag.firstChild);
    diag.appendChild(toggle);
    let boxes = BoxManager.createBoxes(rnd);
    boxes.forEach(b=>diag.appendChild(b));
    let arrows = ArrowManager.generateArrows(rnd);
    arrows.forEach(a=>diag.appendChild(a));
    FieldEngine.applyField(boxes, arrows);
    pubsubInstance.publish("diagram:updated", { boxes, arrows });
  }

  function applyConfigToUI(){
    const cfg = DataModel.getConfig();
    bCount.value = cfg.boxCount;
    aCount.value = cfg.arrowCount;
    aZ.value = cfg.arrowZVal;
    bSpread.value = cfg.boxSpread;
    aLen.value = cfg.arrowLengthFactor;
  }

  function updateConfig(){
    const cfg = DataModel.getConfig();
    cfg.boxCount = parseInt(bCount.value) || 5;
    cfg.arrowCount = parseInt(aCount.value) || 5;
    cfg.arrowZVal = parseInt(aZ.value) || 0;
    cfg.boxSpread = parseInt(bSpread.value) || 200;
    cfg.arrowLengthFactor = parseFloat(aLen.value) || 1;
    DataModel.setConfig(cfg);
  }

  function showJSON(){
    const cfg = DataModel.getConfig();
    // JSON Viewer is always visible
  }

  return {init};
})();
