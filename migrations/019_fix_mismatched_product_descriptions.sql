-- ============================================================
-- Migration 019: Fix Mismatched Product Descriptions & Data
-- ============================================================
-- Fixes products where Neem Comb description was accidentally cloned.

-- 1. Vitamin C Serum (ID 42 / slug 'yogkart-vitamin-c-serum')
UPDATE products
SET description = 'YogKart Natural Vitamin C Face Serum is a lightweight, fast-absorbing facial serum designed to enhance natural skin radiance, reduce dark spots, and even out skin tone. Infused with potent Vitamin C, Hyaluronic Acid, and botanical extracts, this non-greasy formula hydrates deeply, defends against daily oxidative stress, and helps restore youthful glow and skin elasticity. Suitable for all skin types for daily morning and evening skincare routines.',
    short_description = 'Lightweight Vitamin C face serum for dark spot reduction, deep hydration, and radiant glowing skin.',
    seo_description = 'YogKart Natural Vitamin C Face Serum is a lightweight, fast-absorbing facial serum designed to enhance natural skin radiance, reduce dark spots, and even out skin tone.',
    key_benefits = '["Enhances Skin Radiance & Natural Glow", "Fades Dark Spots & Hyperpigmentation", "Deep Hydration with Lightweight Texture", "Shields Against Environmental Free Radicals"]'::jsonb,
    how_to_use = '["Cleanse your face thoroughly with a gentle cleanser and pat dry.", "Apply 3-4 drops of Vitamin C Face Serum evenly across your face and neck.", "Gently pat and massage in upward circular motions until fully absorbed.", "Follow with a daily moisturizer and sunscreen during daytime."]'::jsonb,
    ingredients = 'Vitamin C (Sodium Ascorbyl Phosphate), Hyaluronic Acid, Aloe Vera Leaf Extract, Niacinamide (Vitamin B3), Vitamin E (Tocopherol), Vegetable Glycerin, Purified Aqua',
    product_highlights = '["30ml Pack", "Fast Absorbing & Non-Greasy", "Suitable for All Skin Types", "Free from Parabens & Sulfates"]'::jsonb
WHERE slug = 'yogkart-vitamin-c-serum' OR id = 42;

-- 2. Hyaluronic Acid Serum (ID 43 / slug 'yogkart-hyaluronic-serum')
UPDATE products
SET description = 'YogKart Hyaluronic Acid Serum provides multi-layer deep hydration to restore skin moisture, plumpness, and smooth texture. Formulated with high and low molecular weight hyaluronic acid, it quenches thirsty skin, softens fine dryness lines, and strengthens the skin natural moisture barrier for a fresh, dewy complexion all day.',
    short_description = 'Intense multi-layer hydrating hyaluronic acid serum for plump, smooth, and radiant skin.',
    seo_description = 'YogKart Hyaluronic Acid Serum provides multi-layer deep hydration to restore skin moisture, plumpness, and smooth texture.',
    key_benefits = '["Intense Multi-Depth Skin Hydration", "Plumps Skin & Softens Fine Lines", "Strengthens Natural Moisture Barrier", "Ultra-Lightweight & Non-Sticky Finish"]'::jsonb,
    how_to_use = '["Dispense 3-4 drops onto damp, cleansed facial skin.", "Gently massage until absorbed before applying heavier creams.", "Use twice daily (morning and evening) for lasting hydration."]'::jsonb,
    ingredients = 'Hyaluronic Acid (Multi-Molecular), Pro-Vitamin B5 (Panthenol), Aloe Vera Leaf Extract, Vegetable Glycerin, Centella Asiatica Extract, Purified Aqua',
    product_highlights = '["30ml Pack", "Intense Deep Hydration", "Non-Sticky Lightweight Formula", "Suitable for All Skin Types"]'::jsonb
WHERE slug = 'yogkart-hyaluronic-serum' OR id = 43;

