// api/index.js — Vercel serverless entry point
const app = require('../src/app');
const { testConnection } = require('../src/config/database');
const { ensurePaymentGatewaySchema } = require('../src/services/paymentGatewaySettings.service');
const { ensureProductSeoSchema } = require('../src/services/productSeo.service');
const { ensureBannersSchema } = require('../src/services/banner.service');
const { ensureBulkCommunicationSchema } = require('../src/services/bulkCommunication.service');

let dbConnected = false;

// Allowed origins list
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

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Silent,X-Skip-Loading,X-Requested-With,Accept,Origin');
}

module.exports = async (req, res) => {
  // CORS headers hamesha set karo — chahe server crash ho ya error aaye
  setCorsHeaders(req, res);

  // OPTIONS preflight ka seedha response do
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    // DB connection aur schemas initialization non-blocking tareeqe se karo
    if (!dbConnected) {
      try {
        await testConnection();
        await Promise.allSettled([
          ensurePaymentGatewaySchema(),
          ensureProductSeoSchema(),
          ensureBannersSchema(),
          ensureBulkCommunicationSchema(),
        ]);
        dbConnected = true;
      } catch (dbErr) {
        console.error('⚠️ DB Init warning on Vercel:', dbErr.message);
      }
    }
    return app(req, res);
  } catch (err) {
    console.error('Vercel function error:', err.message);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    }));
  }
};

