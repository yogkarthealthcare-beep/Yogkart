require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

(async () => {
  const client = await pool.connect();
  try {
    const users = await client.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email ~* '^reviewtest[0-9]{2}@yogkart[.]test$'
       ORDER BY email`
    );
    const orderCounts = await client.query(
      `SELECT u.email, COUNT(DISTINCT o.id)::int AS orders,
              COUNT(oi.id)::int AS order_items,
              BOOL_AND(o.status = 'delivered') AS all_delivered,
              BOOL_AND(o.payment_status = 'paid') AS all_paid
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE u.email ~* '^reviewtest[0-9]{2}@yogkart[.]test$'
       GROUP BY u.id, u.email
       ORDER BY u.email`
    );
    const reviewTables = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('product_reviews', 'reviews', 'ratings')`
    );
    const passwordValid = users.rows.length
      ? await bcrypt.compare(
          process.env.REVIEW_TEST_PASSWORD || 'ReviewTest@123',
          users.rows[0].password_hash
        )
      : false;
    const products = await client.query(
      `SELECT id, name, rating, review_count
       FROM products WHERE is_active = TRUE ORDER BY id LIMIT 20`
    );

    const checks = {
      tenUsersExist: users.rowCount === 10,
      eachUserHasFiveOrders: orderCounts.rows.every(row => row.orders === 5),
      allOrdersDelivered: orderCounts.rows.every(row => row.all_delivered === true),
      allOrdersPaid: orderCounts.rows.every(row => row.all_paid === true),
      passwordValid,
      reviewFeatureSchemaExists: reviewTables.rowCount > 0,
    };
    console.log(JSON.stringify({
      checks,
      users: users.rows.map(({ name, email }) => ({ name, email })),
      orderCounts: orderCounts.rows,
      reviewTables: reviewTables.rows,
      productRatingAggregates: products.rows,
      conclusion: checks.reviewFeatureSchemaExists
        ? 'A reviews table exists; inspect its exact rules before inserting reviews.'
        : 'The purchase prerequisites are ready, but ratings/reviews behavior cannot be verified because no review table or review API exists.',
    }, null, 2));
    if (!checks.tenUsersExist || !checks.eachUserHasFiveOrders || !checks.passwordValid) {
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
