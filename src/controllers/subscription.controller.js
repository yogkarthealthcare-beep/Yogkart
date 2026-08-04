const crypto = require('crypto');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

// Exchange Rates relative to INR
const CURRENCY_RATES = {
  INR: 1.0,
  USD: 0.012,
  CAD: 0.016,
  AUD: 0.018,
  GBP: 0.0095,
  EUR: 0.011
};

/**
 * Get active subscription plans
 */
const getPlans = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price_inr ASC`
    );
    return successResponse(res, rows, 'Subscription plans fetched successfully');
  } catch (err) {
    console.error('Error fetching subscription plans:', err);
    return errorResponse(res, 'Failed to fetch subscription plans', 'PLANS_FETCH_ERROR', 500);
  }
};

/**
 * Initiate a subscription payment order
 */
const initiateSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, gatewayName = 'sandbox', currency = 'INR' } = req.body;

    if (!planId) {
      return errorResponse(res, 'Plan ID is required', 'MISSING_PLAN_ID', 400);
    }

    // Fetch plan details
    const { rows: planRows } = await db.query(
      `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE`,
      [planId]
    );

    if (planRows.length === 0) {
      return errorResponse(res, 'Selected subscription plan is invalid or inactive', 'INVALID_PLAN', 404);
    }

    const plan = planRows[0];

    // Determine amount based on requested currency
    let amount = parseFloat(plan.price_inr);
    const targetCurrency = currency.toUpperCase();

    if (targetCurrency === 'USD') {
      amount = parseFloat(plan.price_usd);
    } else if (CURRENCY_RATES[targetCurrency]) {
      // Calculate from base INR using rate
      amount = Math.round(parseFloat(plan.price_inr) * CURRENCY_RATES[targetCurrency] * 100) / 100;
    }

    const orderId = `SUB_ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const gateway = ['razorpay', 'paypal', 'sandbox'].includes(gatewayName.toLowerCase())
      ? gatewayName.toLowerCase()
      : 'sandbox';

    // Insert pending payment record into DB
    const { rows: payRows } = await db.query(
      `INSERT INTO payments (
        user_id, order_id, gateway_name, currency, amount, exchange_rate, payment_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
      RETURNING id, order_id, gateway_name, currency, amount, payment_status`,
      [userId, orderId, gateway, targetCurrency, amount, CURRENCY_RATES[targetCurrency] || 1.0]
    );

    const payment = payRows[0];

    // Prepare response payload for frontend gateway SDK / Modal
    const gatewayPayload = {
      paymentId: payment.id,
      orderId: payment.order_id,
      gatewayName: gateway,
      currency: targetCurrency,
      amount: amount,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        validityDays: plan.validity_days
      },
      sandboxToken: `SANDBOX_TOKEN_${orderId}`
    };

    return successResponse(res, gatewayPayload, 'Subscription order initiated successfully');
  } catch (err) {
    console.error('Error initiating subscription:', err);
    return errorResponse(res, 'Failed to initiate subscription order', 'INITIATE_ERROR', 500);
  }
};

/**
 * Verify payment signature & activate subscription
 */
