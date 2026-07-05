const { pool } = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting categories & menu migration...');

    // 1. DDL updates
    await client.query('BEGIN');
    
    console.log('Adding schema columns to categories table...');
    await client.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS badge VARCHAR(50);
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image VARCHAR(255);
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT TRUE;
    `);

    // 2. Insert new category entries
    console.log('Inserting new categories & subcategories...');

    const items = [
      // Top Level Categories
      { id: 'categories', name: 'Categories', sort_order: 1, parent_id: null },
      { id: 'health-wellness', name: 'Health & Wellness', sort_order: 2, parent_id: null },
      { id: 'massage-recovery', name: 'Massage & Recovery', sort_order: 3, parent_id: null },
      { id: 'daily-wellness', name: 'Daily Wellness', sort_order: 4, parent_id: null },
      { id: 'eco-collection', name: 'Eco Collection', sort_order: 5, parent_id: null },

      // Subcategories: Categories
      { id: 'eye-care', name: 'Eye Care', sort_order: 1, parent_id: 'categories', icon: 'visibility' },
      { id: 'hair-care', name: 'Hair Care', sort_order: 2, parent_id: 'categories', icon: 'face' },
      { id: 'skin-care', name: 'Skin Care', sort_order: 3, parent_id: 'categories', icon: 'spa' },
      { id: 'oral-teeth-care', name: 'Oral & Teeth Care', sort_order: 4, parent_id: 'categories', icon: 'teeth' },
      { id: 'body-care', name: 'Body Care', sort_order: 5, parent_id: 'categories', icon: 'accessibility_new' },
      { id: 'personal-hygiene', name: 'Personal Hygiene', sort_order: 6, parent_id: 'categories', icon: 'clean_hands' },
      { id: 'womens-care', name: 'Women\'s Care', sort_order: 7, parent_id: 'categories', icon: 'female', badge: 'New' },
      { id: 'mens-grooming', name: 'Men\'s Grooming', sort_order: 8, parent_id: 'categories', icon: 'male' },
      { id: 'baby-care', name: 'Baby Care', sort_order: 9, parent_id: 'categories', icon: 'baby_changing_station' },
      { id: 'senior-care', name: 'Senior Care', sort_order: 10, parent_id: 'categories', icon: 'elderly' },
      { id: 'herbal-natural', name: 'Herbal & Natural Products', sort_order: 11, parent_id: 'categories', icon: 'nature_people' },
      { id: 'wooden-eco', name: 'Wooden & Eco-Friendly Products', sort_order: 12, parent_id: 'categories', icon: 'forest' },

      // Subcategories: Health & Wellness
      { id: 'yoga-mats', name: 'Yoga Mats', sort_order: 1, parent_id: 'health-wellness' },
      { id: 'yoga-accessories', name: 'Yoga Accessories', sort_order: 2, parent_id: 'health-wellness' },
      { id: 'resistance-bands', name: 'Resistance Bands', sort_order: 3, parent_id: 'health-wellness' },
      { id: 'stretching-equipment', name: 'Stretching Equipment', sort_order: 4, parent_id: 'health-wellness' },
      { id: 'posture-correctors', name: 'Posture Correctors', sort_order: 5, parent_id: 'health-wellness' },
      { id: 'back-support-belts', name: 'Back Support Belts', sort_order: 6, parent_id: 'health-wellness' },
      { id: 'cervical-pillows', name: 'Cervical Pillows', sort_order: 7, parent_id: 'health-wellness' },
      { id: 'lumbar-support', name: 'Lumbar Support', sort_order: 8, parent_id: 'health-wellness' },
      { id: 'knee-supports', name: 'Knee Supports', sort_order: 9, parent_id: 'health-wellness' },
      { id: 'elbow-supports', name: 'Elbow Supports', sort_order: 10, parent_id: 'health-wellness' },
      { id: 'wrist-supports', name: 'Wrist Supports', sort_order: 11, parent_id: 'health-wellness' },
      { id: 'ankle-supports', name: 'Ankle Supports', sort_order: 12, parent_id: 'health-wellness' },

      // Subcategories: Massage & Recovery
      { id: 'head-massagers', name: 'Head Massagers', sort_order: 1, parent_id: 'massage-recovery' },
      { id: 'neck-massagers', name: 'Neck Massagers', sort_order: 2, parent_id: 'massage-recovery' },
      { id: 'foot-massagers', name: 'Foot Massagers', sort_order: 3, parent_id: 'massage-recovery' },
      { id: 'body-massagers', name: 'Body Massagers', sort_order: 4, parent_id: 'massage-recovery' },
      { id: 'massage-rollers', name: 'Massage Rollers', sort_order: 5, parent_id: 'massage-recovery' },
      { id: 'massage-balls', name: 'Massage Balls', sort_order: 6, parent_id: 'massage-recovery' },
      { id: 'acupressure-products', name: 'Acupressure Products', sort_order: 7, parent_id: 'massage-recovery' },
      { id: 'relaxation-tools', name: 'Relaxation Tools', sort_order: 8, parent_id: 'massage-recovery' },

      // Subcategories: Daily Wellness
      { id: 'hot-cold-therapy', name: 'Hot & Cold Therapy', sort_order: 1, parent_id: 'daily-wellness' },
      { id: 'pain-relief-accessories', name: 'Pain Relief Accessories', sort_order: 2, parent_id: 'daily-wellness' },
      { id: 'sleep-support-products', name: 'Sleep Support Products', sort_order: 3, parent_id: 'daily-wellness' },
      { id: 'travel-wellness-accessories', name: 'Travel Wellness Accessories', sort_order: 4, parent_id: 'daily-wellness' },
      { id: 'home-healthcare-essentials', name: 'Home Healthcare Essentials', sort_order: 5, parent_id: 'daily-wellness' },

      // Subcategories: Eco Collection
      { id: 'neem-wood-products', name: 'Neem Wood Products', sort_order: 1, parent_id: 'eco-collection' },
      { id: 'wooden-combs', name: 'Wooden Combs', sort_order: 2, parent_id: 'eco-collection' },
      { id: 'wooden-massage-tools', name: 'Wooden Massage Tools', sort_order: 3, parent_id: 'eco-collection' },
      { id: 'bamboo-products', name: 'Bamboo Products', sort_order: 4, parent_id: 'eco-collection' },
      { id: 'sustainable-personal-care', name: 'Sustainable Personal Care', sort_order: 5, parent_id: 'eco-collection' }
    ];

    for (const item of items) {
      await client.query(`
        INSERT INTO categories (id, name, sort_order, parent_id, icon, badge, is_active, show_in_menu)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          sort_order = EXCLUDED.sort_order,
          parent_id = EXCLUDED.parent_id,
          icon = COALESCE(EXCLUDED.icon, categories.icon),
          badge = COALESCE(EXCLUDED.badge, categories.badge)
      `, [item.id, item.name, item.sort_order, item.parent_id, item.icon || null, item.badge || null]);
    }

    // 3. Deactivate all food / supplements / vitamins / beverages products
    console.log('Deactivating food, medicine, and edible products...');
    await client.query(`
      UPDATE products
      SET is_active = FALSE
      WHERE LOWER(subcategory) IN ('nutrition', 'supplements', 'beverages', 'medicines', 'pharmacy', 'vitamins', 'protein', 'detox', 'immunity', 'bone health')
         OR EXISTS (
           SELECT 1 FROM unnest(tags) t
           WHERE LOWER(t) IN ('nutrition', 'supplements', 'beverages', 'medicines', 'pharmacy', 'vitamins', 'protein', 'edible', 'detox', 'immunity')
         );
    `);

    // 4. Map existing active products to new subcategory IDs
    console.log('Mapping existing active products to new category IDs...');
    const mapping = {
      'baby': 'baby-care',
      'eye': 'eye-care',
      'hair': 'hair-care',
      'skin': 'skin-care',
      'men': 'mens-grooming',
      'women': 'womens-care',
      'personal': 'personal-hygiene',
      'herbal': 'herbal-natural',
      'fitness': 'yoga-accessories',
      'wellness': 'home-healthcare-essentials',
      'health': 'home-healthcare-essentials'
    };

    for (const [oldId, newId] of Object.entries(mapping)) {
      await client.query(`
        UPDATE products 
        SET category_id = $1 
        WHERE category_id = $2 AND is_active = TRUE
      `, [newId, oldId]);
      
      // For any inactive products from old categories, make sure their constraint isn't violated
      await client.query(`
        UPDATE products 
        SET category_id = $1 
        WHERE category_id = $2
      `, [newId, oldId]);
    }

    // 5. Clean up old category IDs
    console.log('Removing old categories...');
    await client.query(`
      DELETE FROM categories 
      WHERE id IN ('baby', 'eye', 'hair', 'skin', 'men', 'women', 'personal', 'herbal', 'fitness', 'wellness', 'health')
    `);

    await client.query('COMMIT');
    console.log('Categories & menu migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
