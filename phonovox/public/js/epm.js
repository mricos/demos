(function () {
  // EP packet fields:
  // { lenMs, start:{ f0,f1,f2,f3,duty,shape }, end:{...} }
  // Frequencies in Hz; duty in [0,1]; shape in {'saw','pulse','tri'} (engine uses 'saw' baseline).
  const baseline = { f0:140, f1:500, f2:1500, f3:2500, duty:0.5, shape:'saw' };

  // Western vowels typical targets (coarse, adult male-ish)
  // Ref values indicative, not clinical.
  const WEST = {
    'i':  { f1:300,  f2:2300, f3:3000 },
    'ɪ':  { f1:350,  f2:2000, f3:2900 },
    'e':  { f1:400,  f2:2000, f3:2800 },
    'ɛ':  { f1:500,  f2:1900, f3:2600 },
    'æ':  { f1:700,  f2:1800, f3:2500 },
    'a':  { f1:800,  f2:1600, f3:2400 },
    'ʌ':  { f1:600,  f2:1200, f3:2300 },
    'ə':  { f1:500,  f2:1500, f3:2500 },
    'u':  { f1:350,  f2: 900, f3:2200 },
    'ʊ':  { f1:400,  f2:1100, f3:2300 },
    'o':  { f1:450,  f2: 900, f3:2300 },
    'ɔ':  { f1:500,  f2:1000, f3:2200 }
  };

  // Full IPA vowel set rendered (symbol order for grid)
  const IPA_ALL = [
    'i','y','ɨ','ʉ','ɯ','u',
    'ɪ','ʏ','ʊ','e','ø','ɘ','ɵ','ɤ','o',
    'ə','ɛ','œ','ɜ','ɞ','ʌ','ɔ',
    'æ','ɐ','a','ɶ','ɑ','ɒ'
  ];

  function epFor(sym, opts) {
    const dur = (opts && opts.lenMs) || 180;
    const target = WEST[sym];
    const start = Object.assign({}, baseline, target ? target : {});
    const end   = Object.assign({}, start); // hold
    return { lenMs: dur, start, end };
  }

  window.EPM = {
    baseline: () => Object.assign({}, baseline),
    isWestern: (sym) => !!WEST[sym],
    ipaList: () => IPA_ALL.slice(),
    packetFor: epFor
  };
})();

