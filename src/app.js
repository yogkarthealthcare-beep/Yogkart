const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const { validateEncryptionKey } = require('./utils/encryption');
const authRoutes         = require('./routes/auth.routes');
const productRoutes      = require('./routes/product.routes');
const categoryRoutes     = require('./routes/category.routes');
const orderRoutes        = require('./routes/order.routes');
const wishlistRoutes     = require('./routes/wishlist.routes');
const addressRoutes      = require('./routes/address.routes');
const paymentRoutes      = require('./routes/payments.routes');
const couponRoutes       = require('./routes/coupon.routes');
const adminRoutes        = require('./routes/admin.routes');
const adminAuthRoutes    = require('./routes/admin.auth.routes');
const diseaseRoutes      = require('./routes/disease.routes');
const reminderRoutes     = require('./routes/reminder.routes');
const stepTrackingRoutes = require('./routes/stepTracking.routes');
const cartRoutes        = require('./routes/cart.routes');
const teacherRoutes     = require('./routes/teacher.routes');
const teacherBookingRoutes = require('./routes/teacherBooking.routes');
const courseRoutes         = require('./routes/course.routes');
const certificateRoutes    = require('./routes/certificate.routes');
const healthRoutes         = require('./routes/health.routes');
const fitnessCenterRoutes  = require('./routes/fitnessCenter.routes');
const communityRoutes      = require('./routes/community.routes');
const bannerRoutes       = require('./routes/banner.routes');   // ✅ Banner routes
const blogRoutes         = require('./routes/blog.routes');     // ✅ Blog routes
const instagramRoutes    = require('./routes/instagram.routes');  // ✅ Instagram Reels routes
const { ensureInstagramReelsSchema } = require('./services/instagram.service');
const marketplaceRoutes  = require('./routes/marketplace.routes');
const { ensureMarketplaceSchema } = require('./services/marketplace.service');
const subscriptionRoutes   = require('./routes/subscription.routes');
const adminSubscriptionRoutes = require('./routes/admin.subscription.routes');
const publicSeoRoutes      = require('./routes/seo.routes');
const adminSeoRoutes       = require('./routes/admin.seo.routes');
const seoController      = require('./controllers/seo.controller');
const socialShareController = require('./controllers/socialShare.controller');
const analyticsRoutes       = require('./routes/analytics.routes');
const uploadRoutes          = require('./routes/upload.routes');
const { STORAGE_ROOT_DIR, ensureStorageDirs } = require('./config/storage');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.set('trust proxy', 1);

app.use((req, res, next) => {
  try {
    if (!req.socket) req.socket = {};
    if (!req.socket.remoteAddress) {
      const headerIp = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
      req.socket.remoteAddress = headerIp?.split(',')[0].trim() || '127.0.0.1';
    }
  } catch {}
  next();
});

// ── CORS ──────────────────────────────────────────────
const allowedOrigins = [
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
  'https://api.yogkart.com',
  'https://www.api.yogkart.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Silent', 'X-Skip-Loading', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Headers'],
  credentials: true,
}));

// ── Rate Limiters ─────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: 'Too many requests, please try again later.' }),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      50,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: 'Too many login attempts, please try again later.' }),
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

validateEncryptionKey();
ensureStorageDirs();
ensureInstagramReelsSchema().catch(err => console.error('Error ensuring instagram_reels schema:', err));
ensureMarketplaceSchema().catch(err => console.error('Error ensuring marketplace schema:', err));

// ── VPS Local Storage Static Serving (Cross-Origin Enabled) ──
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

const staticUploadsOptions = {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
};

app.use('/uploads', express.static(STORAGE_ROOT_DIR, staticUploadsOptions));
app.use('/uploads', express.static(require('path').resolve(__dirname, '../uploads'), staticUploadsOptions));




app.get('/health', (req, res) => {
  res.json({
    success:     true,
    message:     'Yogkart API is running',
    version:     '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});
app.get('/sitemap-index.xml', seoController.sitemapIndex);
app.get('/sitemap.xml', seoController.sitemapIndex);
app.get('/sitemap-:locale.xml', seoController.localeSitemap);
app.get('/image-sitemap.xml', seoController.imageSitemap);
app.get('/video-sitemap.xml', seoController.videoSitemap);
app.get('/robots.txt', seoController.robots);
app.get('/llms.txt', seoController.llmsTxt);
app.get('/llms-full.txt', seoController.llmsTxt);
app.get('/share/products/:slug', socialShareController.getSocialPreview);

const deployRoutes        = require('./routes/deploy.routes');

app.use('/api',                          deployRoutes);
app.use('/api/auth',       authLimiter,  authRoutes);

app.use('/api/admin-auth', authLimiter,  adminAuthRoutes);
app.use('/api/upload',                   uploadRoutes);
app.use('/api/admin/upload',             uploadRoutes);
app.use('/api/admin',                    adminRoutes);
app.use('/api/seo',                      publicSeoRoutes);
app.use('/api/admin/seo',                adminSeoRoutes);
app.use('/api/products',                 productRoutes);
app.use('/api/categories',               categoryRoutes);
app.use('/api/orders',                   orderRoutes);
app.use('/api/cart',                     cartRoutes);
app.use('/api/wishlist',                 wishlistRoutes);
app.use('/api/addresses',                addressRoutes);
app.use('/api/payments',                 paymentRoutes);
app.use('/api/coupons',                  couponRoutes);
app.use('/api/banners',                  bannerRoutes);         // ✅ Banner routes
app.use('/api/blogs',                    blogRoutes);          // ✅ Blog routes
app.use('/api/instagram-reels',          instagramRoutes);     // ✅ Instagram Reels routes
app.use('/api',                          marketplaceRoutes);   // ✅ Online Selling Platforms routes
app.use('/api/teachers',                 teacherRoutes);
app.use('/api/teacher-bookings',         teacherBookingRoutes);
app.use('/api/courses',                  courseRoutes);
app.use('/api/certificates',             certificateRoutes);
app.use('/api/health',                   healthRoutes);
app.use('/api/fitness-centers',          fitnessCenterRoutes);
app.use('/api/community',                communityRoutes);
app.use('/api/subscriptions',            subscriptionRoutes);
app.use('/api/admin/subscriptions',      adminSubscriptionRoutes);
app.use('/api',                          diseaseRoutes);
app.use('/api',                          reminderRoutes);
app.use('/api',                          stepTrackingRoutes);
app.use('/api/analytics',                analyticsRoutes);


// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;
