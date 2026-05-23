const { defaultGuidance, guidanceByDisease } = require('../data/healthGuidance.data');

const mergeUnique = (base = [], override = []) => {
  return [...new Set([...(override.length ? override : base)])];
};

const generateGuidance = async (possibleDiseases = []) => {
  const primaryDisease = possibleDiseases[0]?.disease;
  const diseaseGuidance = guidanceByDisease[primaryDisease] || {};

  return {
    recoveryEstimate: diseaseGuidance.recoveryEstimate || defaultGuidance.recoveryEstimate,
    diet: mergeUnique(defaultGuidance.diet, diseaseGuidance.diet),
    yoga: mergeUnique(defaultGuidance.yoga, diseaseGuidance.yoga),
    ayurveda: mergeUnique(defaultGuidance.ayurveda, diseaseGuidance.ayurveda),
    dailyRoutine: mergeUnique(defaultGuidance.dailyRoutine, diseaseGuidance.dailyRoutine),
    lifestyle: mergeUnique(defaultGuidance.lifestyle, diseaseGuidance.lifestyle),
  };
};

module.exports = {
  generateGuidance,
};
