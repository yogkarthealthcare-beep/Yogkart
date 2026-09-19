const { query } = require('../config/database');

/**
 * POST /api/newsletter/subscribe
 * Body: { email, name, contact }
 */
const subscribe = async (req, res) => {
  try {
    const { email, name, contact } = req.body || {};

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email format.'
      });
    }

    const cleanName = String(name || '').trim() || 'Newsletter Subscriber';
    const cleanContact = String(contact || '').trim();

    // Check if already in customer_contacts
    const existingRes = await query(
      `SELECT id, email, source_table, created_at FROM customer_contacts WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (existingRes.rows.length > 0) {
      return res.json({
        success: true,
        message: 'You are already subscribed to Yogkart Newsletter! Use coupon code YOGKART15 for 15% OFF.',
        data: {
          email: cleanEmail,
          couponCode: 'YOGKART15',
          discount: '15% OFF',
          alreadySubscribed: true
        }
      });
    }

    // Insert new contact into customer_contacts table
    const insertRes = await query(
      `INSERT INTO customer_contacts (name, email, contact, address, country, source_table, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, email, contact, source_table, created_at`,
      [cleanName, cleanEmail, cleanContact, '', 'India', 'Newsletter Subscriber']
    );

    return res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! Your 15% discount coupon is YOGKART15.',
      data: {
        id: insertRes.rows[0].id,
        email: cleanEmail,
        couponCode: 'YOGKART15',
        discount: '15% OFF'
      }
    });
  } catch (err) {
    console.error('❌ Error subscribing to newsletter:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter. Please try again later.'
    });
  }
};

module.exports = {
  subscribe
};
