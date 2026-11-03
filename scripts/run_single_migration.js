const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigration(migrationFileName) {
  let filePath = migrationFileName;
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, '..', migrationFileName);
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, '../migrations', migrationFileName);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${migrationFileName}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n🚀 Executing migration: ${path.basename(filePath)}`);

  const client = await pool.connect();
  try {
    const res = await client.query(sql);
    console.log(`✅ Migration ${path.basename(filePath)} completed successfully.`);
    if (Array.isArray(res)) {
      res.forEach((r, idx) => {
        if (r.command) {
          console.log(`   [Step ${idx + 1}] ${r.command}: ${r.rowCount !== null ? r.rowCount + ' row(s) affected' : 'OK'}`);
        }
      });
    } else if (res && res.command) {
      console.log(`   ${res.command}: ${res.rowCount !== null ? res.rowCount + ' row(s) affected' : 'OK'}`);
    }
  } catch (err) {
    console.error(`❌ Migration ${path.basename(filePath)} FAILED:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node run_single_migration.js <migration_file_name>');
    process.exit(1);
  }
  runMigration(file)
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}

module.exports = { runMigration };
