function stripSurroundingQuotes(value) {
  let current = value;
  while (
    current.length >= 2 &&
    ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'")))
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

export function normalizeText(value, { stripQuotes = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  let text = String(value).trim();
  if (text === '') return null;
  if (stripQuotes) {
    text = stripSurroundingQuotes(text);
  }
  if (text === '') return null;
  if (text.toLowerCase() === 'null') return null;
  return text;
}

export function normalizeCategoryName(value) {
  return normalizeText(value, { stripQuotes: true });
}

export function normalizeNameForComparison(value) {
  const normalized = normalizeCategoryName(value);
  if (!normalized) return undefined;
  return normalized.replace(/\s+/g, ' ').trim().toLowerCase();
}
