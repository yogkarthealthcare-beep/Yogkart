const { query } = require('../src/config/database');

async function main() {
  const res = await query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'navigation_menus' ORDER BY ordinal_position");
  console.log('navigation_menus columns:');
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