-- 3. Sunscreen SPF 50 (ID 44 / slug 'yogkart-sunscreen-spf50')
UPDATE products
SET description = 'YogKart Sunscreen SPF 50 PA+++ provides broad-spectrum UVA and UVB defense in an ultra-light, non-greasy gel formula. It shields your skin against sunburn, tanning, photo-aging, and blue light damage without leaving any white cast or sticky residue. Enriched with skin-nourishing antioxidants, it leaves your skin protected, matte, and hydrated throughout the day.',
    short_description = 'Broad-spectrum SPF 50 PA+++ sunscreen gel for daily sun protection with zero white cast.',
    seo_description = 'YogKart Sunscreen SPF 50 PA+++ provides broad-spectrum UVA and UVB defense in an ultra-light, non-greasy gel formula.',
    key_benefits = '["Broad Spectrum UVA & UVB Protection (SPF 50 PA+++)", "Zero White Cast & Ultra-Lightweight Gel Texture", "Prevents Sunburn, Dark Spots & Premature Aging", "Water & Sweat Resistant Formula"]'::jsonb,
    how_to_use = '["Apply generously to clean face, neck, and exposed skin 15 minutes before sun exposure.", "Reapply every 2-3 hours during prolonged sun exposure, swimming, or sweating."]'::jsonb,
    ingredients = 'Octocrylene & Avobenzone (UV Filters), Zinc Oxide, Aloe Vera Extract, Green Tea Extract, Vitamin E, Aqua',
    product_highlights = '["50g Pack", "SPF 50 PA+++ Protection", "Zero White Cast", "Quick Absorbing Gel"]'::jsonb
WHERE slug = 'yogkart-sunscreen-spf50' OR id = 44;

-- 4. Anti-Aging Night Cream (ID 46 / slug 'yogkart-anti-aging-cream')
UPDATE products
SET description = 'YogKart Anti-Aging Night Cream is a deeply nourishing nocturnal treatment formulated to rejuvenate, firm, and repair skin while you sleep. Packed with peptides, retinol, and rich botanical butters, it boosts collagen synthesis, smooths fine lines, and replenishes essential moisture to reveal firmer, smoother, and radiant skin every morning.',
    short_description = 'Rejuvenating anti-aging night cream with peptides and retinol for firm, youthful skin.',
    seo_description = 'YogKart Anti-Aging Night Cream is a deeply nourishing nocturnal treatment formulated to rejuvenate, firm, and repair skin while you sleep.',
    key_benefits = '["Boosts Collagen & Restores Skin Firmness", "Reduces Fine Lines & Wrinkles", "Overnight Deep Cellular Nourishment", "Restores Natural Skin Elasticity & Glow"]'::jsonb,
    how_to_use = '["Cleanse your face before bedtime.", "Take a coin-sized amount and gently massage into face and neck in upward strokes.", "Leave on overnight for complete absorption."]'::jsonb,
    ingredients = 'Retinol Complex, Peptides, Shea Butter, Almond Oil, Niacinamide, Vitamin E, Gotu Kola Extract, Purified Aqua',
    product_highlights = '["50g Pack", "Overnight Cell Renewal", "Rich & Non-Greasy Texture", "Improves Skin Elasticity"]'::jsonb
WHERE slug = 'yogkart-anti-aging-cream' OR id = 46;

-- 5. Walnut Face Scrub (ID 47 / slug 'yogkart-face-scrub-walnut')
UPDATE products
SET description = 'YogKart Natural Walnut Face Scrub gently buffs away dead skin cells, blackheads, and deep-seated impurities without micro-tearing the skin. Formulated with finely milled walnut shell granules and moisturizing herbal oils, it cleanses pores, refines skin texture, and leaves your complexion remarkably smooth, clear, and glowing.',
    short_description = 'Gentle exfoliating walnut face scrub for unclogging pores and radiant smooth skin.',
    seo_description = 'YogKart Natural Walnut Face Scrub gently buffs away dead skin cells, blackheads, and deep-seated impurities without micro-tearing the skin.',
    key_benefits = '["Gently Exfoliates Dead Skin & Blackheads", "Unclogs Pores for Clear, Smooth Skin", "Refines Skin Texture Without Dryness", "Infused with Natural Botanical Oils"]'::jsonb,
    how_to_use = '["Dampen face and neck with water.", "Apply a small amount and massage gently in circular motions for 1-2 minutes.", "Rinse thoroughly with lukewarm water and pat dry. Use 1-2 times weekly."]'::jsonb,
    ingredients = 'Finely Milled Walnut Shell Powder, Apricot Kernel Oil, Aloe Vera Gel, Glycerin, Vitamin E, Aqua',
    product_highlights = '["100g Pack", "Natural Walnut Exfoliator", "Cleanses Deep Pores", "Dermatologically Tested"]'::jsonb
