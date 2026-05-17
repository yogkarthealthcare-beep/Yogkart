const diseaseService = require('../services/disease.service');

const detectDisease = async (req, res, next) => {
  try {
    const {
      originalText,
      detectedLanguage,
      detectedSymptoms,
    } = req.symptomAnalysis;

    const prediction = await diseaseService.predictDiseases(detectedSymptoms);
    const hasPredictions = prediction.possibleDiseases.length > 0;

    if (!hasPredictions) {
      return res.status(200).json({
        success: false,
        message: 'No matching condition found. Please consult a doctor or healthcare specialist.',
      });
    }

    return res.status(200).json({
      success: true,
      originalText,
      detectedLanguage,
      detectedSymptoms,
      possibleDiseases: prediction.possibleDiseases,
      predictionType: prediction.predictionType,
      guidance: prediction.guidance,
      reminders: prediction.reminders,
      message: 'Possible condition detected based on symptoms.',
      disclaimer: 'This is not a medical diagnosis. Please consult a healthcare professional.',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  detectDisease,
};
