// src/controllers/blog.controller.js
const { query } = require('../config/database');
const { success, error, badRequest, notFound } = require('../utils/response');

// Auto-run table creation and 20-blogs seed if table does not exist
const ensureBlogsTableExists = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        featured_image TEXT,
        short_description TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        tags TEXT[],
        author VARCHAR(100) DEFAULT 'Yogkart Team',
        read_time VARCHAR(50) DEFAULT '7 min read',
        is_published BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        is_trending BOOLEAN DEFAULT false,
        meta_title VARCHAR(255),
        meta_description TEXT,
        keywords TEXT[],
        views_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    const countRes = await query(`SELECT COUNT(*) FROM blogs`);
    if (parseInt(countRes.rows[0]?.count || 0) === 0) {
      await query(`
        INSERT INTO blogs (title, slug, featured_image, short_description, content, category, tags, author, read_time, is_published, is_featured, is_trending, meta_title, meta_description, keywords)
        VALUES
        (
            'Top 10 Benefits of Neem for Hair Growth',
            'top-10-benefits-of-neem-for-hair-growth',
            'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop',
            'Discover how pure neem wood and neem extracts boost scalp circulation, fight dandruff, and accelerate natural hair growth.',
            '<h2>Why Neem is Nature’s Greatest Gift for Hair</h2><p>Neem (Azadirachta indica) has been revered in Ayurvedic medicine for thousands of years. Packed with antibacterial, antifungal, and antioxidant properties, neem treats scalp infections, purifies roots, and promotes strong hair follicle growth.</p><h3>1. Clears Scalp Infections & Dandruff</h3><p>Malassezia fungus is a primary cause of stubborn dandruff. Neem contains nimbidin and nimbin which naturally destroy fungal spores without drying out natural scalp oils.</p><h3>2. Stimulates Follicle Blood Circulation</h3><p>Massaging scalp with neem oil or combing with a handcrafted neem wood comb stimulates blood flow directly to hair roots, supplying essential nutrient-rich oxygen.</p>',
            'Hair Care',
            ARRAY['Neem', 'Hair Growth', 'Scalp Care', 'Ayurveda'],
            'Yogkart Team',
            '6 min read',
            true, true, true,
            'Top 10 Benefits of Neem for Hair Growth | Yogkart Organic',
            'Learn how neem extracts and pure neem wood combs prevent hair fall, eliminate dandruff, and stimulate thick hair growth naturally.',
            ARRAY['neem for hair', 'hair growth remedies', 'ayurvedic hair care']
        ),
        (
            'Tea Tree Oil for Acne: Benefits & How to Use',
            'tea-tree-oil-for-acne-benefits-and-how-to-use',
            'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800&auto=format&fit=crop',
            'A complete guide to using organic tea tree oil to heal active acne breakouts, reduce redness, and unclog facial pores safely.',
            '<h2>Understanding Tea Tree Oil for Clear Skin</h2><p>Tea tree oil is a powerful botanical extract known for its potent antimicrobial and anti-inflammatory compounds. Unlike harsh synthetic chemicals like benzoyl peroxide, tea tree oil kills acne-causing bacteria gently.</p>',
            'Skin Care',
            ARRAY['Tea Tree', 'Acne Treatment', 'Organic Skincare'],
            'Yogkart Team',
            '7 min read',
            true, true, false,
            'Tea Tree Oil for Acne: Ultimate Guide | Yogkart Healthcare',
            'Discover how tea tree oil treats acne breakouts naturally, unclogs pores, and prevents post-acne scarring without harsh side effects.',
            ARRAY['tea tree oil acne', 'organic acne care', 'natural skincare']
        ),
        (
            'Aloe Vera for Dry Skin: Complete Guide',
            'aloe-vera-for-dry-skin-complete-guide',
            'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?q=80&w=800&auto=format&fit=crop',
            'Learn how 99% pure organic aloe vera gel locks in deep hydration, repairs skin barrier, and relieves dry flaky skin.',
            '<h2>The Science of Aloe Vera Hydration</h2><p>Aloe vera gel contains 99% water alongside polysaccharides, mucopolysaccharides, and essential vitamins A, C, and E. It creates a breathable moisture seal over sensitive dry skin.</p>',
            'Skin Care',
            ARRAY['Aloe Vera', 'Dry Skin', 'Hydration'],
            'Yogkart Team',
            '5 min read',
            true, false, true,
            'Aloe Vera for Dry Skin Guide | Deep Natural Hydration',
            'Explore how pure organic aloe vera gel locks in deep cellular hydration and restores dry, flaky skin without sticky residue.',
            ARRAY['aloe vera gel', 'dry skin hydration', 'organic skin repair']
        ),
        (
            'Best Natural Remedies for Hair Fall',
            'best-natural-remedies-for-hair-fall',
            'https://images.unsplash.com/photo-1608248597263-0007999659b3?q=80&w=800&auto=format&fit=crop',
            'Stop excessive hair fall naturally with proven Ayurvedic herbs including Amla, Bhringraj, Onion Oil, and Kachi Neem.',
            '<h2>Root Causes of Hair Fall</h2><p>Excessive stress, poor nutrition, chemical shampoos, and hard water degrade hair follicle strength. Traditional herbs provide holistic root restoration.</p>',
            'Hair Care',
            ARRAY['Hair Fall', 'Amla', 'Bhringraj', 'Onion Oil'],
            'Yogkart Team',
            '8 min read',
            true, true, true,
            'Best Natural Remedies for Hair Fall Control | Yogkart',
            'Stop hair shedding naturally with time-tested Ayurvedic hair oils, neem combs, and herbal hair care secrets.',
            ARRAY['hair fall remedies', 'ayurvedic hair oil', 'onion hair oil']
        ),
        (
            'Why Chemical-Free Skincare is Better',
            'why-chemical-free-skincare-is-better',
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop',
            'Why switching to toxin-free, organic skincare protects your endocrine system, preserves collagen, and yields long-term radiant skin.',
            '<h2>The Hidden Dangers of Synthetic Skincare</h2><p>Conventional skincare products often contain parabens, sulfates (SLS), phthalates, and synthetic fragrances that penetrate skin pores into bloodstream.</p>',
            'Wellness',
            ARRAY['Chemical Free', 'Organic Beauty', 'Clean Beauty'],
            'Yogkart Team',
            '6 min read',
            true, false, false,
            'Why Chemical-Free Skincare is Better | Clean Beauty Guide',
            'Learn why chemical-free organic skincare protects long-term health, preserves collagen, and leaves skin radiantly clear.',
            ARRAY['chemical free skincare', 'clean beauty products']
        ),
        (
            'Wooden Neem Comb Benefits for Healthy Hair',
            'wooden-neem-comb-benefits-for-healthy-hair',
            'https://images.unsplash.com/photo-1590159763121-7c9fd312190d?q=80&w=800&auto=format&fit=crop',
            'Ditch plastic combs! Discover how handcrafted Kachi Neem wooden combs distribute natural scalp oils, prevent breakage, and soothe scalp.',
            '<h2>Plastic vs Neem Wooden Comb</h2><p>Plastic combs produce electrostatic charge that weakens hair roots and causes frizz. Hand-carved Kachi Neem combs possess anti-static properties and release medicinal neem extracts with every stroke.</p>',
            'Hair Care',
            ARRAY['Neem Comb', 'Hair Breakage', 'Eco Friendly'],
            'Yogkart Team',
            '5 min read',
            true, true, true,
            'Wooden Neem Comb Benefits for Healthy Hair | Yogkart',
            'Discover why switching to a handcrafted neem wood comb stops hair breakage, distributes natural sebum, and soothes scalp.',
            ARRAY['neem comb benefits', 'kachi neem comb', 'wooden hair brush']
        )
        ON CONFLICT (slug) DO NOTHING;
      `);
    }
  } catch (err) {
    console.error('[Blog Controller] ensureBlogsTableExists error:', err);
  }
};

