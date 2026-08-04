-- Migration 011: International SEO & AI Visibility System v2
BEGIN;

-- 1. BCP-47 SEO Locales Table
CREATE TABLE IF NOT EXISTS seo_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g. en-in, hi-in, en-us, en-gb, en-ca, fr-ca, ar-ae, en-ae, en-au
    country_code VARCHAR(10) NOT NULL, -- IN, US, UK, CA, AE, AU
    language_code VARCHAR(10) NOT NULL, -- en, hi, ar, fr
    name VARCHAR(100) NOT NULL, -- e.g. English (India), Arabic (UAE)
    currency_code VARCHAR(10) NOT NULL, -- INR, USD, GBP, CAD, AED, AUD
    currency_symbol VARCHAR(10) NOT NULL, -- ₹, $, £, C$, AED, A$
    exchange_rate NUMERIC(12, 4) DEFAULT 1.0000, -- Relative to INR base
    tax_rule VARCHAR(50) DEFAULT 'gst_inclusive', -- gst_inclusive, vat_inclusive, sales_tax_exclusive
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI Crawler Controls Table
CREATE TABLE IF NOT EXISTS seo_ai_crawlers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_name VARCHAR(50) UNIQUE NOT NULL, -- GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider
    user_agent VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'allow', -- allow or disallow
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SEO Redirect Mappings Table (301/302)
CREATE TABLE IF NOT EXISTS seo_redirect_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_path VARCHAR(255) UNIQUE NOT NULL,
    new_path VARCHAR(255) NOT NULL,
    redirect_code INT DEFAULT 301,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed BCP-47 Locales
INSERT INTO seo_locales (code, country_code, language_code, name, currency_code, currency_symbol, exchange_rate, tax_rule, is_default) VALUES
('en-in', 'IN', 'en', 'English (India)', 'INR', '₹', 1.0000, 'gst_inclusive', TRUE),
('hi-in', 'IN', 'hi', 'Hindi (India)', 'INR', '₹', 1.0000, 'gst_inclusive', FALSE),
('en-us', 'US', 'en', 'English (United States)', 'USD', '$', 0.0120, 'sales_tax_exclusive', FALSE),
('en-gb', 'UK', 'en', 'English (United Kingdom)', 'GBP', '£', 0.0095, 'vat_inclusive', FALSE),
('en-ca', 'CA', 'en', 'English (Canada)', 'CAD', 'C$', 0.0160, 'sales_tax_exclusive', FALSE),
('fr-ca', 'CA', 'fr', 'French (Canada)', 'CAD', 'C$', 0.0160, 'sales_tax_exclusive', FALSE),
('ar-ae', 'AE', 'ar', 'Arabic (UAE)', 'AED', 'AED', 0.0440, 'vat_inclusive', FALSE),
('en-ae', 'AE', 'en', 'English (UAE)', 'AED', 'AED', 0.0440, 'vat_inclusive', FALSE),
('en-au', 'AU', 'en', 'English (Australia)', 'AUD', 'A$', 0.0180, 'gst_inclusive', FALSE)
ON CONFLICT (code) DO UPDATE SET
  exchange_rate = EXCLUDED.exchange_rate,
  tax_rule = EXCLUDED.tax_rule,
  updated_at = NOW();

-- 5. Seed AI Crawlers Control
INSERT INTO seo_ai_crawlers (bot_name, user_agent, status, description) VALUES
('GPTBot', 'GPTBot', 'allow', 'OpenAI ChatGPT web search crawler'),
('ChatGPT-User', 'ChatGPT-User', 'allow', 'Direct user ChatGPT web retrieval'),
('ClaudeBot', 'ClaudeBot', 'allow', 'Anthropic Claude web crawler'),
('Claude-Web', 'Claude-Web', 'allow', 'Anthropic Claude direct web retrieval'),
('PerplexityBot', 'PerplexityBot', 'allow', 'Perplexity AI search engine crawler'),
('Google-Extended', 'Google-Extended', 'allow', 'Google Gemini AI training crawler'),
('CCBot', 'CCBot', 'disallow', 'Common Crawl bulk dataset scraper'),
('Bytespider', 'Bytespider', 'disallow', 'TikTok / ByteDance scraper'),
('Amazonbot', 'Amazonbot', 'allow', 'Amazon Alexa / AI crawler')
ON CONFLICT (bot_name) DO NOTHING;

-- 6. Seed Redirect Mappings
INSERT INTO seo_redirect_mappings (old_path, new_path, redirect_code) VALUES
('/find-teachers', '/en-in/find-teachers', 301),
('/courses', '/en-in/courses', 301),
('/pricing', '/en-in/pricing', 301)
ON CONFLICT (old_path) DO NOTHING;

COMMIT;
