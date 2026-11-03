-- Migration: Set representative images for active categories
BEGIN;

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1780731408/b61b4361-1993-4cad-a95b-2569216881bd-Benefits-of-using-Eye-wash-cup-2_ydcxe6.webp'
WHERE id = 'eye-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050885/Category_02_oiakaz.jpg'
WHERE id = 'hair-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050885/Category_01_wri8lo.png'
WHERE id = 'skin-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1780731422/074ea6df-e0e8-44d1-976f-3572bad44666-1_da5hlf.webp'
WHERE id = 'oral-teeth-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/Category_03_wngftc.jpg'
WHERE id = 'body-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/q_auto/f_auto/v1779634938/ChatGPT_Image_May_24_2026_08_32_03_PM_osbuqs.webp'
WHERE id = 'baby-care';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/Category_04_tizdi7.jpg'
WHERE id IN ('health-wellness', 'daily-wellness');

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/essential-oils_ngoozy.jpg'
WHERE id = 'essential-oils';

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1789050884/gift-sets_ynbxsa.jpg'
WHERE id IN ('eco-collection', 'gift-sets');

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1780731399/1161a0d4-18e7-4d78-ab00-d224e3d69cdb-shampoo-handle-Comb_efv3ga.webp'
WHERE id IN ('wooden-eco', 'wooden-combs', 'neem-wood-products');

UPDATE categories
SET image = 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1780731422/074ea6df-e0e8-44d1-976f-3572bad44666-1_da5hlf.webp'
WHERE id = 'bamboo-products';

COMMIT;