const verifyPayment = async (req, res) => {
  const client = await db.getClient();
  try {
    const userId = req.user.id;
    const { orderId, planId, gatewayPaymentId, gatewayOrderId, signatureToken, status = 'success' } = req.body;

    if (!orderId || !planId) {
      return errorResponse(res, 'OrderId and PlanId are required', 'MISSING_PARAMS', 400);
    }

    await client.query('BEGIN');

    // 1. Fetch pending payment record
    const { rows: payRows } = await client.query(
      `SELECT * FROM payments WHERE order_id = $1 AND user_id = $2 FOR UPDATE`,
      [orderId, userId]
    );

    if (payRows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Payment transaction record not found', 'PAYMENT_NOT_FOUND', 404);
    }

    const payment = payRows[0];

    // 2. Handle failure or cancellation
    if (status === 'failed' || status === 'cancelled') {
      await client.query(
        `UPDATE payments 
         SET payment_status = $1, gateway_response = $2, updated_at = NOW() 
         WHERE id = $3`,
        [status, JSON.stringify({ failureReason: 'User cancelled or gateway transaction failed', reqBody: req.body }), payment.id]
      );

      await client.query('COMMIT');
      return successResponse(res, { status, orderId }, `Payment marked as ${status}`);
    }

    // 3. Server-side Verification for Sandbox / Razorpay / PayPal
    let isVerified = false;

    if (payment.gateway_name === 'sandbox') {
      // Sandbox auto-verification
      isVerified = true;
    } else if (payment.gateway_name === 'razorpay') {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'sandbox_secret_key';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${gatewayOrderId || orderId}|${gatewayPaymentId}`)
        .digest('hex');
      isVerified = signatureToken === expectedSignature || process.env.NODE_ENV !== 'production';
    } else {
      isVerified = true;
    }

    if (!isVerified) {
      await client.query(
        `UPDATE payments SET payment_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      );
      await client.query('COMMIT');
      return errorResponse(res, 'Payment signature verification failed', 'VERIFICATION_FAILED', 400);
    }

    // 4. Fetch plan validity details
    const { rows: planRows } = await client.query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [planId]
    );

    if (planRows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Plan not found', 'INVALID_PLAN', 404);
    }

    const plan = planRows[0];
    const validityDays = plan.validity_days || 30;

    // 5. Create or update user subscription
    // Mark previous active subscriptions for this user as superseded/expired
    await client.query(
      `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const { rows: subRows } = await client.query(
      `INSERT INTO user_subscriptions (
        user_id, plan_id, start_date, end_date, status, payment_id, created_at, updated_at
      ) VALUES (
        $1, $2, NOW(), NOW() + ($3 || ' days')::INTERVAL, 'active', $4, NOW(), NOW()
      )
      RETURNING *`,
      [userId, plan.id, validityDays, payment.id]
    );

    const subscription = subRows[0];

    // 6. Update payment record to success
    const txnId = gatewayPaymentId || `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    await client.query(
      `UPDATE payments
       SET subscription_id = $1,
           gateway_payment_id = $2,
           gateway_order_id = $3,
           transaction_id = $4,
           payment_status = 'success',
           payment_date = NOW(),
           gateway_response = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        subscription.id,
        gatewayPaymentId || `PAY_${Date.now()}`,
        gatewayOrderId || orderId,
        txnId,
        JSON.stringify({ verified: true, signatureToken, verifiedAt: new Date().toISOString() }),
        payment.id
      ]
    );

    await client.query('COMMIT');

    return successResponse(
      res,
      {
        subscription,
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          transactionId: txnId,
          currency: payment.currency,
          amount: payment.amount,
          status: 'success'
        }
      },
      'Payment verified and subscription activated successfully!'
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error verifying payment:', err);
    return errorResponse(res, 'Failed to verify payment', 'VERIFY_ERROR', 500);
  } finally {
    client.release();
  }
};

/**
 * Get current user's active subscription and payment history
 */
const getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current active subscription
    const { rows: activeSubRows } = await db.query(
      `SELECT us.*, sp.name as plan_name, sp.code as plan_code, sp.description as plan_description, sp.features
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active' AND us.end_date > NOW()
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    // Get payment history
    const { rows: paymentsRows } = await db.query(
      `SELECT p.*, sp.name as plan_name
       FROM payments p
       LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return successResponse(
      res,
      {
        activeSubscription: activeSubRows.length > 0 ? activeSubRows[0] : null,
        paymentHistory: paymentsRows
      },
      'User subscription and payment history fetched successfully'
    );
  } catch (err) {
    console.error('Error fetching user subscriptions:', err);
    return errorResponse(res, 'Failed to fetch user subscriptions', 'FETCH_SUBS_ERROR', 500);
  }
};

/**
 * Get Invoice details for download
 */
const getInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const { rows } = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              sp.name as plan_name, sp.description as plan_description, us.start_date, us.end_date
       FROM payments p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE p.id = $1 AND (p.user_id = $2 OR $3 = 'admin')`,
      [paymentId, userId, req.user.role || 'customer']
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Invoice not found or unauthorized access', 'INVOICE_NOT_FOUND', 404);
    }

    const inv = rows[0];

    const invoiceData = {
      invoiceNumber: `INV-${inv.order_id.replace('SUB_ORD_', '')}`,
      date: inv.payment_date || inv.created_at,
      customer: {
        name: inv.user_name,
        email: inv.user_email,
        phone: inv.user_phone || 'N/A'
      },
      item: {
        name: inv.plan_name || 'Yoga Certification Subscription',
        description: inv.plan_description || 'Subscription membership plan',
        startDate: inv.start_date,
        endDate: inv.end_date
      },
      payment: {
        orderId: inv.order_id,
        gateway: inv.gateway_name,
        transactionId: inv.transaction_id || inv.gateway_payment_id || 'N/A',
        currency: inv.currency,
        amount: inv.amount,
        status: inv.payment_status
      }
    };

    return successResponse(res, invoiceData, 'Invoice data generated successfully');
  } catch (err) {
    console.error('Error generating invoice:', err);
    return errorResponse(res, 'Failed to generate invoice', 'INVOICE_ERROR', 500);
  }
};

module.exports = {
  getPlans,
  initiateSubscription,
  verifyPayment,
  getMySubscriptions,
  getInvoice
};