WHERE slug = 'yogkart-face-scrub-walnut' OR id = 47;

-- 6. Keratin Shampoo (ID 49 / slug 'yogkart-keratin-shampoo')
UPDATE products
SET description = 'YogKart Smooth Keratin Shampoo infuses damaged, frizzy strands with natural plant keratin and argan oil to restore tensile strength, eliminate frizz, and impart a silky, glossy shine from root to tip.',
    short_description = 'Smoothing keratin shampoo with argan oil for frizz control, strength, and glossy shine.',
    seo_description = 'YogKart Smooth Keratin Shampoo infuses damaged, frizzy strands with natural plant keratin and argan oil.',
    key_benefits = '["Restores Strength & Elasticity to Damaged Hair", "Controls Frizz & Flyaways for Ultra-Smooth Finish", "Enriched with Argan Oil & Plant Keratin", "Sulfate-Free & Safe for Color-Treated Hair"]'::jsonb,
    how_to_use = '["Apply to wet hair and scalp, massaging gently to create a rich lather.", "Leave on for 1-2 minutes to allow keratin absorption.", "Rinse thoroughly with water. Follow with conditioner for best results."]'::jsonb,
    ingredients = 'Hydrolyzed Plant Keratin, Moroccan Argan Oil, Coconut Oil Derivatives, Biotin, Pro-Vitamin B5, Aqua',
    product_highlights = '["250ml Pack", "Keratin & Argan Oil Infused", "Sulfate & Paraben Free", "For Frizz-Free Smooth Hair"]'::jsonb
WHERE slug = 'yogkart-keratin-shampoo' OR id = 49;

-- 7. Hair Growth Serum (ID 51 / slug 'yogkart-hair-growth-serum')
UPDATE products
SET description = 'YogKart Natural Hair Growth Serum is a concentrated botanical serum enriched with Redensyl, Rosemary, and Bhringraj to awaken dormant follicles, reduce hair thinning, and stimulate dense, healthy hair growth.',
    short_description = 'Potent hair growth serum with Redensyl, Rosemary, and Bhringraj for fuller, thicker hair.',
    seo_description = 'YogKart Natural Hair Growth Serum is a concentrated botanical serum enriched with Redensyl, Rosemary, and Bhringraj.',
    key_benefits = '["Stimulates Hair Follicles & Promotes New Growth", "Reduces Hair Thinning & Breakage", "Boosts Scalp Circulation & Root Strength", "Non-Greasy & Fast-Absorbing Leave-In Formula"]'::jsonb,
    how_to_use = '["Apply a full dropper directly onto the clean scalp, focusing on thinning areas.", "Gently massage with fingertips for 2-3 minutes. Do not rinse.", "Use once daily at night before sleeping."]'::jsonb,
    ingredients = 'Redensyl Complex, Rosemary Leaf Oil, Bhringraj Extract, Biotinoyl Tripeptide, Amla Extract, Aqua',
    product_highlights = '["50ml Pack", "Redensyl + Rosemary + Bhringraj", "Non-Greasy Leave-On Serum", "Visible Results in 60 Days"]'::jsonb
WHERE slug = 'yogkart-hair-growth-serum' OR id = 51;

-- 8. Anti-Dandruff Shampoo (ID 52 / slug 'yogkart-anti-dandruff-shampoo')
UPDATE products
SET description = 'YogKart Anti-Dandruff Shampoo combines Tea Tree Oil, Neem, and Salicylic Acid to eliminate stubborn dandruff flakes, soothe itchy scalp, and prevent microbial recurrence without drying your hair.',
    short_description = 'Effective anti-dandruff shampoo with tea tree oil and neem for a clean, flake-free scalp.',
    seo_description = 'YogKart Anti-Dandruff Shampoo combines Tea Tree Oil, Neem, and Salicylic Acid to eliminate stubborn dandruff flakes.',
    key_benefits = '["Clears Stubborn Flakes & Dandruff from First Wash", "Soothes Itchy, Irritated Scalp with Tea Tree Oil", "Purifies Hair Roots with Antibacterial Neem", "Gentle Daily Cleanser Without Stripping Moisture"]'::jsonb,
    how_to_use = '["Apply generously to wet hair and scalp.", "Massage thoroughly focusing on the scalp for 2 minutes.", "Rinse thoroughly with water. Use 2-3 times weekly."]'::jsonb,
    ingredients = 'Tea Tree Essential Oil, Neem Leaf Extract, Salicylic Acid, Zinc Pyrithione, Aloe Vera Extract, Aqua',
    product_highlights = '["250ml Pack", "Tea Tree & Neem Power", "Fights Flakes & Itchiness", "Soothes Scalp"]'::jsonb
