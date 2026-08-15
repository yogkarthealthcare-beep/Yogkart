const app = require('./app');
const { testConnection } = require('./config/database');
const { ensurePaymentGatewaySchema } = require('./services/paymentGatewaySettings.service');
const { ensureProductSeoSchema } = require('./services/productSeo.service');
const { ensureBannersSchema } = require('./services/banner.service');
const { ensureBulkCommunicationSchema } = require('./services/bulkCommunication.service');

const PORT = process.env.PORT || 3000;

// ── Fail-Safe Server Startup ──────────────────────────────
// Start listening on PORT immediately so Nginx reverse proxy (127.0.0.1:3000)
// never receives ECONNREFUSED or 502 Bad Gateway.
const server = app.listen(PORT, () => {
  console.log(`✅ Yogkart API server listening on http://127.0.0.1:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Non-blocking background database connection & schema initialization
  (async () => {
    try {
      await testConnection();
      await Promise.allSettled([
        ensurePaymentGatewaySchema(),
        ensureProductSeoSchema(),
        ensureBannersSchema(),
        ensureBulkCommunicationSchema(),
      ]);
      console.log('✅ Database connection and schemas initialized successfully');
    } catch (dbErr) {
      console.error('⚠️ Database initialization warning:', dbErr.message);
    }
  })();
});

// Clean exception handlers to prevent Node process crash loops in PM2
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});

module.exports = server;
