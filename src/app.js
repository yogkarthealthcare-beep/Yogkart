const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { validateEncryptionKey } = require('./utils/encryption');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const addressRoutes = require('./routes/address.routes');
const paymentRoutes = require('./routes/payments.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/admin.auth.routes');
const diseaseRoutes = require('./routes/disease.routes');
const reminderRoutes = require('./routes/reminder.routes');
const stepTrackingRoutes = require('./routes/stepTracking.routes');

const app = express();

app.use(helmet());
app.set('trust proxy', 1);

// Robust IP extractor for serverless environments where `req.socket` may be missing
const extractIp = (req) => {
  try {
    if (req.ip) return req.ip;
    const fwd = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
    if (fwd && typeof fwd === 'string') return fwd.split(',')[0].trim();
    return req.socket && req.socket.remoteAddress || req.connection && req.connection.remoteAddress || 'unknown';
  } catch (e) {
    return 'unknown';
  }
};

// Ensure `req.socket.remoteAddress` exists to avoid proxy-addr errors in serverless runtimes
app.use((req, res, next) => {
  try {
    if (!req.socket) {
      req.socket = {};
    }
    if (!req.socket.remoteAddress) {
      const headerIp = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
      req.socket.remoteAddress = headerIp && headerIp.split(',')[0].trim() || req.connection && req.connection.remoteAddress || '127.0.0.1';
    }
  } catch (e) {}
  return next();
});

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:64814',
  'https://yogkart-eedb8.web.app',
  'https://yogkart-eedb8.firebaseapp.com',
  'https://www.yogkart.in',
  'https://www.yogkart.com',
  'https://yogkart.com',
  'https://yogkart.in',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Silent', 'X-Skip-Loading'],
  credentials: true,
}));

app.options('*', cors());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: extractIp,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many requests, please try again later.' }),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: extractIp,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many login attempts, please try again later.' }),
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

validateEncryptionKey();

app.get('/favicon.ico', (req, res) => {
  res.sendStatus(204);
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Yogkart API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin-auth', authLimiter, adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', diseaseRoutes);
app.use('/api', reminderRoutes);
app.use('/api', stepTrackingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;
