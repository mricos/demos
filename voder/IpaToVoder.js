// IpaToVoder.js
// Maps IPA phonemes to Voder control settings

class IpaToVoder {
  constructor() {
    this.phonemeDB = null;
    this.defaultPitch = 120; // Hz
  }

  // Load phoneme database from global PHONEME_DATA
  async loadPhonemeDB() {
    if (typeof PHONEME_DATA === 'undefined') {
      console.error('PHONEME_DATA not found. Make sure phonemeData.js is loaded.');
      throw new Error('PHONEME_DATA not defined');
    }

    this.phonemeDB = PHONEME_DATA;
    console.log(`Loaded ${Object.keys(this.phonemeDB).length} phonemes`);
    return this.phonemeDB;
  }

  // Translate IPA phoneme to Voder settings
  translate(ipa, options = {}) {
    if (!this.phonemeDB) {
      throw new Error('Phoneme database not loaded. Call loadPhonemeDB() first.');
    }

    const phoneme = this.phonemeDB[ipa];

    if (!phoneme) {
      console.warn(`Unknown phoneme: ${ipa}`);
      // Return silence as fallback
      return {
        ipa,
        filters: [],
        gains: [],
        voiced: false,
        pitch: this.defaultPitch,
        duration: 50
      };
    }

    // Build Voder control object
    return {
      ipa: phoneme.ipa,
      filters: phoneme.filters || [],
      gains: phoneme.gains || [],
      voiced: phoneme.voiced !== undefined ? phoneme.voiced : true,
      pitch: options.pitch || this.defaultPitch,
      duration: options.duration || phoneme.duration || 100,
      category: phoneme.category,
      formants: phoneme.formants
    };
  }

  // Translate a sequence of IPA phonemes
  translateSequence(ipaArray, options = {}) {
    const {
      basePitch = this.defaultPitch,
      pitchVariation = 0.1, // 10% variation for naturalness
      stressedPitchBoost = 1.2
    } = options;

    return ipaArray.map((item, index) => {
      // item can be string (ipa) or object {ipa, stress, duration}
      const ipa = typeof item === 'string' ? item : item.ipa;
      const stress = typeof item === 'object' ? item.stress : 0;
      const customDuration = typeof item === 'object' ? item.duration : null;

      // Calculate pitch with variation
      let pitch = basePitch;
      if (stress > 0) {
        pitch *= stressedPitchBoost;
      }

      // Add slight natural variation
      pitch *= (1 + (Math.random() - 0.5) * pitchVariation);

      const translation = this.translate(ipa, {
        pitch: Math.round(pitch),
        duration: customDuration
      });

      return translation;
    });
  }

  // Apply coarticulation: smooth transition between two phonemes
  applyCoarticulation(phoneme1, phoneme2) {
    // For now, this is a placeholder
    // Real implementation would adjust formant transitions
    // based on phoneme classes (vowel-to-vowel, consonant-to-vowel, etc.)

    const transitionDuration = 30; // ms

    return {
      type: 'transition',
      duration: transitionDuration,
      from: phoneme1,
      to: phoneme2
    };
  }

  // Get phoneme info
  getPhoneme(ipa) {
    return this.phonemeDB ? this.phonemeDB[ipa] : null;
  }

  // Get all phonemes in a category
  getPhonemesByCategory(category) {
    if (!this.phonemeDB) return [];

    return Object.keys(this.phonemeDB)
      .filter(ipa => this.phonemeDB[ipa].category === category)
      .map(ipa => this.phonemeDB[ipa]);
  }

  // Get vowels organized by height and backness
  getVowelChart() {
    const vowels = this.getPhonemesByCategory('vowel');

    const chart = {
      high: { front: [], central: [], back: [] },
      mid: { front: [], central: [], back: [] },
      low: { front: [], central: [], back: [] }
    };

    vowels.forEach(vowel => {
      const height = vowel.height || 'mid';
      const backness = vowel.backness || 'central';

      if (chart[height] && chart[height][backness]) {
        chart[height][backness].push(vowel);
      }
    });

    return chart;
  }

  // Get consonants organized by manner and place
  getConsonantChart() {
    const consonants = this.getPhonemesByCategory('consonant');

    const chart = {
      plosive: { bilabial: [], alveolar: [], velar: [] },
      fricative: { labiodental: [], dental: [], alveolar: [], postalveolar: [], glottal: [] },
      nasal: { bilabial: [], alveolar: [], velar: [] },
      approximant: { lateral: [], rhotic: [], semivowel: [] }
    };

    consonants.forEach(consonant => {
      const manner = consonant.manner || 'other';
      const place = consonant.place || 'other';

      if (chart[manner] && chart[manner][place]) {
        chart[manner][place].push(consonant);
      }
    });

    return chart;
  }

  // Get all phonemes
  getAllPhonemes() {
    if (!this.phonemeDB) return [];
    return Object.values(this.phonemeDB);
  }
}
