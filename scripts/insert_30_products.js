const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

// Categories to ensure exist in categories table
const CATEGORIES_DATA = [
  { id: 'pain-relief-support', name: 'Pain Relief & Support', sort_order: 6 },
  { id: 'fitness-wellness', name: 'Fitness & Wellness', sort_order: 7 },
  { id: 'wellness-sleep', name: 'Wellness & Sleep', sort_order: 8 },
  { id: 'beauty-tools', name: 'Beauty Tools', sort_order: 9 }
];

// Helper to count words
function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

const RAW_PRODUCTS = [
  // 1. Posture Corrector Belt for Men & Women
  {
    name: 'Posture Corrector Belt for Men & Women',
    slug: 'yogkart-posture-corrector-belt-for-men-women',
    category_id: 'pain-relief-support',
    subcategory: 'Posture Support',
    price: 399,
    original_price: 899,
    flags: { featured: true, new: true, best_seller: true },
    short_description: 'Adjustable posture corrector belt for upper back, shoulder and neck alignment during desk work and daily use.',
    benefits: [
      'Helps remind you to sit and stand upright',
      'Adjustable fit for men and women',
      'Breathable, lightweight and wearable under clothes'
    ],
    material: 'Neoprene, breathable mesh, velcro',
    specs: [
      { label: 'Size', value: 'Free size, adjustable (28-44 inch chest)' },
      { label: 'Material', value: 'Neoprene with breathable mesh' },
      { label: 'Closure', value: 'Velcro straps' },
      { label: 'Colour', value: 'Black' }
    ],
    how_to_use: [
      'Wear the belt over the shoulders and cross the straps behind your back.',
      'Adjust the straps until comfortable and snug.',
      'Start with 20-30 minutes a day and increase slowly.'
    ],
    precautions: 'Do not wear for more than 2-3 hours at a stretch. Stop use if you feel discomfort. Consult a doctor for any existing back or spine condition.',
    tags: ['posture corrector', 'back support', 'shoulder support', 'desk posture', 'office wellness'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Can I wear it under my shirt?', answer: 'Yes, the slim design fits under normal clothing.' },
      { question: 'Is it suitable for women?', answer: 'Yes, it is adjustable and suits both men and women.' }
    ],
    description: 'YogKart Posture Corrector Belt provides dependable upper body support to help maintain comfortable shoulder and spinal alignment throughout your workday. Crafted with lightweight breathable neoprene mesh, it fits discreetly under clothing so you can wear it at the office, home, or during daily walks. Adjustable velcro straps allow a customised snug fit for both men and women. Wearing it regularly serves as a gentle reminder to avoid slouching and slouch-induced strain. Experience better posture comfort and daily confidence with this ergonomic support brace. Suitable for long desk hours and everyday routines.',
    seo_title: 'Posture Corrector Belt | Best Price | YogKart',
    meta_description: 'Buy YogKart Posture Corrector Belt online at Rs 399. Get adjustable upper back and shoulder alignment support. Order today on YogKart.',
    meta_keywords: ['posture corrector', 'back support belt', 'shoulder brace', 'desk posture support', 'posture belt men women', 'buy online india', 'yogkart', 'ergonomic back brace'],
    seo_description: 'Improve daily posture with the YogKart Posture Corrector Belt. Designed for men and women, this adjustable brace offers breathable shoulder and back support for work and home comfort.',
    product_highlights: [
      'Universal adjustable chest fit (28 to 44 inches)',
      'Breathable neoprene mesh for all-day comfort',
      'Discreet slim profile wearable under daily clothing',
      'Sturdy velcro closure for quick adjustment'
    ],
    image_alt_text: 'YogKart Posture Corrector Belt for Men and Women - Adjustable Back Support',
    stock: 185
  },

  // 2. Mini Massage Gun | Rechargeable Deep Tissue Percussion Massager
  {
    name: 'Mini Massage Gun | Rechargeable Deep Tissue Percussion Massager',
    slug: 'yogkart-mini-massage-gun-rechargeable',
    category_id: 'pain-relief-support',
    subcategory: 'Massagers',
    price: 1599,
    original_price: 3499,
    flags: { featured: true, new: true, best_seller: true },
    short_description: 'Compact rechargeable massage gun with multiple speeds and attachment heads for post-workout muscle relaxation.',
    benefits: [
      'Multiple speed levels for personalised massage',
      'Interchangeable heads for different muscle areas',
      'Portable, rechargeable and quiet'
    ],
    material: 'ABS body, silicone grip, lithium battery',
    specs: [
      { label: 'Speed Levels', value: '6' },
      { label: 'Attachments', value: '4 massage heads' },
      { label: 'Charging', value: 'USB Type-C' },
      { label: 'Battery Life', value: 'Up to 6 hours' }
    ],
    how_to_use: [
      'Fit a massage head and switch on at the lowest speed.',
      'Glide gently over the muscle for 1-2 minutes per area.',
      'Increase speed as comfortable. Do not press hard.'
    ],
    precautions: 'Do not use on bones, joints, neck front, or injured skin. Not for use by pregnant women or people with pacemakers without medical advice.',
    tags: ['massage gun', 'muscle massager', 'percussion massager', 'gym recovery', 'body massager'],
    pack_size: '1 Unit + 4 Heads + Charging Cable + Pouch',
    faqs: [
      { question: 'How long does it take to charge?', answer: 'About 2-3 hours with a USB charger.' },
      { question: 'Can I use it daily?', answer: 'Short sessions of 1-2 minutes per muscle area are generally suitable.' }
    ],
    description: 'YogKart Mini Massage Gun delivers focused percussion vibrations to assist post-workout muscle recovery and daily body relaxation. Engineered with a compact ABS chassis and comfortable non-slip silicone grip, it includes four interchangeable heads tailored for back, legs, arms, and shoulders. Six adjustable speed levels provide tailored intensity from gentle relaxation to deep tissue percussion. With convenient USB Type-C charging and whisper-quiet operation, this portable massager fits effortlessly into your gym bag or travel luggage for soothing muscle relief anywhere. It is an ideal everyday wellness companion for fitness enthusiasts and working professionals looking to ease muscle fatigue.',
    seo_title: 'Mini Massage Gun | Buy Online Best Price | YogKart',
    meta_description: 'Buy YogKart Mini Massage Gun online at Rs 1599. Compact rechargeable percussion massager with 4 heads. Order now on YogKart with fast delivery.',
    meta_keywords: ['mini massage gun', 'percussion massager', 'deep tissue massager', 'body massager gun', 'gym recovery massager', 'buy online india', 'yogkart', 'rechargeable muscle massager'],
    seo_description: 'Enjoy fast muscle relaxation with YogKart Mini Massage Gun. Features 6 variable speeds, 4 specialised heads, and USB-C charging in a lightweight, travel-friendly body for daily recovery.',
    product_highlights: [
      '6 variable percussion speed levels',
      '4 interchangeable massage heads included',
      'Long-lasting rechargeable battery via USB Type-C',
      'Compact, pocket-sized lightweight design'
    ],
    image_alt_text: 'YogKart Mini Massage Gun Rechargeable Percussion Massager with 4 Heads',
    stock: 142
  },

  // 3. Anti-Skid Yoga Mat 6mm | Extra Thick Exercise Mat with Carry Strap
  {
    name: 'Anti-Skid Yoga Mat 6mm | Extra Thick Exercise Mat with Carry Strap',
    slug: 'yogkart-anti-skid-yoga-mat-6mm',
    category_id: 'fitness-wellness',
    subcategory: 'Yoga Accessories',
    price: 499,
    original_price: 1299,
    flags: { featured: true, new: false, best_seller: true },
    short_description: '6mm thick anti-skid yoga mat with cushioning for yoga, stretching, pilates and home workouts.',
    benefits: [
      '6mm cushioning for knees and joints',
      'Anti-slip surface for stable poses',
      'Lightweight and easy to carry with strap'
    ],
    material: 'High-density NBR foam',
    specs: [
      { label: 'Thickness', value: '6 mm' },
      { label: 'Size', value: '183 x 61 cm' },
      { label: 'Material', value: 'NBR foam' },
      { label: 'Weight', value: 'Approx. 700 g' }
    ],
    how_to_use: [
      'Unroll the mat on a flat, clean surface.',
      'Practise yoga, stretching or floor exercises.',
      'Wipe with a damp cloth and roll up to store.'
    ],
    precautions: 'Keep away from sharp objects and direct sunlight. Do not machine wash.',
    tags: ['yoga mat', 'exercise mat', 'anti skid mat', 'pilates mat', 'home workout'],
    pack_size: '1 Mat + Strap',
    faqs: [
      { question: 'Is it suitable for hot yoga?', answer: 'It suits regular yoga and workouts; for very sweaty sessions use a towel on top.' },
      { question: 'Does it smell?', answer: 'Mild new-mat smell fades after a day of airing.' }
    ],
    description: 'Elevate your daily yoga, pilates, and fitness sessions with the YogKart 6mm Anti-Skid Yoga Mat. Made from premium high-density NBR foam, this mat provides 6mm of supportive cushioning to protect sensitive knees, elbows, and joints during floor routines. Its dual-sided anti-slip texture provides reliable grip on tile, wood, and concrete floors. Lightweight and moisture-resistant, it rolls up neatly and includes a practical carry strap for easy transport to yoga class, the gym, or outdoor parks. Whether you are stretching, meditating, or doing floor workouts, it provides a stable and comfortable foundation.',
    seo_title: 'Anti-Skid Yoga Mat 6mm | Best Price | YogKart',
    meta_description: 'Buy YogKart Anti-Skid 6mm Yoga Mat at Rs 499. Cushioned exercise mat with carry strap for yoga & pilates. Order now on YogKart.',
    meta_keywords: ['anti skid yoga mat', '6mm yoga mat', 'exercise mat', 'pilates mat', 'yoga mat with strap', 'fitness mat india', 'buy online india', 'yogkart'],
    seo_description: 'Practise safely on the YogKart 6mm Anti-Skid Yoga Mat. Features high-density NBR foam cushioning, slip-resistant texture, and a carry strap for home, studio, and gym workouts.',
    product_highlights: [
      '6mm high-density NBR cushioning for joint comfort',
      'Dual-side anti-skid textured grip',
      'Includes complimentary shoulder carry strap',
      'Generous 183 x 61 cm workout surface'
    ],
    image_alt_text: 'YogKart 6mm Anti-Skid Yoga Mat with Carrying Strap for Workout and Pilates',
    stock: 220
  },

  // 4. Neck & Shoulder Massager | Electric Cervical Neck Relaxer
  {
    name: 'Neck & Shoulder Massager | Electric Cervical Neck Relaxer',
    slug: 'yogkart-neck-shoulder-massager-electric',
    category_id: 'pain-relief-support',
    subcategory: 'Massagers',
    price: 899,
    original_price: 2199,
    flags: { featured: true, new: true, best_seller: false },
    short_description: 'Electric neck and shoulder massager with heat function for relaxation after long work hours.',
    benefits: [
      'Soothing heat and pulse massage mode',
      'Contoured shape fits the neck',
      'Rechargeable and portable'
    ],
    material: 'ABS, soft PU skin, lithium battery',
    specs: [
      { label: 'Modes', value: 'Multiple pulse modes' },
      { label: 'Heat', value: 'Yes' },
      { label: 'Charging', value: 'USB' },
      { label: 'Colour', value: 'Grey' }
    ],
    how_to_use: [
      'Place the massager around your neck.',
      'Switch on and select a mode and heat level.',
      'Use for 10-15 minutes per session.'
    ],
    precautions: 'Not for use on injured skin. Avoid use if you have a pacemaker. Do not use while sleeping.',
    tags: ['neck massager', 'shoulder massager', 'cervical massager', 'electric massager', 'relaxation'],
    pack_size: '1 Unit + USB Cable',
    faqs: [
      { question: 'Can it be used while working?', answer: 'Yes, many people use it while sitting at a desk.' },
      { question: 'Does it have a heat option?', answer: 'Yes, it has a gentle heat function.' }
    ],
    description: 'Unwind after strenuous work hours with the YogKart Electric Neck and Shoulder Massager. Ergonomically contoured to curve naturally around your cervical vertebrae, this device combines gentle electrical pulses with soothing warmth to ease daily neck tension. Soft skin-friendly PU padding ensures irritation-free comfort against your skin. Powered by a rechargeable battery with USB charging, it is whisper-quiet and hands-free, making it an ideal companion while working at your computer, reading, or relaxing on the couch. Enjoy peaceful relaxation anytime and experience renewed neck comfort at the push of a button.',
    seo_title: 'Neck & Shoulder Massager | Best Price | YogKart',
    meta_description: 'Buy YogKart Electric Neck & Shoulder Massager at Rs 899. Soothing pulse massage with gentle heat. Order online on YogKart today.',
    meta_keywords: ['neck massager', 'shoulder massager', 'electric neck relaxer', 'cervical massager', 'heated neck massager', 'buy online india', 'yogkart', 'neck pain support'],
    seo_description: 'Soothe stiff neck muscles with the YogKart Electric Cervical Neck and Shoulder Massager. Features adjustable pulse modes, gentle warmth, and cordless USB rechargeable design for daily ease.',
    product_highlights: [
      'Contoured ergonomic cervical neck fit',
      'Gentle heating mode for deeper relaxation',
      'Multiple pulse massage frequency settings',
      'Cordless rechargeable battery via USB'
    ],
    image_alt_text: 'YogKart Electric Neck and Shoulder Massager with Gentle Heat Function',
    stock: 165
  },

  // 5. Acupressure Mat & Pillow Set | Foot & Back Relaxation Mat
  {
    name: 'Acupressure Mat & Pillow Set | Foot & Back Relaxation Mat',
    slug: 'yogkart-acupressure-mat-pillow-set',
    category_id: 'pain-relief-support',
    subcategory: 'Foot Care',
    price: 649,
    original_price: 1499,
    flags: { featured: false, new: true, best_seller: true },
    short_description: 'Acupressure mat with pillow featuring spike points for back, neck and foot relaxation.',
    benefits: [
      'Spike points provide a stimulating massage feel',
      'Includes matching neck pillow',
      'Easy to use at home'
    ],
    material: 'Cotton cover, ABS spikes, foam',
    specs: [
      { label: 'Mat Size', value: '68 x 42 cm' },
      { label: 'Pillow Size', value: '37 x 15 cm' },
      { label: 'Spikes', value: '6000+ points' },
      { label: 'Material', value: 'Cotton and foam' }
    ],
    how_to_use: [
      'Lie on the mat on a flat surface, starting with a thin shirt.',
      'Relax for 10-20 minutes.',
      'Build up time gradually as skin adapts.'
    ],
    precautions: 'Not for use on broken skin. Avoid use during pregnancy or if you have circulation issues without medical advice.',
    tags: ['acupressure mat', 'back relaxation', 'foot massage', 'spike mat', 'relaxation mat'],
    pack_size: '1 Mat + 1 Pillow',
    faqs: [
      { question: 'Does it hurt?', answer: 'Initial sensation is intense and eases with regular use.' },
      { question: 'Can I use it on the floor?', answer: 'Yes, on a flat soft surface or bed.' }
    ],
    description: 'Restore body harmony and discover deep muscular relaxation with the YogKart Acupressure Mat and Pillow Set. Outfitted with over 6,000 non-toxic ABS acupressure contact points, this set works on the principles of traditional pressure-point stimulation. Resting on the cushioned cotton mat helps release back, shoulder, and foot tension after exhausting days. The matching contoured pillow cradles the cervical spine for comprehensive neck comfort. Simply rest on it for 15-20 minutes to foster a calm mind and relaxed body. It is lightweight, rollable, and easy to store for convenient daily wellness at home.',
    seo_title: 'Acupressure Mat & Pillow Set | YogKart',
    meta_description: 'Buy YogKart Acupressure Mat & Pillow Set at Rs 649. Features 6000+ spike points for back and foot relaxation. Shop online on YogKart.',
    meta_keywords: ['acupressure mat', 'acupressure pillow', 'spike mat', 'back relaxation mat', 'foot acupressure', 'stress relief mat', 'buy online india', 'yogkart'],
    seo_description: 'Experience whole-body relaxation with the YogKart Acupressure Mat & Pillow Set. Over 6000 stimulating spike points ease back, neck, and foot tension at home and support restful sleep.',
    product_highlights: [
      'Over 6000 ergonomic ABS acupressure points',
      'Includes dedicated contoured neck acupressure pillow',
      '100% breathable cotton cover with soft foam core',
      'Lightweight and rollable for easy storage'
    ],
    image_alt_text: 'YogKart Acupressure Mat and Pillow Set with Spike Points for Back Relaxation',
    stock: 195
  },

  // 6. Knee Support Brace | Adjustable Knee Cap for Gym, Walking & Running
  {
    name: 'Knee Support Brace | Adjustable Knee Cap for Gym, Walking & Running',
    slug: 'yogkart-knee-support-brace-adjustable',
    category_id: 'pain-relief-support',
    subcategory: 'Supports & Braces',
    price: 349,
    original_price: 899,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Breathable adjustable knee support for comfort and stability during workouts, walking and sports.',
    benefits: [
      'Adjustable compression fit',
      'Breathable stretch fabric',
      'Suitable for gym, running and daily use'
    ],
    material: 'Neoprene, nylon, velcro',
    specs: [
      { label: 'Size', value: 'Free size, adjustable' },
      { label: 'Material', value: 'Neoprene' },
      { label: 'Closure', value: 'Velcro strap' },
      { label: 'Sold As', value: 'Single piece' }
    ],
    how_to_use: [
      'Slide the brace over the knee.',
      'Adjust the strap for a comfortable snug fit.',
      'Remove after activity and wash by hand.'
    ],
    precautions: 'Do not wear too tight. Remove if numbness occurs. Consult a doctor for any knee injury.',
    tags: ['knee support', 'knee brace', 'knee cap', 'gym support', 'sports support'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Can it be worn all day?', answer: 'It is meant for activity; avoid wearing too long.' },
      { question: 'Does it fit both knees?', answer: 'Yes, it can be worn on either knee.' }
    ],
    description: 'Keep your knees supported and active with the YogKart Adjustable Knee Support Brace. Engineered for runners, gym-goers, and brisk walkers, this brace delivers customised patellar compression through adjustable velcro fastening straps. The breathable neoprene-nylon blend retains therapeutic warmth around the joint while wicking away sweat to prevent chafing. Its flexible design stabilizes knee tracking during squats, stairs, and jogging. Wearable on either left or right knee for versatile day-to-day joint comfort. An essential supportive brace for daily fitness, sports training, and active lifestyle routines.',
    seo_title: 'Knee Support Brace | Best Price | YogKart',
    meta_description: 'Buy YogKart Knee Support Brace at Rs 349. Adjustable compression knee cap for gym, running & daily walks. Order now on YogKart.',
    meta_keywords: ['knee support brace', 'adjustable knee cap', 'gym knee support', 'running knee brace', 'joint stability strap', 'knee compression band', 'buy online india', 'yogkart'],
    seo_description: 'Protect your knees with YogKart Adjustable Knee Support Brace. Provides snug compression and joint comfort for running, gym workouts, walking, and daily mobility support.',
    product_highlights: [
      'Fully adjustable three-strap velcro compression',
      'Breathable sweat-resistant neoprene fabric',
      'Universal reversible fit for left or right knee',
      'Reinforced edges to prevent roll-down and slipping'
    ],
    image_alt_text: 'YogKart Adjustable Knee Support Brace for Gym Running and Daily Mobility',
    stock: 210
  },

  // 7. Lumbar Back Support Belt | Adjustable Waist Support for Men & Women
  {
    name: 'Lumbar Back Support Belt | Adjustable Waist Support for Men & Women',
    slug: 'yogkart-lumbar-back-support-belt',
    category_id: 'pain-relief-support',
    subcategory: 'Supports & Braces',
    price: 449,
    original_price: 1199,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Adjustable lower back support belt for comfort during sitting, lifting and long standing hours.',
    benefits: [
      'Gives lumbar support and comfort',
      'Breathable elastic material',
      'Easy adjustable closure'
    ],
    material: 'Elastic fabric, velcro, steel strips',
    specs: [
      { label: 'Size', value: 'M/L/XL options' },
      { label: 'Material', value: 'Elastic breathable fabric' },
      { label: 'Closure', value: 'Velcro' },
      { label: 'Colour', value: 'Black' }
    ],
    how_to_use: [
      'Wrap the belt around your waist over a thin layer.',
      'Tighten for snug support.',
      'Wear during activity, remove while resting.'
    ],
    precautions: 'Do not wear continuously for long hours. Consult a doctor for chronic back pain.',
    tags: ['back support belt', 'lumbar support', 'waist belt', 'back pain support', 'gym belt'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'How do I choose size?', answer: 'Measure your waist and match it with the size chart.' },
      { question: 'Can women use it?', answer: 'Yes, it is unisex.' }
    ],
    description: 'Protect your lower spine from fatigue and daily posture strain with the YogKart Lumbar Back Support Belt. Reinforced with supportive vertical stays, this belt stabilizes the lower back during heavy lifting, long office desk shifts, and extended standing. The dual-pull elastic tension bands allow you to customise compression precisely where you need it. Crafted from breathable mesh, it promotes airflow to keep your abdomen and lower back cool and dry throughout active usage. Enjoy reliable abdominal stability and lumbar comfort every day at home, work, or the gym.',
    seo_title: 'Lumbar Back Support Belt | Best Price | YogKart',
    meta_description: 'Buy YogKart Lumbar Back Support Belt at Rs 449. Adjustable waist belt for lower back comfort and lifting. Order online on YogKart.',
    meta_keywords: ['lumbar support belt', 'back support belt', 'waist support belt', 'lower back brace', 'back belt men women', 'posture belt india', 'buy online india', 'yogkart'],
    seo_description: 'Relieve lower back strain with YogKart Lumbar Support Belt. Equipped with supportive stays, dual elastic bands, and breathable fabric for lifting, sitting, and workday comfort.',
    product_highlights: [
      'Reinforced vertical stays for lower back stabilization',
      'Dual-strap tension adjustment for custom compression',
      'Breathable elastic mesh to prevent heat accumulation',
      'Comfortable unisex fit for all waist sizes'
    ],
    image_alt_text: 'YogKart Lumbar Back Support Belt Adjustable Waist Brace for Men and Women',
    stock: 175
  },

  // 8. Gua Sha & Jade Roller Facial Massage Set
  {
    name: 'Gua Sha & Jade Roller Facial Massage Set',
    slug: 'yogkart-gua-sha-jade-roller-facial-set',
    category_id: 'beauty-tools',
    subcategory: 'Face Massage Tools',
    price: 299,
    original_price: 799,
    flags: { featured: true, new: true, best_seller: true },
    short_description: 'Natural stone gua sha and facial roller set for daily face and neck massage routine.',
    benefits: [
      'Helps relax facial muscles during massage',
      'Cool-to-touch natural stone',
      'Compact set for daily routine'
    ],
    material: 'Natural stone, stainless steel',
    specs: [
      { label: 'Contents', value: 'Gua sha and roller' },
      { label: 'Material', value: 'Natural stone' },
      { label: 'Colour', value: 'Green/Pink' },
      { label: 'Use', value: 'Face and neck' }
    ],
    how_to_use: [
      'Apply your serum or oil on clean skin.',
      'Glide the tool gently upward and outward.',
      'Clean with water after each use.'
    ],
    precautions: 'Handle with care, stone can chip if dropped. Avoid use on broken skin or active breakouts.',
    tags: ['gua sha', 'jade roller', 'face roller', 'facial massage', 'skin care tools'],
    pack_size: '1 Set (2 Pcs)',
    faqs: [
      { question: 'Can I refrigerate it?', answer: 'Yes, a cool tool feels refreshing.' },
      { question: 'How often can I use it?', answer: 'Daily for 5-10 minutes is common.' }
    ],
    description: 'Elevate your skincare ritual with the YogKart Gua Sha and Jade Roller Facial Massage Set. Carved from authentic cooling natural stone, this dual-piece beauty set glides gracefully across facial contours and neck lines. The dual-ended roller cools the under-eye area and distributes facial oils, while the ergonomic gua sha scraper promotes relaxing lymphatic facial massage. Regular gentle strokes help ease facial jaw tension and invigorate morning skin freshness. Keep in the refrigerator for an extra crisp, cooling experience. It makes a luxurious addition to any natural beauty and self-care routine.',
    seo_title: 'Gua Sha & Jade Roller Set | Best Price | YogKart',
    meta_description: 'Buy YogKart Gua Sha & Jade Roller Facial Set at Rs 299. Natural stone cooling massage tools for skin care. Order now on YogKart.',
    meta_keywords: ['gua sha', 'jade roller', 'facial roller set', 'face massage tools', 'natural stone roller', 'skincare routine', 'buy online india', 'yogkart'],
    seo_description: 'Rejuvenate your skin with YogKart Gua Sha and Jade Roller Set. Handcrafted natural stone tools designed to soothe facial tension, cool skin, and enhance daily serum absorption.',
    product_highlights: [
      'Handcrafted natural cooling stone',
      'Dual-ended roller for face, eyes, and neck',
      'Ergonomic gua sha sculpting tool included',
      'Sturdy noiseless stainless steel frame'
    ],
    image_alt_text: 'YogKart Natural Stone Gua Sha and Jade Facial Roller Skincare Massage Set',
    stock: 230
  },

  // 9. Speed Skipping Rope | Adjustable Jump Rope for Fitness & Cardio
  {
    name: 'Speed Skipping Rope | Adjustable Jump Rope for Fitness & Cardio',
    slug: 'yogkart-speed-skipping-rope-adjustable',
    category_id: 'fitness-wellness',
    subcategory: 'Cardio',
    price: 199,
    original_price: 599,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Adjustable speed skipping rope with ball bearings and comfortable grip for fitness and cardio workouts.',
    benefits: [
      'Smooth rotation with ball bearings',
      'Adjustable length for all heights',
      'Foam handles for secure grip'
    ],
    material: 'PVC rope, ABS and foam handles',
    specs: [
      { label: 'Length', value: '3 metres, adjustable' },
      { label: 'Handles', value: 'Anti-slip foam' },
      { label: 'Bearing', value: 'Yes' },
      { label: 'Colour', value: 'Black/Red' }
    ],
    how_to_use: [
      'Adjust the rope length so handles reach your armpits.',
      'Jump with small bounces on a flat surface.',
      'Start with 1-2 minute rounds.'
    ],
    precautions: 'Use on a flat, non-slippery surface with proper shoes. Warm up first.',
    tags: ['skipping rope', 'jump rope', 'cardio', 'fitness', 'weight loss workout'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Is it good for beginners?', answer: 'Yes, it is adjustable and easy to control.' },
      { question: 'Can I use it indoors?', answer: 'Yes, with enough ceiling clearance.' }
    ],
    description: 'Supercharge your cardiovascular stamina and footwork with the YogKart Speed Skipping Rope. Designed with 360-degree precision steel ball bearings inside the handles, this jump rope ensures tangle-free, ultra-smooth rotations for high-speed skipping. The 3-metre durable PVC cable can be shortened easily to match your exact height. Lightweight handles wrapped in sweat-absorbent foam provide a confident, non-slip grip during intense endurance, HIIT, and boxing workouts at home or the gym. Perfect for fitness enthusiasts, beginners, and athletes aiming for effective calorie burning and agility training.',
    seo_title: 'Speed Skipping Rope | Best Price | YogKart',
    meta_description: 'Buy YogKart Speed Skipping Rope online at Rs 199. Ball bearing jump rope with adjustable length & foam grip. Shop now on YogKart.',
    meta_keywords: ['speed skipping rope', 'jump rope cardio', 'fitness skipping rope', 'adjustable jump rope', 'gym skipping rope', 'cardio jump rope', 'buy online india', 'yogkart'],
    seo_description: 'Boost cardio endurance with the YogKart Speed Skipping Rope. Features 360-degree ball bearings, tangle-free PVC rope, and ergonomic foam grip handles for swift workout sessions.',
    product_highlights: [
      '360-degree ball bearings for ultra-smooth rotation',
      'Easily customizable 3-metre tangle-free PVC rope',
      'Ergonomic sweat-absorbing memory foam handles',
      'Lightweight construction for swift cardio reps'
    ],
    image_alt_text: 'YogKart Speed Skipping Rope with Ball Bearings and Anti-Slip Foam Handles',
    stock: 245
  },

  // 10. 3D Contoured Sleep Eye Mask | Soft Light Blocking Eye Cover
  {
    name: '3D Contoured Sleep Eye Mask | Soft Light Blocking Eye Cover',
    slug: 'yogkart-3d-contoured-sleep-eye-mask',
    category_id: 'wellness-sleep',
    subcategory: 'Sleep Accessories',
    price: 199,
    original_price: 599,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Soft 3D contoured sleep mask that blocks light for comfortable sleep, travel and naps.',
    benefits: [
      'Blocks light for restful sleep',
      'Contoured to avoid pressure on eyes',
      'Adjustable strap'
    ],
    material: 'Memory foam, soft fabric',
    specs: [
      { label: 'Fit', value: 'Adjustable' },
      { label: 'Material', value: 'Soft fabric with foam' },
      { label: 'Colour', value: 'Black' },
      { label: 'Washable', value: 'Hand wash' }
    ],
    how_to_use: [
      'Place over your eyes and adjust the strap.',
      'Use during sleep, travel or naps.',
      'Hand wash gently and air dry.'
    ],
    precautions: 'Stop use if you feel skin irritation.',
    tags: ['sleep mask', 'eye mask', 'sleep accessories', 'travel mask', 'light blocking'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Does it press on the eyes?', answer: 'No, the 3D shape leaves room for blinking.' },
      { question: 'Is it good for travel?', answer: 'Yes, it is light and easy to pack.' }
    ],
    description: 'Enjoy uninterrupted sleep wherever you are with the YogKart 3D Contoured Sleep Eye Mask. Specifically designed with deep 3D eye cavities, it exerts zero pressure on your eyelids and eyelashes, allowing natural eye movement and blinking while sleeping. Made with ultra-soft breathable memory foam and skin-gentle fabric, this mask seals out ambient light completely around the nose bridge. An elastic adjustable buckle strap guarantees a snug fit without tangling hair, making it essential for flights, night shifts, and deep restorative sleep. Relax into total darkness for peaceful naps and nighttime rest.',
    seo_title: '3D Contoured Sleep Eye Mask | YogKart',
    meta_description: 'Buy YogKart 3D Contoured Sleep Eye Mask at Rs 199. Zero eye pressure light-blocking sleep mask for travel & deep sleep. Buy on YogKart.',
    meta_keywords: ['3d sleep mask', 'contoured eye mask', 'light blocking eye cover', 'sleep eye mask', 'travel blindfold', 'blackout eye mask', 'buy online india', 'yogkart'],
    seo_description: 'Sleep deeper with the YogKart 3D Contoured Eye Mask. Ergonomic eye cavities eliminate eyelid pressure while delivering total darkness for travel, meditation, and home rest.',
    product_highlights: [
      'Deep 3D concave eye cups prevent eyelid pressure',
      '100% total darkness blackout around nose bridge',
      'Silky breathable fabric with soft memory foam',
      'Adjustable elastic strap will not catch hair'
    ],
    image_alt_text: 'YogKart 3D Contoured Sleep Eye Mask Light Blocking Eye Cover for Sleeping',
    stock: 200
  },

  // 11. Cervical Memory Foam Pillow | Orthopedic Neck Support Pillow
  {
    name: 'Cervical Memory Foam Pillow | Orthopedic Neck Support Pillow',
    slug: 'yogkart-cervical-memory-foam-pillow',
    category_id: 'wellness-sleep',
    subcategory: 'Pillows & Cushions',
    price: 799,
    original_price: 1999,
    flags: { featured: true, new: false, best_seller: false },
    short_description: 'Contour memory foam pillow designed for neck alignment and comfortable sleep.',
    benefits: [
      'Contoured design for neck support',
      'Slow-rebound memory foam',
      'Removable washable cover'
    ],
    material: 'Memory foam, cotton blend cover',
    specs: [
      { label: 'Size', value: '50 x 30 x 10/8 cm' },
      { label: 'Material', value: 'Memory foam' },
      { label: 'Cover', value: 'Removable' },
      { label: 'Colour', value: 'White' }
    ],
    how_to_use: [
      'Place the pillow so the neck curve fits your neck.',
      'Sleep on your back or side.',
      'Wash the cover, spot clean the foam.'
    ],
    precautions: 'Give 1-2 weeks to adjust. Do not wash foam in a machine.',
    tags: ['cervical pillow', 'memory foam pillow', 'orthopedic pillow', 'neck pillow', 'sleep pillow'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Is it good for side sleepers?', answer: 'Yes, the contour supports back and side sleeping.' },
      { question: 'Does it feel hard?', answer: 'It is firm at first and softens with body heat.' }
    ],
    description: 'Transform your night-time rest with the YogKart Cervical Memory Foam Pillow. Thoughtfully contoured to accommodate the natural curvature of your head, neck, and shoulders, it encourages neutral spinal alignment throughout the night. Crafted from premium slow-rebound memory foam, it adapts smoothly to your contours, distributing pressure evenly whether you sleep on your back or side. The soft cotton-blend zipper cover promotes healthy airflow and can be effortlessly detached for machine washing. Experience relaxing neck support and start every morning feeling revitalised, comfortable, and well-rested.',
    seo_title: 'Cervical Memory Foam Pillow | YogKart',
    meta_description: 'Buy YogKart Cervical Memory Foam Pillow at Rs 799. Orthopedic contoured neck support pillow with washable cover. Order now on YogKart.',
    meta_keywords: ['cervical pillow', 'memory foam pillow', 'orthopedic neck pillow', 'contour pillow', 'cervical support pillow', 'ergonomic sleep pillow', 'buy online india', 'yogkart'],
    seo_description: 'Wake up refreshed with the YogKart Cervical Memory Foam Pillow. Contoured ergonomic shape supports natural neck alignment and spinal comfort for back and side sleepers alike.',
    product_highlights: [
      'Ergonomic dual-height contour for neck cradling',
      'High-grade slow-rebound memory foam core',
      'Breathable, removable zipper cover for easy cleaning',
      'Suitable for back, side, and stomach sleeping'
    ],
    image_alt_text: 'YogKart Ergonomic Cervical Memory Foam Pillow for Neck Support and Sleeping',
    stock: 135
  },

  // 12. Orthopedic Seat Cushion | Memory Foam Coccyx Support for Chair
  {
    name: 'Orthopedic Seat Cushion | Memory Foam Coccyx Support for Chair',
    slug: 'yogkart-orthopedic-seat-cushion-memory-foam',
    category_id: 'pain-relief-support',
    subcategory: 'Pillows & Cushions',
    price: 699,
    original_price: 1799,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Ergonomic memory foam seat cushion for office chair, car and wheelchair comfort.',
    benefits: [
      'Relieves pressure while sitting',
      'Non-slip base',
      'Removable cover'
    ],
    material: 'Memory foam, polyester cover',
    specs: [
      { label: 'Size', value: '45 x 35 x 7 cm' },
      { label: 'Material', value: 'Memory foam' },
      { label: 'Base', value: 'Anti-slip' },
      { label: 'Colour', value: 'Black' }
    ],
    how_to_use: [
      'Place on your chair.',
      'Sit with your back against the backrest.',
      'Wash cover as needed.'
    ],
    precautions: 'Not a medical device. Consult a doctor for persistent pain.',
    tags: ['seat cushion', 'coccyx cushion', 'office cushion', 'orthopedic cushion', 'sitting support'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Is it good for long sitting?', answer: 'It adds cushioning for long sitting hours.' },
      { question: 'Can I use in a car?', answer: 'Yes, it fits car seats.' }
    ],
    description: 'Make long desk hours and road commutes far more comfortable with the YogKart Orthopedic Seat Cushion. Shaped with an ergonomic U-cutout, it suspends your tailbone above hard seating surfaces to help ease sitting pressure. Molded from dense memory foam that does not flatten over time, it distributes body weight evenly across your hips and thighs. The bottom features a textured non-slip rubber grip that stays firmly planted on office chairs, car seats, and wheelchairs. The breathable removable cover keeps you cool, making it ideal for daily office use and travel comfort.',
    seo_title: 'Orthopedic Seat Cushion | Best Price | YogKart',
    meta_description: 'Buy YogKart Orthopedic Memory Foam Seat Cushion at Rs 699. Ergonomic coccyx cushion for office chair & car. Shop online on YogKart.',
    meta_keywords: ['orthopedic seat cushion', 'coccyx cushion', 'memory foam chair cushion', 'office chair cushion', 'car seat cushion', 'tailbone support cushion', 'buy online india', 'yogkart'],
    seo_description: 'Enhance sitting comfort with the YogKart Orthopedic Memory Foam Seat Cushion. U-shaped coccyx cutout eases tailbone pressure during long work, commuting, and driving hours.',
    product_highlights: [
      'U-shaped ergonomic cutout suspends the tailbone',
      'Resilient high-density memory foam prevents flattening',
      'Non-slip rubber studded bottom keeps cushion in place',
      'Breathable machine-washable zippered outer cover'
    ],
    image_alt_text: 'YogKart Orthopedic Memory Foam Seat Cushion for Office Chair and Car Seat',
    stock: 155
  },

  // 13. Foot Massage Roller | Wooden Plantar Relaxation Roller
  {
    name: 'Foot Massage Roller | Wooden Plantar Relaxation Roller',
    slug: 'yogkart-foot-massage-roller-wooden',
    category_id: 'pain-relief-support',
    subcategory: 'Foot Care',
    price: 249,
    original_price: 699,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Wooden foot roller for relaxing tired feet and soles after a long day.',
    benefits: [
      'Textured wooden roller',
      'Easy to use at home or office',
      'Compact and durable'
    ],
    material: 'Natural wood',
    specs: [
      { label: 'Material', value: 'Wood' },
      { label: 'Length', value: 'Approx. 30 cm' },
      { label: 'Use', value: 'Feet' },
      { label: 'Colour', value: 'Natural' }
    ],
    how_to_use: [
      'Place under your foot while seated.',
      'Roll back and forth for 3-5 minutes.',
      'Switch feet.'
    ],
    precautions: 'Avoid on injured or swollen feet.',
    tags: ['foot roller', 'foot massager', 'wooden roller', 'plantar massage', 'foot care'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Can I use it while standing?', answer: 'Seated use is recommended.' },
      { question: 'Is it only for feet?', answer: 'It can also be used on calves.' }
    ],
    description: 'Soothe tired, achy feet after a long day of standing or walking with the YogKart Wooden Foot Massage Roller. Handcrafted from smooth, polished natural wood, this durable roller features grooved ridges that stimulate the plantar arches and reflexology pressure points on the soles of your feet. Compact and electricity-free, it slides conveniently under your office desk or sofa so you can enjoy relaxing foot massage sessions anytime while working or watching television. Regular rolling helps relax foot stiffness, refresh fatigued soles, and promote pleasant whole-body calm.',
    seo_title: 'Foot Massage Roller | Best Price | YogKart',
    meta_description: 'Buy YogKart Wooden Foot Massage Roller online at Rs 249. Handcrafted natural wood plantar acupressure roller. Order today on YogKart.',
    meta_keywords: ['foot massage roller', 'wooden foot roller', 'plantar foot massager', 'acupressure foot roller', 'foot care roller', 'wooden arch roller', 'buy online india', 'yogkart'],
    seo_description: 'Relax tired arches with the YogKart Wooden Foot Massage Roller. Textured ridges provide soothing acupressure stimulation for feet under your desk, at work, or relaxing at home.',
    product_highlights: [
      'Crafted from 100% polished natural hardwood',
      'Acupressure ridged design massages arches and soles',
      'Compact, lightweight and fits neatly under any desk',
      'Durable, manual design requires zero batteries'
    ],
    image_alt_text: 'YogKart Wooden Foot Massage Roller Natural Hardwood Plantar Acupressure Tool',
    stock: 215
  },

  // 14. Kansa Wand Foot Massager | Pure Kansa Face & Body Massage Tool
  {
    name: 'Kansa Wand Foot Massager | Pure Kansa Face & Body Massage Tool',
    slug: 'yogkart-kansa-wand-foot-massager',
    category_id: 'beauty-tools',
    subcategory: 'Ayurvedic Tools',
    price: 449,
    original_price: 999,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Traditional Kansa wand with smooth rounded surface for foot, face and body massage.',
    benefits: [
      'Traditional Ayurvedic massage tool',
      'Cool smooth metal surface',
      'Suitable for daily self-massage'
    ],
    material: 'Kansa alloy',
    specs: [
      { label: 'Material', value: 'Kansa' },
      { label: 'Use', value: 'Foot, face and body' },
      { label: 'Finish', value: 'Polished' },
      { label: 'Care', value: 'Wipe clean' }
    ],
    how_to_use: [
      'Apply a little oil on the skin.',
      'Massage in gentle circular strokes.',
      'Wipe the wand clean after use.'
    ],
    precautions: 'Use gentle pressure. Clean after each use.',
    tags: ['kansa wand', 'foot massage', 'ayurvedic massager', 'kansa massager', 'self care'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Do I need oil?', answer: 'A light oil makes the massage smoother.' },
      { question: 'Will it tarnish?', answer: 'Wipe dry; it may darken slightly over time.' }
    ],
    description: 'Embrace timeless Ayurvedic self-care traditions with the YogKart Kansa Wand Foot and Body Massager. Handcrafted with a dome of traditional Kansa bronze alloy attached to a polished wooden handle, this massage wand feels pleasantly cool and smooth against the skin. When paired with your favourite natural massage oil, gentle circular strokes help ease foot fatigue, promote calmness, and soothe facial muscles. A beautiful addition to your holistic nighttime wellness and relaxation rituals. Experience grounding tactile relaxation and holistic vitality with every comforting massage session.',
    seo_title: 'Kansa Wand Foot Massager | YogKart',
    meta_description: 'Buy YogKart Pure Kansa Wand Foot & Body Massager at Rs 449. Traditional Ayurvedic bronze massage tool. Order online on YogKart today.',
    meta_keywords: ['kansa wand', 'kansa massager', 'ayurvedic massage tool', 'foot kansa wand', 'bronze body massager', 'ayurvedic foot care', 'buy online india', 'yogkart'],
    seo_description: 'Experience authentic Ayurvedic wellness with the YogKart Kansa Wand. Made from cooling bronze alloy, it revitalises tired feet, face, and body with soothing self-massage strokes.',
    product_highlights: [
      'Authentic Kansa bronze alloy dome',
      'Comfortable carved wooden handle for firm grip',
      'Ideal for soothing foot, face, and neck massage',
      'Traditional handcrafted Ayurvedic self-care tool'
    ],
    image_alt_text: 'YogKart Pure Kansa Wand Ayurvedic Foot Face and Body Massage Tool',
    stock: 160
  },

  // 15. Hot Water Bag | Rubber Heat Bag for Pain Relief Comfort
  {
    name: 'Hot Water Bag | Rubber Heat Bag for Pain Relief Comfort',
    slug: 'yogkart-hot-water-bag-rubber-heat',
    category_id: 'pain-relief-support',
    subcategory: 'Heat Therapy',
    price: 249,
    original_price: 599,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Classic rubber hot water bag with soft cover for warmth and comfort during cold weather and muscle stiffness.',
    benefits: [
      'Retains warmth for long',
      'Soft fleece cover included',
      'Leak-proof stopper'
    ],
    material: 'Natural rubber, fleece cover',
    specs: [
      { label: 'Capacity', value: '2 Litres' },
      { label: 'Material', value: 'Rubber' },
      { label: 'Cover', value: 'Fleece' },
      { label: 'Colour', value: 'Assorted' }
    ],
    how_to_use: [
      'Fill with hot (not boiling) water.',
      'Close the stopper tightly.',
      'Cover and place on the area for 15-20 minutes.'
    ],
    precautions: 'Never use boiling water. Do not apply directly on skin. Check for leaks before use.',
    tags: ['hot water bag', 'heat bag', 'hot compress', 'winter essential', 'comfort'],
    pack_size: '1 Piece + Cover',
    faqs: [
      { question: 'Can I use boiling water?', answer: 'No, use hot water around 60-70 degrees.' },
      { question: 'Can kids use it?', answer: 'Only under adult supervision.' }
    ],
    description: 'Find soothing warmth and muscular comfort with the YogKart Classic Rubber Hot Water Bag. Manufactured from high-grade natural rubber, this 2-litre bag retains heat for hours, offering natural thermal comfort for cramped muscles, back stiffness, and chilly winter nights. It comes complete with a plush removable fleece cover that prevents direct skin scalds and feels pleasantly soft against your body. The ribbed exterior and threaded leak-proof stopper ensure safe, drip-free application every time. An indispensable comfort accessory for every household during winter seasons and relaxing bedtime moments.',
    seo_title: 'Hot Water Bag with Cover | Best Price | YogKart',
    meta_description: 'Buy YogKart Rubber Hot Water Bag with Fleece Cover at Rs 249. Safe leak-proof 2L heat bag for muscle comfort. Order on YogKart.',
    meta_keywords: ['hot water bag', 'rubber heat bag', 'hot water bottle cover', 'hot compress bag', 'winter heat bag', 'fleece hot bag', 'buy online india', 'yogkart'],
    seo_description: 'Enjoy long-lasting soothing warmth with the YogKart 2-Litre Hot Water Bag. Includes a soft protective fleece cover and a leak-proof stopper for winter comfort and muscle warmth.',
    product_highlights: [
      'Generous 2-litre natural rubber heat reservoir',
      'Plush removable fleece cover prevents direct scalds',
      'Ribbed textured surface ensures steady heat release',
      'Threaded safety stopper guarantees zero leakage'
    ],
    image_alt_text: 'YogKart 2L Natural Rubber Hot Water Bag with Soft Fleece Protective Cover',
    stock: 240
  },

  // 16. Electric Heating Pad | Fast Heating Waist & Back Warmer
  {
    name: 'Electric Heating Pad | Fast Heating Waist & Back Warmer',
    slug: 'yogkart-electric-heating-pad-fast-heating',
    category_id: 'pain-relief-support',
    subcategory: 'Heat Therapy',
    price: 699,
    original_price: 1599,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Electric heating pad with adjustable heat levels for back, waist and shoulder warmth.',
    benefits: [
      'Quick heating',
      'Multiple heat settings',
      'Soft washable cover'
    ],
    material: 'Soft fabric, heating element',
    specs: [
      { label: 'Voltage', value: '220-240V' },
      { label: 'Heat Levels', value: '3' },
      { label: 'Size', value: '30 x 40 cm' },
      { label: 'Cable', value: '1.8 m' }
    ],
    how_to_use: [
      'Plug in and select a heat level.',
      'Place over the area with the cover on.',
      'Switch off after 15-20 minutes.'
    ],
    precautions: 'Do not sleep with it on. Do not fold while on. Keep dry.',
    tags: ['heating pad', 'electric heating pad', 'back warmer', 'hot compress', 'winter care'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Is it safe for overnight use?', answer: 'No, switch off after use.' },
      { question: 'Can I wash it?', answer: 'Only the removable cover.' }
    ],
    description: 'Experience rapid, comforting warmth at the push of a button with the YogKart Electric Heating Pad. Built with advanced insulated heating elements, this pad warms up in seconds to soothe tired back muscles, abdominal cramps, and shoulder stiffness. Choose between 3 adjustable temperature settings using the simple handheld controller. Covered in a gentle, machine-washable fabric casing and featuring a generous 1.8-metre power cord, it allows effortless relaxation while resting on your bed or sofa. Enjoy targeted heat comfort safely and conveniently whenever your body desires soothing relief.',
    seo_title: 'Electric Heating Pad | Best Price | YogKart',
    meta_description: 'Buy YogKart Electric Heating Pad at Rs 699. Fast heating back and waist warmer with 3 temperature levels. Order now on YogKart.',
    meta_keywords: ['electric heating pad', 'heating pad back pain', 'waist heating pad', 'electric hot compress', 'orthopedic heat pad', 'fast heating pad', 'buy online india', 'yogkart'],
    seo_description: 'Relieve muscle stiffness fast with the YogKart Electric Heating Pad. Features 3 heat settings, quick warm-up technology, and a soft washable outer cover for soothing body warmth.',
    product_highlights: [
      'Rapid warm-up within seconds of turning on',
      '3 adjustable temperature settings with LED controller',
      'Generous 30 x 40 cm coverage area for back and waist',
      'Soft detachable fabric cover for hygienic washing'
    ],
    image_alt_text: 'YogKart Electric Heating Pad Fast Heating Back and Waist Warmer',
    stock: 150
  },

  // 17. Yoga Block Set of 2 | High Density EVA Foam Blocks with Strap
  {
    name: 'Yoga Block Set of 2 | High Density EVA Foam Blocks with Strap',
    slug: 'yogkart-yoga-block-set-of-2-with-strap',
    category_id: 'fitness-wellness',
    subcategory: 'Yoga Accessories',
    price: 349,
    original_price: 899,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Set of 2 EVA foam yoga blocks with strap to help with alignment, balance and stretching.',
    benefits: [
      'Firm, lightweight foam',
      'Anti-slip surface',
      'Includes yoga strap'
    ],
    material: 'EVA foam, cotton strap',
    specs: [
      { label: 'Pack', value: '2 Blocks + 1 Strap' },
      { label: 'Size', value: '23 x 15 x 8 cm' },
      { label: 'Material', value: 'EVA foam' },
      { label: 'Colour', value: 'Assorted' }
    ],
    how_to_use: [
      'Place the block under hands or hips for support.',
      'Use the strap to deepen stretches.',
      'Wipe clean after use.'
    ],
    precautions: 'Use on a non-slippery surface.',
    tags: ['yoga block', 'yoga strap', 'yoga accessories', 'stretching', 'pilates'],
    pack_size: '2 Blocks + 1 Strap',
    faqs: [
      { question: 'Are they firm?', answer: 'Yes, high-density foam holds weight.' },
      { question: 'Good for beginners?', answer: 'Yes, they help with alignment.' }
    ],
    description: 'Master challenging yoga postures and deepen your stretches with the YogKart Yoga Block Set of 2 with Strap. Molded from high-density, eco-friendly EVA foam, these supportive blocks feature beveled edges that ensure a solid, comfortable hand grip. They provide the necessary elevation and balance support when working toward proper spinal and hip alignment. The accompanying durable cotton stretching strap with sturdy metal D-rings helps you extend reach safely, making this combo ideal for both beginners and seasoned yogis. Enjoy safer poses, enhanced flexibility, and greater stability in every session.',
    seo_title: 'Yoga Block Set of 2 with Strap | YogKart',
    meta_description: 'Buy YogKart Yoga Block Set of 2 with Strap at Rs 349. High-density EVA foam blocks for alignment & stretching. Buy on YogKart.',
    meta_keywords: ['yoga blocks set', 'eva foam blocks', 'yoga strap set', 'yoga alignment blocks', 'stretching prop set', 'yoga bricks 2 pack', 'buy online india', 'yogkart'],
    seo_description: 'Deepen your yoga poses safely with the YogKart Yoga Block Set of 2 plus stretching strap. High-density EVA foam blocks with beveled edges provide reliable balance and stability.',
    product_highlights: [
      'Pack includes 2 supportive EVA blocks and 1 cotton strap',
      'High-density moisture-proof foam supports full body weight',
      'Beveled edges provide a comfortable, non-slip grip',
      'Sturdy strap with metal D-rings for safe flexibility training'
    ],
    image_alt_text: 'YogKart High Density EVA Foam Yoga Blocks Set of 2 with Stretching Strap',
    stock: 190
  },

  // 18. Ab Roller Wheel with Knee Pad | Core Strength Exercise Wheel
  {
    name: 'Ab Roller Wheel with Knee Pad | Core Strength Exercise Wheel',
    slug: 'yogkart-ab-roller-wheel-with-knee-pad',
    category_id: 'fitness-wellness',
    subcategory: 'Strength Training',
    price: 299,
    original_price: 799,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Dual wheel ab roller with knee pad for core and abdominal workouts at home.',
    benefits: [
      'Smooth dual wheel',
      'Comfortable foam handles',
      'Includes knee mat'
    ],
    material: 'Steel, foam, rubber',
    specs: [
      { label: 'Wheel', value: 'Dual' },
      { label: 'Handles', value: 'Anti-slip foam' },
      { label: 'Includes', value: 'Knee pad' },
      { label: 'Colour', value: 'Black/Red' }
    ],
    how_to_use: [
      'Kneel on the pad and hold the handles.',
      'Roll forward slowly and return.',
      'Start with a few reps.'
    ],
    precautions: 'Do not overextend if you have back issues.',
    tags: ['ab roller', 'abs workout', 'core strength', 'home gym', 'exercise wheel'],
    pack_size: '1 Roller + Knee Pad',
    faqs: [
      { question: 'Is it for beginners?', answer: 'Yes, start with short rolls.' },
      { question: 'Does it need space?', answer: 'About 1 metre of floor space.' }
    ],
    description: 'Sculpt your midsection and build formidable core stability with the YogKart Ab Roller Wheel with Knee Pad. Equipped with dual smooth-gliding rubberized wheels, this ab trainer ensures maximum balance and tracking stability on any floor without wobbling. The heavy-duty steel axle supports intense workout loads, while ergonomic padded foam handles prevent palm fatigue and slippage. An included thick foam knee mat protects your joints from hard surfaces, making your home abdominal sessions safe and effective. Strengthen your abs, shoulders, and lower back with smooth, controlled rollouts.',
    seo_title: 'Ab Roller Wheel with Knee Pad | YogKart',
    meta_description: 'Buy YogKart Ab Roller Wheel with Knee Pad at Rs 299. Dual wheel core workout trainer for home gym. Order online on YogKart.',
    meta_keywords: ['ab roller wheel', 'abdominal exercise wheel', 'core strength trainer', 'home gym ab roller', 'dual wheel roller', 'ab workout wheel', 'buy online india', 'yogkart'],
    seo_description: 'Build core strength with the YogKart Ab Roller Wheel. Dual-wheel design provides superior stability, complemented by padded handles and a cushioned knee mat for safe home gyms.',
    product_highlights: [
      'Dual-wheel wide base provides wobble-free stability',
      'Heavy-duty stainless steel core axle holds high weight',
      'Anti-slip sweat-resistant foam hand grips',
      'Includes high-density cushioned knee protector pad'
    ],
    image_alt_text: 'YogKart Dual Ab Roller Wheel with Knee Pad for Core Abdominal Exercise',
    stock: 180
  },

  // 19. Hand Gripper Adjustable | Forearm & Grip Strength Trainer
  {
    name: 'Hand Gripper Adjustable | Forearm & Grip Strength Trainer',
    slug: 'yogkart-hand-gripper-adjustable-resistance',
    category_id: 'fitness-wellness',
    subcategory: 'Strength Training',
    price: 199,
    original_price: 499,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Adjustable resistance hand gripper for forearm and grip strength training.',
    benefits: [
      'Adjustable resistance',
      'Non-slip handles',
      'Compact for office and gym'
    ],
    material: 'Steel spring, foam grip',
    specs: [
      { label: 'Resistance', value: '10-40 kg adjustable' },
      { label: 'Material', value: 'Steel and foam' },
      { label: 'Use', value: 'Hand and forearm' },
      { label: 'Colour', value: 'Black' }
    ],
    how_to_use: [
      'Hold the gripper in your palm.',
      'Squeeze fully and release slowly.',
      'Do 10-15 reps per hand.'
    ],
    precautions: 'Do not over-train. Rest between sets.',
    tags: ['hand gripper', 'grip strength', 'forearm trainer', 'gym accessory', 'hand exercise'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Can I change resistance?', answer: 'Yes, using the adjustment dial.' },
      { question: 'Good for climbers?', answer: 'Yes, for grip training.' }
    ],
    description: 'Develop powerful wrist, finger, and forearm endurance with the YogKart Adjustable Hand Gripper. Designed with a robust alloy steel tension spring, this gripper features an intuitive rotary dial that lets you adjust resistance smoothly from 10 kg up to 40 kg. Ergonomic non-slip grooved handles fit hands of all sizes comfortably, making it ideal for athletes, rock climbers, musicians, and office workers seeking hand strength and dexterity. Compact and lightweight, it easily fits in pockets or desk drawers. Build functional hand grip strength anytime and track your daily training progress.',
    seo_title: 'Adjustable Hand Gripper | Best Price | YogKart',
    meta_description: 'Buy YogKart Adjustable Hand Gripper at Rs 199. 10-40 kg resistance forearm and grip strength trainer. Shop now on YogKart.',
    meta_keywords: ['hand gripper', 'adjustable grip trainer', 'forearm strengthener', 'wrist exerciser', 'grip strength equipment', 'finger grip exerciser', 'buy online india', 'yogkart'],
    seo_description: 'Strengthen forearms and wrists with the YogKart Adjustable Hand Gripper. Easy rotary dial adjusts resistance from 10kg to 40kg for progressive grip and finger strength training.',
    product_highlights: [
      'Dial-controlled resistance adjustable from 10 to 40 kg',
      'Heavy-duty alloy steel tension spring',
      'Ergonomic textured handles for slip-resistant grip',
      'Pocket-sized design for training at home, office or gym'
    ],
    image_alt_text: 'YogKart Adjustable Hand Gripper 10-40kg Forearm and Grip Strength Trainer',
    stock: 225
  },

  // 20. Resistance Loop Bands Set of 5 | Booty & Stretch Workout Bands
  {
    name: 'Resistance Loop Bands Set of 5 | Booty & Stretch Workout Bands',
    slug: 'yogkart-resistance-loop-bands-set-of-5',
    category_id: 'fitness-wellness',
    subcategory: 'Resistance Training',
    price: 299,
    original_price: 799,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Set of 5 fabric and latex loop bands in different resistance levels for strength and stretching.',
    benefits: [
      '5 resistance levels',
      'Non-slip design',
      'Carry pouch included'
    ],
    material: 'Natural latex',
    specs: [
      { label: 'Pack', value: '5 Bands' },
      { label: 'Levels', value: 'Light to Extra Heavy' },
      { label: 'Material', value: 'Latex' },
      { label: 'Includes', value: 'Carry bag' }
    ],
    how_to_use: [
      'Choose a band level.',
      'Place around legs or arms.',
      'Perform controlled exercises.'
    ],
    precautions: 'Check the band for tears before use. Avoid if allergic to latex.',
    tags: ['resistance bands', 'loop bands', 'workout bands', 'stretch bands', 'home gym'],
    pack_size: '5 Bands + Pouch',
    faqs: [
      { question: 'Which band should I start with?', answer: 'Start with light or medium.' },
      { question: 'Are they washable?', answer: 'Yes, with mild soap and water.' }
    ],
    description: 'Upgrade your home gym and body toning routines with the YogKart Resistance Loop Bands Set of 5. Made from 100% skin-safe natural latex, this comprehensive set features five color-coded bands ranging from Extra Light to Extra Heavy resistance. Perfect for activating glutes, toning legs, strengthening shoulders, and rehabilitation stretches. They snap back reliably without overstretching or rolling. The included breathable carry pouch keeps all five bands tidy and portable for workouts at the gym, park, or on vacation. Add versatile resistance to squats, lunges, and mobility routines effortlessly.',
    seo_title: 'Resistance Loop Bands Set of 5 | YogKart',
    meta_description: 'Buy YogKart Resistance Loop Bands Set of 5 at Rs 299. Natural latex workout loop bands with carry pouch. Order on YogKart today.',
    meta_keywords: ['resistance loop bands', 'booty workout bands', 'stretch bands set', 'latex resistance bands', 'fitness bands set', 'exercise loop bands', 'buy online india', 'yogkart'],
    seo_description: 'Tone your legs, glutes, and upper body with the YogKart 5-piece Resistance Loop Band Set. 5 calibrated tension levels made from durable natural latex with portable carry pouch.',
    product_highlights: [
      '5 color-coded resistance levels from X-Light to X-Heavy',
      '100% natural snap-resistant durable latex',
      'Ideal for glute activation, yoga, and rehab exercises',
      'Compact travel pouch included for on-the-go workouts'
    ],
    image_alt_text: 'YogKart Set of 5 Resistance Loop Bands with Pouch for Glute and Leg Workout',
    stock: 235
  },

  // 21. Massage Ball & Lacrosse Ball Set | Trigger Point Roller Balls
  {
    name: 'Massage Ball & Lacrosse Ball Set | Trigger Point Roller Balls',
    slug: 'yogkart-massage-ball-lacrosse-ball-set',
    category_id: 'fitness-wellness',
    subcategory: 'Recovery',
    price: 249,
    original_price: 699,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Set of massage balls for trigger point and muscle recovery on back, feet and shoulders.',
    benefits: [
      'Firm and textured',
      'Portable',
      'Great for post-workout recovery'
    ],
    material: 'Silicone, rubber',
    specs: [
      { label: 'Pack', value: '2 Balls' },
      { label: 'Diameter', value: '6.5 cm' },
      { label: 'Material', value: 'Rubber' },
      { label: 'Colour', value: 'Assorted' }
    ],
    how_to_use: [
      'Place the ball between you and a wall or floor.',
      'Roll gently over tight areas.',
      'Hold for 20-30 seconds.'
    ],
    precautions: 'Do not roll on bones or injured areas.',
    tags: ['massage ball', 'lacrosse ball', 'recovery', 'trigger point', 'muscle roller'],
    pack_size: '2 Balls',
    faqs: [
      { question: 'Is it painful?', answer: 'Mild pressure; adjust as comfortable.' },
      { question: 'Where to use?', answer: 'Back, feet, glutes and shoulders.' }
    ],
    description: 'Release stubborn muscle knots and localized trigger point tension with the YogKart Massage Ball and Lacrosse Ball Set. Crafted from dense, non-toxic solid rubber, these 6.5 cm recovery spheres offer the precise firmness required for deep tissue myofascial release. Target tight shoulder blades, calves, glutes, and plantar fascia by simply placing the ball against a floor or wall and rolling smoothly. Compact and lightweight, they are effortless to pack for post-workout recovery sessions anywhere. Incorporate them into your warm-up and cool-down routines to enhance muscle mobility and flexibility.',
    seo_title: 'Massage & Lacrosse Ball Set | YogKart',
    meta_description: 'Buy YogKart Massage Ball & Lacrosse Ball Set at Rs 249. Firm trigger point recovery balls for back & feet. Order on YogKart.',
    meta_keywords: ['massage ball set', 'lacrosse ball recovery', 'trigger point ball', 'myofascial release ball', 'foot massage ball', 'muscle roller balls', 'buy online india', 'yogkart'],
    seo_description: 'Target deep muscle knots with the YogKart Massage Ball Set. Solid high-density rubber construction delivers focused trigger-point comfort for back, feet, glutes, and shoulders.',
    product_highlights: [
      'Pack of 2 solid high-density rubber massage balls',
      'Standard 6.5 cm diameter for pinpoint trigger pressure',
      'Non-slip grip surface holds firmly on walls and floors',
      'Great for plantar fasciitis, glutes, and shoulder knots'
    ],
    image_alt_text: 'YogKart Massage Ball and Lacrosse Ball Trigger Point Myofascial Recovery Set',
    stock: 205
  },

  // 22. Stainless Steel Tongue Cleaner Set | Copper & Steel Oral Hygiene Scraper
  {
    name: 'Stainless Steel Tongue Cleaner Set | Copper & Steel Oral Hygiene Scraper',
    slug: 'yogkart-stainless-steel-tongue-cleaner-set',
    category_id: 'wellness-sleep',
    subcategory: 'Oral Hygiene Tools',
    price: 99,
    original_price: 299,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Stainless steel tongue cleaner for daily oral hygiene routine.',
    benefits: [
      'Smooth, rust-free steel',
      'Easy to clean and reuse',
      'Hygienic daily habit'
    ],
    material: 'Stainless steel',
    specs: [
      { label: 'Pack', value: '2 Pieces' },
      { label: 'Material', value: 'Stainless steel' },
      { label: 'Length', value: 'Approx. 14 cm' },
      { label: 'Use', value: 'Daily' }
    ],
    how_to_use: [
      'Gently scrape from back to front of the tongue.',
      'Rinse the tool and mouth.',
      'Wash tool with soap after each use.'
    ],
    precautions: 'Use gentle pressure. Stop if irritation occurs.',
    tags: ['tongue cleaner', 'oral hygiene', 'steel tongue scraper', 'daily care', 'mouth hygiene'],
    pack_size: '2 Pieces',
    faqs: [
      { question: 'How often to use?', answer: 'Once daily, usually in the morning.' },
      { question: 'Is it rust-proof?', answer: 'Yes, it is made of stainless steel.' }
    ],
    description: 'Elevate your daily morning oral hygiene with the YogKart Stainless Steel Tongue Cleaner Set. Crafted from medical-grade, rust-resistant stainless steel with smoothly contoured edges, these scrapers effectively remove oral buildup and bacteria from the tongue surface without cutting or nicking. The wide flexible curved scraping head covers maximum tongue area in a single gentle sweep, freshening breath and promoting enhanced taste sensation. Dishwasher safe, plastic-free, and designed to last for years. Make tongue scraping an effortless daily self-care habit that supports your overall oral wellness.',
    seo_title: 'Stainless Steel Tongue Cleaner Set | YogKart',
    meta_description: 'Buy YogKart Stainless Steel Tongue Cleaner Set (Pack of 2) at Rs 99. Rust-proof oral scrapers for fresh breath. Order online on YogKart.',
    meta_keywords: ['tongue cleaner set', 'stainless steel tongue scraper', 'oral hygiene scraper', 'tongue cleaner 2 pack', 'metal tongue cleaner', 'oral care tools', 'buy online india', 'yogkart'],
    seo_description: 'Keep your breath fresh naturally with the YogKart Stainless Steel Tongue Cleaner Set. Smooth, curved rust-free scrapers designed for hygienic, non-gagging daily oral care.',
    product_highlights: [
      'Pack of 2 surgical-grade stainless steel scrapers',
      'Non-gagging wide curved edge for smooth scraping',
      'Smoothly rounded handles for comfortable control',
      'Eco-friendly, rust-proof, and plastic-free longevity'
    ],
    image_alt_text: 'YogKart Stainless Steel Tongue Cleaner Scraper Set of 2 for Oral Hygiene',
    stock: 250
  },

  // 23. Ceramic Neti Pot | Nasal Cleansing Pot for Daily Use
  {
    name: 'Ceramic Neti Pot | Nasal Cleansing Pot for Daily Use',
    slug: 'yogkart-ceramic-neti-pot-nasal-cleansing',
    category_id: 'wellness-sleep',
    subcategory: 'Wellness Tools',
    price: 249,
    original_price: 599,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Traditional ceramic neti pot for nasal rinse routine following Ayurvedic and yogic practice.',
    benefits: [
      'Easy to hold and pour',
      'Durable ceramic',
      'Traditional wellness tool'
    ],
    material: 'Ceramic',
    specs: [
      { label: 'Capacity', value: '300 ml' },
      { label: 'Material', value: 'Ceramic' },
      { label: 'Colour', value: 'White' },
      { label: 'Use', value: 'Nasal rinse' }
    ],
    how_to_use: [
      'Fill with lukewarm clean water as per instructions.',
      'Tilt head and rinse as taught.',
      'Wash the pot after use.'
    ],
    precautions: 'Use only clean, boiled and cooled or distilled water. Learn the technique before use.',
    tags: ['neti pot', 'nasal rinse', 'jal neti', 'yoga kriya', 'wellness'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'What water to use?', answer: 'Lukewarm boiled or distilled water.' },
      { question: 'Is it dishwasher safe?', answer: 'Hand wash is recommended.' }
    ],
    description: 'Cleanse and refresh your respiratory pathways naturally with the YogKart Traditional Ceramic Neti Pot. Designed for the ancient yogic practice of Jal Neti, this 300ml glazed ceramic pot features an ergonomic tapered spout that fits comfortably against the nostril without leaking. Its balanced handle allows steady pouring control while performing gentle saline nasal flushes. Crafted from lead-free, non-porous ceramic, it is exceptionally hygienic, easy to sanitize with warm water, and free of microplastics. Maintain seasonal breathing comfort and daily nasal freshness with this authentic yoga cleansing prop.',
    seo_title: 'Ceramic Neti Pot for Nasal Rinse | YogKart',
    meta_description: 'Buy YogKart Ceramic Neti Pot at Rs 249. Traditional Jal Neti pot for natural nasal rinse & respiratory wellness. Order on YogKart.',
    meta_keywords: ['ceramic neti pot', 'jal neti pot', 'nasal wash pot', 'ayurvedic neti pot', 'nasal rinse tool', 'yoga cleansing kriya', 'ceramic nasal pot', 'buy online india', 'yogkart'],
    seo_description: 'Practise traditional Jal Neti with the YogKart Ceramic Neti Pot. Glazed lead-free ceramic with an ergonomic spout ensures smooth, comfortable nasal irrigation and breathing ease.',
    product_highlights: [
      'Lead-free glazed ceramic for superior hygiene',
      'Smooth tapered conical spout fits nostril comfortably',
      'Ergonomic handle ensures balanced water flow control',
      'Generous 300 ml capacity for complete nasal rinse'
    ],
    image_alt_text: 'YogKart Glazed White Ceramic Neti Pot for Jal Neti Nasal Rinse Cleansing',
    stock: 140
  },

  // 24. Aroma Essential Oil Diffuser | Ultrasonic Cool Mist Humidifier
  {
    name: 'Aroma Essential Oil Diffuser | Ultrasonic Cool Mist Humidifier',
    slug: 'yogkart-aroma-essential-oil-diffuser',
    category_id: 'wellness-sleep',
    subcategory: 'Aromatherapy',
    price: 699,
    original_price: 1699,
    flags: { featured: true, new: true, best_seller: false },
    short_description: 'Ultrasonic aroma diffuser with LED mood light to spread fragrance and add humidity to your room.',
    benefits: [
      'Quiet cool mist operation',
      'Soft LED light',
      'Auto shut-off for safety'
    ],
    material: 'ABS, ceramic plate',
    specs: [
      { label: 'Capacity', value: '300 ml' },
      { label: 'Run Time', value: '4-6 hours' },
      { label: 'Power', value: 'USB / Adapter' },
      { label: 'Light', value: 'LED' }
    ],
    how_to_use: [
      'Fill the tank with water.',
      'Add a few drops of essential oil.',
      'Switch on and enjoy.'
    ],
    precautions: 'Use only water and diluted essential oils. Keep out of reach of pets and kids.',
    tags: ['aroma diffuser', 'essential oil diffuser', 'humidifier', 'aromatherapy', 'room freshener'],
    pack_size: '1 Unit + Adapter',
    faqs: [
      { question: 'Can I use it without oil?', answer: 'Yes, as a humidifier.' },
      { question: 'Does it make noise?', answer: 'It is nearly silent.' }
    ],
    description: 'Create a tranquil spa ambiance in your living room or bedroom with the YogKart Ultrasonic Aroma Essential Oil Diffuser. Utilizing ultrasonic cool mist technology, it transforms water and natural essential oils into an ultra-fine aromatic vapor without using heat, keeping the therapeutic qualities of your oils intact. Equipped with soft color-changing LED mood lighting and a built-in auto shut-off function when water is depleted, this 300ml diffuser operates whisper-quietly for 4-6 hours of peaceful aromatherapy. Humidify dry air while enveloping your home in soothing botanical fragrances.',
    seo_title: 'Aroma Essential Oil Diffuser | YogKart',
    meta_description: 'Buy YogKart Ultrasonic Aroma Diffuser & Humidifier at Rs 699. Cool mist aroma diffuser with LED mood light. Order now on YogKart.',
    meta_keywords: ['aroma diffuser', 'essential oil diffuser', 'ultrasonic humidifier', 'cool mist diffuser', 'aromatherapy diffuser', 'electric room freshener', 'buy online india', 'yogkart'],
    seo_description: 'Infuse your space with soothing fragrance using the YogKart Ultrasonic Aroma Diffuser. Features 300ml tank, whisper-quiet misting, and soft LED mood lights for restful home aroma.',
    product_highlights: [
      'Ultrasonic cool mist preserves essential oil benefits',
      '300 ml water tank delivers 4 to 6 hours continuous mist',
      'Soothing ambient 7-color LED night light feature',
      'Automatic dry-run safety shut-off mechanism'
    ],
    image_alt_text: 'YogKart Ultrasonic Cool Mist Aroma Essential Oil Diffuser and Humidifier',
    stock: 130
  },

  // 25. Silk Pillowcase | Satin Anti-Frizz Pillow Cover for Hair & Skin
  {
    name: 'Silk Pillowcase | Satin Anti-Frizz Pillow Cover for Hair & Skin',
    slug: 'yogkart-silk-pillowcase-satin-cover',
    category_id: 'beauty-tools',
    subcategory: 'Hair & Skin Accessories',
    price: 299,
    original_price: 899,
    flags: { featured: false, new: true, best_seller: true },
    short_description: 'Soft satin pillowcase that feels smooth on skin and hair and helps reduce friction while sleeping.',
    benefits: [
      'Smooth on hair and skin',
      'Cool, soft feel',
      'Envelope closure'
    ],
    material: 'Satin polyester',
    specs: [
      { label: 'Size', value: 'Standard 18 x 28 inch' },
      { label: 'Material', value: 'Satin' },
      { label: 'Closure', value: 'Envelope' },
      { label: 'Colour', value: 'Assorted' }
    ],
    how_to_use: [
      'Remove the old cover and slip on the satin pillowcase.',
      'Use nightly.',
      'Machine wash gently.'
    ],
    precautions: 'Wash separately. Do not bleach.',
    tags: ['silk pillowcase', 'satin pillow cover', 'anti frizz', 'hair care', 'skin care'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Will hair frizz less?', answer: 'Smoother fabric reduces friction on hair.' },
      { question: 'Is it machine washable?', answer: 'Yes, on a gentle cycle.' }
    ],
    description: 'Protect your hair from tangles and cherish your delicate facial skin overnight with the YogKart Satin Silk Pillowcase. Unlike rough cotton fibers that pull at strands and absorb skin moisture, this silky smooth satin fabric dramatically reduces friction while you sleep. Your hair glides freely without frizz, breakage, or morning bedhead, while your facial skin stays supple without morning sleep creases. Crafted with a zipper-free envelope closure to ensure complete sleeping comfort and easy laundering. Wake up each morning with glossier hair, moisturized skin, and a refreshed look.',
    seo_title: 'Silk Satin Pillowcase | Best Price | YogKart',
    meta_description: 'Buy YogKart Satin Silk Pillowcase at Rs 299. Anti-frizz pillow cover for hair and glowing skin. Order online today on YogKart.',
    meta_keywords: ['silk pillowcase', 'satin pillow cover', 'anti frizz pillowcase', 'hair care pillow cover', 'skin friendly pillowcase', 'satin silk pillow', 'buy online india', 'yogkart'],
    seo_description: 'Wake up with smooth hair and fresh skin using the YogKart Satin Pillowcase. Silky frictionless texture prevents hair frizz, knots, and facial sleep lines for overnight beauty care.',
    product_highlights: [
      'Ultra-smooth silky texture minimizes hair friction',
      'Prevents morning hair frizz, breakage, and split ends',
      'Envelope closure design eliminates uncomfortable zippers',
      'Standard 18 x 28 inch size fits regular pillows'
    ],
    image_alt_text: 'YogKart Smooth Satin Silk Pillowcase Anti-Frizz Cover for Hair and Skin',
    stock: 220
  },

  // 26. Silk Hair Bonnet | Satin Sleeping Cap for Curly & Long Hair
  {
    name: 'Silk Hair Bonnet | Satin Sleeping Cap for Curly & Long Hair',
    slug: 'yogkart-silk-hair-bonnet-satin-cap',
    category_id: 'beauty-tools',
    subcategory: 'Hair & Skin Accessories',
    price: 149,
    original_price: 499,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Satin bonnet to protect hair during sleep and reduce tangles.',
    benefits: [
      'Soft elastic band',
      'Reduces friction',
      'Fits all hair lengths'
    ],
    material: 'Satin',
    specs: [
      { label: 'Size', value: 'Free' },
      { label: 'Material', value: 'Satin' },
      { label: 'Band', value: 'Elastic' },
      { label: 'Colour', value: 'Black' }
    ],
    how_to_use: [
      'Gather hair and place the bonnet.',
      'Adjust the band.',
      'Sleep comfortably.'
    ],
    precautions: 'Wash gently by hand.',
    tags: ['hair bonnet', 'satin cap', 'sleeping cap', 'curly hair', 'hair care'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Does it fit long hair?', answer: 'Yes, it is roomy.' },
      { question: 'Is it comfortable overnight?', answer: 'Yes, the band is soft.' }
    ],
    description: 'Keep your curly, natural, or styled hair impeccably protected throughout the night with the YogKart Silk Satin Hair Bonnet. Crafted with a premium silky satin lining, this sleeping cap prevents moisture loss and stops hair from rubbing against bed linen. Its roomy crown comfortably accommodates braids, long locks, curls, and thick hair without flattening volume. Finished with a soft, wide elastic perimeter band, it stays securely on your head all night without leaving tight forehead marks. Wake up to tangle-free curls and preserved hairstyles every single morning.',
    seo_title: 'Silk Satin Hair Bonnet | Best Price | YogKart',
    meta_description: 'Buy YogKart Silk Satin Hair Bonnet at Rs 149. Sleeping cap for curly, long hair and anti-frizz protection. Order now on YogKart.',
    meta_keywords: ['silk hair bonnet', 'satin sleep cap', 'curly hair bonnet', 'satin bonnet for sleeping', 'hair protection cap', 'elastic satin bonnet', 'buy online india', 'yogkart'],
    seo_description: 'Protect your curls and hairstyles with the YogKart Silk Satin Hair Bonnet. Lightweight, roomy, and soft elastic band keeps hair frizz-free and hydrated overnight for easy mornings.',
    product_highlights: [
      'Frictionless satin fabric prevents hair breakage and dryness',
      'Roomy crown accommodates long hair, braids, and curls',
      'Wide stretchable elastic band stays securely in place',
      'Gentle on scalp and leaves no forehead compression marks'
    ],
    image_alt_text: 'YogKart Satin Silk Sleeping Hair Bonnet Cap for Curly and Long Hair',
    stock: 245
  },

  // 27. Face Steamer | Nano Ionic Facial Steamer for Deep Cleansing Routine
  {
    name: 'Face Steamer | Nano Ionic Facial Steamer for Deep Cleansing Routine',
    slug: 'yogkart-face-steamer-nano-ionic',
    category_id: 'beauty-tools',
    subcategory: 'Face Tools',
    price: 899,
    original_price: 2199,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Nano mist facial steamer for a relaxing home facial and skin prep routine.',
    benefits: [
      'Fine warm mist',
      'Quick heat-up',
      'Compact design'
    ],
    material: 'ABS, ceramic',
    specs: [
      { label: 'Capacity', value: '80 ml' },
      { label: 'Mist', value: 'Nano' },
      { label: 'Power', value: '220V' },
      { label: 'Time', value: '10 minutes' }
    ],
    how_to_use: [
      'Add water to the tank.',
      'Switch on and hold your face at a distance.',
      'Steam 5-10 minutes.'
    ],
    precautions: 'Keep a safe distance. Not for use on very sensitive or broken skin.',
    tags: ['face steamer', 'facial steamer', 'skin care tool', 'spa at home', 'facial'],
    pack_size: '1 Unit',
    faqs: [
      { question: 'How long to steam?', answer: '5-10 minutes is common.' },
      { question: 'Can I add herbs?', answer: 'Only if the model has a separate herb tray.' }
    ],
    description: 'Transform your weekly skincare ritual into a luxurious salon experience with the YogKart Nano Ionic Facial Steamer. Utilizing ceramic heating elements and nano atomization technology, it generates warm nano-steam particles in under 30 seconds that penetrate deeply into skin pores. The soothing warm mist loosens stubborn blackheads, unclogs impurities, and softens facial skin to significantly amplify the absorption of face creams and serums. Compact, easy to refill, and designed for safe home spa indulgence. Pamper your face with hydrating warmth and reveal glowing skin clarity.',
    seo_title: 'Nano Ionic Face Steamer | Best Price | YogKart',
    meta_description: 'Buy YogKart Nano Ionic Face Steamer online at Rs 899. Warm mist facial steamer for deep pore cleansing. Order today on YogKart.',
    meta_keywords: ['face steamer', 'nano ionic facial steamer', 'pore cleansing steamer', 'facial steam machine', 'spa face steamer', 'warm mist steamer', 'buy online india', 'yogkart'],
    seo_description: 'Indulge in deep pore cleansing with the YogKart Nano Ionic Face Steamer. Produces ultrafine warm steam in 30 seconds to hydrate and prep skin for serums and creams at home.',
    product_highlights: [
      'Produces micro-fine nano ionic warm steam particles',
      'Ultra-fast heating generates steam in under 30 seconds',
      'Provides 10 minutes of continuous relaxing face steam',
      'Compact countertop footprint with one-touch button control'
    ],
    image_alt_text: 'YogKart Nano Ionic Facial Steamer Machine for Deep Cleansing and Skin Care',
    stock: 125
  },

  // 28. Silicone Face Cleansing Brush | Soft Waterproof Facial Scrubber
  {
    name: 'Silicone Face Cleansing Brush | Soft Waterproof Facial Scrubber',
    slug: 'yogkart-silicone-face-cleansing-brush',
    category_id: 'beauty-tools',
    subcategory: 'Face Tools',
    price: 499,
    original_price: 1299,
    flags: { featured: false, new: true, best_seller: false },
    short_description: 'Soft silicone face brush for gentle cleansing and massage.',
    benefits: [
      'Gentle silicone bristles',
      'Waterproof',
      'USB rechargeable'
    ],
    material: 'Silicone, ABS',
    specs: [
      { label: 'Charging', value: 'USB' },
      { label: 'Waterproof', value: 'Yes' },
      { label: 'Speed', value: '3 levels' },
      { label: 'Colour', value: 'Pink/White' }
    ],
    how_to_use: [
      'Wet your face and apply cleanser.',
      'Move the brush in gentle circles.',
      'Rinse and clean the brush.'
    ],
    precautions: 'Do not use on broken skin. Replace as per manufacturer advice.',
    tags: ['face brush', 'cleansing brush', 'silicone brush', 'skin care tool', 'facial cleanser brush'],
    pack_size: '1 Unit + Cable',
    faqs: [
      { question: 'Is it good for sensitive skin?', answer: 'Soft silicone is gentle; use low speed.' },
      { question: 'How long does it run?', answer: 'About 1-2 weeks per charge with regular use.' }
    ],
    description: 'Achieve radiant, squeaky-clean skin with the YogKart Soft Silicone Face Cleansing Brush. Made from food-grade ultra-hygienic silicone with thousands of soft touchpoints, this waterproof facial scrubber delivers gentle micro-vibrations to clear dirt, excess oil, and makeup residue without scratching delicate facial skin. Featuring 3 adjustable speed settings, it caters to sensitive, combination, and oily skin types alike. Fully waterproof for shower use and rechargeable via USB for hassle-free daily cleansing. Enjoy a refreshing facial massage while maintaining smooth, clear, and glowing skin daily.',
    seo_title: 'Silicone Face Cleansing Brush | YogKart',
    meta_description: 'Buy YogKart Silicone Face Cleansing Brush at Rs 499. Waterproof vibrating facial scrubber with USB charging. Order on YogKart.',
    meta_keywords: ['silicone face brush', 'facial cleansing brush', 'waterproof face scrubber', 'sonic face cleanser', 'silicone facial brush', 'face wash brush', 'buy online india', 'yogkart'],
    seo_description: 'Gently cleanse and massage your skin with the YogKart Silicone Face Cleansing Brush. Features soft silicone bristles, 3 vibration speeds, and USB charging for daily radiant skin.',
    product_highlights: [
      'Hypoallergenic ultra-soft food-grade silicone touchpoints',
      '3 adjustable sonic vibration intensity levels',
      'IPX7 waterproof rated for safe usage in the shower',
      'Long-lasting USB rechargeable battery'
    ],
    image_alt_text: 'YogKart Waterproof Silicone Face Cleansing Brush and Sonic Facial Scrubber',
    stock: 170
  },

  // 29. Scalp Massager Brush | Silicone Hair Shampoo Brush
  {
    name: 'Scalp Massager Brush | Silicone Hair Shampoo Brush',
    slug: 'yogkart-scalp-massager-brush-silicone',
    category_id: 'beauty-tools',
    subcategory: 'Hair Tools',
    price: 129,
    original_price: 399,
    flags: { featured: false, new: false, best_seller: true },
    short_description: 'Soft silicone scalp massager brush for shampooing and relaxing scalp massage.',
    benefits: [
      'Soft flexible bristles',
      'Fits comfortably in hand',
      'Easy to clean'
    ],
    material: 'Silicone, PP',
    specs: [
      { label: 'Material', value: 'Silicone' },
      { label: 'Use', value: 'Wet and dry' },
      { label: 'Colour', value: 'Assorted' },
      { label: 'Size', value: 'Hand size' }
    ],
    how_to_use: [
      'Wet hair and apply shampoo.',
      'Massage scalp in circular motion.',
      'Rinse brush after use.'
    ],
    precautions: 'Use gentle pressure. Avoid on injured scalp.',
    tags: ['scalp massager', 'shampoo brush', 'hair care', 'head massager', 'silicone brush'],
    pack_size: '1 Piece',
    faqs: [
      { question: 'Can I use it on dry hair?', answer: 'Yes, as a gentle massager.' },
      { question: 'Is it easy to clean?', answer: 'Yes, rinse with water.' }
    ],
    description: 'Upgrade your hair wash routine with the YogKart Silicone Scalp Massager and Shampoo Brush. Fitted with thick, flexible silicone bristles of varied lengths, it gently exfoliates the scalp, works shampoo into a rich lather, and removes buildup without scratching with your fingernails. The ergonomic finger-groove handle provides a firm, slip-free grip even with soapy hands. Use it in the shower on wet hair or on dry hair for a soothing, stress-relieving scalp massage after long work hours. Leaves your scalp feeling thoroughly revitalised, clean, and pleasantly refreshed.',
    seo_title: 'Silicone Scalp Massager Brush | YogKart',
    meta_description: 'Buy YogKart Silicone Scalp Massager Brush at Rs 129. Soft bristle shampoo brush for hair care and scalp massage. Shop on YogKart.',
    meta_keywords: ['scalp massager brush', 'shampoo brush', 'silicone hair brush', 'scalp scrubber', 'head massager tool', 'hair wash massager', 'buy online india', 'yogkart'],
    seo_description: 'Exfoliate and invigorate your scalp with the YogKart Silicone Scalp Massager Brush. Soft flexible bristles work shampoo deeply while giving a relaxing massage during every shower.',
    product_highlights: [
      'Soft flexible silicone bristles stimulate scalp comfortably',
      'Works shampoo into a deep, rich lather with less product',
      'Ergonomic palm handle ensures slip-proof wet grip',
      'Suitable for all hair types: curly, straight, thick, or fine'
    ],
    image_alt_text: 'YogKart Soft Silicone Scalp Massager Brush and Hair Shampoo Scrubber',
    stock: 240
  },

  // 30. Bath Loofah & Back Scrubber Set | Exfoliating Shower Brush
  {
    name: 'Bath Loofah & Back Scrubber Set | Exfoliating Shower Brush',
    slug: 'yogkart-bath-loofah-back-scrubber-set',
    category_id: 'beauty-tools',
    subcategory: 'Bath Accessories',
    price: 199,
    original_price: 599,
    flags: { featured: false, new: false, best_seller: false },
    short_description: 'Set of loofah and long-handle back scrubber for a refreshing bath.',
    benefits: [
      'Reaches back easily',
      'Gentle exfoliation',
      'Quick drying'
    ],
    material: 'Natural loofah, wood handle',
    specs: [
      { label: 'Pack', value: '2 Pieces' },
      { label: 'Handle', value: 'Wooden' },
      { label: 'Material', value: 'Loofah' },
      { label: 'Use', value: 'Bath' }
    ],
    how_to_use: [
      'Wet the scrubber and add body wash.',
      'Scrub gently.',
      'Rinse and air dry.'
    ],
    precautions: 'Do not use on irritated skin.',
    tags: ['loofah', 'back scrubber', 'bath brush', 'exfoliating', 'shower accessory'],
    pack_size: 'Set of 2',
    faqs: [
      { question: 'Is it soft?', answer: 'Medium-soft, gentle on skin.' },
      { question: 'How often to replace?', answer: 'Every 2-3 months.' }
    ],
    description: 'Enjoy a refreshing, invigorating shower with the YogKart Bath Loofah and Back Scrubber Set. This essential duo includes a long wooden-handled back brush and a fluffy dense loofah sponge. The long polished wooden handle enables you to reach across your back and shoulders effortlessly, while the natural fibrous loofah texture exfoliates dead skin cells and sweeps away grime. Creates a rich lather with minimal soap and features a handy hanging cord for fast, hygienic air-drying after use. Step out of every shower feeling thoroughly cleansed, smooth, and revitalised.',
    seo_title: 'Bath Loofah & Back Scrubber Set | YogKart',
    meta_description: 'Buy YogKart Bath Loofah & Back Scrubber Set at Rs 199. Long handle wooden shower brush for full body exfoliation. Order on YogKart.',
    meta_keywords: ['bath loofah', 'back scrubber brush', 'shower body brush', 'exfoliating bath scrubber', 'long handle loofah', 'shower loofah set', 'buy online india', 'yogkart'],
    seo_description: 'Cleanse and gently exfoliate hard-to-reach areas with the YogKart Bath Loofah and Back Scrubber Set. Features a long wooden handle and hanging loop for effortless full-body bathing.',
    product_highlights: [
      'Includes long-reach wooden back scrubber and shower loofah',
      'Natural fibrous texture exfoliates dead skin cells gently',
      'Generates luxurious rich foam with any shower gel or soap',
      'Cotton hanging cord allows rapid, mold-free air drying'
    ],
    image_alt_text: 'YogKart Bath Loofah and Long Handle Wooden Back Scrubber Shower Set',
    stock: 220
  }
];

