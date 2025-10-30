(function () {
  const bus = new (window.EventTarget || function(){ this._={}; this.addEventListener=(t,f)=>((this._[t]=this._[t]||[]).push(f));
    this.removeEventListener=(t,f)=>{this._[t]=(this._[t]||[]).filter(x=>x!==f);};
    this.dispatchEvent=(e)=>{(this._[e.type]||[]).forEach(fn=>fn(e));}; })();

  window.EventBus = {
    on:  (type, fn) => bus.addEventListener(type, fn),
    off: (type, fn) => bus.removeEventListener(type, fn),
    emit:(type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }))
  };
})();

