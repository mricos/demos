// phonemeData.js
// Phoneme database as JavaScript object (avoids CORS issues with file:// protocol)

const PHONEME_DATA = {
  "i": {
    "ipa": "i",
    "xsampa": "i:",
    "category": "vowel",
    "height": "high",
    "backness": "front",
    "voiced": true,
    "formants": {
      "f1": 270,
      "f2": 2290,
      "f3": 3010
    },
    "filters": [0, 1, 8, 9],
    "gains": [0.3, 0.8, 1.0, 0.7],
    "duration": 150,
    "examples": ["beat", "see", "tree"]
  },
  "ɪ": {
    "ipa": "ɪ",
    "xsampa": "I",
    "category": "vowel",
    "height": "high",
    "backness": "front",
    "voiced": true,
    "formants": {
      "f1": 390,
      "f2": 1990,
      "f3": 2550
    },
    "filters": [1, 2, 8, 9],
    "gains": [0.8, 0.5, 1.0, 0.6],
    "duration": 120,
    "examples": ["bit", "sit", "hit"]
  },
  "e": {
    "ipa": "e",
    "xsampa": "e",
    "category": "vowel",
    "height": "mid",
    "backness": "front",
    "voiced": true,
    "formants": {
      "f1": 530,
      "f2": 1840,
      "f3": 2480
    },
    "filters": [2, 3, 7, 8],
    "gains": [0.9, 0.6, 0.8, 1.0],
    "duration": 140,
    "examples": ["bed", "get", "set"]
  },
  "æ": {
    "ipa": "æ",
    "xsampa": "{",
    "category": "vowel",
    "height": "low",
    "backness": "front",
    "voiced": true,
    "formants": {
      "f1": 660,
      "f2": 1720,
      "f3": 2410
    },
    "filters": [3, 7, 8],
    "gains": [1.0, 0.9, 0.7],
    "duration": 160,
    "examples": ["bat", "cat", "hat"]
  },
  "ɑ": {
    "ipa": "ɑ",
    "xsampa": "A:",
    "category": "vowel",
    "height": "low",
    "backness": "back",
    "voiced": true,
    "formants": {
      "f1": 730,
      "f2": 1090,
      "f3": 2440
    },
    "filters": [3, 5, 8, 9],
    "gains": [1.0, 0.8, 0.6, 0.5],
    "duration": 170,
    "examples": ["father", "palm", "spa"]
  },
  "ɒ": {
    "ipa": "ɒ",
    "xsampa": "Q",
    "category": "vowel",
    "height": "low",
    "backness": "back",
    "voiced": true,
    "formants": {
      "f1": 570,
      "f2": 840,
      "f3": 2410
    },
    "filters": [2, 3, 4],
    "gains": [0.8, 0.9, 0.6],
    "duration": 140,
    "examples": ["cot", "hot", "lot"]
  },
  "ɔ": {
    "ipa": "ɔ",
    "xsampa": "O:",
    "category": "vowel",
    "height": "mid",
    "backness": "back",
    "voiced": true,
    "formants": {
      "f1": 490,
      "f2": 910,
      "f3": 2350
    },
    "filters": [2, 4, 8],
    "gains": [0.9, 0.8, 0.5],
    "duration": 160,
    "examples": ["caught", "thought", "law"]
  },
  "ʊ": {
    "ipa": "ʊ",
    "xsampa": "U",
    "category": "vowel",
    "height": "high",
    "backness": "back",
    "voiced": true,
    "formants": {
      "f1": 440,
      "f2": 1020,
      "f3": 2240
    },
    "filters": [1, 2, 5],
    "gains": [0.7, 0.8, 0.9],
    "duration": 120,
    "examples": ["foot", "book", "good"]
  },
  "u": {
    "ipa": "u",
    "xsampa": "u:",
    "category": "vowel",
    "height": "high",
    "backness": "back",
    "voiced": true,
    "formants": {
      "f1": 300,
      "f2": 870,
      "f3": 2240
    },
    "filters": [0, 1, 4],
    "gains": [0.6, 0.8, 1.0],
    "duration": 150,
    "examples": ["boot", "moon", "food"]
  },
  "ʌ": {
    "ipa": "ʌ",
    "xsampa": "V",
    "category": "vowel",
    "height": "mid",
    "backness": "central",
    "voiced": true,
    "formants": {
      "f1": 640,
      "f2": 1190,
      "f3": 2390
    },
    "filters": [3, 5, 6],
    "gains": [1.0, 0.9, 0.7],
    "duration": 130,
    "examples": ["but", "cup", "love"]
  },
  "ɜ": {
    "ipa": "ɜ",
    "xsampa": "3:",
    "category": "vowel",
    "height": "mid",
    "backness": "central",
    "voiced": true,
    "formants": {
      "f1": 490,
      "f2": 1350,
      "f3": 1690
    },
    "filters": [2, 6, 7],
    "gains": [0.9, 1.0, 0.8],
    "duration": 160,
    "examples": ["bird", "hurt", "turn"]
  },
  "ə": {
    "ipa": "ə",
    "xsampa": "@",
    "category": "vowel",
    "height": "mid",
    "backness": "central",
    "voiced": true,
    "formants": {
      "f1": 500,
      "f2": 1500,
      "f3": 2500
    },
    "filters": [2, 6, 7, 9],
    "gains": [0.7, 0.9, 0.8, 0.5],
    "duration": 80,
    "examples": ["about", "sofa", "comma"]
  },
  "p": {
    "ipa": "p",
    "xsampa": "p",
    "category": "consonant",
    "manner": "plosive",
    "place": "bilabial",
    "voiced": false,
    "filters": [0, 1, 2, 3],
    "gains": [0.2, 0.3, 0.4, 0.2],
    "duration": 60,
    "burst": true,
    "examples": ["pat", "spin", "tap"]
  },
  "b": {
    "ipa": "b",
    "xsampa": "b",
    "category": "consonant",
    "manner": "plosive",
    "place": "bilabial",
    "voiced": true,
    "filters": [0, 1, 2],
    "gains": [0.4, 0.5, 0.3],
    "duration": 70,
    "burst": true,
    "examples": ["bat", "about", "cab"]
  },
  "t": {
    "ipa": "t",
    "xsampa": "t",
    "category": "consonant",
    "manner": "plosive",
    "place": "alveolar",
    "voiced": false,
    "filters": [1, 2, 7, 8],
    "gains": [0.3, 0.4, 0.5, 0.3],
    "duration": 50,
    "burst": true,
    "examples": ["top", "stick", "cat"]
  },
  "d": {
    "ipa": "d",
    "xsampa": "d",
    "category": "consonant",
    "manner": "plosive",
    "place": "alveolar",
    "voiced": true,
    "filters": [1, 2, 7],
    "gains": [0.5, 0.6, 0.4],
    "duration": 60,
    "burst": true,
    "examples": ["dog", "add", "bad"]
  },
  "k": {
    "ipa": "k",
    "xsampa": "k",
    "category": "consonant",
    "manner": "plosive",
    "place": "velar",
    "voiced": false,
    "filters": [2, 3, 4, 5],
    "gains": [0.3, 0.4, 0.5, 0.3],
    "duration": 60,
    "burst": true,
    "examples": ["cat", "back", "ski"]
  },
  "g": {
    "ipa": "g",
    "xsampa": "g",
    "category": "consonant",
    "manner": "plosive",
    "place": "velar",
    "voiced": true,
    "filters": [2, 3, 4],
    "gains": [0.5, 0.6, 0.5],
    "duration": 70,
    "burst": true,
    "examples": ["go", "again", "dog"]
  },
  "f": {
    "ipa": "f",
    "xsampa": "f",
    "category": "consonant",
    "manner": "fricative",
    "place": "labiodental",
    "voiced": false,
    "filters": [6, 7, 8, 9],
    "gains": [0.4, 0.6, 0.7, 0.5],
    "duration": 100,
    "examples": ["fat", "coffee", "leaf"]
  },
  "v": {
    "ipa": "v",
    "xsampa": "v",
    "category": "consonant",
    "manner": "fricative",
    "place": "labiodental",
    "voiced": true,
    "filters": [5, 6, 7, 8],
    "gains": [0.5, 0.6, 0.7, 0.5],
    "duration": 90,
    "examples": ["van", "have", "live"]
  },
  "θ": {
    "ipa": "θ",
    "xsampa": "T",
    "category": "consonant",
    "manner": "fricative",
    "place": "dental",
    "voiced": false,
    "filters": [7, 8, 9],
    "gains": [0.5, 0.7, 0.6],
    "duration": 110,
    "examples": ["think", "math", "path"]
  },
  "ð": {
    "ipa": "ð",
    "xsampa": "D",
    "category": "consonant",
    "manner": "fricative",
    "place": "dental",
    "voiced": true,
    "filters": [6, 7, 8],
    "gains": [0.5, 0.6, 0.5],
    "duration": 90,
    "examples": ["this", "mother", "breathe"]
  },
  "s": {
    "ipa": "s",
    "xsampa": "s",
    "category": "consonant",
    "manner": "fricative",
    "place": "alveolar",
    "voiced": false,
    "filters": [7, 8, 9],
    "gains": [0.6, 0.8, 0.9],
    "duration": 100,
    "examples": ["sit", "pass", "bus"]
  },
  "z": {
    "ipa": "z",
    "xsampa": "z",
    "category": "consonant",
    "manner": "fricative",
    "place": "alveolar",
    "voiced": true,
    "filters": [6, 7, 8, 9],
    "gains": [0.5, 0.6, 0.7, 0.6],
    "duration": 90,
    "examples": ["zoo", "buzz", "is"]
  },
  "ʃ": {
    "ipa": "ʃ",
    "xsampa": "S",
    "category": "consonant",
    "manner": "fricative",
    "place": "postalveolar",
    "voiced": false,
    "filters": [6, 7, 8],
    "gains": [0.5, 0.7, 0.8],
    "duration": 110,
    "examples": ["ship", "fish", "rush"]
  },
  "ʒ": {
    "ipa": "ʒ",
    "xsampa": "Z",
    "category": "consonant",
    "manner": "fricative",
    "place": "postalveolar",
    "voiced": true,
    "filters": [5, 6, 7, 8],
    "gains": [0.5, 0.6, 0.7, 0.6],
    "duration": 100,
    "examples": ["measure", "vision", "beige"]
  },
  "h": {
    "ipa": "h",
    "xsampa": "h",
    "category": "consonant",
    "manner": "fricative",
    "place": "glottal",
    "voiced": false,
    "filters": [4, 5, 6, 7, 8],
    "gains": [0.3, 0.4, 0.5, 0.4, 0.3],
    "duration": 80,
    "examples": ["hat", "ahead", "behind"]
  },
  "m": {
    "ipa": "m",
    "xsampa": "m",
    "category": "consonant",
    "manner": "nasal",
    "place": "bilabial",
    "voiced": true,
    "formants": {
      "f1": 280,
      "f2": 1200,
      "f3": 2500
    },
    "filters": [0, 1, 5, 8],
    "gains": [0.8, 0.7, 0.6, 0.4],
    "duration": 80,
    "examples": ["man", "summer", "ham"]
  },
  "n": {
    "ipa": "n",
    "xsampa": "n",
    "category": "consonant",
    "manner": "nasal",
    "place": "alveolar",
    "voiced": true,
    "formants": {
      "f1": 300,
      "f2": 1700,
      "f3": 2500
    },
    "filters": [0, 1, 2, 7, 8],
    "gains": [0.7, 0.8, 0.6, 0.5, 0.3],
    "duration": 80,
    "examples": ["no", "sun", "can"]
  },
  "ŋ": {
    "ipa": "ŋ",
    "xsampa": "N",
    "category": "consonant",
    "manner": "nasal",
    "place": "velar",
    "voiced": true,
    "formants": {
      "f1": 280,
      "f2": 2200,
      "f3": 2500
    },
    "filters": [0, 1, 3, 8],
    "gains": [0.8, 0.7, 0.5, 0.4],
    "duration": 90,
    "examples": ["sing", "long", "think"]
  },
  "l": {
    "ipa": "l",
    "xsampa": "l",
    "category": "consonant",
    "manner": "approximant",
    "place": "lateral",
    "voiced": true,
    "formants": {
      "f1": 300,
      "f2": 1500,
      "f3": 2500
    },
    "filters": [0, 1, 2, 6, 7],
    "gains": [0.7, 0.8, 0.6, 0.5, 0.4],
    "duration": 80,
    "examples": ["let", "yellow", "ball"]
  },
  "r": {
    "ipa": "r",
    "xsampa": "r\\",
    "category": "consonant",
    "manner": "approximant",
    "place": "rhotic",
    "voiced": true,
    "formants": {
      "f1": 350,
      "f2": 1200,
      "f3": 1600
    },
    "filters": [1, 2, 5, 6],
    "gains": [0.7, 0.8, 0.7, 0.5],
    "duration": 90,
    "examples": ["red", "very", "car"]
  },
  "w": {
    "ipa": "w",
    "xsampa": "w",
    "category": "consonant",
    "manner": "approximant",
    "place": "semivowel",
    "voiced": true,
    "formants": {
      "f1": 300,
      "f2": 870,
      "f3": 2240
    },
    "filters": [0, 1, 4, 5],
    "gains": [0.6, 0.7, 0.8, 0.6],
    "duration": 70,
    "examples": ["wet", "away", "cow"]
  },
  "j": {
    "ipa": "j",
    "xsampa": "j",
    "category": "consonant",
    "manner": "approximant",
    "place": "semivowel",
    "voiced": true,
    "formants": {
      "f1": 280,
      "f2": 2250,
      "f3": 3000
    },
    "filters": [0, 1, 8, 9],
    "gains": [0.5, 0.7, 0.9, 0.6],
    "duration": 70,
    "examples": ["yes", "beyond", "boy"]
  },
  "tʃ": {
    "ipa": "tʃ",
    "xsampa": "tS",
    "category": "consonant",
    "manner": "affricate",
    "place": "postalveolar",
    "voiced": false,
    "filters": [2, 6, 7, 8],
    "gains": [0.4, 0.5, 0.7, 0.8],
    "duration": 100,
    "burst": true,
    "examples": ["church", "match", "chip"]
  },
  "dʒ": {
    "ipa": "dʒ",
    "xsampa": "dZ",
    "category": "consonant",
    "manner": "affricate",
    "place": "postalveolar",
    "voiced": true,
    "filters": [2, 5, 6, 7, 8],
    "gains": [0.5, 0.5, 0.6, 0.7, 0.6],
    "duration": 90,
    "burst": true,
    "examples": ["judge", "age", "joy"]
  }
};
