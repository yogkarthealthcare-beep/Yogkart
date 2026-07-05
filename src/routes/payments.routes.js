const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { query } = require('../config/database');
const {
  getGatewaySettings,
  getPublicGatewaySettings,
} = require('../services/paymentGatewaySettings.service');

const router = express.Router();

const sendGatewayError = (res, err, fallback) => {
  console.error(fallback, err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : fallback,
  });
};

const cashfreeBaseUrl = (environment) => (
  environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'
);

const paypalBaseUrl = (environment) => (
  environment === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
);

const payuBaseUrl = (environment) => (
  environment === 'production'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment'
);

const cashfreeHeaders = (settings, extra = {}) => ({
  'Content-Type': 'application/json',
  'x-api-version': settings.additionalConfig.apiVersion || '2025-01-01',
  'x-client-id': settings.clientId,
  'x-client-secret': settings.secretKey,
  ...extra,
});

const payuHash = ({
  key,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  salt,
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
}) => crypto
  .createHash('sha512')
  .update([
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    '',
    '',
    '',
    '',
    '',
    salt,
  ].join('|'))
  .digest('hex');

const payuResponseHash = ({
  additionalCharges = '',
  salt,
  status,
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
  email = '',
  firstname = '',
  productinfo = '',
  amount = '',
  txnid = '',
  key = '',
}) => {
  const parts = [
    salt,
    status,
    '',
    '',
    '',
    '',
    '',
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
  ];
  if (additionalCharges) parts.unshift(additionalCharges);
  return crypto
    .createHash('sha512')
    .update(parts.join('|'))
    .digest('hex');
};

router.get('/gateways', async (_req, res) => {
  try {
    res.json({ success: true, data: { gateways: await getPublicGatewaySettings() } });
  } catch (err) {
    sendGatewayError(res, err, 'Could not load payment methods');
  }
});

router.post('/razorpay/create-order', async (req, res) => {
  try {
    const settings = await getGatewaySettings('razorpay', { requireEnabled: true });
    const { amount, currency = 'INR', receipt } = req.body;
    if (!Number.isInteger(amount) || amount < 100 || currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'A valid INR amount is required' });
    }
    const razorpay = new Razorpay({
      key_id: settings.clientId,
      key_secret: settings.secretKey,
    });
    const order = await razorpay.orders.create({ amount, currency, receipt });
    res.json({
      orderId: receipt || `YK-${Date.now()}`,
      razorpayOrderId: order.id,
      amount: order.amount,
      keyId: settings.clientId,
    });
  } catch (err) {
    sendGatewayError(res, err, 'Could not create Razorpay order');
  }
});

