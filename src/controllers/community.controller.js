const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/community/posts
 * Fetch community feed with pagination & user liked status
 */
exports.listPosts = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { category, page = 1, limit = 15 } = req.query;

    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`p.category ILIKE $${idx++}`);
      params.push(`%${category}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await db.query(`SELECT COUNT(*) FROM community_posts p ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const queryParams = [...params];
    let userLikeSelect = 'FALSE AS is_liked';

    if (userId) {
      userLikeSelect = `EXISTS(SELECT 1 FROM community_post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${idx++}) AS is_liked`;
      queryParams.push(userId);
    }

    queryParams.push(parseInt(limit, 10), offset);

    const postsRes = await db.query(
      `SELECT 
        p.id, p.user_id, u.name as user_name, u.avatar as user_avatar, u.role as user_role,
        p.content, p.image_url, p.category, p.likes_count, p.comments_count, p.created_at,
        ${userLikeSelect}
       FROM community_posts p
       JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      queryParams
    );

    return successResponse(res, {
      posts: postsRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    }, 'Community feed fetched successfully');
  } catch (error) {
    console.error('listPosts error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/community/posts
 * Publish a new community post
 */
exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, image_url, category = 'General' } = req.body;

    if (!content || !content.trim()) {
      return errorResponse(res, 'Post content is required', 400);
    }

    const postRes = await db.query(
      `INSERT INTO community_posts (user_id, content, image_url, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, content.trim(), image_url || null, category]
    );

    const post = postRes.rows[0];
    post.user_name = req.user.name;
    post.user_avatar = req.user.avatar || null;
    post.is_liked = false;

    return successResponse(res, { post }, 'Post published successfully', 201);
  } catch (error) {
    console.error('createPost error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/community/posts/:id/like
 * Toggle like/unlike status for a post
 */
exports.toggleLikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: postId } = req.params;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM community_post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      let isLiked = false;

      if (existing.rows.length > 0) {
        // Unlike
        await client.query('DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
        await client.query('UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
        isLiked = false;
      } else {
        // Like
        await client.query('INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
        await client.query('UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
        isLiked = true;
      }

      const postRes = await client.query('SELECT likes_count FROM community_posts WHERE id = $1', [postId]);
      await client.query('COMMIT');

      return successResponse(res, {
        is_liked: isLiked,
        likes_count: postRes.rows[0]?.likes_count || 0
      }, isLiked ? 'Post liked' : 'Post unliked');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('toggleLikePost error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/community/posts/:id/comments
 * Add comment to a post
 */
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: postId } = req.params;
    const { comment_text } = req.body;

    if (!comment_text || !comment_text.trim()) {
      return errorResponse(res, 'Comment text is required', 400);
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const commentRes = await client.query(
        `INSERT INTO community_comments (post_id, user_id, comment_text)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, userId, comment_text.trim()]
      );

      await client.query('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

      await client.query('COMMIT');

      const comment = commentRes.rows[0];
      comment.user_name = req.user.name;
      comment.user_avatar = req.user.avatar || null;

      return successResponse(res, { comment }, 'Comment added', 201);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('addComment error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/community/posts/:id/comments
 * Get comments for a post
 */
exports.getPostComments = async (req, res) => {
  try {
    const { id: postId } = req.params;

    const result = await db.query(
      `SELECT c.id, c.comment_text, c.created_at, u.name as user_name, u.avatar as user_avatar
       FROM community_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return successResponse(res, { comments: result.rows }, 'Comments fetched');
  } catch (error) {
    console.error('getPostComments error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * GET /api/community/challenges
 * List active wellness challenges
 */
exports.listChallenges = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM wellness_challenges WHERE is_active = TRUE ORDER BY created_at DESC'
    );

    return successResponse(res, { challenges: result.rows }, 'Challenges fetched');
  } catch (error) {
    console.error('listChallenges error:', error);
    return errorResponse(res, error.message, 500);
  }
};