WHERE slug = 'yogkart-anti-dandruff-shampoo' OR id = 52;

-- 9. Baby Massage Oil (ID 53 / slug 'yogkart-baby-massage-oil')
UPDATE products
SET description = 'YogKart Natural Baby Massage Oil is a gentle, pediatrician-tested blend of cold-pressed virgin oils (Almond, Sesame, Olive, and Jojoba) enriched with Vitamin E. It nourishes delicate baby skin, promotes bone and muscle strength through gentle massage, and keeps skin soft, supple, and rash-free.',
    short_description = 'Nourishing baby massage oil with cold-pressed almond and olive oil for strong bones and soft skin.',
    seo_description = 'YogKart Natural Baby Massage Oil is a gentle, pediatrician-tested blend of cold-pressed virgin oils enriched with Vitamin E.',
    key_benefits = '["Strengthens Baby Bones & Muscles with Daily Massage", "Deeply Nourishes & Hydrates Delicate Baby Skin", "100% Pure Cold-Pressed Botanical Oils", "Free from Mineral Oil, Parabens & Artificial Fragrance"]'::jsonb,
    how_to_use = '["Take a few drops of oil onto your palms and rub to warm slightly.", "Gently massage over baby body and limbs in gentle circular and upward strokes before bath."]'::jsonb,
    ingredients = 'Cold-Pressed Sweet Almond Oil, Virgin Olive Oil, Sesame Seed Oil, Jojoba Oil, Vitamin E (Tocopherol)',
    product_highlights = '["100ml Pack", "100% Pure Cold-Pressed Oils", "Pediatrician Tested", "No Mineral Oil or Parabens"]'::jsonb
WHERE slug = 'yogkart-baby-massage-oil' OR id = 53;

-- 10. Baby Shampoo (ID 54 / slug 'yogkart-baby-shampoo')
UPDATE products
SET description = 'YogKart Gentle Tear-Free Baby Shampoo is a mild, pH-balanced formula enriched with aloe vera and chamomile to cleanse baby hair and scalp gently without irritating sensitive eyes or drying out delicate strands.',
    short_description = 'Tear-free gentle baby shampoo with chamomile and aloe vera for soft baby hair.',
    seo_description = 'YogKart Gentle Tear-Free Baby Shampoo is a mild, pH-balanced formula enriched with aloe vera and chamomile.',
    key_benefits = '["100% Tear-Free & Gentle on Sensitive Eyes", "Mild pH-Balanced Cleansing for Delicate Scalp", "Enriched with Soothing Aloe Vera & Chamomile", "Free from Sulfates, Parabens, Dyes & Silicones"]'::jsonb,
    how_to_use = '["Wet baby hair with warm water.", "Apply a small amount of shampoo and gently massage into a rich lather.", "Rinse thoroughly with lukewarm water."]'::jsonb,
    ingredients = 'Decyl Glucoside (Plant Cleanser), Aloe Vera Leaf Juice, Chamomile Extract, Pro-Vitamin B5, Purified Water',
    product_highlights = '["200ml Pack", "Tear-Free Formula", "pH 5.5 Balanced", "Dermatologically Tested"]'::jsonb
WHERE slug = 'yogkart-baby-shampoo' OR id = 54;

-- 11. Baby Powder (ID 57 / slug 'yogkart-natural-talc-free-baby-powder')
UPDATE products
SET description = 'YogKart Natural Talc-Free Baby Powder is formulated with organic arrowroot, cornstarch, and soothing chamomile extract to keep delicate baby folds dry, fresh, and free from diaper rash. 100% free from talc, synthetic fragrances, parabens, and toxins.',
    short_description = '100% talc-free baby powder with chamomile and cornstarch for dry, rash-free skin.',
    seo_description = 'YogKart Natural Talc-Free Baby Powder is formulated with organic arrowroot, cornstarch, and soothing chamomile extract.',
    key_benefits = '["100% Talc-Free & Toxin-Free Safe Formulation", "Absorbs Excess Moisture to Prevent Diaper Rash", "Soothes Delicate Baby Skin with Chamomile", "Hypoallergenic & Pediatrician Approved"]'::jsonb,
    how_to_use = '["Sprinkle a small amount into your hands away from baby face.", "Gently apply onto baby skin folds, diaper area, and neck after bath or diaper change."]'::jsonb,
    ingredients = 'Organic Cornstarch, Arrowroot Powder, Chamomile Flower Extract, Oat Kernel Flour, Zinc Oxide',
    product_highlights = '["100g Pack", "100% Talc-Free", "Safe for Sensitive Skin", "Hypoallergenic Formula"]'::jsonb