router.post('/razorpay/verify', async (req, res) => {
  try {
    const settings = await getGatewaySettings('razorpay', { requireEnabled: true });
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto
      .createHmac('sha256', settings.secretKey)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const received = Buffer.from(String(razorpay_signature || ''));
    const calculated = Buffer.from(expected);
    if (
      received.length !== calculated.length
      || !crypto.timingSafeEqual(received, calculated)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    if (orderId) {
      await query(
        `UPDATE orders SET status = 'confirmed', payment_status = 'paid' WHERE id = $1`,
        [orderId]
      );
    }
    res.json({ success: true, orderId });
  } catch (err) {
    sendGatewayError(res, err, 'Razorpay verification failed');
  }
});

router.post('/cashfree/create-order', async (req, res) => {
  try {
    const settings = await getGatewaySettings('cashfree', { requireEnabled: true });
    const { amount, currency = 'INR', receipt, address = {}, customer = {} } = req.body;
    if (!Number.isInteger(amount) || amount < 100 || currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'A valid INR amount is required' });
    }
    const orderId = String(receipt || `YKCF-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 45);
    const orderMeta = {};
    if (settings.returnUrl) {
      orderMeta.return_url = settings.returnUrl.includes('{order_id}')
        ? settings.returnUrl
        : `${settings.returnUrl}${settings.returnUrl.includes('?') ? '&' : '?'}cashfree_order_id={order_id}`;
    }
    if (settings.webhookUrl) orderMeta.notify_url = settings.webhookUrl;

    const response = await fetch(`${cashfreeBaseUrl(settings.environment)}/orders`, {
      method: 'POST',
      headers: cashfreeHeaders(settings, { 'x-idempotency-key': crypto.randomUUID() }),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number((amount / 100).toFixed(2)),
        order_currency: 'INR',
        customer_details: {
          customer_id: String(customer.id || customer.email || address.phone || orderId)
            .replace(/[^A-Za-z0-9_-]/g, '')
            .slice(0, 50),
          customer_name: customer.name || address.name || 'YogKart Customer',
          customer_email: customer.email || undefined,
          customer_phone: customer.phone || address.phone || '9999999999',
        },
        order_meta: orderMeta,
        order_note: 'YogKart order payment',
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.payment_session_id) {
      throw new Error(data.message || 'Cashfree did not create a payment session');
    }
    res.json({
      success: true,
      orderId,
      cashfreeOrderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      environment: settings.environment,
    });
  } catch (err) {
    sendGatewayError(res, err, 'Could not create Cashfree order');
  }
});

router.post('/cashfree/verify', async (req, res) => {
  try {
    const settings = await getGatewaySettings('cashfree', { requireEnabled: true });
    const orderId = String(req.body.orderId || '');
    if (!orderId) return res.status(400).json({ success: false, message: 'Cashfree order ID is required' });
    const response = await fetch(
      `${cashfreeBaseUrl(settings.environment)}/orders/${encodeURIComponent(orderId)}`,
      { headers: cashfreeHeaders(settings) }
    );
    const data = await response.json();
    if (!response.ok || data.order_status !== 'PAID') {
      return res.status(400).json({ success: false, message: 'Cashfree payment is not completed' });
    }
    await query(
      `UPDATE orders SET status = 'confirmed', payment_status = 'paid' WHERE id = $1`,
      [orderId]
    );
    res.json({ success: true, orderId, transactionId: String(data.cf_order_id || '') });
  } catch (err) {
    sendGatewayError(res, err, 'Cashfree verification failed');
  }
});

router.post('/payu/create-payment', async (req, res) => {
  try {
    const settings = await getGatewaySettings('payu', { requireEnabled: true });
    const { amount, currency = 'INR', receipt, address = {}, customer = {} } = req.body;
    if (!Number.isInteger(amount) || amount < 100 || currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'A valid INR amount is required' });
    }

    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const frontendUrl = String(settings.returnUrl || process.env.FRONTEND_URL || 'https://yogkart.com').replace(/\/$/, '');
    const txnid = String(receipt || `YKPU-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    const amountText = (amount / 100).toFixed(2);
    const productinfo = 'YogKart order payment';
    const firstname = String(customer.name || address.name || 'YogKart Customer').trim().slice(0, 60);
    const email = String(customer.email || address.email || 'customer@yogkart.com').trim();
    const phone = String(customer.phone || address.phone || '9999999999').replace(/\D/g, '').slice(-10) || '9999999999';

    const fields = {
      key: settings.clientId,
      txnid,
      amount: amountText,
      productinfo,
      firstname,
      email,
      phone,
      surl: settings.callbackUrl || `${apiBaseUrl}/api/payments/payu/callback`,
      furl: settings.callbackUrl || `${apiBaseUrl}/api/payments/payu/callback`,
      udf1: frontendUrl,
      service_provider: 'payu_paisa',
    };
    fields.hash = payuHash({ ...fields, salt: settings.secretKey });

    res.json({
      success: true,
      orderId: txnid,
      gateway: 'payu',
      action: payuBaseUrl(settings.environment),
      method: 'POST',
      fields,
      environment: settings.environment,
    });
  } catch (err) {
    sendGatewayError(res, err, 'Could not create PayU payment');
  }
});

router.post('/payu/callback', async (req, res) => {
  try {
    const settings = await getGatewaySettings('payu', { requireEnabled: true });
    const body = req.body || {};
    const expected = payuResponseHash({
      salt: settings.secretKey,
      additionalCharges: body.additionalCharges,
      status: body.status,
      udf1: body.udf1,
      udf2: body.udf2,
      udf3: body.udf3,
      udf4: body.udf4,
      udf5: body.udf5,
      email: body.email,
      firstname: body.firstname,
      productinfo: body.productinfo,
      amount: body.amount,
      txnid: body.txnid,
      key: body.key,
    });
    const isValid = body.hash && expected === body.hash;
    const paid = isValid && String(body.status).toLowerCase() === 'success';
    if (paid && body.txnid) {
      await query(
        `UPDATE orders SET status = 'confirmed', payment_status = 'paid' WHERE id = $1`,
        [body.txnid]
      );
    }

    const fallbackUrl = process.env.FRONTEND_URL || 'https://yogkart.com';
    const returnUrl = String(body.udf1 || settings.returnUrl || fallbackUrl).replace(/\/$/, '');
    const queryString = new URLSearchParams({
      gateway: 'payu',
      status: paid ? 'success' : 'failed',
      orderId: String(body.txnid || ''),
      transactionId: String(body.mihpayid || ''),
    }).toString();
    return res.redirect(302, `${returnUrl}/checkout?${queryString}`);
  } catch (err) {
    sendGatewayError(res, err, 'PayU verification failed');
  }
});

router.post('/paypal/verify', async (req, res) => {
  try {
    const settings = await getGatewaySettings('paypal', { requireEnabled: true });
    const { captureId, payload } = req.body;
    const baseUrl = paypalBaseUrl(settings.environment);
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.clientId}:${settings.secretKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error('PayPal authentication failed');

    const captureResponse = await fetch(
      `${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    const capture = await captureResponse.json();
    if (!captureResponse.ok || capture.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'PayPal capture not completed' });
    }
    const orderId = payload?.receipt || `YK-PP-${Date.now()}`;
    await query(
      `UPDATE orders SET status = 'confirmed', payment_status = 'paid' WHERE id = $1`,
      [orderId]
    );
    res.json({ success: true, orderId });
  } catch (err) {
    sendGatewayError(res, err, 'PayPal verification failed');
  }
});

module.exports = router;
