// TextToPhoneme.js
// Simple English text to IPA phoneme converter

class TextToPhoneme {
  constructor() {
    // Dictionary of common English words to IPA
    this.dictionary = {
      // Common words
      'hello': ['h', 'e', 'l', 'əʊ'],
      'world': ['w', 'ɜ', 'r', 'l', 'd'],
      'the': ['ð', 'ə'],
      'a': ['ə'],
      'i': ['aɪ'],
      'you': ['j', 'u'],
      'we': ['w', 'i'],
      'it': ['ɪ', 't'],
      'is': ['ɪ', 'z'],
      'are': ['ɑ', 'r'],
      'am': ['æ', 'm'],
      'be': ['b', 'i'],
      'have': ['h', 'æ', 'v'],
      'has': ['h', 'æ', 'z'],
      'do': ['d', 'u'],
      'does': ['d', 'ʌ', 'z'],
      'did': ['d', 'ɪ', 'd'],
      'can': ['k', 'æ', 'n'],
      'will': ['w', 'ɪ', 'l'],
      'would': ['w', 'ʊ', 'd'],
      'should': ['ʃ', 'ʊ', 'd'],
      'could': ['k', 'ʊ', 'd'],
      'may': ['m', 'eɪ'],
      'might': ['m', 'aɪ', 't'],
      'must': ['m', 'ʌ', 's', 't'],
      'this': ['ð', 'ɪ', 's'],
      'that': ['ð', 'æ', 't'],
      'these': ['ð', 'i', 'z'],
      'those': ['ð', 'əʊ', 'z'],
      'what': ['w', 'ɒ', 't'],
      'when': ['w', 'e', 'n'],
      'where': ['w', 'e', 'r'],
      'who': ['h', 'u'],
      'why': ['w', 'aɪ'],
      'how': ['h', 'aʊ'],
      'yes': ['j', 'e', 's'],
      'no': ['n', 'əʊ'],
      'not': ['n', 'ɒ', 't'],
      'cat': ['k', 'æ', 't'],
      'dog': ['d', 'ɒ', 'g'],
      'bird': ['b', 'ɜ', 'r', 'd'],
      'fish': ['f', 'ɪ', 'ʃ'],
      'man': ['m', 'æ', 'n'],
      'woman': ['w', 'ʊ', 'm', 'ə', 'n'],
      'child': ['tʃ', 'aɪ', 'l', 'd'],
      'good': ['g', 'ʊ', 'd'],
      'bad': ['b', 'æ', 'd'],
      'big': ['b', 'ɪ', 'g'],
      'small': ['s', 'm', 'ɔ', 'l'],
      'hot': ['h', 'ɒ', 't'],
      'cold': ['k', 'əʊ', 'l', 'd'],
      'new': ['n', 'j', 'u'],
      'old': ['əʊ', 'l', 'd'],
      'one': ['w', 'ʌ', 'n'],
      'two': ['t', 'u'],
      'three': ['θ', 'r', 'i'],
      'four': ['f', 'ɔ', 'r'],
      'five': ['f', 'aɪ', 'v'],
      'six': ['s', 'ɪ', 'k', 's'],
      'seven': ['s', 'e', 'v', 'ə', 'n'],
      'eight': ['eɪ', 't'],
      'nine': ['n', 'aɪ', 'n'],
      'ten': ['t', 'e', 'n']
    };

    // Letter-to-phoneme rules (simplified)
    this.letterRules = {
      'a': 'æ',
      'b': 'b',
      'c': 'k',
      'd': 'd',
      'e': 'e',
      'f': 'f',
      'g': 'g',
      'h': 'h',
      'i': 'ɪ',
      'j': 'dʒ',
      'k': 'k',
      'l': 'l',
      'm': 'm',
      'n': 'n',
      'o': 'ɒ',
      'p': 'p',
      'q': 'k',
      'r': 'r',
      's': 's',
      't': 't',
      'u': 'ʌ',
      'v': 'v',
      'w': 'w',
      'x': 'k',
      'y': 'j',
      'z': 'z'
    };
  }

  // Convert text to phoneme sequence
  textToPhonemes(text) {
    // Normalize text: lowercase and remove punctuation
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');

    // Split into words
    const words = normalized.split(/\s+/).filter(w => w.length > 0);

    // Convert each word
    const phonemeSequence = [];

    words.forEach((word, index) => {
      // Add word boundary pause between words
      if (index > 0) {
        phonemeSequence.push({ type: 'pause', duration: 100 });
      }

      // Look up in dictionary
      if (this.dictionary[word]) {
        this.dictionary[word].forEach(phoneme => {
          phonemeSequence.push({
            type: 'phoneme',
            ipa: phoneme,
            duration: null // Use default from phoneme data
          });
        });
      } else {
        // Fall back to letter-by-letter conversion
        const phonemes = this.letterToPhonemes(word);
        phonemes.forEach(phoneme => {
          phonemeSequence.push({
            type: 'phoneme',
            ipa: phoneme,
            duration: null
          });
        });
      }
    });

    return phonemeSequence;
  }

  // Convert individual word to phonemes using letter rules
  letterToPhonemes(word) {
    const phonemes = [];

    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const nextLetter = word[i + 1];

      // Handle digraphs
      if (letter === 'c' && nextLetter === 'h') {
        phonemes.push('tʃ');
        i++; // Skip next letter
        continue;
      }
      if (letter === 's' && nextLetter === 'h') {
        phonemes.push('ʃ');
        i++;
        continue;
      }
      if (letter === 't' && nextLetter === 'h') {
        phonemes.push('θ');
        i++;
        continue;
      }
      if (letter === 'n' && nextLetter === 'g') {
        phonemes.push('ŋ');
        i++;
        continue;
      }

      // Use letter rules
      if (this.letterRules[letter]) {
        phonemes.push(this.letterRules[letter]);
      }
    }

    return phonemes;
  }

  // Add word to dictionary
  addWord(word, phonemes) {
    this.dictionary[word.toLowerCase()] = phonemes;
  }

  // Get all dictionary words
  getDictionary() {
    return Object.keys(this.dictionary).sort();
  }
}
