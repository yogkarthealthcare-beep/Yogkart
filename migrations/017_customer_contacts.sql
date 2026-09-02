-- Migration 017: Customer Contacts Table
-- For importing customer/contact data from Excel files

CREATE TABLE IF NOT EXISTS customer_contacts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    source_table TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON customer_contacts (email);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contact ON customer_contacts (contact);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_country ON customer_contacts (country);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_created_at ON customer_contacts (created_at DESC);
