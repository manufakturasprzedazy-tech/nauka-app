const POLISH_STOPWORDS = new Set([
  'i', 'w', 'z', 'na', 'do', 'nie', 'to', 'jest', 'się', 'że', 'o', 'co',
  'jak', 'ale', 'za', 'od', 'po', 'tak', 'lub', 'czy', 'przez', 'są',
  'dla', 'ten', 'ta', 'te', 'być', 'już', 'jego', 'jej', 'ich', 'tylko',
  'tym', 'tego', 'tej', 'także', 'które', 'który', 'która', 'które',
  'może', 'będzie', 'gdy', 'tych', 'tym', 'jako', 'inne', 'innych',
  'aby', 'więc', 'jest', 'pod', 'nad', 'przed', 'między',
  'np', 'etc', 'tzn', 'tzw', 'itp',
  // English common
  'the', 'is', 'a', 'an', 'in', 'of', 'to', 'and', 'or', 'for', 'it',
  'that', 'this', 'are', 'was', 'be', 'has', 'have', 'with', 'can',
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !POLISH_STOPWORDS.has(w))
  );
}

export interface SimilarityResult {
  score: number; // 0-1
  matchedKeywords: string[];
  missedKeywords: string[];
  suggestedRating: number; // 1-5
}

export function calculateSimilarity(userText: string, modelText: string): SimilarityResult {
  const modelKeywords = extractKeywords(modelText);
  const userKeywords = extractKeywords(userText);

  if (modelKeywords.size === 0) {
    return { score: 0, matchedKeywords: [], missedKeywords: [], suggestedRating: 3 };
  }

  const matched: string[] = [];
  const missed: string[] = [];

  for (const keyword of modelKeywords) {
    if (userKeywords.has(keyword)) {
      matched.push(keyword);
    } else {
      missed.push(keyword);
    }
  }

  // Jaccard similarity
  const union = new Set([...modelKeywords, ...userKeywords]);
  const intersection = matched.length;
  const score = union.size > 0 ? intersection / union.size : 0;

  // Keyword coverage (how much of model answer is covered)
  const coverage = matched.length / modelKeywords.size;

  let suggestedRating: number;
  if (coverage >= 0.8) suggestedRating = 5;
  else if (coverage >= 0.6) suggestedRating = 4;
  else if (coverage >= 0.4) suggestedRating = 3;
  else if (coverage >= 0.2) suggestedRating = 2;
  else suggestedRating = 1;

  return { score, matchedKeywords: matched, missedKeywords: missed.slice(0, 10), suggestedRating };
}
