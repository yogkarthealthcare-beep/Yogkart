const { query } = require('../config/database');
const { success, created, notFound, error, paginated } = require('../utils/response');
const {
  generateProductSeo,
  ensureUniqueSlug,
  notifySearchIndexing,
  productUrl,
} = require('../services/productSeo.service');

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const getCategoryName = async (categoryId) => {
  if (!categoryId) return '';
  const result = await query('SELECT name FROM categories WHERE id = $1', [categoryId]);
  return result.rows[0]?.name || '';
};

const finalizeSeo = async (product, overrides = {}, excludeId = null, useAi = true) => {
  let seo = await generateProductSeo(product, { useAi, overrides });
  seo.slug = await ensureUniqueSlug(seo.slug, excludeId);
  seo.canonical_url = overrides.canonical_url || productUrl(seo.slug);
  return generateProductSeo({ ...product, slug: seo.slug }, {
    useAi: false,
    overrides: { ...seo, ...overrides, slug: seo.slug },
  });
};

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx} OR p.slug ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category);
    }
    if (status === 'active') conditions.push('p.is_active = TRUE');
    if (status === 'inactive') conditions.push('p.is_active = FALSE');
    if (status === 'low_stock') conditions.push('p.stock <= 5 AND p.stock > 0');
    if (status === 'out_of_stock') conditions.push('p.stock = 0');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = Number(countResult.rows[0].count);
    const offset = (Number(page) - 1) * Number(limit);
    const result = await query(
      `SELECT
         p.id, p.name, p.slug, p.brand, p.price, p.original_price, p.discount,
         p.stock, p.thumbnail, p.is_featured, p.is_new, p.is_best_seller,
         p.prescription, p.is_active, p.tags, p.images, p.seo_score,
         p.created_at, p.updated_at, c.name AS category_name, p.category_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, Number(limit), offset]
    );
    return paginated(res, result.rows, total, page, limit);
  } catch (err) {
    console.error('admin getProducts error:', err);
    return error(res, 'Failed to fetch products');
  }
};

const getProduct = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    return success(res, { product: result.rows[0] });
  } catch (err) {
    return error(res, 'Failed to fetch product');
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name, brand, price, original_price, category_id, subcategory,
      discount = 0, stock = 0, thumbnail, description, ingredients,
      dosage, side_effects, manufacturer, country_of_origin, pack_size,
      is_featured = false, is_new = false, is_best_seller = false,
      prescription = false, is_active = true,
    } = req.body;
    if (!name || !brand || !price || !original_price) {
      return error(res, 'name, brand, price, original_price are required', 400);
    }

    const categoryId = category_id?.trim() || null;
    const images = toArray(req.body.images);
    const benefits = toArray(req.body.key_benefits);
    const tags = toArray(req.body.tags);
    const product = {
      ...req.body,
      name, brand, price, original_price,
      category_id: categoryId,
      category_name: await getCategoryName(categoryId),
      images,
      key_benefits: benefits,
      tags,
    };
    const seo = await finalizeSeo(product, req.body, null, req.body.use_ai_seo !== false);

    const result = await query(
      `INSERT INTO products (
        name, slug, category_id, subcategory, brand, price, original_price,
        discount, stock, images, thumbnail, description, key_benefits,
        ingredients, dosage, side_effects, is_featured, is_new, is_best_seller,
        tags, prescription, manufacturer, country_of_origin, pack_size, is_active,
        seo_title, meta_description, meta_keywords, canonical_url,
        short_description, seo_description, product_highlights, image_alt_text,
        faq_json, schema_json, seo_score, seo_suggestions, seo_generated_by,
        seo_generated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        $37,$38,NOW()
      ) RETURNING *`,
      [
        name, seo.slug, categoryId, subcategory || null, brand,
        Number(price), Number(original_price), Number(discount), Number(stock),
        images, thumbnail || null, description || null, benefits,
        ingredients || null, dosage || null, side_effects || null,
        Boolean(is_featured), Boolean(is_new), Boolean(is_best_seller),
        seo.product_tags, Boolean(prescription), manufacturer || null,
        country_of_origin || null, pack_size || null, Boolean(is_active),
        seo.seo_title, seo.meta_description, seo.meta_keywords, seo.canonical_url,
        seo.short_description, seo.seo_description, seo.product_highlights,
        seo.image_alt_text, JSON.stringify(seo.faq_json), JSON.stringify(seo.schema_json),
        seo.seo_score, seo.seo_suggestions, seo.generated_by,
      ]
    );
    if (result.rows[0].is_active) notifySearchIndexing(result.rows[0]).catch(() => {});
    return created(res, { product: result.rows[0] }, 'Product created successfully');
  } catch (err) {
    console.error('createProduct error:', err);
    if (err.code === '23505') return error(res, 'Product with this slug already exists', 409);
    if (err.code === '23503') return error(res, 'Invalid category_id', 400);
    return error(res, 'Failed to create product');
  }
};

const updateProduct = async (req, res) => {
  try {
    const existingResult = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!existingResult.rows.length) return notFound(res, 'Product not found');
    const existing = existingResult.rows[0];
    const categoryId = req.body.category_id !== undefined
      ? (req.body.category_id?.trim() || null)
      : existing.category_id;
    const merged = {
      ...existing,
      ...req.body,
      category_id: categoryId,
      category_name: await getCategoryName(categoryId),
      images: req.body.images !== undefined ? toArray(req.body.images) : existing.images,
      key_benefits: req.body.key_benefits !== undefined
        ? toArray(req.body.key_benefits)
        : existing.key_benefits,
      tags: req.body.tags !== undefined ? toArray(req.body.tags) : existing.tags,
    };
    const seo = await finalizeSeo(
      merged,
      req.body,
      req.params.id,
      req.body.use_ai_seo !== false
    );

    const fields = {
      name: merged.name,
      slug: seo.slug,
      category_id: categoryId,
      subcategory: merged.subcategory || null,
      brand: merged.brand,
      price: Number(merged.price),
      original_price: Number(merged.original_price),
      discount: Number(merged.discount || 0),
      stock: Number(merged.stock || 0),
      images: merged.images,
      thumbnail: merged.thumbnail || null,
      description: merged.description || null,
      key_benefits: merged.key_benefits,
      ingredients: merged.ingredients || null,
      dosage: merged.dosage || null,
      side_effects: merged.side_effects || null,
      is_featured: Boolean(merged.is_featured),
      is_new: Boolean(merged.is_new),
      is_best_seller: Boolean(merged.is_best_seller),
      tags: seo.product_tags,
      prescription: Boolean(merged.prescription),
      manufacturer: merged.manufacturer || null,
      country_of_origin: merged.country_of_origin || null,
      pack_size: merged.pack_size || null,
      is_active: Boolean(merged.is_active),
      seo_title: seo.seo_title,
      meta_description: seo.meta_description,
      meta_keywords: seo.meta_keywords,
      canonical_url: seo.canonical_url,
      short_description: seo.short_description,
      seo_description: seo.seo_description,
      product_highlights: seo.product_highlights,
      image_alt_text: seo.image_alt_text,
      faq_json: JSON.stringify(seo.faq_json),
      schema_json: JSON.stringify(seo.schema_json),
      seo_score: seo.seo_score,
      seo_suggestions: seo.seo_suggestions,
      seo_generated_by: seo.generated_by,
      seo_generated_at: new Date(),
    };
    const entries = Object.entries(fields);
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`);
    const result = await query(
      `UPDATE products
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $${entries.length + 1}
       RETURNING *`,
      [...entries.map(([, value]) => value), req.params.id]
    );
    if (result.rows[0].is_active) notifySearchIndexing(result.rows[0]).catch(() => {});
    return success(res, { product: result.rows[0] }, 'Product updated successfully');
  } catch (err) {
    console.error('updateProduct error:', err);
    if (err.code === '23503') return error(res, 'Invalid category_id', 400);
    if (err.code === '23505') return error(res, 'Product with this slug already exists', 409);
    return error(res, 'Failed to update product');
  }
};

