-- Migration: 2026-11-03_02_fix_category_assignments.sql
-- Description:
-- Fix category assignments for accurate navigation, consistency, and zero null categories (Task 1.12)

BEGIN;

-- 1. Combs, hair sets, and shampoo -> hair-care
UPDATE public.products
SET category_id = 'hair-care'
WHERE id IN (1, 7, 82, 83, 84, 85, 86, 92, 93, 94)
   OR name ILIKE '%comb%'
   OR name ILIKE '%shampoo%';

-- 2. Soap bars -> body-care
UPDATE public.products
SET category_id = 'body-care'
WHERE id IN (95, 96, 97, 98, 99)
   OR name ILIKE '%soap bar%';

-- 3. Bamboo toothbrushes -> oral-teeth-care
UPDATE public.products
SET category_id = 'oral-teeth-care'
WHERE id = 89
   OR name ILIKE '%toothbrush%'
   OR name ILIKE '%bamboo brush%';

-- 4. Eye wash cup -> eye-care
UPDATE public.products
SET category_id = 'eye-care'
WHERE id = 87
   OR name ILIKE '%eye wash%';

-- 5. Copper bottle and bamboo bottle -> home-healthcare-essentials
UPDATE public.products
SET category_id = 'home-healthcare-essentials'
WHERE id IN (88, 90, 91)
   OR name ILIKE '%copper bottle%'
   OR name ILIKE '%bamboo water bottle%';

-- 6. Hide empty bamboo-products category from navigation
UPDATE public.categories
SET show_in_menu = false, is_active = false
WHERE id = 'bamboo-products';

COMMIT;
