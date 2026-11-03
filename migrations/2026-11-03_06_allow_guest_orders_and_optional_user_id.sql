-- Migration: 2026-11-03_06_allow_guest_orders_and_optional_user_id.sql
-- Description:
-- Allow guest orders by dropping NOT NULL constraint on orders.user_id and adding customer_email (Task 2.1)

BEGIN;

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

COMMIT;

