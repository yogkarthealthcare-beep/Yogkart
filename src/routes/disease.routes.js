const express = require('express');
const router = express.Router();
const diseaseController = require('../controllers/disease.controller');
const { processSymptomText } = require('../middleware/symptom.middleware');

router.post('/detect-disease', processSymptomText, diseaseController.detectDisease);

module.exports = router;