WHERE slug = 'yogkart-natural-talc-free-baby-powder' OR id = 57;

-- 12. Herbal Eye Drops (ID 58 / slug 'yogkart-eye-drops')
UPDATE products
SET description = 'YogKart Herbal Ayurvedic Eye Drops are prepared using sterile Ayurvedic distillates of Rose water, Triphala, and Punarnava to cool tired eyes, relieve dryness, reduce irritation from screen exposure, and promote clarity and comfort.',
    short_description = 'Sterile Ayurvedic herbal eye drops with rose water and Triphala for soothing screen-tired eyes.',
    seo_description = 'YogKart Herbal Ayurvedic Eye Drops are prepared using sterile Ayurvedic distillates of Rose water, Triphala, and Punarnava.',
    key_benefits = '["Soothes Digital Eye Strain & Screen Fatigue", "Relieves Dryness, Itching & Redness", "Cooling & Calming Ayurvedic Distillate", "Prepared with Sterile Purified Rose Water & Triphala"]'::jsonb,
    how_to_use = '["Tilt head back and instill 1-2 drops into each eye.", "Close eyes gently for 30 seconds. Use 2-3 times daily or as advised by your physician."]'::jsonb,
    ingredients = 'Sterile Rose Distillate (Gulab Jal), Triphala Extract, Punarnava Extract, Bhringraj Distillate, Camphor (Bhimseni)',
    product_highlights = '["10ml Sterile Pack", "100% Ayurvedic Eye Care", "Relieves Digital Screen Fatigue", "Cooling & Soothing"]'::jsonb
WHERE slug = 'yogkart-eye-drops' OR id = 58;

-- 13. Under Eye Cream (ID 59 / slug 'yogkart-under-eye-cream')
UPDATE products
SET description = 'YogKart Under Eye Cream is specially formulated to target dark circles, under-eye puffiness, and fine expression lines around the delicate eye contour. Enriched with caffeine, peptides, and cucumber extract, it cools, depuffs, and illuminates tired eyes for a refreshed, youthful look.',
    short_description = 'Targeted under-eye cream with caffeine and cucumber for dark circles and puffiness.',
    seo_description = 'YogKart Under Eye Cream is specially formulated to target dark circles, under-eye puffiness, and fine expression lines.',
    key_benefits = '["Visibly Reduces Dark Circles & Under-Eye Bags", "Soothes Puffiness with Cooling Effect", "Hydrates & Smooths Delicate Eye Contour", "Fights Early Crow Feet & Fine Lines"]'::jsonb,
    how_to_use = '["Dab a tiny amount under each eye using your ring finger.", "Gently tap along the orbital bone from inner to outer corner until absorbed.", "Use morning and evening for optimal results."]'::jsonb,
    ingredients = 'Caffeine Extract, Cucumber Fruit Extract, Peptide Complex, Hyaluronic Acid, Almond Oil, Vitamin K & E, Aqua',
    product_highlights = '["15g Pack", "Targets Dark Circles & Puffiness", "Cooling & Lightweight Formula", "Ophthalmologist Tested"]'::jsonb
WHERE slug = 'yogkart-under-eye-cream' OR id = 59;

