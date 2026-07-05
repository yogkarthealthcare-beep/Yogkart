const {
  ensurePaymentGatewaySchema,
  updateGatewaySettings,
} = require('../src/services/paymentGatewaySettings.service');
const { pool } = require('../src/config/database');

const gateways = [
  {
    name: 'payu',
    clientId: process.env.PAYU_KEY,
    secretKey: process.env.PAYU_SALT,
    environment: process.env.PAYU_ENVIRONMENT || 'sandbox',
  },
  {
    name: 'cashfree',
    clientId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    environment: process.env.CASHFREE_ENVIRONMENT || 'sandbox',
  },
  {
    name: 'razorpay',
    clientId: process.env.RAZORPAY_KEY_ID,
    secretKey: process.env.RAZORPAY_KEY_SECRET,
    environment: process.env.RAZORPAY_ENVIRONMENT || 'sandbox',
  },
];

const required = gateways.flatMap((gateway) => [
  [gateway.name, 'clientId', gateway.clientId],
  [gateway.name, 'secretKey', gateway.secretKey],
]);

const missing = required
  .filter(([, , value]) => !String(value || '').trim())
  .map(([gateway, field]) => `${gateway}.${field}`);

if (missing.length) {
  console.error(`Missing required values: ${missing.join(', ')}`);
  process.exit(1);
}

const run = async () => {
  try {
    await ensurePaymentGatewaySchema();
    for (const gateway of gateways) {
      const updated = await updateGatewaySettings(gateway.name, {
        isEnabled: true,
        environment: gateway.environment,
        clientId: gateway.clientId,
        secretKey: gateway.secretKey,
        callbackUrl: '',
        returnUrl: process.env.PAYMENT_RETURN_URL || 'https://yogkart.com/checkout',
        webhookUrl: '',
        additionalConfig: {},
      });
      console.log(`${updated.displayName}: enabled (${updated.environment})`);
    }
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
