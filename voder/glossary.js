// Glossary of technical terms for the Voder documentation
// Each term has a title and definition

const GLOSSARY = {
  "voder": {
    title: "VODER",
    definition: "Voice Operation DEmonstratoR - The world's first electronic speech synthesizer, created by Homer Dudley at Bell Labs in 1939. It was operated like a musical instrument by trained operators who manually controlled spectral filters and voicing parameters."
  },

  "synthesizer": {
    title: "Speech Synthesizer",
    definition: "A device or system that produces human-like speech artificially. The VODER was the first to do this electronically (without recordings), using the source-filter principle to generate speech from basic acoustic components."
  },

  "worlds-fair": {
    title: "1939 New York World's Fair",
    definition: "The VODER was demonstrated at the 1939-1940 New York World's Fair, where it amazed visitors by producing intelligible speech purely through electronic means. Trained operators ('Voder Girls') demonstrated the system to millions of attendees."
  },

  "bell-labs": {
    title: "Bell Labs",
    definition: "Bell Telephone Laboratories - A premier industrial research laboratory responsible for major innovations including the transistor, laser, UNIX, and the C programming language. Homer Dudley developed the VODER there as part of research into speech transmission and compression."
  },

  "speech-production": {
    title: "Speech Production",
    definition: "The physiological process by which humans create speech sounds. It involves airflow from the lungs, vibration of the vocal folds (for voiced sounds), and modulation by the vocal tract (tongue, lips, jaw) to create resonances called formants."
  },

  "electronic-circuits": {
    title: "Electronic Circuits",
    definition: "In the VODER, vacuum tube circuits generated the buzz and hiss sources, while resonant LC circuits (inductors and capacitors) created bandpass filters. The operator's key presses controlled relays that switched these circuits to shape the sound spectrum."
  },

  "filters": {
    title: "Frequency-Selective Filters",
    definition: "Electronic circuits that allow certain frequencies to pass while blocking others. The VODER used 10 bandpass filters covering 200-2600 Hz. By activating combinations of filters, the operator could approximate the formant patterns of different vowels and consonants."
  },

  "voiced": {
    title: "Voiced Sounds",
    definition: "Speech sounds produced with vocal fold vibration, creating a periodic buzz at the fundamental frequency (pitch). Examples: all vowels, and consonants like [b], [d], [g], [v], [z], [m], [n]. The VODER generated voiced sounds using a relaxation oscillator."
  },

  "unvoiced": {
    title: "Unvoiced Sounds",
    definition: "Speech sounds produced without vocal fold vibration, using turbulent airflow that creates noise. Examples: [p], [t], [k], [f], [s], [ʃ], [h]. The VODER generated unvoiced sounds using a hiss generator (noise source)."
  },

  "pitch": {
    title: "Pitch (Fundamental Frequency)",
    definition: "The rate of vocal fold vibration in voiced sounds, measured in Hertz (Hz). Typical values: adult male ~100-120 Hz, adult female ~200-220 Hz, children ~300 Hz. Pitch conveys intonation and emotion. On the VODER, the operator controlled pitch with a foot pedal."
  },

  "plosive": {
    title: "Plosives (Stop Consonants)",
    definition: "Consonants produced by completely blocking airflow, building up pressure, then releasing it in a burst. Examples: [p], [b], [t], [d], [k], [g]. The VODER had three special keys that triggered brief noise bursts at different frequency ranges to simulate plosives."
  },

  "resonance": {
    title: "Acoustic Resonance",
    definition: "Natural frequencies at which a cavity vibrates most efficiently. The vocal tract has resonances called formants. When the vocal folds buzz, the vocal tract filters that buzz, amplifying frequencies near the formants while damping others."
  },

  "excitation": {
    title: "Excitation Source",
    definition: "The initial sound source before filtering. In speech: vocal fold buzz (voiced) or turbulent noise (unvoiced). In the VODER: electronic oscillator or noise generator. The source-filter model treats excitation and filtering as independent."
  },

  "source-filter": {
    title: "Source-Filter Model",
    definition: "A fundamental theory of speech production stating that speech is the product of (1) a source (buzz or noise) and (2) a filter (vocal tract resonance). This decomposition, formalized by Gunnar Fant, is the basis for most speech synthesis and coding systems."
  },

  "ipa": {
    title: "IPA (International Phonetic Alphabet)",
    definition: "A standardized system for representing speech sounds across all languages. Each symbol represents one phoneme (distinct sound). Examples: [i] for 'beet', [ɪ] for 'bit', [θ] for 'think'. The IPA keyboard in this app lets you synthesize any English phoneme directly."
  },

  "vocal-folds": {
    title: "Vocal Folds (Vocal Cords)",
    definition: "Two bands of muscle tissue in the larynx that vibrate when air passes through them, creating the buzz for voiced sounds. Tension and length control pitch; closure determines voice quality. The VODER simulated this with an electronic relaxation oscillator."
  },

  "f0": {
    title: "f₀ (Fundamental Frequency)",
    definition: "The lowest frequency component in voiced sounds, corresponding to the rate of vocal fold vibration. Written as f₀ or F0. This is what we perceive as pitch. Formants (F1, F2, F3...) are the resonances of the vocal tract, independent of f₀."
  },

  "white-noise": {
    title: "White Noise",
    definition: "A random signal with equal energy across all frequencies, sounding like a hiss. Used for unvoiced consonants like [s], [f], [ʃ]. The VODER generated white noise using a gas-discharge tube. This synthesizer uses a JavaScript random number generator to fill an audio buffer."
  },

  "fricative": {
    title: "Fricative Consonants",
    definition: "Consonants produced by forcing air through a narrow constriction, creating turbulence (noise). Examples: [f], [v], [θ], [ð], [s], [z], [ʃ], [ʒ], [h]. Fricatives are characterized by sustained hiss-like sounds and are always or primarily unvoiced (except [v], [ð], [z], [ʒ] which mix voicing and noise)."
  },

  "vocal-tract": {
    title: "Vocal Tract",
    definition: "The airway from the vocal folds to the lips, including the pharynx (throat), oral cavity (mouth), and nasal cavity. Its shape—controlled by tongue, jaw, lips, and velum—determines formant frequencies. The vocal tract acts as a resonant tube, typically 17 cm long in adult males."
  },

  "resonant-cavity": {
    title: "Resonant Cavity",
    definition: "An enclosed or semi-enclosed space that amplifies sound at certain frequencies (resonances). The vocal tract is a complex resonant cavity with multiple formants. Even simple tubes have resonances; for example, an open tube of length L resonates at f = (2n-1)c/(4L) for n=1,2,3..."
  },

  "formants": {
    title: "Formants",
    definition: "Resonant frequencies of the vocal tract, visible as dark bands on a spectrogram. F1, F2, F3, etc. Vowels are distinguished primarily by F1 and F2. For [i]: F1≈270 Hz, F2≈2290 Hz. For [a]: F1≈730 Hz, F2≈1090 Hz. The VODER approximated formants by activating specific filter combinations."
  },

  "f1": {
    title: "F1 (First Formant)",
    definition: "The lowest formant frequency, typically 200-800 Hz. F1 correlates with vowel height (jaw opening): high vowels [i, u] have low F1 (~300 Hz), low vowels [a] have high F1 (~700 Hz). Filter keys 0-3 in the VODER controlled F1."
  },

  "f2": {
    title: "F2 (Second Formant)",
    definition: "The second formant frequency, typically 800-2500 Hz. F2 correlates with vowel backness (tongue position): front vowels [i, e] have high F2 (~2000 Hz), back vowels [u, o] have low F2 (~900 Hz). Filters 4-9 on the VODER shaped F2 and F3."
  },

  "bandpass": {
    title: "Bandpass Filter",
    definition: "A filter that allows frequencies within a certain range (bandwidth) to pass while attenuating frequencies outside that range. Characterized by center frequency and Q factor (quality: higher Q = narrower bandwidth). The VODER and this synthesizer use 10 bandpass filters to approximate vocal tract resonances."
  },

  "web-audio": {
    title: "Web Audio API",
    definition: "A JavaScript API for processing and synthesizing audio in web browsers. Provides low-latency audio nodes for oscillators, filters, gain, and more. This VODER implementation uses OscillatorNode (sawtooth wave for buzz), BufferSourceNode (white noise), and BiquadFilterNode (bandpass filters)."
  },

  "sawtooth": {
    title: "Sawtooth Wave",
    definition: "A waveform that rises linearly then drops sharply, rich in harmonics (all integer multiples of f₀). Sounds buzzy and resembles vocal fold output before filtering. Harmonics decrease at -6 dB/octave. The Web Audio OscillatorNode generates sawtooth waves for voiced excitation in this synthesizer."
  },

  "general-american": {
    title: "General American English",
    definition: "A dialect of American English considered standard in broadcasting and education, without strong regional features. This phoneme set covers General American, including distinctions like cot-caught [ɑ] vs [ɔ] (merged in some dialects) and flapped [t]/[d] in 'butter'."
  },

  "vowel-height": {
    title: "Vowel Height",
    definition: "The vertical position of the tongue during vowel production. High vowels [i, u] have the tongue close to the palate (low F1). Low vowels [a] have the tongue low in the mouth (high F1). Mid vowels [e, o] are intermediate. Height is the primary correlate of F1."
  },

  "vowel-backness": {
    title: "Vowel Backness",
    definition: "The front-back position of the tongue during vowel production. Front vowels [i, e] have the tongue forward (high F2). Back vowels [u, o] have the tongue retracted (low F2). Central vowels [ə, ʌ] are intermediate. Backness is the primary correlate of F2."
  },

  "manner": {
    title: "Manner of Articulation",
    definition: "How airflow is obstructed during consonant production. Categories: plosive (complete closure), fricative (narrow constriction → turbulence), nasal (oral closure, nasal airflow), approximant (slight constriction, no turbulence), affricate (closure → fricative release)."
  },

  "place": {
    title: "Place of Articulation",
    definition: "Where in the vocal tract the primary constriction occurs. Examples: bilabial (lips: [p, b, m]), alveolar (tongue tip at gum ridge: [t, d, s, n]), velar (tongue back at soft palate: [k, g, ŋ]). Place affects formant transitions and burst spectra."
  },

  "nasal": {
    title: "Nasal Consonants",
    definition: "Consonants produced with the velum lowered, allowing air to escape through the nose while the oral cavity is closed. Examples: [m] (bilabial), [n] (alveolar), [ŋ] (velar, as in 'sing'). Nasals have characteristic formants but with extra resonances and anti-resonances from the nasal cavity."
  },

  "approximant": {
    title: "Approximant Consonants",
    definition: "Consonants with minimal constriction—enough to be consonantal but not enough to cause turbulence. Examples: [l] (lateral, air flows around sides of tongue), [r] (rhotic), [w], [j] (semivowels, vowel-like). Approximants are always voiced and sonorant (resonant)."
  },

  "affricate": {
    title: "Affricate Consonants",
    definition: "Consonants that combine a stop closure with a fricative release. English has two: [tʃ] as in 'church' (voiceless) and [dʒ] as in 'judge' (voiced). Affricates start like plosives (buildup → burst) but release into sustained frication rather than abruptly."
  },

  "lips": {
    title: "Lip Visualization",
    definition: "A visual representation of lip shape and opening during phoneme production. Lip rounding (as in [u]) lengthens the vocal tract, lowering all formants. Lip spreading (as in [i]) shortens the effective tract, raising formants. The visualization helps understand articulatory gestures."
  }
};
