-- Migration: Set high-reliability VPS-hosted images for categories
BEGIN;

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1788538795067-e1d57a85183fb1c4.webp'
WHERE id = 'eye-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/yogkart-natural-neem-wood-lily-comb-2-3718f259.webp'
WHERE id = 'hair-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1788536259068-7892cf2f29989fb7.webp'
WHERE id = 'skin-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1787331309195-894bc48708337881.webp'
WHERE id = 'oral-teeth-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1788539552868-ca665e71946d5d39.webp'
WHERE id = 'body-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1788706582231-cc5e098c66e8fb0a.webp'
WHERE id = 'baby-care';

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/1787556989020-468371608407dc04.webp'
WHERE id IN ('home-healthcare-essentials', 'daily-wellness', 'health-wellness');

UPDATE categories
SET image = 'https://api.yogkart.com/uploads/products/yogkart-natural-neem-wood-lily-comb-2-3718f259.webp'
WHERE id IN ('wooden-eco', 'wooden-combs', 'neem-wood-products', 'eco-collection');

COMMIT;

