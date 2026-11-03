const { query, getClient } = require('../config/database');
const { success, created, notFound, error, paginated, forbidden } = require('../utils/response');
const { calculateDiscount, normalizeCode } = require('./coupon.controller');
const invoiceService = require('../services/invoice.service');

const generateOrderId = () => {
  const ts = Date.now().toString().slice(-8);
  return `YK${ts}`;
};

// ── POST /api/orders ───────────────────────────────────
const placeOrder = async (req, res) => {
  const client = await getClient();
  try {
    const {
      items, subtotal, discount = 0, delivery_fee = 0, tax = 0, total,
      payment_method, address, coupon_code, email, utm
    } = req.body;

    if (!items || items.length === 0) {
      return error(res, 'No items in order', 400);
    }

    await client.query('BEGIN');

    const orderId = generateOrderId();
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);

    const initialStatus = ['cod', 'paypal'].includes(payment_method) ? 'confirmed' : 'pending';
    const initialPaymentStatus = payment_method === 'paypal' ? 'paid' : 'pending';
    let couponCode = normalizeCode(coupon_code);
    let couponDiscount = 0;

    if (couponCode) {
      const couponRes = await client.query(
        `SELECT *
         FROM coupons
         WHERE UPPER(code) = $1
           AND is_active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR current_uses < max_uses)
         LIMIT 1`,
        [couponCode]
      );
      if (!couponRes.rows.length) throw new Error('Invalid or expired coupon');
      const coupon = couponRes.rows[0];
      if (Number(subtotal) < Number(coupon.min_order_value || 0)) {
        throw new Error(`Minimum order value Rs. ${coupon.min_order_value} required`);
      }
      couponDiscount = calculateDiscount(coupon, subtotal);
    }

    const totalAmount = couponDiscount > 0
      ? Math.max(0, Number(subtotal || 0) + Number(delivery_fee || 0) + Number(tax || 0) - couponDiscount)
      : Number(total || 0);

    // 1. Resolve User (Logged-in or link guest by phone/email - Task 2.1)
    let userId = req.user ? req.user.id : null;
    const customerEmail = String(email || address.email || (req.user && req.user.email) || '').trim().toLowerCase() || null;
    const customerPhone = String(address.phone || '').trim();

    if (!userId && (customerPhone || customerEmail)) {
      const existingUser = await client.query(
        `SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2) LIMIT 1`,
        [customerPhone, customerEmail]
      );
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
      }
    }

    // 2. Insert order with UTM and tracking info (Task 2.1 & 2.4)
    await client.query(
      `INSERT INTO orders (
        id, user_id, status, subtotal, discount, delivery_fee, tax, total,
        payment_method, payment_status,
        address_name, address_phone, address_line1, address_city, address_state, address_pincode,
        expected_delivery, coupon_code, coupon_discount,
        customer_email, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      [
        orderId, userId, initialStatus,
        subtotal, Number(discount) + couponDiscount, delivery_fee, tax, totalAmount,
        payment_method, initialPaymentStatus,
        address.name, address.phone, address.line1,
        address.city, address.state, address.pincode,
        expectedDelivery, couponCode || null, couponDiscount,
        customerEmail,
        utm?.utm_source || null,
        utm?.utm_medium || null,
        utm?.utm_campaign || null,
        utm?.utm_content || null,
        utm?.utm_term || null,
        utm?.gclid || null,
        utm?.fbclid || null
      ]
    );

    if (couponCode) {
      await client.query(
        'UPDATE coupons SET current_uses = current_uses + 1 WHERE UPPER(code) = $1',
        [couponCode]
      );
    }

    // Insert order items & update stock
    for (const item of items) {
      const productRes = await client.query(
        `SELECT p.id, p.name, p.thumbnail, p.pack_size, p.price, p.stock
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id = $1
           AND p.is_active = TRUE
           AND (p.category_id IS NULL OR c.is_active = TRUE)`,
        [item.product_id]
      );
      if (productRes.rows.length === 0) throw new Error(`Product ${item.product_id} not found`);

      const product = productRes.rows[0];
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemTotal = product.price * item.quantity;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, name, thumbnail, pack_size, quantity, price, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [orderId, product.id, item.variant_id || null, product.name, product.thumbnail, item.pack_size || product.pack_size, item.quantity, product.price, itemTotal]
      );

      // Decrement stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, product.id]
      );
    }

    await client.query('COMMIT');

    // ── Post-Commit Notifications (Task 2.2) ──────────────────────────
    // Notifications never break the order; errors are logged to notification_log
    const orderItemsSummary = items.map(i => ({ name: i.name || 'Product', qty: i.quantity, price: i.price }));
    const formattedAddress = `${address.name} (${address.phone}), ${address.line1}, ${address.city}, ${address.state} - ${address.pincode}`;

    // 1. Customer confirmation email
    if (customerEmail) {
      (async () => {
        try {
          const { sendEmail } = require('../utils/email.service');
          await sendEmail({
            type: 'order_confirmation',
            to: customerEmail,
            data: {
              name: address.name || 'Valued Customer',
              orderId,
              items: orderItemsSummary,
              total: totalAmount,
              address: formattedAddress
            }
          });
          await query('INSERT INTO notification_log (order_id, channel, status) VALUES ($1, $2, $3)', [orderId, 'email_customer', 'sent']);
        } catch (emailErr) {
          console.error('Customer email notification error:', emailErr.message);
          await query('INSERT INTO notification_log (order_id, channel, status, error) VALUES ($1, $2, $3, $4)', [orderId, 'email_customer', 'failed', emailErr.message]).catch(() => {});
        }
      })();
    }

    // 2. Admin notification email
    (async () => {
      try {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPPORT_EMAIL || 'support@yogkart.com';
        const { sendEmail } = require('../utils/email.service');
        await sendEmail({
          type: 'order_confirmation',
          to: adminEmail,
          data: {
            name: 'YogKart Admin',
            orderId: `${orderId} [NEW ORDER]`,
            items: orderItemsSummary,
            total: totalAmount,
            address: formattedAddress
          }
        });
        await query('INSERT INTO notification_log (order_id, channel, status) VALUES ($1, $2, $3)', [orderId, 'email_admin', 'sent']);
      } catch (adminErr) {
        console.error('Admin order notification error:', adminErr.message);
        await query('INSERT INTO notification_log (order_id, channel, status, error) VALUES ($1, $2, $3, $4)', [orderId, 'email_admin', 'failed', adminErr.message]).catch(() => {});
      }
    })();

    // 3. Optional Meta Conversions API (Task 2.5)
    if (process.env.META_PIXEL_ID && process.env.META_CONVERSIONS_API_TOKEN) {
      (async () => {
        try {
          const crypto = require('crypto');
          const hash = val => crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
          const userData = {};
          if (customerEmail) userData.em = [hash(customerEmail)];
          if (customerPhone) userData.ph = [hash(customerPhone.replace(/\D/g, ''))];

          const payload = {
            data: [{
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              event_id: orderId,
              action_source: 'website',
              user_data: userData,
              custom_data: {
                currency: 'INR',
                value: totalAmount,
                order_id: orderId
              }
            }]
          };

          await fetch(`https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CONVERSIONS_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (metaErr) {
          console.error('Meta CAPI error:', metaErr.message);
        }
      })();
    }

    // Return full order
    const order = await getOrderById(orderId, userId);
    return created(res, { order }, 'Order placed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('placeOrder error:', err);
    return error(res, err.message || 'Failed to place order');
  } finally {
    client.release();
  }
};

