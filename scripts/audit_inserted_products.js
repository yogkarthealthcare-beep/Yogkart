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

async function audit() {
  console.log('--- COMPREHENSIVE AUDIT OF 30 INSERTED PRODUCTS ---');

  // 1. Core query from prompt
  const step4Res = await pool.query(`
    SELECT count(*), count(*) FILTER (WHERE is_active=false) as inactive, min(stock), max(stock)
    FROM public.products
    WHERE seo_generated_by='ai';
  `);
  console.log('\n1. Prompt Query Result:');
  console.table(step4Res.rows);

  // 2. Length constraints audit
  const lengthsRes = await pool.query(`
    SELECT 
      min(length(seo_title)) as min_title_len,
      max(length(seo_title)) as max_title_len,
      min(length(meta_description)) as min_meta_desc_len,
      max(length(meta_description)) as max_meta_desc_len,
      min(length(short_description)) as min_short_desc_len,
      max(length(short_description)) as max_short_desc_len,
      min(length(seo_description)) as min_seo_desc_len,
      max(length(seo_description)) as max_seo_desc_len,
      min(length(image_alt_text)) as min_alt_len,
      max(length(image_alt_text)) as max_alt_len
    FROM public.products
    WHERE seo_generated_by='ai';
  `);
  console.log('\n2. Text Field Lengths:');
  console.table(lengthsRes.rows);

  // 3. Array & JSON lengths
  const structureRes = await pool.query(`
    SELECT
      min(array_length(tags, 1)) as min_tags,
      max(array_length(tags, 1)) as max_tags,
      min(array_length(meta_keywords, 1)) as min_meta_kw,
      max(array_length(meta_keywords, 1)) as max_meta_kw,
      min(array_length(key_benefits, 1)) as min_benefits,
      max(array_length(key_benefits, 1)) as max_benefits,
      min(array_length(product_highlights, 1)) as min_highlights,
      max(array_length(product_highlights, 1)) as max_highlights,
      min(jsonb_array_length(faq_json)) as min_faqs,
      max(jsonb_array_length(faq_json)) as max_faqs,
      min(jsonb_array_length(how_to_use)) as min_how_to_use,
      max(jsonb_array_length(how_to_use)) as max_how_to_use,
      min(jsonb_array_length(specifications)) as min_specs,
      max(jsonb_array_length(specifications)) as max_specs,
      min(jsonb_array_length(ingredients_list)) as min_ingredients,
      max(jsonb_array_length(ingredients_list)) as max_ingredients
    FROM public.products
    WHERE seo_generated_by='ai';
  `);
  console.log('\n3. Arrays & JSON Element Counts:');
  console.table(structureRes.rows);

  // 4. Categories join check
  const catJoinRes = await pool.query(`
    SELECT p.category_id, c.name as category_name, c.is_active as cat_active, count(p.id) as product_count
    FROM public.products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.seo_generated_by='ai'
    GROUP BY p.category_id, c.name, c.is_active
    ORDER BY p.category_id;
  `);
  console.log('\n4. Category Association Check:');
  console.table(catJoinRes.rows);

  // 5. Search Vector Check
  const svRes = await pool.query(`
    SELECT count(*) FILTER (WHERE search_vector IS NULL) as null_search_vectors
    FROM public.products
    WHERE seo_generated_by='ai';
  `);
  console.log('\n5. Search Vector Null Count:', svRes.rows[0].null_search_vectors);

  // 6. Detailed list of all 30 products
  const allProds = await pool.query(`
    SELECT id, name, slug, category_id, subcategory, price, original_price, discount, stock, is_active
    FROM public.products
    WHERE seo_generated_by='ai'
    ORDER BY id;
  `);
  console.log('\n6. All 30 Inserted Products:');
  console.table(allProds.rows);

  await pool.end();
}

audit();

