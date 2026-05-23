const symptoms = require('../data/symptoms.data');

const normalizeText = (text = '') => {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasAlias = (normalizedText, alias) => {
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) return false;

  if (/^[a-z0-9\s_]+$/i.test(normalizedAlias)) {
    const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedAlias)}(?=\\s|$)`, 'iu');
    return pattern.test(normalizedText);
  }

  return normalizedText.includes(normalizedAlias);
};

const extractSymptoms = (text = '') => {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return [];

  const detected = symptoms
    .filter((symptom) => symptom.aliases.some((alias) => hasAlias(normalizedText, alias)))
    .map((symptom) => symptom.key);

  return [...new Set(detected)];
};

module.exports = {
  extractSymptoms,
  normalizeText,
};
