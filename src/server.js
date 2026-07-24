const app = require('./app');
const { testConnection } = require('./config/database');
const { ensurePaymentGatewaySchema } = require('./services/paymentGatewaySettings.service');
const { ensureProductSeoSchema } = require('./services/productSeo.service');
const { ensureBannersSchema } = require('./services/banner.service');
const { ensureBulkCommunicationSchema } = require('./services/bulkCommunication.service');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await testConnection();
    await ensurePaymentGatewaySchema();
    await ensureProductSeoSchema();
    await ensureBannersSchema();
    await ensureBulkCommunicationSchema();

    app.listen(PORT, () => {
      console.log(`Yogkart API running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Key Endpoints:');
      console.log('  POST   /api/auth/login');
      console.log('  POST   /api/admin-auth/login');
      console.log('  GET    /api/admin/dashboard');
      console.log('  POST   /api/detect-disease');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
