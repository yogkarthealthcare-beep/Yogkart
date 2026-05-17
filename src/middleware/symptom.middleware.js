const { detectLanguage } = require('../utils/languageDetector');
const { extractSymptoms, normalizeText } = require('../utils/symptomExtractor');

const MAX_TEXT_LENGTH = 2000;

const processSymptomText = async (req, res, next) => {
  try {
    const { text } = req.body || {};

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text is required and must be a non-empty string.',
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(413).json({
        success: false,
        message: `Text must not exceed ${MAX_TEXT_LENGTH} characters.`,
      });
    }

    const normalizedText = normalizeText(text);
    const detectedLanguage = detectLanguage(text);
    const detectedSymptoms = extractSymptoms(text);

    req.symptomAnalysis = {
      originalText: text,
      normalizedText,
      detectedLanguage,
      detectedSymptoms,
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  processSymptomText,
};
