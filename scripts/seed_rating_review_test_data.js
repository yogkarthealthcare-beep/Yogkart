require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

const TEST_MARKER = '[RATING_REVIEW_TEST_DATA_V1]';
const TEST_PASSWORD = process.env.REVIEW_TEST_PASSWORD || 'ReviewTest@123';
const USER_COUNT = 10;
const ORDERS_PER_USER = 5;

const comments = [
  'Excellent product quality and careful packaging.',
  'Good value for money and matched the product description.',
  'The product arrived on time and was easy to use.',
  'Satisfied with the quality; I would purchase it again.',
  'Decent product overall, though the packaging could improve.',
  'The product worked well for my daily routine.',
  'Very happy with the purchase and delivery experience.',
  'Quality was consistent with the brand description.',
  'Useful product with clear instructions and secure packaging.',
  'A reliable purchase; delivery and product condition were good.',
];

const reviewTableCandidates = ['product_reviews', 'reviews', 'ratings'];

const findReviewTable = async client => {
  const result = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])
     ORDER BY array_position($1::text[], table_name)
     LIMIT 1`,
    [reviewTableCandidates]
  );
  return result.rows[0]?.table_name || null;
};

const makeOrderId = (userNumber, orderNumber) =>
  `RVT${String(userNumber).padStart(2, '0')}${String(orderNumber).padStart(2, '0')}`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productsResult = await client.query(
      `SELECT id, name, thumbnail, pack_size, price
       FROM products
       WHERE is_active = TRUE
       ORDER BY id
       LIMIT 20`
    );
    if (productsResult.rows.length < 2) {
      throw new Error('At least two active products are required to seed test orders.');
    }
    const products = productsResult.rows;
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    const users = [];

    for (let index = 1; index <= USER_COUNT; index++) {
      const email = `reviewtest${String(index).padStart(2, '0')}@yogkart.test`;
      const userResult = await client.query(
        `INSERT INTO users (
          name, email, phone, password_hash, role, is_active, is_verified,
          provider, is_temporary_data, is_profile_completed
        ) VALUES ($1,$2,$3,$4,'customer',TRUE,TRUE,'local',FALSE,TRUE)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash,
          is_active = TRUE,
          is_verified = TRUE,
          updated_at = NOW()
        RETURNING id, name, email`,
        [
          `Review Test User ${String(index).padStart(2, '0')}`,
          email,
          `90000000${String(index).padStart(2, '0')}`,
          passwordHash,
        ]
      );
      users.push(userResult.rows[0]);
    }

    let createdOrders = 0;
    let createdItems = 0;
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      for (let orderIndex = 1; orderIndex <= ORDERS_PER_USER; orderIndex++) {
        const first = products[(userIndex + orderIndex - 1) % products.length];
        const second = products[(userIndex + orderIndex + 2) % products.length];
        const selectedProducts = first.id === second.id ? [first] : [first, second];
        const subtotal = selectedProducts.reduce((sum, product) => sum + Number(product.price), 0);
        const tax = Number((subtotal * 0.05).toFixed(2));
        const total = Number((subtotal + tax).toFixed(2));
        const orderId = makeOrderId(userIndex + 1, orderIndex);
        const createdAt = new Date(Date.now() - ((userIndex * ORDERS_PER_USER + orderIndex) * 86400000));

        const orderResult = await client.query(
          `INSERT INTO orders (
            id, user_id, status, subtotal, discount, delivery_fee, tax, total,
            payment_method, payment_status, address_name, address_phone,
            address_line1, address_city, address_state, address_pincode,
            expected_delivery, notes, created_at, updated_at
          ) VALUES (
            $1,$2,'delivered',$3,0,0,$4,$5,'cod','paid',$6,$7,
            'Test Address, YogKart QA','New Delhi','Delhi','110001',
            $8,$9,$10,$10
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING id`,
          [
            orderId,
            user.id,
            subtotal,
            tax,
            total,
            user.name,
            `90000000${String(userIndex + 1).padStart(2, '0')}`,
            new Date(createdAt.getTime() + 5 * 86400000),
            `${TEST_MARKER} Delivered purchase for ratings/reviews verification.`,
            createdAt,
          ]
        );
        if (!orderResult.rowCount) continue;
        createdOrders++;

        for (const product of selectedProducts) {
          await client.query(
            `INSERT INTO order_items (
              order_id, product_id, name, thumbnail, pack_size, quantity, price, total
            ) VALUES ($1,$2,$3,$4,$5,1,$6,$6)`,
            [
              orderId,
              product.id,
              product.name,
              product.thumbnail,
              product.pack_size,
              product.price,
            ]
          );
          createdItems++;
        }
      }
    }

    const reviewTable = await findReviewTable(client);
    await client.query('COMMIT');

    console.log(JSON.stringify({
      success: true,
      users: users.length,
      ordersCreated: createdOrders,
      orderItemsCreated: createdItems,
      reviewTable,
      reviewsCreated: 0,
      credentials: {
        emails: users.map(user => user.email),
        sharedPassword: TEST_PASSWORD,
      },
      reviewCommentsPrepared: comments.length,
      warning: reviewTable
        ? `Review table "${reviewTable}" exists but its columns were not assumed automatically. No review rows were inserted.`
        : 'No ratings/reviews table exists. Purchase test data was created, but linked reviews cannot be seeded without implementing the missing feature.',
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
