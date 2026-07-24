// api/index.js — Vercel serverless entry point
const app = require('../src/app');
const { testConnection } = require('../src/config/database');
const { ensurePaymentGatewaySchema } = require('../src/services/paymentGatewaySettings.service');
const { ensureProductSeoSchema } = require('../src/services/productSeo.service');
const { ensureBannersSchema } = require('../src/services/banner.service');
const { ensureBulkCommunicationSchema } = require('../src/services/bulkCommunication.service');

let dbConnected = false;

// Allowed origins (same list as app.js — crash ke case mein bhi CORS headers milein)
const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:64814',
  'https://yogkart-eedb8.web.app',
  'https://yogkart-eedb8.firebaseapp.com',
  'https://yogkart.vercel.app',
  'https://www.yogkart.in',
  'https://www.yogkart.com',
  'https://yogkart.com',
  'https://yogkart.in',
];

module.exports = async (req, res) => {
  // CORS headers hamesha set karo — chahe server crash ho jaaye
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Silent,X-Skip-Loading');

  // OPTIONS preflight ka seedha jawab do
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    // DB connection ek baar karo, reuse karo (Vercel warm instances)
    if (!dbConnected) {
      await testConnection();
      await ensurePaymentGatewaySchema();
      await ensureProductSeoSchema();
      await ensureBannersSchema();
      await ensureBulkCommunicationSchema();
      dbConnected = true;
    }
    return app(req, res);
  } catch (err) {
    console.error('Vercel function error:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    }));
  }
};
