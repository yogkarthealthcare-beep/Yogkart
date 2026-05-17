const defaultGuidance = {
  recoveryEstimate: 'Depends on severity and medical history.',
  diet: [
    'Drink warm water at regular intervals.',
    'Eat light, freshly cooked food.',
    'Avoid oily, spicy, and heavily processed food.',
  ],
  yoga: [
    'Anulom Vilom',
    'Gentle breathing practice',
    'Short guided meditation',
  ],
  ayurveda: [
    'Consult an Ayurveda practitioner before taking herbs.',
    'Use simple home care only when symptoms are mild.',
  ],
  dailyRoutine: [
    'Rest adequately.',
    'Track symptoms morning and evening.',
    'Avoid self-medication without professional advice.',
  ],
  lifestyle: [
    'Maintain sleep hygiene.',
    'Avoid dehydration.',
    'Seek urgent care if symptoms worsen.',
  ],
};

const guidanceByDisease = {
  Migraine: {
    recoveryEstimate: '4-72 hours for an episode; recurring cases need medical review.',
    diet: [
      'Drink warm water.',
      'Eat light meals at regular times.',
      'Avoid skipped meals, excess caffeine, and trigger foods.',
    ],
    yoga: [
      'Anulom Vilom',
      'Bhramari Pranayama',
      'Meditation',
    ],
    ayurveda: [
      'Brahmi under practitioner guidance.',
      'Ashwagandha under practitioner guidance.',
      'Apply a calming routine and avoid known triggers.',
    ],
    dailyRoutine: [
      'Rest in a quiet room during severe headache.',
      'Reduce screen brightness.',
      'Maintain a consistent sleep schedule.',
    ],
    lifestyle: [
      'Identify headache triggers.',
      'Avoid dehydration.',
      'Consult a doctor if headache is sudden, severe, or associated with weakness.',
    ],
  },
  'Food Poisoning': {
    recoveryEstimate: '1-3 days for mild cases; dehydration needs urgent care.',
    diet: [
      'ORS or electrolyte fluids.',
      'Rice, banana, toast, and light soup.',
      'Avoid oily food, dairy, alcohol, and street food.',
    ],
    yoga: [
      'Restorative breathing',
      'Vajrasana only if comfortable after meals',
    ],
    ayurveda: [
      'Jeera water may support digestion.',
      'Ginger tea may help nausea if tolerated.',
      'Avoid strong herbs without clinical advice.',
    ],
    dailyRoutine: [
      'Take small frequent sips of fluid.',
      'Monitor urine frequency and dizziness.',
      'Eat small portions after nausea improves.',
    ],
    lifestyle: [
      'Prioritize hydration.',
      'Seek care for blood in stool, high fever, or persistent vomiting.',
    ],
  },
  'Viral Fever': {
    recoveryEstimate: '3-7 days in many mild cases.',
    diet: [
      'Warm fluids.',
      'Light khichdi, soup, fruits, and easy-to-digest meals.',
      'Avoid fried and heavy foods.',
    ],
    yoga: [
      'Deep breathing',
      'Gentle stretching after fever reduces',
    ],
    ayurveda: [
      'Tulsi tea may support comfort.',
      'Giloy should be used only after professional advice.',
    ],
    dailyRoutine: [
      'Check temperature periodically.',
      'Rest well.',
      'Keep hydration steady.',
    ],
    lifestyle: [
      'Avoid intense exercise during fever.',
      'Consult a doctor if fever persists beyond 3 days or rises very high.',
    ],
  },
  'Common Cold': {
    recoveryEstimate: '5-10 days.',
    diet: [
      'Warm water.',
      'Soup and light meals.',
      'Avoid cold drinks if they worsen throat irritation.',
    ],
    yoga: [
      'Steam inhalation support routine',
      'Anulom Vilom when breathing is comfortable',
    ],
    ayurveda: [
      'Tulsi ginger tea if tolerated.',
      'Honey for adults may soothe cough.',
    ],
    dailyRoutine: [
      'Rest and avoid overexertion.',
      'Gargle with warm salt water if throat is sore.',
      'Maintain hygiene to reduce spread.',
    ],
    lifestyle: [
      'Sleep adequately.',
      'Avoid smoke and dust exposure.',
    ],
  },
  Flu: {
    recoveryEstimate: '5-14 days depending on severity.',
    diet: [
      'Warm fluids.',
      'Protein-rich light meals.',
      'Fruits and easy-to-digest foods.',
    ],
    yoga: [
      'Rest first.',
      'Gentle breathing after fever improves.',
    ],
    ayurveda: [
      'Tulsi tea may support comfort.',
      'Avoid combining herbs with medicines without advice.',
    ],
    dailyRoutine: [
      'Rest at home.',
      'Track fever and breathing.',
      'Avoid close contact with others while symptomatic.',
    ],
    lifestyle: [
      'Avoid strenuous activity.',
      'Seek care for breathing difficulty or chest pain.',
    ],
  },
  Bronchitis: {
    recoveryEstimate: '1-3 weeks; persistent symptoms need review.',
    diet: [
      'Warm fluids.',
      'Light meals.',
      'Avoid smoke, alcohol, and very cold drinks.',
    ],
    yoga: [
      'Pursed-lip breathing',
      'Gentle pranayama only if breathing is comfortable.',
    ],
    ayurveda: [
      'Honey for adults may soothe cough.',
      'Use herbs only after medical guidance if breathing is affected.',
    ],
    dailyRoutine: [
      'Avoid dust and smoke.',
      'Rest between activities.',
      'Monitor breathing difficulty.',
    ],
    lifestyle: [
      'Seek urgent care for severe breathlessness or chest pain.',
      'Do not ignore wheezing or blue lips.',
    ],
  },
  Gastritis: {
    recoveryEstimate: '2-7 days for mild irritation; recurring pain needs evaluation.',
    diet: [
      'Small frequent meals.',
      'Bland foods like rice, banana, and curd if tolerated.',
      'Avoid spicy, acidic, and fried foods.',
    ],
    yoga: [
      'Vajrasana after meals if comfortable.',
      'Gentle breathing',
    ],
    ayurveda: [
      'Fennel water may soothe digestion.',
      'Avoid strong remedies without practitioner advice.',
    ],
    dailyRoutine: [
      'Avoid lying down immediately after meals.',
      'Eat slowly.',
      'Track foods that trigger pain.',
    ],
    lifestyle: [
      'Avoid alcohol and smoking.',
      'Consult a doctor for severe pain, black stool, or vomiting blood.',
    ],
  },
  'Respiratory Infection': {
    recoveryEstimate: '7-14 days; breathing symptoms need careful monitoring.',
    diet: [
      'Warm fluids.',
      'Light protein-rich meals.',
      'Avoid smoke-triggering foods or cold beverages if they worsen symptoms.',
    ],
    yoga: [
      'Gentle breathing only when comfortable.',
      'Avoid forceful pranayama during breathing difficulty.',
    ],
    ayurveda: [
      'Tulsi tea may support comfort.',
      'Professional advice is important for breathing symptoms.',
    ],
    dailyRoutine: [
      'Monitor breathing and fever.',
      'Rest adequately.',
      'Avoid pollution and smoke.',
    ],
    lifestyle: [
      'Seek urgent care for chest pain, severe breathlessness, or low oxygen signs.',
    ],
  },
};

module.exports = {
  defaultGuidance,
  guidanceByDisease,
};