// ── GET /api/orders/:id/invoice ───────────────────────
const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    let order;

    if (req.user.role === 'admin') {
      const resOrder = await query(
        `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
          json_agg(json_build_object(
            'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
            'thumbnail', oi.thumbnail, 'pack_size', oi.pack_size,
            'quantity', oi.quantity, 'price', oi.price, 'total', oi.total
          )) AS items
         FROM orders o
         JOIN users u ON o.user_id = u.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.id = $1
         GROUP BY o.id, u.id`,
        [id]
      );
      order = resOrder.rows[0];
    } else {
      order = await getOrderById(id, req.user.id);
    }

    if (!order) return notFound(res, 'Order not found');

    const pdfBuffer = await invoiceService.generateInvoicePdf(order, order.items || []);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadInvoice error:', err);
    return error(res, 'Failed to generate invoice PDF');
  }
};

// ── GET /api/orders ────────────────────────────────────
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE o.user_id = $1';
    const params = [req.user.id];
    if (status) {
      where += ` AND o.status = $2`;
      params.push(status);
    }

    const countRes = await query(`SELECT COUNT(*) FROM orders o ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const ordersRes = await query(
      `SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
              'thumbnail', oi.thumbnail, 'pack_size', oi.pack_size,
              'quantity', oi.quantity, 'price', oi.price, 'total', oi.total
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const orders = ordersRes.rows.map(order => ({
      ...order,
      address: {
        name: order.address_name || '',
        phone: order.address_phone || '',
        line1: order.address_line1 || '',
        city: order.address_city || '',
        state: order.address_state || '',
        pincode: order.address_pincode || '',
      },
      items: (order.items ?? [])
        .filter(item => item && (item.id !== null || item.product_id !== null))
        .map(item => ({
          ...item,
          product_name: item.name,
          image: item.thumbnail,
        }))
    }));
    return success(res, orders, 'Orders fetched');
  } catch (err) {
    console.error('getOrders error:', err);
    return error(res, 'Failed to fetch orders');
  }
};

