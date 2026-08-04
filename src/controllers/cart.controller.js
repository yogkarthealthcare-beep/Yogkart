const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/cart
 * Get all cart items for logged-in user with product details
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT 
        ci.id as cart_item_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        p.name,
        p.slug,
        p.brand,
        p.price as product_price,
        p.original_price,
        p.images,
        p.thumbnail,
        p.stock as product_stock,
        pv.attribute_name,
        pv.attribute_value,
        pv.price as variant_price,
        pv.stock_qty as variant_stock,
        COALESCE(pv.price, p.price) as unit_price,
        COALESCE(pv.stock_qty, p.stock) as available_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.user_id = $1 AND p.is_active = TRUE
       ORDER BY ci.created_at DESC`,
      [userId]
    );

    const items = result.rows.map(item => ({
      cart_item_id: item.cart_item_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      thumbnail: item.thumbnail || (item.images && item.images[0]) || null,
      unit_price: parseFloat(item.unit_price),
      original_price: parseFloat(item.original_price),
      item_total: parseFloat(item.unit_price) * item.quantity,
      available_stock: item.available_stock,
      variant: item.variant_id ? {
        id: item.variant_id,
        name: item.attribute_name,
        value: item.attribute_value,
        price: parseFloat(item.variant_price)
      } : null
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.item_total, 0);

    return successResponse(res, {
      items,
      total_items: items.length,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: totalAmount
    }, 'Cart fetched successfully');
  } catch (error) {
    console.error('getCart error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/cart/add
 * Add item to cart or update quantity if exists
 */
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, variant_id = null, quantity = 1 } = req.body;

    if (!product_id) {
      return errorResponse(res, 'product_id is required', 400);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return errorResponse(res, 'Quantity must be a positive integer', 400);
    }

    // Verify product exists
    const prodResult = await db.query(
      'SELECT id, price, stock FROM products WHERE id = $1 AND is_active = TRUE',
      [product_id]
    );
    if (prodResult.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404);
    }

    // Check existing item
    let checkQuery = 'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2';
    let checkParams = [userId, product_id];

    if (variant_id) {
      checkQuery += ' AND variant_id = $3';
      checkParams.push(variant_id);
    } else {
      checkQuery += ' AND variant_id IS NULL';
    }

    const existingItem = await db.query(checkQuery, checkParams);

    if (existingItem.rows.length > 0) {
      const newQty = existingItem.rows[0].quantity + qty;
      await db.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQty, existingItem.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [userId, product_id, variant_id, qty]
      );
    }

    return exports.getCart(req, res);
  } catch (error) {
    console.error('addItem error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * PUT /api/cart/update
 * Update item quantity
 */
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id) {
      return errorResponse(res, 'cart_item_id is required', 400);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      return errorResponse(res, 'Valid quantity is required', 400);
    }

    if (qty === 0) {
      await db.query(
        'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
        [cart_item_id, userId]
      );
    } else {
      await db.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [qty, cart_item_id, userId]
      );
    }

    return exports.getCart(req, res);
  } catch (error) {
    console.error('updateItem error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * DELETE /api/cart/remove/:cartItemId
 * Remove item from cart
 */
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    await db.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [cartItemId, userId]
    );

    return exports.getCart(req, res);
  } catch (error) {
    console.error('removeItem error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * POST /api/cart/merge
 * Merge guest local storage cart with DB cart after login
 */
exports.mergeGuestCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items = [] } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const productId = item.product_id || item.id;
        const variantId = item.variant_id || null;
        const qty = parseInt(item.quantity || 1, 10);

        if (!productId || isNaN(qty) || qty <= 0) continue;

        let checkQuery = 'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2';
        let checkParams = [userId, productId];

        if (variantId) {
          checkQuery += ' AND variant_id = $3';
          checkParams.push(variantId);
        } else {
          checkQuery += ' AND variant_id IS NULL';
        }

        const existing = await db.query(checkQuery, checkParams);

        if (existing.rows.length > 0) {
          const maxQty = Math.max(existing.rows[0].quantity, qty);
          await db.query(
            'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
            [maxQty, existing.rows[0].id]
          );
        } else {
          await db.query(
            `INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [userId, productId, variantId, qty]
          );
        }
      }
    }

    return exports.getCart(req, res);
  } catch (error) {
    console.error('mergeGuestCart error:', error);
    return errorResponse(res, error.message, 500);
  }
};