// Pre-flight validator function
function validateAll() {
  console.log(`Starting validation for ${RAW_PRODUCTS.length} products...`);
  const slugs = new Set();
  const FORBIDDEN_WORDS = [/\bcures?\b/i, /\btreats?\b/i, /\bheals?\b/i];

  for (let i = 0; i < RAW_PRODUCTS.length; i++) {
    const p = RAW_PRODUCTS[i];
    const num = i + 1;

    // Check slug
    if (!p.slug.startsWith('yogkart-')) {
      throw new Error(`Product ${num}: slug must start with 'yogkart-', got ${p.slug}`);
    }
    if (slugs.has(p.slug)) {
      throw new Error(`Product ${num}: duplicate slug ${p.slug}`);
    }
    slugs.add(p.slug);

    // Check seo_title
    if (p.seo_title.length > 60) {
      throw new Error(`Product ${num} (${p.slug}): seo_title exceeds 60 chars (${p.seo_title.length}): "${p.seo_title}"`);
    }

    // Check meta_description
    if (p.meta_description.length > 155) {
      throw new Error(`Product ${num} (${p.slug}): meta_description exceeds 155 chars (${p.meta_description.length}): "${p.meta_description}"`);
    }
    if (!p.meta_description.includes('Rs')) {
      throw new Error(`Product ${num} (${p.slug}): meta_description must include price with 'Rs'`);
    }

    // Check short_description
    if (p.short_description.length > 160) {
      throw new Error(`Product ${num} (${p.slug}): short_description exceeds 160 chars (${p.short_description.length})`);
    }

    // Check seo_description
    if (p.seo_description.length < 150 || p.seo_description.length > 250) {
      throw new Error(`Product ${num} (${p.slug}): seo_description must be 150-250 chars (${p.seo_description.length}): "${p.seo_description}"`);
    }

    // Check description word count
    const words = countWords(p.description);
    if (words < 80 || words > 150) {
      throw new Error(`Product ${num} (${p.slug}): description word count must be 80-150, got ${words}`);
    }

    // Check forbidden medical claims in text fields
    const textsToCheck = [p.description, p.short_description, p.seo_description, ...p.benefits];
    for (const text of textsToCheck) {
      for (const pattern of FORBIDDEN_WORDS) {
        if (pattern.test(text)) {
          throw new Error(`Product ${num} (${p.slug}): contains forbidden word ${pattern}: "${text}"`);
        }
      }
    }

    // Check stock
    if (p.stock < 120 || p.stock > 250) {
      throw new Error(`Product ${num} (${p.slug}): stock must be between 120 and 250, got ${p.stock}`);
    }

    // Check image_alt_text
    if (p.image_alt_text.length >= 125) {
      throw new Error(`Product ${num} (${p.slug}): image_alt_text must be under 125 chars (${p.image_alt_text.length})`);
    }

    // Check product highlights
    if (p.product_highlights.length < 3 || p.product_highlights.length > 5) {
      throw new Error(`Product ${num} (${p.slug}): product_highlights count must be 3-5, got ${p.product_highlights.length}`);
    }

    // Check meta_keywords
    if (p.meta_keywords.length < 8 || p.meta_keywords.length > 12) {
      throw new Error(`Product ${num} (${p.slug}): meta_keywords count must be 8-12, got ${p.meta_keywords.length}`);
    }

    // Check FAQs
    if (!Array.isArray(p.faqs) || p.faqs.length === 0) {
      throw new Error(`Product ${num} (${p.slug}): faqs must not be empty`);
    }
  }

  console.log(`✅ All ${RAW_PRODUCTS.length} products passed strict pre-flight validation!`);
}