ensureBlogsTableExists();

// ── GET /api/blogs (Public — Paginated, Search, Category filter) ────────────
const getBlogs = async (req, res) => {
  try {
    const { category, search, is_featured, is_trending, page = 1, limit = 12 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let whereConditions = ['is_published = TRUE'];
    let queryParams = [];

    if (category) {
      queryParams.push(category);
      whereConditions.push(`category = $${queryParams.length}`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(title ILIKE $${queryParams.length} OR short_description ILIKE $${queryParams.length} OR content ILIKE $${queryParams.length})`);
    }

    if (is_featured === 'true') {
      whereConditions.push(`is_featured = TRUE`);
    }

    if (is_trending === 'true') {
      whereConditions.push(`is_trending = TRUE`);
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM blogs ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0]?.count || 0);

    queryParams.push(parseInt(limit));
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const result = await query(
      `SELECT id, title, slug, featured_image, short_description, category, tags, author, read_time, is_featured, is_trending, views_count, created_at, updated_at 
       FROM blogs ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    return success(res, {
      blogs: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Blog Controller] getBlogs error:', err);
    return error(res, 'Failed to fetch blogs');
  }
};

// ── GET /api/blogs/:slug (Public — Full detail & view increment) ───────────
const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query(`SELECT * FROM blogs WHERE slug = $1 AND is_published = TRUE`, [slug]);

    if (result.rows.length === 0) {
      return notFound(res, 'Blog post not found');
    }

    const blog = result.rows[0];

    // Increment views count silently
    await query(`UPDATE blogs SET views_count = views_count + 1 WHERE id = $1`, [blog.id]);

    // Fetch 3 related blogs in same category
    const relatedResult = await query(
      `SELECT id, title, slug, featured_image, short_description, category, read_time, created_at 
       FROM blogs 
       WHERE category = $1 AND slug != $2 AND is_published = TRUE 
       ORDER BY created_at DESC 
       LIMIT 3`,
      [blog.category, blog.slug]
    );

    return success(res, {
      blog,
      relatedBlogs: relatedResult.rows
    });
  } catch (err) {
    console.error('[Blog Controller] getBlogBySlug error:', err);
    return error(res, 'Failed to fetch blog post');
  }
};

// ── GET /api/admin/blogs (Admin — list all including drafts) ───────────────
const adminGetBlogs = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM blogs ORDER BY created_at DESC`);
    return success(res, { blogs: result.rows });
  } catch (err) {
    console.error('[Blog Controller] adminGetBlogs error:', err);
    return error(res, 'Failed to fetch admin blogs');
  }
};

// ── POST /api/admin/blogs ──────────────────────────────────────────────────
const createBlog = async (req, res) => {
  try {
    const {
      title, slug, featured_image, short_description, content,
      category, tags, author, read_time, is_published, is_featured, is_trending,
      meta_title, meta_description, keywords
    } = req.body;

    if (!title || !short_description || !content || !category) {
      return badRequest(res, 'Title, short description, content, and category are required');
    }

    const generatedSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(
      `INSERT INTO blogs 
        (title, slug, featured_image, short_description, content, category, tags, author, read_time, is_published, is_featured, is_trending, meta_title, meta_description, keywords)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        title, generatedSlug, featured_image || null, short_description, content,
        category, Array.isArray(tags) ? tags : [], author || 'Yogkart Team', read_time || '7 min read',
        is_published ?? true, is_featured ?? false, is_trending ?? false,
        meta_title || title, meta_description || short_description, Array.isArray(keywords) ? keywords : []
      ]
    );

    return success(res, { blog: result.rows[0] }, 'Blog created successfully');
  } catch (err) {
    console.error('[Blog Controller] createBlog error:', err);
    return error(res, 'Failed to create blog post');
  }
};

