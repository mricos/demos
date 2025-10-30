(function () {
  class Phonovox {
    constructor(baseline) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.sr  = this.ctx.sampleRate;

      // Master
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.15;
      this.master.connect(this.ctx.destination);

      // Source (glottal proxy)
      this.osc = this.ctx.createOscillator(); this.osc.type = 'sawtooth';
      this.osc.frequency.value = baseline.f0 || 140;
      this.srcGain = this.ctx.createGain(); this.srcGain.gain.value = 0.8;

      // Formants
      this.f1 = this.ctx.createBiquadFilter(); this.f1.type='bandpass';
      this.f2 = this.ctx.createBiquadFilter(); this.f2.type='peaking';
      this.f3 = this.ctx.createBiquadFilter(); this.f3.type='peaking';

      // Baseline formants
      this._setFormants(baseline);

      // Wire
      this.osc.connect(this.srcGain);
      this.srcGain.connect(this.f1);
      this.f1.connect(this.f2);
      this.f2.connect(this.f3);
      this.f3.connect(this.master);

      this.osc.start();

      // Event bindings
      EventBus.on('ep:play', (e) => this._playEP(e.detail));
      EventBus.on('ep:baseline', (e) => this._baseline(e.detail));
    }

    resume(){ return this.ctx.resume(); }

    // UI-exposed setters (volume + baseline F1/F2/F3/f0)
    setVolume(v){
       this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
    }

    setBaseline(b){
       this._setFormants(b);
       this.osc.frequency.setTargetAtTime(b.f0||140,
           this.ctx.currentTime, 0.02);
    }

    _setFormants(p){
      const {f1=500,f2=1500,f3=2500} = p || {};
      const q1=8, q2=8, q3=6;
      this.f1.frequency.value=f1; this.f1.Q.value=q1;
      this.f2.frequency.value=f2; this.f2.Q.value=q2; this.f2.gain.value=6;
      this.f3.frequency.value=f3; this.f3.Q.value=q3; this.f3.gain.value=3;
    }

    _baseline(p){ this.setBaseline(p || EPM.baseline()); }

    _playEP(ep){
      if (!ep) return;
      const now = this.ctx.currentTime;
      const len = (ep.lenMs||180)/1000;

      // Duck
      const g = this.master.gain;
      const gHold = g.value;
      g.setTargetAtTime(Math.max(0.05, gHold*0.6), now, 0.01);

      // Apply start immediately
      const S = ep.start || {};
      const E = ep.end   || ep.start || {};
      if (S.f0 != null) this.osc.frequency.setValueAtTime(S.f0, now);
      this._applyFormantsAt(S, now);

      // Ramp to end
      if (E.f0 != null) this.osc.frequency.linearRampToValueAtTime(E.f0, now+len);
      this._rampFormantsTo(E, now+len);

      // Return to baseline
      const base = EPM.baseline();
      this.osc.frequency.linearRampToValueAtTime(base.f0, now+len+0.04);
      this._rampFormantsTo(base, now+len+0.04);
      g.setTargetAtTime(gHold, now+len*0.8, 0.03);

      Log.info('EP play', ep);
    }

    _applyFormantsAt(p, t){
      if (p.f1 != null) this.f1.frequency.setValueAtTime(p.f1, t);
      if (p.f2 != null) this.f2.frequency.setValueAtTime(p.f2, t);
      if (p.f3 != null) this.f3.frequency.setValueAtTime(p.f3, t);
    }
    _rampFormantsTo(p, t){
      if (p.f1 != null) this.f1.frequency.linearRampToValueAtTime(p.f1, t);
      if (p.f2 != null) this.f2.frequency.linearRampToValueAtTime(p.f2, t);
      if (p.f3 != null) this.f3.frequency.linearRampToValueAtTime(p.f3, t);
    }
  }
  window.Phonovox = Phonovox;
})();

