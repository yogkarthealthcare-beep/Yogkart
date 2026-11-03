const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const CLAIM_RULES = [
  { pattern: /\btreats dandruff\b/gi, replacement: 'supports a clean, comfortable scalp' },
  { pattern: /\bfights dandruff\b/gi, replacement: 'helps maintain a clean scalp' },
  { pattern: /\bget rid of dandruff\b/gi, replacement: 'gentle scalp care' },
  { pattern: /\breduces hair fall\b/gi, replacement: 'gentle on hair' },
  { pattern: /\bhair fall control\b/gi, replacement: 'gentle hair care' },
  { pattern: /\bhair growth\b/gi, replacement: 'healthy hair routine' },
  { pattern: /\bregrowth\b/gi, replacement: 'everyday hair nourishment' },
  { pattern: /\bpromotes hair growth\b/gi, replacement: 'nourishes hair naturally' },
  { pattern: /\bpromotes growth\b/gi, replacement: 'gentle everyday care' },
  { pattern: /\bacne and pimples treatment\b/gi, replacement: 'Skincare routine for acne-prone skin' },
  { pattern: /\bacne treatment\b/gi, replacement: 'care for blemish-prone skin' },
  { pattern: /\bpimples treatment\b/gi, replacement: 'care for acne-prone skin' },
  { pattern: /\bhow to get rid of dandruff\b/gi, replacement: 'Understanding dandruff and gentle scalp care' },
  { pattern: /\bguaranteed results\b/gi, replacement: 'trusted natural formula' },
  { pattern: /\bguaranteed\b/gi, replacement: 'dependable' },
  { pattern: /\bclinically proven\b/gi, replacement: 'carefully crafted' },
  { pattern: /\bclinically\b/gi, replacement: 'thoughtfully' },
  { pattern: /\bdermatologist tested\b/gi, replacement: 'gentle on skin' },
  { pattern: /\blab tested\b/gi, replacement: 'quality checked' },
  { pattern: /\b100% organic certified natural\b/gi, replacement: 'Natural and Pure' },
  { pattern: /\bgmp certified\b/gi, replacement: 'crafted with high standards' },
  { pattern: /\bcertified organic\b/gi, replacement: 'pure and natural' },
  { pattern: /\bboost immunity\b/gi, replacement: 'daily wellness routine' },
  { pattern: /\bboosts immunity\b/gi, replacement: 'supports daily wellness' },
  { pattern: /\bdetox\b/gi, replacement: 'refresh' },
  { pattern: /\bcures?\b/gi, replacement: 'supports' },
  { pattern: /\bheals?\b/gi, replacement: 'nourishes' },
  { pattern: /\btreatments?\b/gi, replacement: 'routines' },
  { pattern: /\btreats?\b/gi, replacement: 'soothes' }
];

