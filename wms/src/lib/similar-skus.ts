// Lightweight duplicate-SKU detection: no full-text search engine available
// in SQLite for the pilot, so we score candidates in JS with token-overlap
// (Jaccard) similarity over normalized descriptions. Good enough for a
// catalog of a few hundred packaging SKUs per unit.

const STOPWORDS = new Set(["de", "da", "do", "para", "com", "e", "a", "o"]);

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (after NFD normalization)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word));
}

export function descriptionSimilarity(a: string, b: string): number {
  const ta = new Set(normalize(a));
  const tb = new Set(normalize(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const word of ta) {
    if (tb.has(word)) intersection++;
  }
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

export const SIMILARITY_WARNING_THRESHOLD = 0.4;
