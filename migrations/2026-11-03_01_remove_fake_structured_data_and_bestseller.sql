-- Migration: 2026-11-03_01_remove_fake_structured_data_and_bestseller.sql
-- Description:
-- 1. Remove fake aggregateRating and review keys from products.schema_json (Task 1.4)
-- 2. Reset manual is_best_seller flag to false as there are no verified orders yet (Task 1.5)

BEGIN;

-- Task 1.4: Clean schema_json
UPDATE public.products
SET schema_json = schema_json - 'aggregateRating' - 'review'
WHERE schema_json ? 'aggregateRating' OR schema_json ? 'review';

-- Task 1.5: Reset bestseller flags
UPDATE public.products
SET is_best_seller = false
WHERE is_best_seller = true;

COMMIT;
