const { pool } = require('../src/config/database');

async function listMedia() {
  const blogs = await pool.query('SELECT id, title, featured_image FROM blogs ORDER BY id;');
  const banners = await pool.query('SELECT id, title, image FROM banners ORDER BY id;');
  const reels = await pool.query('SELECT id, title, video_url, instagram_link FROM instagram_reels ORDER BY id;');

  console.log('=== BLOG IMAGES ===');
  blogs.rows.forEach(b => console.log(`Blog #${b.id}: "${b.title}" -> ${b.featured_image}`));

  console.log('\n=== BANNER IMAGES ===');
  banners.rows.forEach(b => console.log(`Banner #${b.id}: "${b.title}" -> ${b.image}`));

  console.log('\n=== REELS ===');
  reels.rows.forEach(r => console.log(`Reel #${r.id}: "${r.title}" -> video: ${r.video_url} | link: ${r.instagram_link}`));

  await pool.end();
}

listMedia().catch(console.error);

