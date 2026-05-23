const diseases = [
  {
    disease: 'Migraine',
    symptoms: {
      headache: 10,
      nausea: 7,
      dizziness: 4,
    },
    minimumScore: 35,
  },
  {
    disease: 'Food Poisoning',
    symptoms: {
      nausea: 9,
      stomach_pain: 8,
      diarrhea: 8,
      fever: 4,
      fatigue: 3,
      headache: 4,
    },
    minimumScore: 32,
  },
  {
    disease: 'Viral Fever',
    symptoms: {
      fever: 10,
      headache: 5,
      body_ache: 7,
      fatigue: 6,
      cough: 3,
    },
    minimumScore: 30,
  },
  {
    disease: 'Common Cold',
    symptoms: {
      runny_nose: 10,
      cough: 7,
      sore_throat: 6,
      headache: 3,
      fever: 2,
      fatigue: 2,
    },
    minimumScore: 28,
  },
  {
    disease: 'Flu',
    symptoms: {
      fever: 9,
      cough: 7,
      sore_throat: 5,
      body_ache: 8,
      headache: 5,
      fatigue: 7,
    },
    minimumScore: 34,
  },
  {
    disease: 'Bronchitis',
    symptoms: {
      cough: 10,
      breathing_difficulty: 7,
      chest_pain: 5,
      fatigue: 4,
      fever: 3,
    },
    minimumScore: 32,
  },
  {
    disease: 'Gastritis',
    symptoms: {
      stomach_pain: 10,
      nausea: 7,
      vomiting: 4,
      fatigue: 2,
    },
    minimumScore: 30,
  },
  {
    disease: 'Respiratory Infection',
    symptoms: {
      cough: 8,
      fever: 7,
      sore_throat: 5,
      breathing_difficulty: 8,
      chest_pain: 5,
      fatigue: 4,
    },
    minimumScore: 35,
  },
];

module.exports = diseases;
