const path = require('path');
require('dotenv').config();
// require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// Yeh hona chahiye
process.env.JWT_SECRET = process.env.JWT_SECRET || 'yk_jwt_secret_change_in_production';
require('./server');
