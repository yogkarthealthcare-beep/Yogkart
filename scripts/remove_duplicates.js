const { query } = require('../src/config/database');

async function removeAllDuplicates() {
  console.log('🔄 Starting full duplicate cleanup across all email tables...');

  try {
    // 1. Marketing Emails
    try {
      const mRes = await query(`
        WITH duplicates AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(email))
                   ORDER BY 
                     CASE WHEN status = 'Sent' THEN 1 WHEN status = 'Sending' THEN 2 ELSE 3 END ASC,
                     created_at DESC,
                     id DESC
                 ) as rnum
          FROM marketing_emails
          WHERE email IS NOT NULL AND email != ''
        )
        DELETE FROM marketing_emails
        WHERE id IN (
          SELECT id FROM duplicates WHERE rnum > 1
        )
        RETURNING id;
      `);
      console.log(`✅ marketing_emails: Removed ${mRes.rowCount || 0} duplicate records.`);
    } catch (e) {
      console.log('marketing_emails cleanup note:', e.message);
    }

    // 2. Customer Contacts
    try {
      const cRes = await query(`
        WITH duplicates AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(email))
                   ORDER BY created_at DESC, id DESC
                 ) as rnum
          FROM customer_contacts
          WHERE email IS NOT NULL AND email != ''
        )
        DELETE FROM customer_contacts
        WHERE id IN (
          SELECT id FROM duplicates WHERE rnum > 1
        )
        RETURNING id;
      `);
      console.log(`✅ customer_contacts: Removed ${cRes.rowCount || 0} duplicate records.`);
    } catch (e) {
      console.log('customer_contacts cleanup note:', e.message);
    }

    // 3. Newsletter Subscribers
    try {
      const nRes = await query(`
        WITH duplicates AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(email))
                   ORDER BY 
                     CASE WHEN status = 'subscribed' THEN 1 ELSE 2 END ASC,
                     created_at DESC,
                     id DESC
                 ) as rnum
          FROM newsletter_subscribers
          WHERE email IS NOT NULL AND email != ''
        )
        DELETE FROM newsletter_subscribers
        WHERE id IN (
          SELECT id FROM duplicates WHERE rnum > 1
        )
        RETURNING id;
      `);
      console.log(`✅ newsletter_subscribers: Removed ${nRes.rowCount || 0} duplicate records.`);
    } catch (e) {
      console.log('newsletter_subscribers cleanup note:', e.message);
    }

    console.log('🎉 Duplicate cleanup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing duplicate cleanup:', err);
    process.exit(1);
  }
}

removeAllDuplicates();
