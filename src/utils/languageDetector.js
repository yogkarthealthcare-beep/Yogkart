const bhojpuriMarkers = [' बा', ' बानी', ' बाटे', ' दुखत', ' करेला', ' होत बा'];
const hindiMarkers = ['मुझे', 'है', 'और', 'दर्द', 'बुखार', 'उल्टी', 'सांस', 'गला'];
const hinglishMarkers = ['mujhe', 'hai', 'aur', 'dard', 'bukhar', 'ulti', 'khansi'];

const countMatches = (text, pattern) => {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
};

const hasAnyMarker = (text, markers) => markers.some((marker) => text.includes(marker));

const detectLanguage = (text = '') => {
  const normalized = text.toLowerCase();
  const devanagariCount = countMatches(text, /[\u0900-\u097F]/g);
  const arabicCount = countMatches(text, /[\u0600-\u06FF]/g);
  const latinCount = countMatches(text, /[a-zA-Z]/g);
  const scriptTypes = [devanagariCount > 0, arabicCount > 0, latinCount > 0].filter(Boolean).length;

  if (scriptTypes > 1) return 'Mixed';
  if (arabicCount > 0) return 'Arabic';
  if (devanagariCount > 0 && hasAnyMarker(` ${normalized}`, bhojpuriMarkers)) return 'Bhojpuri';
  if (devanagariCount > 0 || hasAnyMarker(normalized, hindiMarkers)) return 'Hindi';
  if (latinCount > 0 && hasAnyMarker(normalized, hinglishMarkers)) return 'Hinglish';
  if (latinCount > 0) return 'English';

  return 'Unknown';
};

module.exports = {
  detectLanguage,
};