-- 14. Blue Light Glasses (ID 60 / slug 'yogkart-blue-light-glasses')
UPDATE products
SET description = 'YogKart Blue Light Blocking Glasses feature advanced anti-glare, UV400 lenses designed to filter harmful blue light emitted from smartphones, tablets, laptops, and computer screens. They alleviate eye strain, prevent screen fatigue, reduce tension headaches, and improve sleep quality during long working or gaming hours.',
    short_description = 'Anti-glare UV400 blue light blocking glasses to relieve digital eye strain and fatigue.',
    seo_description = 'YogKart Blue Light Blocking Glasses feature advanced anti-glare, UV400 lenses designed to filter harmful blue light.',
    key_benefits = '["Blocks 90%+ Harmful Digital Blue Light & UV400 Rays", "Relieves Digital Eye Strain, Dryness & Headaches", "Improves Sleep Quality by Supporting Melatonin Cycle", "Ultra-Lightweight, Durable & Stylish Frame"]'::jsonb,
    how_to_use = '["Wear while working on laptops, reading on phones, tablets, or watching TV.", "Clean lenses with a microfiber cloth and lens spray. Store in the protective case when not in use."]'::jsonb,
    ingredients = 'High-Index Anti-Reflective Optical Lenses, Lightweight TR90 / Polycarbonate Composite Frame',
    product_highlights = '["Zero Power Lenses", "Blue Light & UV400 Protection", "Ultra Lightweight Frame", "Includes Case & Cleaning Cloth"]'::jsonb
WHERE slug = 'yogkart-blue-light-glasses' OR id = 60;

-- 15. Stretch Mark Cream (ID 69 / slug 'yogkart-stretch-mark-cream')
UPDATE products
SET description = 'YogKart Natural Stretch Mark Cream is formulated with Cocoa Butter, Shea Butter, Centella Asiatica, and Rosehip Oil to improve skin elasticity, deeply hydrate stretched skin, and visibly fade pregnancy or weight-transition stretch marks.',
    short_description = 'Nourishing stretch mark cream with cocoa butter and rosehip oil to improve skin elasticity.',
    seo_description = 'YogKart Natural Stretch Mark Cream is formulated with Cocoa Butter, Shea Butter, Centella Asiatica, and Rosehip Oil.',
    key_benefits = '["Visibly Fades Stretch Marks & Scars", "Improves Skin Elasticity & Firmness", "Intensive Hydration with Cocoa & Shea Butters", "Safe for Use During and Post-Pregnancy"]'::jsonb,
    how_to_use = '["Massage generously onto belly, hips, thighs, and breasts in circular motions until absorbed.", "Apply twice daily from second trimester onwards or during weight transition."]'::jsonb,
    ingredients = 'Cocoa Butter, Shea Butter, Rosehip Seed Oil, Centella Asiatica (Gotu Kola), Vitamin E, Aqua',
    product_highlights = '["100g Pack", "Cocoa & Shea Butter Blend", "Pregnancy Safe", "Boosts Skin Elasticity"]'::jsonb
WHERE slug = 'yogkart-stretch-mark-cream' OR id = 69;

-- 16. Bamboo Toothbrush (ID 73 / slug 'yogkart-bamboo-toothbrush')
UPDATE products
SET description = 'YogKart Eco-Friendly Bamboo Toothbrush is made from 100% biodegradable organic bamboo with BPA-free soft charcoal-infused bristles. It ensures gentle, deep cleaning of teeth and gums while helping eliminate single-use plastic waste from our oceans and landfills.',
    short_description = 'Eco-friendly biodegradable bamboo toothbrush with soft charcoal bristles.',
    seo_description = 'YogKart Eco-Friendly Bamboo Toothbrush is made from 100% biodegradable organic bamboo with BPA-free soft charcoal-infused bristles.',
    key_benefits = '["100% Biodegradable & Sustainable Bamboo Handle", "Soft Charcoal-Infused Bristles for Deep Plaque Removal", "Naturally Antibacterial & Water-Resistant", "Ergonomic Grip for Comfortable Daily Brushing"]'::jsonb,
    how_to_use = '["Use twice daily with your favorite natural toothpaste.", "Rinse and allow the handle to dry in an airy holder after each use.", "Dentists recommend replacing your toothbrush every 2-3 months."]'::jsonb,
    ingredients = '100% Natural Organic Bamboo Wood, BPA-Free Charcoal Infused Nylon-6 Bristles',
    product_highlights = '["Pack of 4 Toothbrushes", "100% Biodegradable Handle", "Charcoal Infused Soft Bristles", "Plastic-Free Packaging"]'::jsonb
WHERE slug = 'yogkart-bamboo-toothbrush' OR id = 73;

