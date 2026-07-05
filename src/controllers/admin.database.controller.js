const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const ensureBackupHistoryTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS database_backup_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      status VARCHAR(20) NOT NULL,
      file_name TEXT,
      file_size_bytes BIGINT DEFAULT 0,
      message TEXT,
      created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_database_backup_history_created
    ON database_backup_history (created_at DESC)
  `);
};

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const sqlValue = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const getStats = async (_req, res) => {
  try {
    await ensureBackupHistoryTable();
    const [sizeRes, tablesRes, recordsRes, backupRes] = await Promise.all([
      query(`SELECT pg_database_size(current_database()) AS bytes, pg_size_pretty(pg_database_size(current_database())) AS pretty`),
      query(`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`),
      query(`
        SELECT COALESCE(SUM(n_live_tup), 0)::bigint AS estimated_records
        FROM pg_stat_user_tables
      `),
      query(`SELECT * FROM database_backup_history ORDER BY created_at DESC LIMIT 10`),
    ]);

    return success(res, {
      database: {
        size_bytes: Number(sizeRes.rows[0].bytes || 0),
        size_pretty: sizeRes.rows[0].pretty,
        table_count: tablesRes.rows[0].count,
        estimated_record_count: Number(recordsRes.rows[0].estimated_records || 0),
        storage_usage: sizeRes.rows[0].pretty,
      },
      last_backup: backupRes.rows[0] || null,
      history: backupRes.rows,
    }, 'Database stats fetched');
  } catch (err) {
    console.error('get database stats error:', err);
    return error(res, 'Failed to fetch database stats');
  }
};

const createBackup = async (req, res) => {
  await ensureBackupHistoryTable();
  let historyId;
  try {
    const started = await query(
      `INSERT INTO database_backup_history (status, message, created_by)
       VALUES ('running', 'Backup started', $1)
       RETURNING id`,
      [req.admin?.id || null]
    );
    historyId = started.rows[0].id;

    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'database_backup_history'
      ORDER BY table_name
    `);

    const chunks = [
      '-- YogKart logical SQL backup',
      `-- Generated at ${new Date().toISOString()}`,
      'SET session_replication_role = replica;',
      '',
    ];

    for (const { table_name: table } of tables.rows) {
      const rows = await query(`SELECT * FROM ${quoteIdent(table)}`);
      if (!rows.rows.length) continue;
      const columns = Object.keys(rows.rows[0]);
      const colSql = columns.map(quoteIdent).join(', ');
      chunks.push(`-- Table: ${table}`);
      for (const row of rows.rows) {
        const values = columns.map(column => sqlValue(row[column])).join(', ');
        chunks.push(`INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
      }
      chunks.push('');
    }

    chunks.push('SET session_replication_role = DEFAULT;');
    const sql = chunks.join('\n');
    const fileName = `yogkart-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

    await query(
      `UPDATE database_backup_history
       SET status = 'success', file_name = $1, file_size_bytes = $2, message = 'Backup generated'
       WHERE id = $3`,
      [fileName, Buffer.byteLength(sql), historyId]
    );

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(sql);
  } catch (err) {
    console.error('create database backup error:', err);
    if (historyId) {
      await query(
        `UPDATE database_backup_history SET status = 'failed', message = $1 WHERE id = $2`,
        [err.message || 'Backup failed', historyId]
      ).catch(() => {});
    }
    return error(res, 'Failed to create database backup');
  }
};

module.exports = { getStats, createBackup };
