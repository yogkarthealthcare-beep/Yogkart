const diseases = require('../data/diseases.data');
const { calculateDiseaseScore } = require('./scoreCalculator');

const matchDiseases = (detectedSymptoms = []) => {
  if (!detectedSymptoms.length) return [];

  return diseases
    .map((disease) => {
      const scoreDetails = calculateDiseaseScore(disease, detectedSymptoms);

      return {
        disease: disease.disease,
        score: scoreDetails.score,
        matchedSymptoms: scoreDetails.matchedSymptoms,
      };
    })
    .filter((result) => {
      const disease = diseases.find((item) => item.disease === result.disease);
      return result.score >= (disease?.minimumScore || 1);
    })
    .sort((a, b) => b.score - a.score);
};

module.exports = {
  matchDiseases,
};