// ── GET /api/orders/:id ────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id, req.user.id);
    if (!order) return notFound(res, 'Order not found');
    return success(res, { order });
  } catch (err) {
    return error(res, 'Failed to fetch order');
  }
};

// ── PUT /api/orders/:id/cancel ─────────────────────────
const cancelOrder = async (req, res) => {
  const client = await getClient();
  try {
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (orderRes.rows.length === 0) return notFound(res, 'Order not found');

    const order = orderRes.rows[0];
    if (['delivered', 'cancelled'].includes(order.status)) {
      return error(res, `Cannot cancel order with status: ${order.status}`, 400);
    }

    await client.query('BEGIN');

    // Restore stock
    const items = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    for (const item of items.rows) {
      await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );

    await client.query('COMMIT');
    return success(res, null, 'Order cancelled successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('cancelOrder error:', err);
    return error(res, 'Failed to cancel order');
  } finally {
    client.release();
  }
};

// ── Tracking & Helpers (Task 2.1) ──────────────────────
const trackOrder = async (req, res) => {
  try {
    const { id, phone } = req.query;
    if (!id || !phone) {
      return error(res, 'Both Order ID and Phone Number are required for tracking', 400);
    }
    const order = await getOrderByIdAndPhone(String(id).trim(), String(phone).trim());
    if (!order) {
      return notFound(res, 'No matching order found for this Order ID and Phone Number');
    }
    return success(res, { order });
  } catch (err) {
    console.error('trackOrder error:', err);
    return error(res, 'Failed to track order');
  }
};

const getOrderByIdAndPhone = async (orderId, phone) => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const result = await query(
    `SELECT o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
            'thumbnail', oi.thumbnail, 'pack_size', oi.pack_size,
            'quantity', oi.quantity, 'price', oi.price, 'total', oi.total
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE UPPER(o.id) = UPPER($1) 
       AND (o.address_phone ILIKE $2 OR o.address_phone ILIKE $3)
     GROUP BY o.id`,
    [orderId, `%${cleanPhone}`, `%${phone}%`]
  );
  if (!result.rows.length) return null;
  const order = result.rows[0];
  return {
    ...order,
    address: {
      name: order.address_name || '',
      phone: order.address_phone || '',
      line1: order.address_line1 || '',
      city: order.address_city || '',
      state: order.address_state || '',
      pincode: order.address_pincode || '',
    },
    items: (order.items ?? [])
      .filter(item => item && (item.id !== null || item.product_id !== null))
      .map(item => ({
        ...item,
        product_name: item.name,
        image: item.thumbnail,
      }))
  };
};

const getOrderById = async (orderId, userId = null) => {
  const where = userId ? 'WHERE o.id = $1 AND o.user_id = $2' : 'WHERE o.id = $1';
  const params = userId ? [orderId, userId] : [orderId];
  const result = await query(
    `SELECT o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id, 'product_id', oi.product_id, 'name', oi.name,
            'thumbnail', oi.thumbnail, 'pack_size', oi.pack_size,
            'quantity', oi.quantity, 'price', oi.price, 'total', oi.total
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${where}
     GROUP BY o.id`,
    params
  );
  if (!result.rows.length) return null;
  const order = result.rows[0];
  return {
    ...order,
    address: {
      name: order.address_name || '',
      phone: order.address_phone || '',
      line1: order.address_line1 || '',
      city: order.address_city || '',
      state: order.address_state || '',
      pincode: order.address_pincode || '',
    },
    items: (order.items ?? [])
      .filter(item => item && (item.id !== null || item.product_id !== null))
      .map(item => ({
        ...item,
        product_name: item.name,
        image: item.thumbnail,
      }))
  };
};

module.exports = { placeOrder, getOrders, getOrder, cancelOrder, downloadInvoice, trackOrder };