-- 17. Herbal Toothpaste (ID 74 / slug 'yogkart-herbal-toothpaste')
UPDATE products
SET description = 'YogKart Natural Ayurvedic Herbal Toothpaste is crafted with time-tested Ayurvedic herbs like Clove, Neem, Babool, and Miswak to provide complete oral hygiene and protection. It naturally strengthens gums, combats plaque and cavities, prevents tooth sensitivity, and keeps your breath fresh all day without harsh chemicals or artificial sweeteners.',
    short_description = 'Ayurvedic herbal toothpaste with clove and neem for complete cavity and gum protection.',
    seo_description = 'YogKart Natural Ayurvedic Herbal Toothpaste is crafted with time-tested Ayurvedic herbs like Clove, Neem, Babool, and Miswak.',
    key_benefits = '["Strengthens Gums & Protects Tooth Enamel", "Fights Cavities & Plaque Naturally", "Long-Lasting Fresh Breath with Clove & Mint", "100% Fluoride-Free & Natural Herbal Formulation"]'::jsonb,
    how_to_use = '["Apply a pea-sized amount onto a soft toothbrush.", "Brush thoroughly for at least 2 minutes twice a day, morning and night.", "Rinse mouth thoroughly with clean water."]'::jsonb,
    ingredients = 'Neem Extract (Azadirachta Indica), Clove Oil (Syzygium Aromaticum), Babool (Acacia Arabica), Miswak Extract, Pudina / Menthol, Calcium Carbonate, Purified Aqua',
    product_highlights = '["100g Pack", "Ayurvedic Oral Care", "100% Fluoride-Free", "Fresh Breath & Stronger Gums"]'::jsonb
WHERE slug = 'yogkart-herbal-toothpaste' OR id = 74;

-- 18. Body Wash (ID 75 / slug 'yogkart-body-wash')
UPDATE products
SET description = 'YogKart Hydrating Body Wash creates a luxurious, aromatic lather infused with botanical extracts that cleanses deeply without stripping skin of essential natural moisture, leaving you feeling refreshed and revitalized.',
    short_description = 'Refreshing and hydrating body wash with botanical extracts for soft, clean skin.',
    seo_description = 'YogKart Hydrating Body Wash creates a luxurious, aromatic lather infused with botanical extracts.',
    key_benefits = '["Gently Cleanses Dirt, Sweat & Impurities", "Deeply Hydrates & Prevents Post-Shower Dryness", "Invigorating Fresh Botanical Fragrance", "Rich Foaming Formula Suitable for Daily Use"]'::jsonb,
    how_to_use = '["Pour a coin-sized amount onto a wet loofah or palms.", "Work into a rich lather and massage gently over damp body.", "Rinse off thoroughly with water."]'::jsonb,
    ingredients = 'Aloe Vera Juice, Vegetable Glycerin, Green Tea Extract, Shea Butter Derivatives, Purified Aqua',
    product_highlights = '["250ml Pack", "Hydrating & Sulfate-Free", "Invigorating Fresh Scent", "For Men & Women"]'::jsonb
WHERE slug = 'yogkart-body-wash' OR id = 75;

-- 19. Copper Bottle (ID 91 / slug 'yogkart-copper-bottle-14')
UPDATE products
SET description = 'YogKart Pure Copper Water Bottle is handcrafted from 99.7% pure grade copper, designed according to ancient Ayurvedic principles of Tamra Jal. Storing water in copper naturally alkalizes and ionizes the water, balances the three Doshas (Vata, Pitta, Kapha), boosts immunity, and aids healthy digestion. Durable, leak-proof, and stylish for home, office, and yoga practice.',
    short_description = 'Handcrafted 99.7% pure copper water bottle for natural ionization and health benefits.',
    seo_description = 'YogKart Pure Copper Water Bottle is handcrafted from 99.7% pure grade copper according to Ayurvedic Tamra Jal principles.',
    key_benefits = '["Handcrafted from 99.7% Pure High-Grade Copper", "Naturally Ionizes & Alkalizes Drinking Water (Tamra Jal)", "Supports Digestion, Immunity & Cellular Health", "100% Leak-Proof Cap with Silicone Seal"]'::jsonb,
    how_to_use = '["Fill the copper bottle with regular drinking water and leave for 6-8 hours or overnight.", "Drink a glass of copper-infused water first thing in the morning on an empty stomach.", "Clean every 2-3 weeks with lemon juice and salt or tamarind paste, then rinse thoroughly."]'::jsonb,
    ingredients = '100% Pure Certified Solid Copper Metal, Food-Grade Silicone Seal',
    product_highlights = '["1000ml Capacity", "99.7% Pure Copper", "Leak-Proof Cap", "Ayurvedic Tamra Jal"]'::jsonb
