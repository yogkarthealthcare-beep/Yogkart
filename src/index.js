const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes      = require('./routes/auth.routes');
const productRoutes   = require('./routes/product.routes');
const categoryRoutes  = require('./routes/category.routes');
const orderRoutes     = require('./routes/order.routes');
const wishlistRoutes  = require('./routes/wishlist.routes');
const addressRoutes   = require('./routes/address.routes');
const paymentRoutes   = require('./routes/payments.routes');
const adminRoutes     = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/admin.auth.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1); // ✅ Render ke liye zaroori

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
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
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Silent', 'X-Skip-Loading'],
  credentials: true,
}));

// OPTIONS preflight requests allow karo
app.options('*', cors());

// ── Rate Limiting ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use(globalLimiter);

// ── Body Parsing ───────────────────────────────────────
// ⚠️ Body parsing routes se PEHLE hona chahiye
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health Check ───────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Yogkart API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes);      // User auth (register, login, etc.)
app.use('/api/admin-auth',  authLimiter, adminAuthRoutes); // Admin auth (login, logout, me)
app.use('/api/admin',       adminRoutes);                  // Admin panel routes (protected)
app.use('/api/products',    productRoutes);
app.use('/api/categories',  categoryRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/wishlist',    wishlistRoutes);
app.use('/api/addresses',   addressRoutes);
app.use('/api/payments',    paymentRoutes);

// ── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ── Start Server ───────────────────────────────────────
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 Yogkart API running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\nKey Endpoints:`);
    console.log(`  POST   /api/auth/login            ← User login`);
    console.log(`  POST   /api/admin-auth/login       ← Admin login`);
    console.log(`  GET    /api/admin-auth/me           ← Admin profile`);
    console.log(`  GET    /api/admin/dashboard         ← Admin dashboard\n`);
  });
};

start();

module.exports = app;
