/**
 * CLUSTER • Core
 * Event Bus, Utilities, Z-Order Management
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};

  /* ---------- Event Bus ---------- */
  (function(){
    const listeners = new Map();

    function on(topic, fn){
      (listeners.get(topic) || listeners.set(topic, new Set()).get(topic)).add(fn);
      return () => off(topic, fn);
    }

    function off(topic, fn){
      const s = listeners.get(topic);
      if(s){
        s.delete(fn);
        if(!s.size) listeners.delete(topic);
      }
    }

    function emit(topic, data){
      const s = listeners.get(topic);
      if(s){
        s.forEach(fn => {
          try{
            fn(data);
          } catch(e) {
            console.error(`Bus error on ${topic}:`, e);
          }
        });
      }
      // Hooks for other systems
      NS.Log && NS.Log.push(topic, data);
      NS.Canvas && NS.Canvas.pulse(topic);
    }

    NS.Bus = { on, off, emit };
  })();

  /* ---------- Utilities ---------- */
  (function(){
    const U = {};

    // DOM
    U.$ = (sel, root=document) => root.querySelector(sel);
    U.$all = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    // Math
    U.dbToGain = db => Math.pow(10, db/20);
    U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    U.lerp = (a, b, t) => a + (b - a) * t;

    // Time
    U.now = () => performance.now();
    U.localTime = () => new Date().toLocaleTimeString();
    U.iso = () => new Date().toISOString();
    U.beats = (ms, bpm) => (bpm / 60000) * ms;

    // Formatting
    U.fmt = v => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));

    // Copy all synth parameters to JSON
    U.copyParamsJSON = () => {
      const map = {};
      U.$all('[data-param]').forEach(el => {
        map[el.getAttribute('data-param')] = (el.type === 'range' || el.type === 'number') ? +el.value : el.value;
      });
      return JSON.stringify(map, null, 2);
    };

    // Running statistics (Welford algorithm)
    class RunningStats {
      constructor() {
        this.n = 0;
        this.mean = 0;
        this.M2 = 0;
      }
      push(x) {
        this.n++;
        const d = x - this.mean;
        this.mean += d / this.n;
        this.M2 += d * (x - this.mean);
      }
      var() {
        return this.n > 1 ? this.M2 / (this.n - 1) : 0;
      }
      std() {
        return Math.sqrt(this.var());
      }
    }

    // Exponential Moving Average
    class EMA {
      constructor(a) {
        this.a = a;
        this.y = 0;
        this.init = false;
      }
      step(x) {
        if (!this.init) {
          this.y = x;
          this.init = true;
        } else {
          this.y = this.a * x + (1 - this.a) * this.y;
        }
        return this.y;
      }
    }

    U.RunningStats = RunningStats;
    U.EMA = EMA;

    NS.Utils = U;
  })();

  /* ---------- Z-Order Manager ---------- */
  (function(){
    const Z = {
      next: 100,
      items: new Set()
    };

    Z.register = (el) => {
      Z.items.add(el);
      el.style.zIndex = (++Z.next).toString();
    };

    Z.bringToFront = (el) => {
      el.style.zIndex = (++Z.next).toString();
    };

    Z.shuffle = () => {
      const arr = [...Z.items];
      let delay = 0;
      arr.forEach(el => {
        setTimeout(() => Z.bringToFront(el), delay);
        delay += 120;
      });
    };

    NS.Z = Z;
  })();

})(window);
