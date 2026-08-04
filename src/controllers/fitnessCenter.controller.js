const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/fitness-centers
 * Public directory search & filter for Gyms & Yoga Studios
 */
exports.listFitnessCenters = async (req, res) => {
  try {
    const {
      city, type, facility, search,
      page = 1, limit = 12, sort = 'rating'
    } = req.query;

    const conditions = ['is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (city) {
      conditions.push(`city ILIKE $${idx++}`);
      params.push(`%${city}%`);
    }

    if (type) {
      conditions.push(`center_type ILIKE $${idx++}`);
      params.push(`%${type}%`);
    }

    if (facility) {
      conditions.push(`$${idx++} = ANY(facilities)`);
      params.push(facility);
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx} OR city ILIKE $${idx} OR address ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let orderBy = 'rating_avg DESC';
    if (sort === 'price_low') orderBy = 'monthly_price ASC';
    if (sort === 'price_high') orderBy = 'monthly_price DESC';

    const countRes = await db.query(`SELECT COUNT(*) FROM fitness_centers ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const queryParams = [...params, parseInt(limit, 10), offset];
    const centersRes = await db.query(
      `SELECT id, name, slug, center_type, city, address, phone, email, rating_avg, monthly_price, cover_image_url, description, facilities, is_verified, created_at
       FROM fitness_centers
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      queryParams
    );

    return successResponse(res, {
      centers: centersRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Fitness centers fetched successfully');
  } catch (error) {
    console.error('listFitnessCenters error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/fitness-centers/:slug
 * Fetch detailed profile of a fitness center
 */
exports.getFitnessCenterDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await db.query(
      'SELECT * FROM fitness_centers WHERE slug = $1 AND is_active = TRUE',
      [slug]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Fitness center not found', 404);
    }

    return successResponse(res, { center: result.rows[0] }, 'Fitness center details fetched');
  } catch (error) {
    console.error('getFitnessCenterDetail error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/fitness-centers/inquire
 * Submit membership inquiry / schedule visit lead
 */
exports.submitInquiry = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { center_id, user_name, user_phone, user_email, message } = req.body;

    if (!center_id || !user_name || !user_phone) {
      return errorResponse(res, 'center_id, user_name, and user_phone are required', 400);
    }

    const inquiryRes = await db.query(
      `INSERT INTO center_inquiries (center_id, user_id, user_name, user_phone, user_email, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [center_id, userId, user_name, user_phone, user_email || null, message || null]
    );

    return successResponse(res, { inquiry: inquiryRes.rows[0] }, 'Inquiry submitted successfully! The center manager will contact you soon.', 201);
  } catch (error) {
    console.error('submitInquiry error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/fitness-centers
 * Onboard a new fitness center
 */
exports.createFitnessCenter = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const {
      name, center_type = 'Yoga Studio', city, address, phone, email,
      monthly_price = 0, cover_image_url = '', description = '', facilities = []
    } = req.body;

    if (!name || !city || !address) {
      return errorResponse(res, 'Name, city, and address are required', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

    const result = await db.query(
      `INSERT INTO fitness_centers (name, slug, owner_user_id, center_type, city, address, phone, email, monthly_price, cover_image_url, description, facilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [name, slug, ownerUserId, center_type, city, address, phone || null, email || null, parseFloat(monthly_price), cover_image_url || null, description || null, facilities]
    );

    return successResponse(res, { center: result.rows[0] }, 'Fitness center created successfully', 201);
  } catch (error) {
    console.error('createFitnessCenter error:', error);
    return errorResponse(res, error.message, 500);
  }
};
