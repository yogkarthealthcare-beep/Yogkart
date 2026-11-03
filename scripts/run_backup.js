const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const sqlBackupPath = path.join(backupDir, `yogkart_backup_${timestamp}.sql`);
  const jsonBackupPath = path.join(backupDir, `yogkart_backup_${timestamp}.json`);

  const client = await pool.connect();
  try {
    console.log('🔄 Starting YogKart database backup...');

    // 1. Fetch all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables in public schema.`);

    const sqlStream = fs.createWriteStream(sqlBackupPath, { flags: 'w', encoding: 'utf8' });
    sqlStream.write(`-- YogKart Database Backup Dump\n-- Generated at: ${new Date().toISOString()}\n\nBEGIN;\n\n`);

    const fullDump = {};

    for (const table of tables) {
      // Get table columns
      const colsRes = await client.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      // Get rows
      const rowsRes = await client.query(`SELECT * FROM public."${table}";`);
      fullDump[table] = {
        columns: colsRes.rows,
        rowCount: rowsRes.rows.length,
        rows: rowsRes.rows
      };

      console.log(`- Backing up ${table} (${rowsRes.rows.length} rows)`);

      sqlStream.write(`-- Table: public."${table}" (${rowsRes.rows.length} rows)\n`);
      for (const row of rowsRes.rows) {
        const cols = Object.keys(row);
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const values = cols.map(c => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number' || typeof val === 'boolean') return val;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          if (val instanceof Date) return `'${val.toISOString()}'::timestamptz`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');

        sqlStream.write(`INSERT INTO public."${table}" (${colNames}) VALUES (${values});\n`);
      }
      sqlStream.write('\n');
    }

    sqlStream.write('COMMIT;\n');
    sqlStream.end();

    fs.writeFileSync(jsonBackupPath, JSON.stringify(fullDump, null, 2), 'utf8');

    console.log(`\n✅ Backup successfully generated:`);
    console.log(`- SQL dump:  ${sqlBackupPath}`);
    console.log(`- JSON dump: ${jsonBackupPath}`);

    return sqlBackupPath;
  } catch (err) {
    console.error('❌ Backup failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

backupDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});

