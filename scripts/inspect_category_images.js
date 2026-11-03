const { query } = require('../src/config/database');

async function main() {
  const cats = ['eye-care', 'hair-care', 'skin-care', 'oral-teeth-care', 'body-care', 'baby-care'];
  for (const cat of cats) {
    const res = await query(
      "SELECT id, name, thumbnail, images FROM products WHERE category_id = $1 AND is_active = true LIMIT 3",
      [cat]
    );
    console.log(`\n=== Category: ${cat} ===`);
    res.rows.forEach(r => console.log(` - Product: ${r.name.slice(0, 40)} | thumb: ${r.thumbnail}`));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

