const { pool } = require('../src/config/database');

const updateQuery = `
UPDATE public.products AS p
SET
    name = v.new_name,
    updated_at = NOW()
FROM (
    VALUES
        (1, 'YogKart Natural Neem Wood Comb | Neem Wooden Hair Comb for Men & Women | Handmade Wooden Comb for Hair Detangling, Styling & Scalp Care'),
        (2, 'YogKart Pure Aloe Vera Gel for Skin & Hair | Natural Aloe Vera Gel | Hydrating Face, Body & Hair Care Gel'),
        (3, 'YogKart Pure Tulsi Drops | Natural Tulsi Herbal Drops | Tulsi Extract for Daily Wellness & Ayurvedic Care'),
        (4, 'YogKart Organic Amla Powder | Pure Indian Gooseberry Powder | Amla Powder for Hair Care, Skin Care & Wellness'),
        (5, 'YogKart Ashwagandha Capsules | Herbal Ashwagandha Supplement | Ashwagandha Capsules for Daily Wellness, Strength & Stamina'),
        (6, 'YogKart Natural Neem Face Wash | Herbal Neem Face Cleanser | Daily Face Wash for Oily & Acne Prone Skin'),
        (7, 'YogKart Herbal Hair Shampoo | Natural Herbal Shampoo for Men & Women | Daily Hair Cleansing Shampoo for Hair Care'),
        (8, 'YogKart Pure Multani Mitti Powder | Natural Fuller Earth Face Pack | Multani Mitti for Face, Skin Cleansing & Oil Control'),
        (9, 'YogKart Pure Natural Rose Water | Rose Water Face Toner | Natural Facial Mist for Skin Hydration, Freshness & Daily Skin Care'),
        (10, 'YogKart Natural Herbal Tooth Powder | Ayurvedic Herbal Tooth Powder | Natural Oral Care Powder for Daily Teeth & Gum Care'),
        (11, 'YogKart Organic Brahmi Powder | Pure Brahmi Herbal Powder | Brahmi Powder for Hair Care, Scalp Care & Daily Wellness'),
        (12, 'YogKart Pure Shikakai Powder | Natural Shikakai Herbal Powder | Ayurvedic Hair Care Powder for Cleansing & Hair Conditioning'),
        (13, 'YogKart Natural Herbal Hair Oil | Ayurvedic Hair Oil for Men & Women | Herbal Hair Oil for Scalp Massage, Nourishment & Daily Hair Care'),
        (14, 'YogKart Daily Multivitamin Tablets for Men & Women | Multivitamin & Multimineral Supplement | Daily Nutrition Support Tablets'),
        (15, 'YogKart Natural Vitamin C Tablets | Vitamin C Supplement for Daily Nutrition | Antioxidant Vitamin C Tablets'),
        (16, 'YogKart Natural Calcium Tablets | Calcium Supplement for Daily Nutrition | Calcium Tablets for Bone & Muscle Support'),
        (17, 'YogKart Natural Iron Capsules | Iron Supplement Capsules | Daily Iron Nutrition Support for Men & Women'),
        (22, 'YogKart Heavy Duty Resistance Bands | Exercise Resistance Bands for Home Workout | Fitness Bands for Strength Training, Yoga & Exercise'),
        (23, 'YogKart Adjustable Dumbbell Set | Adjustable Weights for Home Gym | Dumbbell Set for Strength Training, Fitness & Exercise'),
        (25, 'YogKart High Density Foam Roller | Muscle Massage & Recovery Roller | Foam Roller for Exercise, Yoga, Fitness & Home Workout'),
        (27, 'YogKart Padded Gym Gloves | Weightlifting & Workout Gloves | Fitness Gloves for Gym Training, Exercise & Strength Workouts'),
        (30, 'YogKart Cast Iron Kettlebell 8kg | Kettlebell Weight for Strength Training | Home Gym Exercise Equipment for Fitness & Workout'),
        (31, 'YogKart Doorway Pull Up Bar | Adjustable Home Gym Pull Up Bar | Exercise Bar for Upper Body Strength Training & Workout'),
        (36, 'YogKart Omega 3 Fish Oil Capsules | Omega 3 Supplement with Fish Oil | EPA DHA Capsules for Daily Nutrition & Wellness'),
        (40, 'YogKart Men Dry Fit Sports T-Shirt | Quick Dry Gym T-Shirt for Men | Sports T-Shirt for Running, Workout, Fitness & Exercise'),
        (42, 'YogKart Natural Vitamin C Face Serum | Vitamin C Facial Serum for Skin Care | Lightweight Serum for Daily Face Care & Hydration'),
        (43, 'YogKart Hyaluronic Acid Serum | Hydrating Face Serum | Hyaluronic Acid Facial Serum for Skin Hydration & Daily Skin Care'),
        (44, 'YogKart Sunscreen SPF 50 PA+++ | Broad Spectrum Sunscreen Gel | Lightweight Face Sunscreen for Daily Sun Protection & Skin Care'),
        (46, 'YogKart Anti Aging Night Cream | Night Face Cream for Skin Care | Moisturizing Night Cream for Daily Skin Hydration & Care'),
        (47, 'YogKart Natural Walnut Face Scrub | Herbal Exfoliating Face Scrub | Walnut Scrub for Facial Cleansing, Exfoliation & Skin Care'),
        (48, 'YogKart Natural Onion Hair Oil | Herbal Onion Hair Oil for Men & Women | Onion Hair Oil for Scalp Massage, Nourishment & Hair Care'),
        (49, 'YogKart Smooth Keratin Shampoo | Keratin Hair Shampoo for Men & Women | Shampoo for Frizz Control, Smooth Hair & Daily Hair Care'),
        (51, 'YogKart Natural Hair Growth Serum | Hair Serum for Scalp & Hair Care | Herbal Hair Serum for Daily Scalp Care & Hair Nourishment'),
        (52, 'YogKart Anti Dandruff Shampoo with Tea Tree Oil | Herbal Hair Shampoo | Tea Tree Shampoo for Scalp Cleansing & Hair Care'),
        (53, 'YogKart Natural Baby Massage Oil | Baby Body Massage Oil | Gentle Herbal Oil for Baby Skin Care & Daily Massage'),
        (54, 'YogKart Gentle Tear Free Baby Shampoo | Mild Baby Hair Shampoo | Gentle Shampoo for Baby Hair & Scalp Care'),
        (57, 'YogKart Natural Talc Free Baby Powder | Baby Skin Care Powder | Gentle Powder for Daily Baby Skin Care & Freshness'),
        (58, 'YogKart Herbal Ayurvedic Eye Drops | Ayurvedic Eye Care Drops | Herbal Eye Drops for Daily Eye Care & Comfort'),
        (59, 'YogKart Under Eye Cream | Eye Cream for Dark Circles & Puffiness | Moisturizing Under Eye Skin Care Cream'),
        (60, 'YogKart Blue Light Blocking Glasses | Computer & Screen Protection Glasses | Blue Light Filter Eyewear for Work, Study & Gaming'),
        (69, 'YogKart Natural Stretch Mark Cream | Skin Care Cream for Stretch Marks | Moisturizing Body Cream for Daily Skin Care'),
        (73, 'YogKart Eco Friendly Bamboo Toothbrush Set | Natural Bamboo Toothbrushes | Sustainable Toothbrush Set for Men & Women'),
        (74, 'YogKart Natural Ayurvedic Herbal Toothpaste | Herbal Toothpaste for Gum & Oral Care | Natural Toothpaste for Daily Brushing'),
        (75, 'YogKart Hydrating Body Wash | Daily Body Cleanser for Men & Women | Moisturizing Shower Gel for Soft, Clean & Fresh Skin'),
        (76, 'YogKart Natural Underarm Deodorant Roll On | Deodorant for Men & Women | Underarm Roll On for Daily Freshness & Odour Protection'),
        (77, 'Pure Tulsi Jap Mala YogKart | 108+1 Beads | Natural Tulsi Wood Meditation & Prayer Necklace with Red Tassel | Set of 2 Jap Mala'),
        (78, 'Digital Finger Counter | Counter for Chanting Mantra | Tally Counter for Jaap | Naam Jaap Counter | Mantra Jap Counter Machine'),
        (79, 'Tulsi Jap Mala for Meditation and Japa | 108 Beads Sacred Hindu Prayer Rosary with Red Tassel | Spiritual Necklace for Puja, Chanting, Yoga & Mindfulness | Set of 2 Jap Mala'),
        (80, 'Karungali Rudraksha Mala 54+1 Beads 8mm with Karungali Bracelet Combo | Lab Tested Ebony Wood & Rudraksha | Silver Capped Mala for Meditation Pooja Men Women'),
        (82, 'YogKart Natural Neem Wood Shampoo Comb | Neem Wooden Hair Comb for Shampooing & Hair Care | Wooden Comb for Men & Women'),
        (83, 'YogKart Natural Neem Wood Tail Comb | Wooden Tail Comb for Hair Sectioning & Styling | Neem Wood Rat Tail Comb for Men & Women'),
        (84, 'YogKart Natural Neem Wood Handle Comb | Wooden Hair Comb for Detangling & Styling | Neem Wood Comb for Men & Women'),
        (85, 'YogKart Natural Neem Wood Lily Comb | Wooden Hair Comb for Men & Women | Neem Wood Lily Comb for Hair Styling & Daily Hair Care'),
        (86, 'YogKart Wide Tooth Neem Wood Comb | Natural Wooden Hair Comb | Wide Tooth Comb for Curly, Thick & Wavy Hair | Detangling Comb for Men & Women'),
        (87, 'YogKart Ayurvedic Eye Wash Cup | Eye Bath Cup for Eye Cleaning | Reusable Eye Wash Cup for Daily Eye Care & Refreshing Eye Bath'),
        (88, 'YogKart Eco Friendly Natural Bamboo Water Bottle | Reusable Bamboo Bottle | Natural Drinking Water Bottle for Home, Office & Travel'),
        (89, 'YogKart Natural Soft Bamboo Toothbrush | Eco Friendly Bamboo Toothbrush | Soft Bristle Toothbrush for Men & Women | Sustainable Oral Care'),
        (90, 'YogKart Flower Printed Pure Copper Bottle | Copper Water Bottle with Printed Design | Traditional Copper Drinking Bottle for Home, Office & Travel'),
        (91, 'YogKart Pure Copper Water Bottle | Traditional Copper Drinking Bottle | Reusable Copper Bottle for Home, Office, Yoga & Travel'),
        (92, 'YogKart Neem Wood Comb 3 Piece Hair Care Set | Neem Wooden Comb Set for Men & Women | Natural Wooden Hair Combs for Styling & Detangling'),
        (93, 'YogKart Neem Hair Care Set | Neem Wood Handle Comb, Shampoo & Lily Comb Combo | Natural Hair Care Kit for Men & Women'),
        (94, 'YogKart Neem Hair Care Kit | Neem Wood Handle Comb & Herbal Shampoo Combo | Natural Hair Care Set for Men & Women'),
        (95, 'YogKart Handmade Natural Kesar Haldi Soap Bar | Herbal Turmeric Saffron Bath Soap | Handmade Soap for Daily Skin Care & Cleansing'),
        (96, 'YogKart Handmade Natural Lavender Soap Bar | Herbal Lavender Bath Soap | Handmade Soap for Daily Skin Cleansing, Freshness & Skin Care'),
        (97, 'YogKart Handmade Natural Red Wine Soap Bar | Herbal Handmade Bath Soap | Natural Soap Bar for Daily Skin Cleansing & Care'),
        (98, 'YogKart Handmade Natural Multani Mitti Soap Bar | Herbal Fuller Earth Bath Soap | Natural Handmade Soap for Daily Skin Cleansing & Care'),
        (99, 'YogKart Handmade Natural Goat Milk Soap Bar | Natural Goat Milk Bath Soap | Handmade Soap for Gentle Daily Skin Cleansing & Skin Care')
) AS v(id, new_name)
WHERE p.id = v.id
RETURNING p.id, p.name;
`;

async function run() {
  try {
    console.log('🔄 Updating product names in database...');
    const res = await pool.query(updateQuery);
    console.log(`✅ Successfully updated ${res.rowCount} products:`);
    res.rows.forEach(r => {
      console.log(` - ID ${r.id}: ${r.name}`);
    });
  } catch (err) {
    console.error('❌ Update failed:', err);
  } finally {
    await pool.end();
  }
}

run();
