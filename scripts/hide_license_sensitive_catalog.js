const { query, pool } = require('../src/config/database');
const { ensureBulkCommunicationSchema } = require('../src/services/bulkCommunication.service');

const SENSITIVE_TERMS = [
  'food',
  'drink',
  'beverage',
  'edible',
  'medicine',
  'medicines',
  'ayurvedic medicine',
  'ayurveda medicine',
  'supplement',
  'supplements',
  'tablet',
  'tablets',
  'capsule',
  'capsules',
  'syrup',
  'protein',
  'nutrition',
  'vitamin',
  'vitamins',
  'immunity',
  'health wellness',
  'health & wellness',
  'health consumable',
  'pharma',
  'drug',
  'fssai',
];

const pattern = SENSITIVE_TERMS.map(term => `%${term}%`);

const run = async () => {
  try {
    await ensureBulkCommunicationSchema();

    await query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT TRUE
    `);

    const hiddenCategories = await query(
      `UPDATE categories
       SET is_active = FALSE,
           show_in_menu = FALSE
       WHERE is_active = TRUE
         AND (
           id ILIKE ANY($1)
           OR name ILIKE ANY($1)
           OR COALESCE(parent_id, '') ILIKE ANY($1)
         )
       RETURNING id, name`,
      [pattern]
    );

    const hiddenProducts = await query(
      `UPDATE products p
       SET is_active = FALSE,
           updated_at = NOW()
       WHERE p.is_active = TRUE
         AND (
           p.category_id IN (SELECT id FROM categories WHERE is_active = FALSE)
           OR p.name ILIKE ANY($1)
           OR p.brand ILIKE ANY($1)
           OR COALESCE(p.subcategory, '') ILIKE ANY($1)
           OR COALESCE(p.description, '') ILIKE ANY($1)
           OR COALESCE(p.ingredients, '') ILIKE ANY($1)
           OR EXISTS (
             SELECT 1 FROM unnest(COALESCE(p.tags, ARRAY[]::text[])) tag
             WHERE tag ILIKE ANY($1)
           )
         )
       RETURNING p.id, p.name, p.category_id`,
      [pattern]
    );

    console.log(JSON.stringify({
      hidden_categories: hiddenCategories.rows,
      hidden_products_count: hiddenProducts.rowCount,
      hidden_products_sample: hiddenProducts.rows.slice(0, 25),
    }, null, 2));
  } catch (err) {
    console.error('Hide license-sensitive catalog failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
