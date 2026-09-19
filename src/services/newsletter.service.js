const { query, getClient } = require('../config/database');

const NEWSLETTER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'subscribed',
    ip_address VARCHAR(100) DEFAULT '',
    source VARCHAR(100) DEFAULT 'Home Page Newsletter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at ON newsletter_subscribers (created_at DESC);
`;

/**
 * Ensure database schema exists for newsletter_subscribers
 */
const ensureNewsletterSchema = async () => {
  try {
    await query(NEWSLETTER_SCHEMA_SQL);
    console.log('✅ Newsletter subscribers schema verified/created');
  } catch (err) {
    console.error('❌ Error ensuring newsletter_subscribers schema:', err.message);
  }
};

/**
 * Public: Subscribe email to newsletter
 */
const subscribe = async ({ email, name = '', ipAddress = '', source = 'Home Page Newsletter' }) => {
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name || '').trim();

  // 1. Insert or update in newsletter_subscribers
  const upsertSql = `
    INSERT INTO newsletter_subscribers (email, name, status, ip_address, source, created_at, updated_at)
    VALUES ($1, $2, 'subscribed', $3, $4, NOW(), NOW())
    ON CONFLICT (email) 
    DO UPDATE SET 
      status = 'subscribed',
      name = CASE WHEN EXCLUDED.name != '' THEN EXCLUDED.name ELSE newsletter_subscribers.name END,
      updated_at = NOW()
    RETURNING id, email, name, status, source, created_at, updated_at;
  `;

  const res = await query(upsertSql, [cleanEmail, cleanName, ipAddress, source]);
  const subscriber = res.rows[0];

  // 2. Also keep customer_contacts in sync (if customer_contacts table exists)
  try {
    await query(
      `INSERT INTO customer_contacts (name, email, contact, address, country, source_table, created_at)
       VALUES ($1, $2, '', '', 'India', 'Newsletter Subscriber', NOW())
       ON CONFLICT DO NOTHING`,
      [cleanName || 'Newsletter Subscriber', cleanEmail]
    ).catch(() => {});
  } catch (e) {}

  return subscriber;
};

/**
 * Admin: Get paginated newsletter subscribers with search & filter
 */
const getSubscribers = async ({ page = 1, limit = 20, search = '', status = '' }) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push(`(email ILIKE $${paramIdx} OR name ILIKE $${paramIdx} OR source ILIKE $${paramIdx})`);
    params.push(s);
    paramIdx++;
  }

  if (status && status.trim() && status.toLowerCase() !== 'all') {
    conditions.push(`status = $${paramIdx}`);
    params.push(status.trim().toLowerCase());
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*)::bigint AS total FROM newsletter_subscribers ${whereClause}`;
  const countRes = await query(countQuery, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  const dataQuery = `
    SELECT id, email, name, status, ip_address, source, created_at, updated_at
    FROM newsletter_subscribers
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataRes = await query(dataQuery, [...params, l, offset]);

  return {
    subscribers: dataRes.rows,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1
  };
};

/**
 * Admin: Get statistical metrics
 */
const getStats = async () => {
  const statsSql = `
    SELECT
      COUNT(*)::bigint AS total_subscribers,
      COUNT(CASE WHEN status = 'subscribed' THEN 1 END)::bigint AS active_subscribers,
      COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END)::bigint AS unsubscribed_count,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::bigint AS today_count,
      COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)::bigint AS this_month_count,
      MAX(created_at) AS last_subscription_date
    FROM newsletter_subscribers;
  `;

  const res = await query(statsSql);
  const row = res.rows[0] || {};

  return {
    totalSubscribers: parseInt(row.total_subscribers, 10) || 0,
    activeSubscribers: parseInt(row.active_subscribers, 10) || 0,
    unsubscribedCount: parseInt(row.unsubscribed_count, 10) || 0,
    todayCount: parseInt(row.today_count, 10) || 0,
    thisMonthCount: parseInt(row.this_month_count, 10) || 0,
    lastSubscriptionDate: row.last_subscription_date
  };
};

/**
 * Admin: Delete a subscriber
 */
const deleteSubscriber = async (id) => {
  const res = await query('DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING id, email', [id]);
  return res.rows[0] || null;
};

/**
 * Admin: Bulk delete subscribers
 */
const bulkDelete = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return { deletedCount: 0 };
  const res = await query('DELETE FROM newsletter_subscribers WHERE id = ANY($1::bigint[]) RETURNING id', [ids]);
  return { deletedCount: res.rowCount };
};

/**
 * Admin: Update status (subscribed / unsubscribed)
 */
const updateStatus = async (id, status) => {
  const cleanStatus = status === 'unsubscribed' ? 'unsubscribed' : 'subscribed';
  const res = await query(
    'UPDATE newsletter_subscribers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [cleanStatus, id]
  );
  return res.rows[0] || null;
};

/**
 * Admin: Export all subscribers for Excel/CSV
 */
const getAllForExport = async () => {
  const res = await query(`
    SELECT id, email, name, status, source, created_at
    FROM newsletter_subscribers
    ORDER BY created_at DESC
  `);
  return res.rows;
};

/**
 * Admin: Remove duplicate subscribers by email
 */
const removeDuplicateSubscribers = async () => {
  const querySql = `
    WITH duplicates AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY LOWER(TRIM(email))
               ORDER BY 
                 CASE WHEN status = 'subscribed' THEN 1 ELSE 2 END ASC,
                 created_at DESC,
                 id DESC
             ) as rnum
      FROM newsletter_subscribers
      WHERE email IS NOT NULL AND email != ''
    )
    DELETE FROM newsletter_subscribers
    WHERE id IN (
      SELECT id FROM duplicates WHERE rnum > 1
    )
    RETURNING id;
  `;
  const res = await query(querySql);
  return res.rowCount || 0;
};

module.exports = {
  ensureNewsletterSchema,
  subscribe,
  getSubscribers,
  getStats,
  deleteSubscriber,
  bulkDelete,
  updateStatus,
  getAllForExport,
  removeDuplicateSubscribers,
};
