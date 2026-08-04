const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/health/remedies
 * Public endpoint to search Ayurvedic remedies by symptom or category
 */
exports.listRemedies = async (req, res) => {
  try {
    const { category, symptom, search } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`category ILIKE $${idx++}`);
      params.push(`%${category}%`);
    }

    if (symptom) {
      conditions.push(`$${idx++} = ANY(symptoms)`);
      params.push(symptom.toLowerCase());
    }

    if (search) {
      conditions.push(`(title ILIKE $${idx} OR ayurvedic_remedy ILIKE $${idx} OR $${idx + 1} = ANY(symptoms))`);
      params.push(`%${search}%`, search.toLowerCase());
      idx += 2;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const remediesRes = await db.query(
      `SELECT id, title, slug, category, symptoms, ayurvedic_remedy, herbs, yoga_poses, precautions, created_at
       FROM health_remedies
       ${whereClause}
       ORDER BY title ASC`,
      params
    );

    return successResponse(res, { remedies: remediesRes.rows }, 'Remedies fetched successfully');
  } catch (error) {
    console.error('listRemedies error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/health/remedies/:slug
 * Public endpoint to fetch remedy details
 */
exports.getRemedyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await db.query(
      'SELECT * FROM health_remedies WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Remedy not found', 404);
    }

    return successResponse(res, { remedy: result.rows[0] }, 'Remedy fetched');
  } catch (error) {
    console.error('getRemedyBySlug error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/health/bmi
 * Calculate BMI Index & return Ayurvedic Wellness & Diet advice
 */
exports.calculateBmi = async (req, res) => {
  try {
    const { height_cm, weight_kg } = req.body;

    const h = parseFloat(height_cm);
    const w = parseFloat(weight_kg);

    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      return errorResponse(res, 'Valid height (cm) and weight (kg) are required', 400);
    }

    const heightMeters = h / 100;
    const bmi = parseFloat((w / (heightMeters * heightMeters)).toFixed(1));

    let category = 'Normal Weight';
    let ayurvedicAdvice = '';
    let dietRecommendations = [];
    let suggestedYoga = [];

    if (bmi < 18.5) {
      category = 'Underweight (Vata Imbalance)';
      ayurvedicAdvice = 'Focus on nourishing, warm, and grounding foods to balance Vata. Include healthy fats like A2 Cow Ghee and warm milk.';
      dietRecommendations = ['Warm milk with Ashwagandha & Nutmeg', 'Soaked almonds & dates', 'Khichdi with Ghee', 'Root vegetables'];
      suggestedYoga = ['Surya Namaskar (Gentle)', 'Bhujangasana', 'Vrikshasana'];
    } else if (bmi >= 18.5 && bmi < 24.9) {
      category = 'Optimal Healthy Weight';
      ayurvedicAdvice = 'Your body weight is in a healthy range. Maintain your Agni (digestive fire) with balanced seasonal Sattvic meals.';
      dietRecommendations = ['Fresh seasonal fruits', 'Whole grains (Ragi, Jowar)', 'Herbal teas (Tulsi & Ginger)', 'Sprouted lentils'];
      suggestedYoga = ['Surya Namaskar (12 Rounds)', 'Trikonasana', 'Anulom Vilom Pranayama'];
    } else if (bmi >= 25 && bmi < 29.9) {
      category = 'Overweight (Kapha Imbalance)';
      ayurvedicAdvice = 'Incorporate light, warm, spicy, and bitter foods to stimulate metabolism and reduce excess Kapha accumulation.';
      dietRecommendations = ['Warm water with lemon & honey in morning', 'Triphala tea', 'Barley & Millet khichdi', 'Pungent spices (black pepper, ginger)'];
      suggestedYoga = ['Vinyasa Flow', 'Dhanurasana (Bow Pose)', 'Kapalbhati Pranayama'];
    } else {
      category = 'Obesity (High Kapha & Mamsa Meda Dhatu)';
      ayurvedicAdvice = 'Engage in active physical exercise, follow a strict low-fat Sattvic diet, and consult an Ayurvedic practitioner for Panchakarma detox.';
      dietRecommendations = ['Warm Ginger-Cinnamon water', 'Steamed vegetables', 'Avoid refined sugar, dairy, and cold drinks'];
      suggestedYoga = ['Surya Namaskar (Dynamic)', 'Paschimottanasana', 'Bhastrika & Kapalbhati Pranayama'];
    }

    return successResponse(res, {
      bmi,
      category,
      ayurvedic_advice: ayurvedicAdvice,
      diet_recommendations: dietRecommendations,
      suggested_yoga: suggestedYoga
    }, 'BMI calculated successfully');
  } catch (error) {
    console.error('calculateBmi error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/health/dosha
 * Evaluate Vata / Pitta / Kapha scores & return Prakriti Analysis
 */
exports.evaluateDosha = async (req, res) => {
  try {
    const { vata_score = 0, pitta_score = 0, kapha_score = 0 } = req.body;
    const userId = req.user?.id || null;

    const v = parseInt(vata_score, 10);
    const p = parseInt(pitta_score, 10);
    const k = parseInt(kapha_score, 10);

    let primaryDosha = 'Tridoshic';
    let doshaDescription = '';
    let recommendations = [];

    if (v > p && v > k) {
      primaryDosha = 'Vata';
      doshaDescription = 'Vata is characterized by the Air & Ether elements. You are energetic, creative, and quick-thinking, but prone to dryness, anxiety, and digestive irregularity when imbalanced.';
      recommendations = ['Favor warm, cooked, grounding foods with healthy Ghee', 'Maintain a consistent daily routine for sleep and meals', 'Practice gentle, grounding yoga and Nadi Shodhana Pranayama'];
    } else if (p > v && p > k) {
      primaryDosha = 'Pitta';
      doshaDescription = 'Pitta is characterized by the Fire & Water elements. You are sharp, focused, passionate, and driven, but prone to acidity, inflammation, and irritability under stress.';
      recommendations = ['Favor sweet, bitter, and astringent cooling foods', 'Avoid excessive spicy, sour, and fried foods', 'Practice Sheetali Pranayama and moonlit walks'];
    } else if (k > v && k > p) {
      primaryDosha = 'Kapha';
      doshaDescription = 'Kapha is characterized by Earth & Water elements. You are calm, loyal, stable, and compassionate, but prone to sluggishness, weight gain, and sinus congestion when imbalanced.';
      recommendations = ['Favor light, warm, spicy, and bitter foods', 'Engage in active daily exercise and stay physically active', 'Drink warm herbal teas with ginger and pepper'];
    } else {
      primaryDosha = 'Tridoshic';
      doshaDescription = 'Your constitution shows a balanced state across Vata, Pitta, and Kapha elements. Maintain seasonal adjustments to keep your Agni strong.';
      recommendations = ['Eat according to seasons (Ritucharya)', 'Maintain balanced Sattvic diet and regular meditation'];
    }

    if (userId) {
      await db.query(
        `INSERT INTO dosha_assessments (user_id, vata_score, pitta_score, kapha_score, primary_dosha, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, v, p, k, primaryDosha, JSON.stringify(recommendations)]
      );
    }

    return successResponse(res, {
      primary_dosha: primaryDosha,
      scores: { vata: v, pitta: p, kapha: k },
      description: doshaDescription,
      recommendations
    }, 'Dosha assessment evaluated successfully');
  } catch (error) {
    console.error('evaluateDosha error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/health/wellness
 * Log daily wellness metrics (water, steps, sleep, mood) for current user
 */
exports.logWellness = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      date,
      water_intake_ml = 0,
      step_count = 0,
      sleep_hours = 0,
      mood_rating = 3,
      notes = ''
    } = req.body;

    const logDate = date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO wellness_logs (user_id, log_date, water_intake_ml, step_count, sleep_hours, mood_rating, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         water_intake_ml = EXCLUDED.water_intake_ml,
         step_count = EXCLUDED.step_count,
         sleep_hours = EXCLUDED.sleep_hours,
         mood_rating = EXCLUDED.mood_rating,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [userId, logDate, parseInt(water_intake_ml, 10), parseInt(step_count, 10), parseFloat(sleep_hours), parseInt(mood_rating, 10), notes || null]
    );

    return successResponse(res, { log: result.rows[0] }, 'Wellness metrics logged successfully');
  } catch (error) {
    console.error('logWellness error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/health/wellness/history
 * Fetch user's recent 30-day wellness logs
 */
exports.getWellnessHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, log_date, water_intake_ml, step_count, sleep_hours, mood_rating, notes, created_at
       FROM wellness_logs
       WHERE user_id = $1
       ORDER BY log_date DESC
       LIMIT 30`,
      [userId]
    );

    return successResponse(res, { logs: result.rows }, 'Wellness history fetched');
  } catch (error) {
    console.error('getWellnessHistory error:', error);
    return errorResponse(res, error.message, 500);
  }
};
