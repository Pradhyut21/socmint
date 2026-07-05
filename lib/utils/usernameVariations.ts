/**
 * Username Variation Generator
 * Creates possible username variations from a given name
 * Used to find related accounts across platforms
 */

export interface UsernameVariation {
  username: string;
  type: 'exact' | 'nospaces' | 'dashes' | 'underscores' | 'dots' | 'initials' | 'reversed' | 'abbreviated';
  confidence: number; // How likely this variation is to be the real account
}

/**
 * Generate all possible username variations from a name
 */
export function generateUsernameVariations(name: string): UsernameVariation[] {
  const variations: UsernameVariation[] = [];
  const nameLower = name.toLowerCase().trim();
  const words = nameLower.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return [];
  
  // 1. EXACT (original query)
  variations.push({
    username: nameLower,
    type: 'exact',
    confidence: 100
  });
  
  // 2. NO SPACES (most common)
  const noSpaces = words.join('');
  if (noSpaces !== nameLower) {
    variations.push({
      username: noSpaces,
      type: 'nospaces',
      confidence: 95
    });
  }
  
  // 3. DASHES
  const withDashes = words.join('-');
  variations.push({
    username: withDashes,
    type: 'dashes',
    confidence: 90
  });
  
  // 4. UNDERSCORES
  const withUnderscores = words.join('_');
  variations.push({
    username: withUnderscores,
    type: 'underscores',
    confidence: 85
  });
  
  // 5. DOTS
  const withDots = words.join('.');
  variations.push({
    username: withDots,
    type: 'dots',
    confidence: 80
  });
  
  // 6. REVERSED (last name first)
  if (words.length >= 2) {
    const reversed = [...words].reverse().join('');
    variations.push({
      username: reversed,
      type: 'reversed',
      confidence: 75
    });
    
    const reversedDash = [...words].reverse().join('-');
    variations.push({
      username: reversedDash,
      type: 'reversed',
      confidence: 70
    });
  }
  
  // 7. INITIALS + LAST NAME (for "John Smith" -> "jsmith", "j.smith")
  if (words.length >= 2) {
    const initials = words.slice(0, -1).map(w => w[0]).join('');
    const lastName = words[words.length - 1];
    
    variations.push({
      username: initials + lastName,
      type: 'initials',
      confidence: 85
    });
    
    variations.push({
      username: initials + '.' + lastName,
      type: 'initials',
      confidence: 80
    });
    
    variations.push({
      username: initials + '-' + lastName,
      type: 'initials',
      confidence: 75
    });
  }
  
  // 8. FIRST NAME + LAST INITIAL (for "John Smith" -> "johns", "john.s")
  if (words.length >= 2) {
    const firstName = words[0];
    const lastInitial = words[words.length - 1][0];
    
    variations.push({
      username: firstName + lastInitial,
      type: 'abbreviated',
      confidence: 80
    });
    
    variations.push({
      username: firstName + '.' + lastInitial,
      type: 'abbreviated',
      confidence: 75
    });
    
    variations.push({
      username: firstName + '-' + lastInitial,
      type: 'abbreviated',
      confidence: 70
    });
  }
  
  // 9. ABBREVIATED VERSIONS (for longer names)
  if (words.length >= 3) {
    // First + Middle Initial + Last (for "John Paul Smith" -> "jpsmith", "j.p.smith")
    const firstMiddle = words.slice(0, -1).map(w => w[0]).join('');
    const last = words[words.length - 1];
    
    variations.push({
      username: firstMiddle + last,
      type: 'abbreviated',
      confidence: 75
    });
  }
  
  // 10. COMMON NUMBER SUFFIXES (123, 01, 99, etc.)
  const commonSuffixes = ['', '1', '01', '123', '786', '007'];
  const baseUsername = noSpaces;
  
  commonSuffixes.forEach(suffix => {
    if (suffix) {
      variations.push({
        username: baseUsername + suffix,
        type: 'abbreviated',
        confidence: 60
      });
    }
  });
  
  // Remove duplicates
  const unique = new Map<string, UsernameVariation>();
  variations.forEach(v => {
    if (!unique.has(v.username) || unique.get(v.username)!.confidence < v.confidence) {
      unique.set(v.username, v);
    }
  });
  
  // Sort by confidence (descending)
  return Array.from(unique.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20); // Limit to top 20 variations
}

/**
 * Check if a username matches any variation
 */
export function matchesVariation(
  username: string,
  variations: UsernameVariation[]
): { matches: boolean; variation?: UsernameVariation; similarity: number } {
  
  const usernameLower = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const variation of variations) {
    const varLower = variation.username.replace(/[^a-z0-9]/g, '');
    
    // Exact match
    if (usernameLower === varLower) {
      return {
        matches: true,
        variation,
        similarity: 1.0
      };
    }
    
    // Contains
    if (usernameLower.includes(varLower) || varLower.includes(usernameLower)) {
      return {
        matches: true,
        variation,
        similarity: 0.8
      };
    }
  }
  
  // Check fuzzy similarity
  const bestMatch = variations.reduce((best, variation) => {
    const varLower = variation.username.replace(/[^a-z0-9]/g, '');
    const similarity = calculateSimilarity(usernameLower, varLower);
    
    if (similarity > best.similarity) {
      return { variation, similarity };
    }
    return best;
  }, { variation: variations[0], similarity: 0 });
  
  if (bestMatch.similarity > 0.7) {
    return {
      matches: true,
      variation: bestMatch.variation,
      similarity: bestMatch.similarity
    };
  }
  
  return {
    matches: false,
    similarity: bestMatch.similarity
  };
}

/**
 * Simple string similarity calculation
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
}

/**
 * Get human-readable description of variation type
 */
export function getVariationDescription(type: UsernameVariation['type']): string {
  const descriptions = {
    exact: 'Exact match',
    nospaces: 'Without spaces',
    dashes: 'With dashes',
    underscores: 'With underscores',
    dots: 'With dots',
    initials: 'Initials format',
    reversed: 'Reversed name order',
    abbreviated: 'Abbreviated format'
  };
  
  return descriptions[type] || 'Variation';
}
