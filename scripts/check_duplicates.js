const { query } = require('../src/config/database');

async function checkDuplicates() {
  try {
    console.log('--- Checking for duplicate emails ---');

    try {
      const mDups = await query(`
        SELECT LOWER(TRIM(email)) as email, COUNT(*) as cnt 
        FROM marketing_emails 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY LOWER(TRIM(email)) 
        HAVING COUNT(*) > 1
      `);
      console.log('marketing_emails duplicates count:', mDups.rows.length, mDups.rows);
    } catch (e) {
      console.log('marketing_emails query note:', e.message);
    }

    try {
      const cDups = await query(`
        SELECT LOWER(TRIM(email)) as email, COUNT(*) as cnt 
        FROM customer_contacts 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY LOWER(TRIM(email)) 
        HAVING COUNT(*) > 1
      `);
      console.log('customer_contacts duplicates count:', cDups.rows.length, cDups.rows.slice(0, 10));
    } catch (e) {
      console.log('customer_contacts query note:', e.message);
    }

    try {
      const nDups = await query(`
        SELECT LOWER(TRIM(email)) as email, COUNT(*) as cnt 
        FROM newsletter_subscribers 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY LOWER(TRIM(email)) 
        HAVING COUNT(*) > 1
      `);
      console.log('newsletter_subscribers duplicates count:', nDups.rows.length, nDups.rows.slice(0, 10));
    } catch (e) {
      console.log('newsletter_subscribers query note:', e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

checkDuplicates();
