const path = require('path');

// ✅ FIX: Always load .env relative to this file (yogkart_backend/.env)
// This ensures dotenv works whether you run from yogkart_backend/ or anywhere else
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// JWT fallback in case .env is missing or key not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'yk_jwt_secret_change_in_production';

require('./server');

