const defaultReminderSchedule = [
  {
    type: 'water',
    time: '7:00 AM',
    message: 'Drink warm lemon water.',
  },
  {
    type: 'meal',
    time: '8:30 AM',
    message: 'Eat a light breakfast.',
  },
  {
    type: 'water',
    time: '10:30 AM',
    message: 'Drink a glass of water.',
  },
  {
    type: 'walking',
    time: '5:30 PM',
    message: 'Take a gentle walk if you feel comfortable.',
  },
  {
    type: 'yoga',
    time: '7:00 PM',
    message: 'Practice gentle breathing or meditation.',
  },
  {
    type: 'sleep',
    time: '10:00 PM',
    message: 'Prepare for sleep and avoid screens.',
  },
];

const reminderScheduleByDisease = {
  Migraine: [
    { type: 'water', time: '7:00 AM', message: 'Drink warm water and avoid skipping breakfast.' },
    { type: 'medicine', time: '9:00 AM', message: 'Take prescribed medicine only if advised by your doctor.' },
    { type: 'rest', time: '1:00 PM', message: 'Rest your eyes in a quiet place for 10 minutes.' },
    { type: 'yoga', time: '7:00 PM', message: 'Practice Anulom Vilom or meditation gently.' },
    { type: 'sleep', time: '10:00 PM', message: 'Sleep on time to reduce headache triggers.' },
  ],
  'Food Poisoning': [
    { type: 'water', time: '7:00 AM', message: 'Start with small sips of ORS or water.' },
    { type: 'water', time: '9:00 AM', message: 'Drink fluids slowly to avoid dehydration.' },
    { type: 'meal', time: '1:00 PM', message: 'Eat light food only if nausea is controlled.' },
    { type: 'medicine', time: '6:00 PM', message: 'Use prescribed medicine only as directed.' },
    { type: 'sleep', time: '10:00 PM', message: 'Rest and monitor dehydration signs.' },
  ],
  'Viral Fever': [
    { type: 'water', time: '7:00 AM', message: 'Drink warm water and check temperature.' },
    { type: 'medicine', time: '9:00 AM', message: 'Take fever medicine only as prescribed.' },
    { type: 'meal', time: '1:00 PM', message: 'Eat light warm food.' },
    { type: 'water', time: '4:00 PM', message: 'Hydrate and recheck temperature if needed.' },
    { type: 'sleep', time: '9:30 PM', message: 'Rest early for recovery.' },
  ],
};

module.exports = {
  defaultReminderSchedule,
  reminderScheduleByDisease,
};