WHERE slug = 'yogkart-copper-bottle-14' OR id = 91;

-- 20. Lavender Soap (ID 96 / slug 'natural-lavender-bar-shop-27')
UPDATE products
SET description = 'YogKart Handmade Natural Lavender Soap is a cold-processed artisan soap bar with pure lavender essential oil and shea butter that calms the senses, soothes irritated skin, and leaves your body velvety soft.',
    short_description = 'Handmade natural lavender soap bar with pure essential oils for calming, soft skin.',
    seo_description = 'YogKart Handmade Natural Lavender Soap is a cold-processed artisan soap bar with pure lavender essential oil.',
    key_benefits = '["Calming & Relaxing Pure Lavender Aroma", "Gently Cleanses & Soothes Sensitive Skin", "Moisturizes with Raw Shea & Cocoa Butters", "Pure Handmade Cold-Processed Formulation"]'::jsonb,
    how_to_use = '["Lather with water on wet body and face.", "Enjoy the calming aroma and rinse clean. Keep dry on a soap dish after use."]'::jsonb,
    ingredients = 'Pure Lavender Essential Oil, Saponified Coconut Oil, Castor Oil, Raw Shea Butter, Aqua',
    product_highlights = '["100g Handmade Bar", "Pure Lavender Essential Oil", "Calming & Hydrating", "No Harsh Chemicals"]'::jsonb
WHERE slug = 'natural-lavender-bar-shop-27' OR id = 96;

-- 21. Red Wine Soap (ID 97 / slug 'natural-red-wine-shop-28')
UPDATE products
SET description = 'YogKart Handmade Natural Red Wine Soap is packed with grape polyphenols and antioxidants that combat skin dullness, boost cellular renewal, and give your skin a vibrant natural glow and velvety smoothness.',
    short_description = 'Artisan handmade red wine soap bar rich in polyphenols and antioxidants for glowing skin.',
    seo_description = 'YogKart Handmade Natural Red Wine Soap is packed with grape polyphenols and antioxidants that combat skin dullness.',
    key_benefits = '["Rich in Antioxidants & Grape Polyphenols", "Brightens Dull Complexion & Enhances Glow", "Cold-Processed with Nourishing Plant Oils", "100% Free from Parabens, SLS & Animal Fat"]'::jsonb,
    how_to_use = '["Rub the wet soap bar between palms to create a rich lather.", "Apply gently over face and body, then rinse thoroughly with clean water."]'::jsonb,
    ingredients = 'Pure Red Wine Extract, Saponified Coconut Oil, Olive Oil, Shea Butter, Glycerin, Purified Aqua',
    product_highlights = '["100g Handmade Bar", "Rich in Grape Antioxidants", "Cold Processed Natural Soap", "Toxin-Free"]'::jsonb
WHERE slug = 'natural-red-wine-shop-28' OR id = 97;

-- 22. Multani Mitti Soap (ID 98 / slug 'natural-multani-mitti-shop-29')
UPDATE products
SET description = 'YogKart Handmade Natural Multani Mitti Soap harnesses the deep cleansing and cooling power of Fuller’s Earth to absorb excess oil, clear blemishes, and detoxify the skin for a fresh, clear complexion.',
    short_description = 'Handmade natural multani mitti soap for deep oil control, pore cleansing, and clear skin.',
    seo_description = 'YogKart Handmade Natural Multani Mitti Soap harnesses the deep cleansing and cooling power of Fuller’s Earth.',
    key_benefits = '["Absorbs Excess Sebum & Deep-Cleanses Pores", "Helps Reduce Acne, Blemishes & Dark Spots", "Natural Cooling & Skin Soothing Action", "Handmade Cold-Processed Herbal Soap"]'::jsonb,
    how_to_use = '["Work soap into a lather with water and apply to face and body.", "Gently massage and rinse with cool water."]'::jsonb,
    ingredients = 'Fuller’s Earth (Multani Mitti), Saponified Coconut Oil, Neem Oil, Turmeric Extract, Aqua',
    product_highlights = '["100g Handmade Bar", "Fuller’s Earth & Neem", "Oil-Control & Blemish Clear", "Handmade & Natural"]'::jsonb
WHERE slug = 'natural-multani-mitti-shop-29' OR id = 98;
