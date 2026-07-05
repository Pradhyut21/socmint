/**
 * Confidence Scoring System for LinkedIn Profiles
 * Calculates how well a profile matches the search query
 */

// ─── TF-IDF Cosine Similarity Helpers (used for headline/bio matching) ─────
// Common stopwords + generic bio/profile boilerplate — near-zero discriminative value
const STOPWORDS = new Set([
  "the", "a", "an", "is", "it", "of", "and", "or", "to", "in", "on", "at", "for",
  "with", "by", "from", "as", "this", "that", "i", "you", "he", "she", "we", "they",
  "my", "your", "his", "her", "our", "their", "am", "are", "was", "were", "be", "been",
  "public", "profile", "account", "user", "found", "active", "discovered", "confirmed", "verified",
]);

// Approximate IDF weights for common bio/profile terms (lower = less discriminative).
// Any term not listed falls back to a length-based heuristic (longer/rarer terms score higher).
const COMMON_WORD_IDF: Record<string, number> = {
  developer: 0.5, engineer: 0.5, student: 0.5, founder: 0.6, manager: 0.5,
  designer: 0.5, consultant: 0.6, analyst: 0.6, love: 0.3, passionate: 0.4,
  building: 0.4, working: 0.3, based: 0.3, currently: 0.3, profile: 0.2,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function termIdf(term: string): number {
  if (term in COMMON_WORD_IDF) return COMMON_WORD_IDF[term];
  // Rare/specific terms get more weight; longer terms tend to be more specific
  return Math.min(3, 1 + term.length / 8);
}

function tfidfVector(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map<string, number>();
  for (const [term, freq] of tf.entries()) {
    vec.set(term, freq * termIdf(term));
  }
  return vec;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const val of vecA.values()) normA += val * val;
  for (const val of vecB.values()) normB += val * val;
  for (const [term, valA] of vecA.entries()) {
    const valB = vecB.get(term);
    if (valB) dot += valA * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ConfidenceScore {
  overall: number; // 0-100
  breakdown: {
    nameMatch: number;
    locationMatch: number;
    headlineMatch: number;
    usernameMatch: number;
    photoAvailable: number;
    dataCompleteness: number;
  };
  reasoning: string[];
}

/**
 * Calculate confidence score for a LinkedIn profile match
 */
export function calculateConfidenceScore(
  searchQuery: string,
  profile: {
    name?: string;
    headline?: string;
    location?: string;
    username?: string;
    photoUrl?: string;
    currentPositions?: any[];
  }
): ConfidenceScore {
  
  const reasoning: string[] = [];
  const breakdown = {
    nameMatch: 0,
    locationMatch: 0,
    headlineMatch: 0,
    usernameMatch: 0,
    photoAvailable: 0,
    dataCompleteness: 0
  };
  
  // Normalize search query
  const queryNormalized = searchQuery.toLowerCase().trim();
  const queryWords = queryNormalized.split(/\s+/);
  
  // 1. Name Match (40 points max)
  if (profile.name) {
    const nameNormalized = profile.name.toLowerCase().trim();
    const nameWords = nameNormalized.split(/\s+/);
    
    // Exact match
    if (nameNormalized === queryNormalized) {
      breakdown.nameMatch = 40;
      reasoning.push('✅ Exact name match');
    }
    // All query words present in name
    else if (queryWords.every(word => nameNormalized.includes(word))) {
      breakdown.nameMatch = 35;
      reasoning.push('✅ All name components match');
    }
    // Partial match (at least 50% of words)
    else {
      const matchingWords = queryWords.filter(word => nameNormalized.includes(word));
      const matchRatio = matchingWords.length / queryWords.length;
      
      if (matchRatio >= 0.5) {
        breakdown.nameMatch = Math.round(matchRatio * 30);
        reasoning.push(`⚠️ Partial name match (${Math.round(matchRatio * 100)}%)`);
      } else {
        breakdown.nameMatch = Math.round(matchRatio * 15);
        reasoning.push(`⚠️ Weak name match (${Math.round(matchRatio * 100)}%)`);
      }
    }
  } else {
    reasoning.push('❌ Name not available');
  }
  
  // 2. Username Match (15 points max)
  if (profile.username) {
    const usernameNormalized = profile.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const queryNoSpaces = queryNormalized.replace(/[^a-z0-9]/g, '');
    
    // Exact username match
    if (usernameNormalized === queryNoSpaces) {
      breakdown.usernameMatch = 15;
      reasoning.push('✅ Username exact match');
    }
    // Username contains query
    else if (usernameNormalized.includes(queryNoSpaces)) {
      breakdown.usernameMatch = 10;
      reasoning.push('⚠️ Username partial match');
    }
    // Query contains username
    else if (queryNoSpaces.includes(usernameNormalized)) {
      breakdown.usernameMatch = 10;
      reasoning.push('⚠️ Username substring match');
    }
    // Fuzzy match
    else {
      const similarity = calculateStringSimilarity(usernameNormalized, queryNoSpaces);
      if (similarity > 0.6) {
        breakdown.usernameMatch = Math.round(similarity * 10);
        reasoning.push(`⚠️ Username similarity (${Math.round(similarity * 100)}%)`);
      }
    }
  }
  
  // 3. Headline/Bio Match (15 points max) — TF-IDF weighted cosine similarity
  // Bio text is free-form prose, so vector-based comparison captures overall
  // topical overlap better than literal substring/keyword counting.
  if (profile.headline) {
    const queryTokens = tokenize(searchQuery);
    const headlineTokens = tokenize(profile.headline);

    if (queryTokens.length > 0 && headlineTokens.length > 0) {
      const queryVec = tfidfVector(queryTokens);
      const headlineVec = tfidfVector(headlineTokens);
      const similarity = cosineSimilarity(queryVec, headlineVec);

      breakdown.headlineMatch = Math.round(Math.min(1, similarity) * 15);

      if (similarity >= 0.6) {
        reasoning.push(`✅ Headline strongly aligns with query (cosine ${Math.round(similarity * 100)}%)`);
      } else if (similarity >= 0.25) {
        reasoning.push(`⚠️ Headline partially aligns with query (cosine ${Math.round(similarity * 100)}%)`);
      } else if (similarity > 0) {
        reasoning.push(`⚠️ Weak headline overlap (cosine ${Math.round(similarity * 100)}%)`);
      } else {
        reasoning.push('❌ No headline term overlap with query');
      }
    }
  }
  
  // 4. Location Match (10 points max)
  if (profile.location) {
    const locationNormalized = profile.location.toLowerCase();
    
    // Check if any query words match location
    const locationMatches = queryWords.filter(word => 
      word.length > 3 && locationNormalized.includes(word)
    );
    
    if (locationMatches.length > 0) {
      breakdown.locationMatch = Math.min(10, locationMatches.length * 5);
      reasoning.push(`✅ Location contains ${locationMatches.length} matching terms`);
    }
  }
  
  // 5. Photo Available (10 points)
  if (profile.photoUrl) {
    breakdown.photoAvailable = 10;
    reasoning.push('✅ Profile photo available');
  } else {
    reasoning.push('⚠️ No profile photo');
  }
  
  // 6. Data Completeness (10 points)
  let completenessScore = 0;
  if (profile.name) completenessScore += 3;
  if (profile.headline) completenessScore += 2;
  if (profile.location) completenessScore += 2;
  if (profile.photoUrl) completenessScore += 2;
  if (profile.currentPositions && profile.currentPositions.length > 0) completenessScore += 1;
  
  breakdown.dataCompleteness = completenessScore;
  if (completenessScore >= 8) {
    reasoning.push('✅ Complete profile data');
  } else if (completenessScore >= 5) {
    reasoning.push('⚠️ Partial profile data');
  } else {
    reasoning.push('❌ Limited profile data');
  }
  
  // Calculate overall score
  const overall = Math.round(
    breakdown.nameMatch +
    breakdown.usernameMatch +
    breakdown.headlineMatch +
    breakdown.locationMatch +
    breakdown.photoAvailable +
    breakdown.dataCompleteness
  );
  
  return {
    overall: Math.min(100, overall),
    breakdown,
    reasoning
  };
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - (distance / maxLen);
}

/**
 * Sort profiles by confidence score (descending)
 */
export function sortByConfidence<T extends { confidence?: number }>(
  profiles: T[]
): T[] {
  return profiles.sort((a, b) => {
    const confA = a.confidence || 0;
    const confB = b.confidence || 0;
    return confB - confA; // Descending order
  });
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (score >= 80) {
    return { label: 'Very High', color: 'green', emoji: '🟢' };
  } else if (score >= 60) {
    return { label: 'High', color: 'lightgreen', emoji: '🟡' };
  } else if (score >= 40) {
    return { label: 'Medium', color: 'yellow', emoji: '🟠' };
  } else if (score >= 20) {
    return { label: 'Low', color: 'orange', emoji: '🔴' };
  } else {
    return { label: 'Very Low', color: 'red', emoji: '⚫' };
  }
}
