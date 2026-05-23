const { matchDiseases } = require('../utils/diseaseMatcher');
const { generateGuidance } = require('./guidance.service');
const { generateReminders } = require('./reminder.service');

const HIGH_CONFIDENCE_SCORE = 85;
const CLEAR_WINNER_GAP = 25;
const MAX_RESULTS = 5;

const detectPredictionType = (rankedDiseases) => {
  if (!rankedDiseases.length) return 'No Disease Detected';

  const [topDisease, secondDisease] = rankedDiseases;
  if (!secondDisease) return 'Single Disease';

  const hasClearWinner =
    topDisease.score >= HIGH_CONFIDENCE_SCORE &&
    topDisease.score - secondDisease.score > CLEAR_WINNER_GAP;

  return hasClearWinner ? 'Single Disease' : 'Combination';
};

const filterPredictionResults = (rankedDiseases, predictionType) => {
  if (predictionType === 'Single Disease') return rankedDiseases.slice(0, 1);

  const topScore = rankedDiseases[0]?.score || 0;
  return rankedDiseases
    .filter((disease) => disease.score >= Math.max(25, topScore - 45))
    .slice(0, MAX_RESULTS);
};

const predictDiseases = async (detectedSymptoms = []) => {
  const rankedDiseases = matchDiseases(detectedSymptoms);
  const predictionType = detectPredictionType(rankedDiseases);
  const possibleDiseases = filterPredictionResults(rankedDiseases, predictionType)
    .map(({ disease, score }) => ({ disease, confidence: score }));
  const guidance = possibleDiseases.length ? await generateGuidance(possibleDiseases) : null;
  const reminders = possibleDiseases.length ? await generateReminders({ possibleDiseases }) : [];

  return {
    possibleDiseases,
    predictionType,
    guidance,
    reminders,
  };
};

module.exports = {
  predictDiseases,
};
