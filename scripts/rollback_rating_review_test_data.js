require('dotenv').config();
const { pool } = require('../src/config/database');

const TEST_MARKER = '[RATING_REVIEW_TEST_DATA_V1]';

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const users = await client.query(
      `SELECT id FROM users WHERE email ~* '^reviewtest[0-9]{2}@yogkart[.]test$'`
    );
    const userIds = users.rows.map(user => user.id);

    const reviewTables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('product_reviews', 'reviews', 'ratings')`
    );
    for (const { table_name: table } of reviewTables.rows) {
      const columns = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (columns.rows.some(column => column.column_name === 'user_id') && userIds.length) {
        await client.query(`DELETE FROM ${table} WHERE user_id = ANY($1::uuid[])`, [userIds]);
      }
    }

    const deletedOrders = await client.query(
      `DELETE FROM orders
       WHERE notes LIKE $1
          OR id ~ '^RVT[0-9]{4}$'
       RETURNING id`,
      [`${TEST_MARKER}%`]
    );
    const deletedUsers = await client.query(
      `DELETE FROM users
       WHERE email ~* '^reviewtest[0-9]{2}@yogkart[.]test$'
       RETURNING email`
    );
    await client.query('COMMIT');
    console.log(JSON.stringify({
      success: true,
      deletedOrders: deletedOrders.rowCount,
      deletedUsers: deletedUsers.rowCount,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
