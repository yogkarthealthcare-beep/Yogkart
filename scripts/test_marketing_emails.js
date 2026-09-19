const { query } = require('../src/config/database');

async function cleanTestRecords() {
  await query("DELETE FROM marketing_emails WHERE email IN ('rahul@gmail.com', 'priya.patel@example.com')");
  console.log('✅ Demo test records cleaned.');
  process.exit(0);
}

cleanTestRecords().catch(err => {
  console.error(err);
  process.exit(1);
});