const generateSeoPreview = async (req, res) => {
  try {
    if (!req.body.name || !req.body.brand) {
      return error(res, 'Product name and brand are required for SEO generation', 400);
    }
    const categoryId = req.body.category_id?.trim() || null;
    const product = {
      ...req.body,
      category_id: categoryId,
      category_name: await getCategoryName(categoryId),
      images: toArray(req.body.images),
      key_benefits: toArray(req.body.key_benefits),
      tags: toArray(req.body.tags),
    };
    const seo = await finalizeSeo(
      product,
      {},
      req.body.id || null,
      req.body.use_ai_seo !== false
    );
    return success(res, { seo }, `SEO generated using ${seo.generated_by}`);
  } catch (err) {
    console.error('generateSeoPreview error:', err);
    return error(res, 'Failed to generate SEO preview');
  }
};

const deleteProduct = async (req, res) => {
  try {
    const result = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return notFound(res, 'Product not found');
    await query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    return success(res, null, 'Product deactivated successfully');
  } catch (err) {
    return error(res, 'Failed to deactivate product');
  }
};

const normalizeProductIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(
    ids
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0)
  )];
};

const bulkDeactivateProducts = async (req, res) => {
  try {
    const ids = normalizeProductIds(req.body.ids);
    if (!ids.length) return error(res, 'ids array required', 400);

    const existing = await query('SELECT id FROM products WHERE id = ANY($1::int[])', [ids]);
    const existingIds = existing.rows.map(row => Number(row.id));
    const result = existingIds.length
      ? await query(
          `UPDATE products
           SET is_active = FALSE, updated_at = NOW()
           WHERE id = ANY($1::int[])
           RETURNING id`,
          [existingIds]
        )
      : { rows: [] };

    const updatedIds = result.rows.map(row => Number(row.id));
    const failed = ids
      .filter(id => !updatedIds.includes(id))
      .map(id => ({ id, reason: existingIds.includes(id) ? 'Not updated' : 'Product not found' }));

    return success(res, {
      requested: ids.length,
      deactivated: updatedIds.length,
      failed,
    }, failed.length
      ? `Deactivated ${updatedIds.length} products. ${failed.length} failed.`
      : `Deactivated ${updatedIds.length} products successfully`);
  } catch (err) {
    console.error('bulkDeactivateProducts error:', err);
    return error(res, 'Failed to bulk deactivate products');
  }
};

