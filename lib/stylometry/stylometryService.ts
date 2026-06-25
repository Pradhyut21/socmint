/**
 * Stylometry Service — SOCMINT Shield
 *
 * Linguistic / stylometric forensics for public text evidence.
 * Compares writing patterns across accounts or posts to surface
 * authorship-likelihood hints.
 *
 * IMPORTANT: Stylometry is SUPPORTING evidence, not proof of authorship.
 * All results include a mandatory analyst caution.
 */

import type { StylometryResult, StylometryPairResult } from "../types";

// ── Text feature extraction ─────────────────────────────────────────────────

interface TextFeatures {
  words: string[];
  wordSet: Set<string>;
  avgWordLength: number;
  sentences: string[];
  avgSentenceLength: number;
  punctuationDensity: number;
  capitalisationRatio: number;
  emojiList: string[];
  emojiDensity: number;
  commonPhrases: string[];        // 2-3 word n-grams
  transliteration: boolean;       // Hindi/regional in Latin script?
  codeMixing: boolean;            // English + regional mixed?
}

const EMOJI_PATTERN = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

// Common Hindi/regional transliteration markers
const HINDI_MARKERS = [
  "bhai", "yaar", "nahi", "hai", "kya", "aur", "mera", "tera", "desh",
  "ghar", "ladki", "ladka", "acha", "theek", "sahi", "galat",
  "karoge", "karo", "dekho", "suno", "bol", "bolna",
];

const CODE_MIX_MARKERS = [
  /\b(?:the|is|are|was|were|have|has|do|does)\b.*\b(?:hai|nahi|kar)\b/i,
  /\b(?:kya|aur|bhi)\b.*\b(?:this|that|it)\b/i,
];

function extractFeatures(text: string): TextFeatures {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const wordSet = new Set(words);
  const avgWordLength = words.length > 0
    ? words.reduce((s, w) => s + w.length, 0) / words.length
    : 0;

  const sentences = text.split(/[.!?।]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((s, sen) => s + sen.trim().split(/\s+/).length, 0) / sentences.length
    : 0;

  const puncts = (text.match(/[!?.,;:]/g) || []).length;
  const punctuationDensity = text.length > 0 ? puncts / text.length : 0;

  const capitalLetters = (text.match(/[A-Z]/g) || []).length;
  const capitalisationRatio = text.length > 0 ? capitalLetters / text.length : 0;

  const emojiList = [...(text.match(EMOJI_PATTERN) || [])];
  const emojiDensity = words.length > 0 ? emojiList.length / words.length : 0;

  // 2-word n-grams as "phrases"
  const commonPhrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (words[i].length > 3 && words[i + 1].length > 3) {
      commonPhrases.push(phrase);
    }
  }

  const lowerText = text.toLowerCase();
  const transliteration = HINDI_MARKERS.some(m => lowerText.includes(m));
  const codeMixing = CODE_MIX_MARKERS.some(p => p.test(text));

  return {
    words,
    wordSet,
    avgWordLength,
    sentences,
    avgSentenceLength,
    punctuationDensity,
    capitalisationRatio,
    emojiList,
    emojiDensity,
    commonPhrases,
    transliteration,
    codeMixing,
  };
}

// ── Similarity computation ──────────────────────────────────────────────────

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? (intersection / union) * 100 : 0;
}

function similarityOfNumbers(a: number, b: number, maxDeviation: number): number {
  return Math.max(0, 100 - (Math.abs(a - b) / maxDeviation) * 100);
}

function sharedPhrases(phrasesA: string[], phrasesB: string[]): string[] {
  const setB = new Set(phrasesB);
  return [...new Set(phrasesA.filter(p => setB.has(p)))].slice(0, 6);
}