function sanitizeCsv(text) {
  if (!text) return '""';
  const str = String(text).replace(/"/g, '""');
  return `"${str}"`;
}

async function scanAndGenerate() {
  const client = await pool.connect();
  const reports = [];
  const backupInserts = [];
  const updates = [];

  try {
    console.log('🔍 Scanning database for claim words...');

    // 1. Scan products
    const prodRes = await client.query(`
      SELECT id, name, description, short_description, key_benefits, product_highlights,
             seo_title, meta_description, seo_description, precautions
      FROM products
      ORDER BY id;
    `);

    for (const p of prodRes.rows) {
      const textFields = [
        'description', 'short_description', 'seo_title', 'meta_description', 'seo_description', 'precautions'
      ];

      for (const field of textFields) {
        let val = p[field];
        if (!val || typeof val !== 'string') continue;
        let matched = false;
        let newVal = val;

        for (const rule of CLAIM_RULES) {
          if (rule.pattern.test(val)) {
            matched = true;
            newVal = newVal.replace(rule.pattern, rule.replacement);
            const m = val.match(rule.pattern);
            reports.push({
              table: 'products',
              id: p.id,
              column: field,
              matched: m ? m.join(', ') : '',
              rewrite: newVal.slice(0, 100) + '...'
            });
          }
        }

        if (matched && newVal !== val) {
          backupInserts.push({
            table: 'products',
            id: String(p.id),
            column: field,
            old: val,
            new: newVal
          });
          updates.push({
            query: `UPDATE products SET "${field}" = $1 WHERE id = $2;`,
            params: [newVal, p.id]
          });
        }
      }

      // Array fields: key_benefits, product_highlights
      for (const arrField of ['key_benefits', 'product_highlights']) {
        const arr = p[arrField];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        let arrModified = false;
        const newArr = arr.map(item => {
          let newItem = item;
          for (const rule of CLAIM_RULES) {
            if (rule.pattern.test(item)) {
              arrModified = true;
              newItem = newItem.replace(rule.pattern, rule.replacement);
              const m = item.match(rule.pattern);
              reports.push({
                table: 'products',
                id: p.id,
                column: arrField,
                matched: m ? m.join(', ') : '',
                rewrite: newItem
              });
            }
          }
          return newItem;
        });

        if (arrModified) {
          backupInserts.push({
            table: 'products',
            id: String(p.id),
            column: arrField,
            old: JSON.stringify(arr),
            new: JSON.stringify(newArr)
          });
          updates.push({
            query: `UPDATE products SET "${arrField}" = $1 WHERE id = $2;`,
            params: [newArr, p.id]
          });
        }
      }
    }

    // 2. Scan blogs
    const blogRes = await client.query(`
      SELECT id, title, short_description, content, slug
      FROM blogs
      ORDER BY id;
    `);

    for (const b of blogRes.rows) {
      for (const field of ['title', 'short_description']) {
        const val = b[field];
        if (!val) continue;
        let newVal = val;
        let matched = false;

        for (const rule of CLAIM_RULES) {
          if (rule.pattern.test(val)) {
            matched = true;
            newVal = newVal.replace(rule.pattern, rule.replacement);
            const m = val.match(rule.pattern);
            reports.push({
              table: 'blogs',
              id: b.id,
              column: field,
              matched: m ? m.join(', ') : '',
              rewrite: newVal
            });
          }
        }

        if (matched && newVal !== val) {
          backupInserts.push({
            table: 'blogs',
            id: String(b.id),
            column: field,
            old: val,
            new: newVal
          });
          updates.push({
            query: `UPDATE blogs SET "${field}" = $1 WHERE id = $2;`,
            params: [newVal, b.id]
          });
        }
      }
    }

    // 3. Scan banners
    const bannerRes = await client.query(`
      SELECT id, title, subtitle, cta_link
      FROM banners
      ORDER BY id;
    `);
    for (const ban of bannerRes.rows) {
      for (const field of ['title', 'subtitle']) {
        const val = ban[field];
        if (!val) continue;
        let newVal = val;
        let matched = false;
        for (const rule of CLAIM_RULES) {
          if (rule.pattern.test(val)) {
            matched = true;
            newVal = newVal.replace(rule.pattern, rule.replacement);
            const m = val.match(rule.pattern);
            reports.push({
              table: 'banners',
              id: ban.id,
              column: field,
              matched: m ? m.join(', ') : '',
              rewrite: newVal
            });
          }
        }
        if (matched && newVal !== val) {
          backupInserts.push({
            table: 'banners',
            id: String(ban.id),
            column: field,
            old: val,
            new: newVal
          });
          updates.push({
            query: `UPDATE banners SET "${field}" = $1 WHERE id = $2;`,
            params: [newVal, ban.id]
          });
        }
      }
    }

    // 4. Scan instagram reels
    const reelRes = await client.query(`
      SELECT id, title
      FROM instagram_reels
      ORDER BY id;
    `);
    for (const r of reelRes.rows) {
      for (const field of ['title']) {
        const val = r[field];
        if (!val) continue;
        let newVal = val;
        let matched = false;
        for (const rule of CLAIM_RULES) {
          if (rule.pattern.test(val)) {
            matched = true;
            newVal = newVal.replace(rule.pattern, rule.replacement);
            const m = val.match(rule.pattern);
            reports.push({
              table: 'instagram_reels',
              id: r.id,
              column: field,
              matched: m ? m.join(', ') : '',
              rewrite: newVal
            });
          }
        }
        if (matched && newVal !== val) {
          backupInserts.push({
            table: 'instagram_reels',
            id: String(r.id),
            column: field,
            old: val,
            new: newVal
          });
          updates.push({
            query: `UPDATE instagram_reels SET "${field}" = $1 WHERE id = $2;`,
            params: [newVal, r.id]
          });
        }
      }
    }

    // Write claims_report.csv
    const csvLines = ['table,id,column,matched_text,proposed_rewrite'];
    for (const rep of reports) {
      csvLines.push([
        rep.table,
        rep.id,
        rep.column,
        sanitizeCsv(rep.matched),
        sanitizeCsv(rep.rewrite)
      ].join(','));
    }
    const csvPath = path.resolve(__dirname, '../../claims_report.csv');
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
    console.log(`✅ Saved claims report: ${csvPath} (${reports.length} findings)`);

    // Write migration file: 2026-11-03_03_create_claims_backup_and_cleanup.sql
    const migrationPath = path.resolve(__dirname, '../migrations/2026-11-03_03_create_claims_backup_and_cleanup.sql');
    let sqlContent = `-- Migration: 2026-11-03_03_create_claims_backup_and_cleanup.sql
-- Description:
-- Create claims_backup audit table and apply safe rewrites for medical/wellness claims (Task 1.11)

BEGIN;

-- 1. Create claims_backup table
CREATE TABLE IF NOT EXISTS public.claims_backup (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

`;

    for (const b of backupInserts) {
      const escOld = (b.old || '').replace(/'/g, "''");
      const escNew = (b.new || '').replace(/'/g, "''");
      sqlContent += `INSERT INTO public.claims_backup (table_name, row_id, column_name, old_value, new_value)
VALUES ('${b.table}', '${b.id}', '${b.column}', '${escOld}', '${escNew}');\n`;
    }

    sqlContent += '\n-- Apply updates\n';
    for (const u of updates) {
      let q = u.query;
      u.params.forEach((p, idx) => {
        let valStr = 'NULL';
        if (p !== null && p !== undefined) {
          if (Array.isArray(p)) {
            valStr = `ARRAY[${p.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',')}]::text[]`;
          } else {
            valStr = `'${String(p).replace(/'/g, "''")}'`;
          }
        }
        q = q.replace(`$${idx + 1}`, valStr);
      });
      sqlContent += `${q}\n`;
    }

    sqlContent += '\nCOMMIT;\n';
    fs.writeFileSync(migrationPath, sqlContent, 'utf8');
    console.log(`✅ Saved migration: ${migrationPath} with ${updates.length} updates`);

  } finally {
    client.release();
    await pool.end();
  }
}

scanAndGenerate().catch(console.error);