// ── PUT /api/admin/blogs/:id ───────────────────────────────────────────────
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, slug, featured_image, short_description, content,
      category, tags, author, read_time, is_published, is_featured, is_trending,
      meta_title, meta_description, keywords
    } = req.body;

    const checkResult = await query(`SELECT * FROM blogs WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return notFound(res, 'Blog post not found');
    }

    const generatedSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : checkResult.rows[0].slug;

    const result = await query(
      `UPDATE blogs SET
        title = $1, slug = $2, featured_image = $3, short_description = $4, content = $5,
        category = $6, tags = $7, author = $8, read_time = $9, is_published = $10,
        is_featured = $11, is_trending = $12, meta_title = $13, meta_description = $14,
        keywords = $15, updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        title ?? checkResult.rows[0].title,
        generatedSlug,
        featured_image ?? checkResult.rows[0].featured_image,
        short_description ?? checkResult.rows[0].short_description,
        content ?? checkResult.rows[0].content,
        category ?? checkResult.rows[0].category,
        Array.isArray(tags) ? tags : checkResult.rows[0].tags,
        author ?? checkResult.rows[0].author,
        read_time ?? checkResult.rows[0].read_time,
        is_published ?? checkResult.rows[0].is_published,
        is_featured ?? checkResult.rows[0].is_featured,
        is_trending ?? checkResult.rows[0].is_trending,
        meta_title ?? checkResult.rows[0].meta_title,
        meta_description ?? checkResult.rows[0].meta_description,
        Array.isArray(keywords) ? keywords : checkResult.rows[0].keywords,
        id
      ]
    );

    return success(res, { blog: result.rows[0] }, 'Blog updated successfully');
  } catch (err) {
    console.error('[Blog Controller] updateBlog error:', err);
    return error(res, 'Failed to update blog post');
  }
};

// ── DELETE /api/admin/blogs/:id ────────────────────────────────────────────
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`DELETE FROM blogs WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return notFound(res, 'Blog post not found');
    }
    return success(res, null, 'Blog deleted successfully');
  } catch (err) {
    console.error('[Blog Controller] deleteBlog error:', err);
    return error(res, 'Failed to delete blog post');
  }
};

module.exports = {
  getBlogs,
  getBlogBySlug,
  adminGetBlogs,
  createBlog,
  updateBlog,
  deleteBlog
};