async function run() {
  validateAll();

  const client = await pool.connect();
  try {
    console.log('Starting database transaction...');
    await client.query('BEGIN');

    // 1. Ensure categories exist in categories table
    console.log('Ensuring categories exist in categories table...');
    for (const cat of CATEGORIES_DATA) {
      await client.query(`
        INSERT INTO categories (id, name, sort_order, parent_id, is_active, show_in_menu)
        VALUES ($1, $2, $3, NULL, TRUE, TRUE)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          is_active = TRUE;
      `, [cat.id, cat.name, cat.sort_order]);
    }
    console.log('✅ Categories verified in public.categories.');

    // 2. Insert all 30 products
    console.log('Inserting 30 products into public.products...');
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < RAW_PRODUCTS.length; i++) {
      const p = RAW_PRODUCTS[i];
      const fullName = 'YogKart ' + p.name;
      const discount = Math.round(((p.original_price - p.price) * 100) / p.original_price);
      const canonical_url = `https://yogkart.com/product/${p.slug}`;

      // Schema.org json
      const schema_json = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: fullName,
        description: p.short_description,
        brand: {
          '@type': 'Brand',
          name: 'YogKart'
        },
        sku: p.slug,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: p.price.toString(),
          availability: 'https://schema.org/InStock',
          url: canonical_url
        }
      };

      // Ingredients list jsonb (materials split by comma)
      const ingredients_list = p.material.split(',').map(m => m.trim()).filter(Boolean);

      const res = await client.query(`
        INSERT INTO public.products (
          id, "name", slug, category_id, subcategory, brand, price, original_price, discount,
          rating, review_count, stock, images, thumbnail, description, key_benefits,
          ingredients, dosage, side_effects, is_featured, is_new, is_best_seller,
          tags, prescription, manufacturer, country_of_origin, pack_size, is_active,
          created_at, updated_at, seo_title, meta_description, meta_keywords,
          canonical_url, short_description, seo_description, product_highlights,
          image_alt_text, faq_json, schema_json, seo_score, seo_suggestions,
          seo_generated_by, seo_generated_at, search_vector, how_to_use,
          ingredients_list, specifications, precautions, variation_ids
        )
        VALUES (
          nextval('products_id_seq'::regclass),
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27,
          NOW(), NOW(), $28, $29, $30,
          $31, $32, $33, $34,
          $35, $36, $37, $38, $39,
          $40, NOW(),
          to_tsvector('english', $46),
          $41,
          $42, $43, $44, $45
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id, slug;
      `, [
        fullName,                             // $1: name
        p.slug,                               // $2: slug
        p.category_id,                        // $3: category_id
        p.subcategory,                        // $4: subcategory
        'YogKart',                            // $5: brand
        p.price,                              // $6: price
        p.original_price,                     // $7: original_price
        discount,                             // $8: discount
        0,                                    // $9: rating
        0,                                    // $10: review_count
        p.stock,                              // $11: stock
        [],                                   // $12: images
        '',                                   // $13: thumbnail
        p.description,                        // $14: description
        p.benefits,                           // $15: key_benefits
        p.material,                           // $16: ingredients
        '',                                   // $17: dosage
        '',                                   // $18: side_effects
        p.flags.featured || false,            // $19: is_featured
        p.flags.new || false,                 // $20: is_new
        p.flags.best_seller || false,         // $21: is_best_seller
        p.tags,                               // $22: tags
        false,                                // $23: prescription
        'YogKart',                            // $24: manufacturer
        'India',                              // $25: country_of_origin
        p.pack_size,                          // $26: pack_size
        false,                                // $27: is_active (MUST BE FALSE)
        p.seo_title,                          // $28: seo_title
        p.meta_description,                   // $29: meta_description
        p.meta_keywords,                      // $30: meta_keywords
        canonical_url,                        // $31: canonical_url
        p.short_description,                  // $32: short_description
        p.seo_description,                    // $33: seo_description
        p.product_highlights,                 // $34: product_highlights
        p.image_alt_text,                     // $35: image_alt_text
        JSON.stringify(p.faqs),               // $36: faq_json
        JSON.stringify(schema_json),          // $37: schema_json
        85,                                   // $38: seo_score
        ['Add product images', 'Add customer reviews after sales'], // $39: seo_suggestions
        'ai',                                 // $40: seo_generated_by
        JSON.stringify(p.how_to_use),         // $41: how_to_use
        JSON.stringify(ingredients_list),     // $42: ingredients_list
        JSON.stringify(p.specs),              // $43: specifications
        p.precautions,                        // $44: precautions
        [],                                   // $45: variation_ids
        `${fullName} ${p.subcategory} ${p.short_description} ${p.tags.join(' ')}` // $46: search_text
      ]);

      if (res.rows.length > 0) {
        insertedCount++;
        console.log(`  [${i + 1}/30] Inserted id=${res.rows[0].id}: ${p.slug}`);
      } else {
        skippedCount++;
        console.log(`  [${i + 1}/30] Skipped existing slug: ${p.slug}`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n🎉 TRANSACTION COMMITTED SUCCESSFULLY!`);
    console.log(`Inserted: ${insertedCount}, Skipped: ${skippedCount}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
  }

  // STEP 4 - VERIFY AND REPORT
  console.log('\nRunning Step 4 Verification Queries...');
  const countRes = await pool.query(`
    SELECT 
      count(*) as total_ai_products, 
      count(*) FILTER (WHERE is_active = false) as inactive_count, 
      min(stock) as min_stock,
      max(stock) as max_stock
    FROM public.products 
    WHERE seo_generated_by = 'ai';
  `);
  console.log('Verification Counts:');
  console.table(countRes.rows);

  const titleCheck = await pool.query(`
    SELECT count(*) as invalid_titles
    FROM public.products
    WHERE seo_generated_by = 'ai' AND length(seo_title) > 60;
  `);
  console.log('Invalid Titles (> 60 chars):', titleCheck.rows[0].invalid_titles);

  const metaDescCheck = await pool.query(`
    SELECT count(*) as invalid_meta_descriptions
    FROM public.products
    WHERE seo_generated_by = 'ai' AND length(meta_description) > 155;
  `);
  console.log('Invalid Meta Descriptions (> 155 chars):', metaDescCheck.rows[0].invalid_meta_descriptions);

  const uniqueSlugCheck = await pool.query(`
    SELECT slug, count(*) 
    FROM public.products 
    WHERE seo_generated_by = 'ai' 
    GROUP BY slug 
    HAVING count(*) > 1;
  `);
  console.log('Duplicate Slugs:', uniqueSlugCheck.rows.length === 0 ? 'None (All unique)' : uniqueSlugCheck.rows);

  // Sample check
  const sample = await pool.query(`
    SELECT id, name, slug, category_id, subcategory, price, original_price, discount, stock, is_active, seo_title, meta_description, array_length(meta_keywords, 1) as kw_count, jsonb_array_length(faq_json) as faq_count
    FROM public.products
    WHERE seo_generated_by = 'ai'
    ORDER BY id
    LIMIT 5;
  `);
  console.log('\nSample Inserted Products:');
  console.table(sample.rows);

  await pool.end();
}

run().catch(err => {
  console.error('Fatal error during run:', err);
  process.exit(1);
});
