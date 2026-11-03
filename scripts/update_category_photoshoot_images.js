require('dotenv').config();
const { query } = require('../src/config/database');

async function run() {
  try {
    await query(`UPDATE categories SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050885/Category_01_wri8lo.png' WHERE id = 'skin-care'`);
    await query(`UPDATE categories SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050885/Category_02_oiakaz.jpg' WHERE id = 'hair-care'`);
    await query(`UPDATE categories SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/Category_03_wngftc.jpg' WHERE id = 'body-care'`);
    await query(`UPDATE categories SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/Category_04_tizdi7.jpg' WHERE id IN ('daily-wellness', 'health-wellness')`);
    console.log('✅ Categories successfully updated in PostgreSQL database');
    process.exit(0);
  } catch (err) {
    console.error('Error updating categories:', err);
    process.exit(1);
  }
}

run();