function comparePair(
  labelA: string,
  featA: TextFeatures,
  labelB: string,
  featB: TextFeatures
): StylometryPairResult {
  const vocabOverlap = jaccardSimilarity(featA.wordSet, featB.wordSet);
  const punctSim = similarityOfNumbers(featA.punctuationDensity, featB.punctuationDensity, 0.05);
  const capsSim = similarityOfNumbers(featA.capitalisationRatio, featB.capitalisationRatio, 0.05);
  const emojiSim = similarityOfNumbers(featA.emojiDensity, featB.emojiDensity, 0.1);
  const wordLenSim = similarityOfNumbers(featA.avgWordLength, featB.avgWordLength, 2);
  const sentLenSim = similarityOfNumbers(featA.avgSentenceLength, featB.avgSentenceLength, 10);
  const repeated = sharedPhrases(featA.commonPhrases, featB.commonPhrases);

  // Weighted overall similarity
  const similarity = Math.min(100, Math.round(
    vocabOverlap * 0.35 +
    punctSim * 0.15 +
    capsSim * 0.10 +
    emojiSim * 0.10 +
    wordLenSim * 0.15 +
    sentLenSim * 0.10 +
    Math.min(30, repeated.length * 5) * 0.05
  ));

  let confidenceLabel: StylometryPairResult["confidenceLabel"];
  if (similarity >= 75) confidenceLabel = "strong";
  else if (similarity >= 55) confidenceLabel = "moderate";
  else if (similarity >= 35) confidenceLabel = "weak";
  else confidenceLabel = "exploratory";

  return {
    sourceA: labelA,
    sourceB: labelB,
    similarity,
    confidenceLabel,
    features: {
      vocabularyOverlap: Math.round(vocabOverlap),
      punctuationSimilarity: Math.round(punctSim),
      capitalisationPattern: Math.round(capsSim),
      emojiUsageSimilarity: Math.round(emojiSim),
      avgWordLength: Math.round(wordLenSim),
      sentenceLengthSimilarity: Math.round(sentLenSim),
      repeatedPhrases: repeated,
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse a corpus of text sources and return full stylometry results
 * including all pairwise comparisons and global signature patterns.
 */
export function analyseStylometry(
  sources: { label: string; text: string; platform?: string }[]
): StylometryResult {
  const analysedAt = new Date().toISOString();

  if (sources.length < 2) {
    return {
      analysedAt,
      sources,
      pairResults: [],
      signaturePatterns: {
        repeatedPhrases: [],
        emojiHabits: [],
        punctuationHabits: [],
        transliterationPattern: false,
        codeMixingPattern: false,
      },
      analystCaution: ANALYST_CAUTION,
    };
  }

  // Extract features for each source
  const features = sources.map(s => ({ label: s.label, feat: extractFeatures(s.text) }));

  // All pairwise comparisons
  const pairResults: StylometryPairResult[] = [];
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      pairResults.push(comparePair(
        features[i].label, features[i].feat,
        features[j].label, features[j].feat
      ));
    }
  }

  // Global signature patterns across all sources
  const allPhrases = features.flatMap(f => f.feat.commonPhrases);
  const phraseFreq: Record<string, number> = {};
  for (const p of allPhrases) {
    phraseFreq[p] = (phraseFreq[p] || 0) + 1;
  }
  const repeatedPhrases = Object.entries(phraseFreq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 8);

  const allEmojis = features.flatMap(f => f.feat.emojiList);
  const emojiFreq: Record<string, number> = {};
  for (const e of allEmojis) {
    emojiFreq[e] = (emojiFreq[e] || 0) + 1;
  }
  const emojiHabits = Object.entries(emojiFreq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e)
    .slice(0, 5);

  const punctuationHabits = features
    .filter(f => f.feat.punctuationDensity > 0.03)
    .map(f => `${f.label}: ${(f.feat.punctuationDensity * 100).toFixed(1)} punct/100chars`);

  const transliterationPattern = features.some(f => f.feat.transliteration);
  const codeMixingPattern = features.some(f => f.feat.codeMixing);

  return {
    analysedAt,
    sources,
    pairResults,
    signaturePatterns: {
      repeatedPhrases,
      emojiHabits,
      punctuationHabits,
      transliterationPattern,
      codeMixingPattern,
    },
    analystCaution: ANALYST_CAUTION,
  };
}

const ANALYST_CAUTION =
  "Stylometric analysis is a supporting forensic tool — NOT definitive proof of authorship. " +
  "Language patterns can overlap for reasons unrelated to common authorship (shared vocabulary, " +
  "regional dialect, template messages). Results labeled 'strong overlap' still require corroborating " +
  "evidence before an attribution claim can be made. A forensic linguist should review before any " +
  "official action is taken.";
