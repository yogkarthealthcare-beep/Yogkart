const calculateDiseaseScore = (disease, detectedSymptoms) => {
  const diseaseSymptoms = disease.symptoms || {};
  const totalWeight = Object.values(diseaseSymptoms).reduce((total, weight) => total + weight, 0);

  if (!totalWeight) {
    return {
      score: 0,
      matchedSymptoms: [],
      matchedWeight: 0,
      totalWeight: 0,
    };
  }

  const matchedSymptoms = detectedSymptoms.filter((symptom) => diseaseSymptoms[symptom]);
  const matchedWeight = matchedSymptoms.reduce((total, symptom) => total + diseaseSymptoms[symptom], 0);
  const coverageBonus = matchedSymptoms.length / Math.max(detectedSymptoms.length, 1);
  const completeMatchBonus = coverageBonus === 1 && matchedSymptoms.length >= 2 ? 5 : 0;
  const rawScore = (matchedWeight / totalWeight) * 70 + coverageBonus * 30 + completeMatchBonus;

  return {
    score: Math.min(100, Math.round(rawScore)),
    matchedSymptoms,
    matchedWeight,
    totalWeight,
  };
};

module.exports = {
  calculateDiseaseScore,
};