const bulkDeleteProducts = async (req, res) => {
  try {
    const ids = normalizeProductIds(req.body.ids);
    if (!ids.length) return error(res, 'ids array required', 400);

    const existing = await query('SELECT id FROM products WHERE id = ANY($1::int[])', [ids]);
    const existingIds = existing.rows.map(row => Number(row.id));
    const blocked = await query(
      'SELECT DISTINCT product_id AS id FROM order_items WHERE product_id = ANY($1::int[])',
      [existingIds]
    );
    const blockedIds = blocked.rows.map(row => Number(row.id));
    const deletableIds = existingIds.filter(id => !blockedIds.includes(id));
    const result = deletableIds.length
      ? await query('DELETE FROM products WHERE id = ANY($1::int[]) RETURNING id', [deletableIds])
      : { rows: [] };

    const deletedIds = result.rows.map(row => Number(row.id));
    const failed = ids
      .filter(id => !deletedIds.includes(id))
      .map(id => {
        if (!existingIds.includes(id)) return { id, reason: 'Product not found' };
        if (blockedIds.includes(id)) return { id, reason: 'Product has order history' };
        return { id, reason: 'Not deleted' };
      });

    const status = failed.length && deletedIds.length ? 207 : 200;
    return success(res, {
      requested: ids.length,
      deleted: deletedIds.length,
      failed,
    }, failed.length
      ? `Deleted ${deletedIds.length} products. ${failed.length} failed.`
      : `Deleted ${deletedIds.length} products successfully`, status);
  } catch (err) {
    console.error('bulkDeleteProducts error:', err);
    return error(res, 'Failed to bulk delete products');
  }
};

const toggleProduct = async (req, res) => {
  try {
    const result = await query(
      `UPDATE products SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, slug, canonical_url, is_active`,
      [req.params.id]
    );
    if (!result.rows.length) return notFound(res, 'Product not found');
    if (result.rows[0].is_active) notifySearchIndexing(result.rows[0]).catch(() => {});
    return success(
      res,
      result.rows[0],
      `Product '${result.rows[0].name}' ${result.rows[0].is_active ? 'activated' : 'deactivated'}`
    );
  } catch (err) {
    return error(res, 'Failed to toggle product status');
  }
};

const bulkUpdateStock = async (req, res) => {
  try {
    if (!Array.isArray(req.body.updates) || !req.body.updates.length) {
      return error(res, 'updates array required: [{ id, stock }]', 400);
    }
    await Promise.all(req.body.updates.map(({ id, stock }) =>
      query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [Number(stock), id])
    ));
    return success(res, null, `Stock updated for ${req.body.updates.length} products`);
  } catch (err) {
    return error(res, 'Failed to bulk update stock');
  }
};

const getVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at ASC',
      [productId]
    );
    return success(res, { variants: result.rows });
  } catch (err) {
    return error(res, 'Failed to fetch variants');
  }
};

const addVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sku, attribute_name = 'Size', attribute_value, price, stock_qty = 0 } = req.body;
    if (!attribute_value || price === undefined) {
      return error(res, 'attribute_value and price are required', 400);
    }
    const result = await query(
      `INSERT INTO product_variants (product_id, sku, attribute_name, attribute_value, price, stock_qty)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [productId, sku || null, attribute_name, attribute_value, parseFloat(price), parseInt(stock_qty, 10)]
    );
    return created(res, { variant: result.rows[0] }, 'Variant added successfully');
  } catch (err) {
    return error(res, err.message || 'Failed to add variant');
  }
};

const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { sku, attribute_name, attribute_value, price, stock_qty, is_active } = req.body;
    const result = await query(
      `UPDATE product_variants
       SET sku = COALESCE($1, sku),
           attribute_name = COALESCE($2, attribute_name),
           attribute_value = COALESCE($3, attribute_value),
           price = COALESCE($4, price),
           stock_qty = COALESCE($5, stock_qty),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [sku, attribute_name, attribute_value, price ? parseFloat(price) : null, stock_qty !== undefined ? parseInt(stock_qty, 10) : null, is_active, variantId]
    );
    if (!result.rows.length) return notFound(res, 'Variant not found');
    return success(res, { variant: result.rows[0] }, 'Variant updated successfully');
  } catch (err) {
    return error(res, 'Failed to update variant');
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const result = await query('DELETE FROM product_variants WHERE id = $1 RETURNING id', [variantId]);
    if (!result.rows.length) return notFound(res, 'Variant not found');
    return success(res, null, 'Variant deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete variant');
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  generateSeoPreview,
  deleteProduct,
  bulkDeactivateProducts,
  bulkDeleteProducts,
  toggleProduct,
  bulkUpdateStock,
  getVariants,
  addVariant,
  updateVariant,
  deleteVariant,
};
