const app = require('../src/app');
const { testConnection } = require('../src/config/database');

let dbConnected = false;

module.exports = async (req, res) => {
  try {
    if (!dbConnected) {
      await testConnection();
      dbConnected = true;
    }

    return app(req, res);
  } catch (err) {
    console.error('❌ Vercel function error:', err);
    res.statusCode = 500;
    return res.end('Internal Server Error');
  }
};