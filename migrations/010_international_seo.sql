-- Migration 010: International SEO, Multi-Country, Multi-Language & AI Visibility
BEGIN;

-- 1. SEO Countries & Currencies Table
CREATE TABLE IF NOT EXISTS seo_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- IN, US, UK, CA, AE, AU
    name VARCHAR(100) NOT NULL,
    default_language VARCHAR(10) DEFAULT 'en',
    currency_code VARCHAR(10) NOT NULL, -- INR, USD, GBP, CAD, AED, AUD
    currency_symbol VARCHAR(10) NOT NULL, -- ₹, $, £, C$, AED, A$
    exchange_rate NUMERIC(12, 4) DEFAULT 1.0000, -- Relative to INR base
    flag_emoji VARCHAR(10) DEFAULT '🌐',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEO Languages Table
CREATE TABLE IF NOT EXISTS seo_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- en, hi, ar, fr
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    direction VARCHAR(5) DEFAULT 'ltr', -- ltr or rtl
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dynamic Page Meta Tags & Schema Table
CREATE TABLE IF NOT EXISTS seo_meta_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path VARCHAR(255) NOT NULL, -- e.g. '/', '/courses', '/teachers', '/pricing', '/blog'
    country_code VARCHAR(10) DEFAULT 'GLOBAL', -- GLOBAL or specific country code
    language_code VARCHAR(10) DEFAULT 'en', -- en, hi, ar, fr
    seo_title VARCHAR(150) NOT NULL,
    meta_description TEXT NOT NULL,
    meta_keywords TEXT[] DEFAULT '{}',
    canonical_url TEXT,
    og_title VARCHAR(150),
    og_description TEXT,
    og_image TEXT,
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    robots VARCHAR(100) DEFAULT 'index, follow',
    change_freq VARCHAR(20) DEFAULT 'weekly',
    priority NUMERIC(3, 2) DEFAULT 0.80,
    schema_type VARCHAR(50) DEFAULT 'WebPage', -- Course, Person, Organization, Article, FAQ, Event, LocalBusiness
    schema_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_path_country_lang UNIQUE(page_path, country_code, language_code)
);

-- 4. SEO Redirects Table
CREATE TABLE IF NOT EXISTS seo_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_path VARCHAR(255) UNIQUE NOT NULL,
    target_path VARCHAR(255) NOT NULL,
    redirect_type INT DEFAULT 301,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed Initial Countries
INSERT INTO seo_countries (code, name, default_language, currency_code, currency_symbol, exchange_rate, flag_emoji) VALUES
('IN', 'India', 'en', 'INR', '₹', 1.0000, '🇮🇳'),
('US', 'United States', 'en', 'USD', '$', 0.0120, '🇺🇸'),
('UK', 'United Kingdom', 'en', 'GBP', '£', 0.0095, '🇬🇧'),
('CA', 'Canada', 'en', 'CAD', 'C$', 0.0160, '🇨🇦'),
('AE', 'United Arab Emirates', 'ar', 'AED', 'AED', 0.0440, '🇦🇪'),
('AU', 'Australia', 'en', 'AUD', 'A$', 0.0180, '🇦🇺')
ON CONFLICT (code) DO UPDATE SET 
  exchange_rate = EXCLUDED.exchange_rate,
  currency_symbol = EXCLUDED.currency_symbol,
  flag_emoji = EXCLUDED.flag_emoji,
  updated_at = NOW();

-- 6. Seed Initial Languages
INSERT INTO seo_languages (code, name, native_name, direction) VALUES
('en', 'English', 'English', 'ltr'),
('hi', 'Hindi', 'हिन्दी', 'ltr'),
('ar', 'Arabic', 'العربية', 'rtl'),
('fr', 'French', 'Français', 'ltr')
ON CONFLICT (code) DO NOTHING;

-- 7. Seed Initial Global & Country SEO Meta Tags
INSERT INTO seo_meta_tags (page_path, country_code, language_code, seo_title, meta_description, meta_keywords, canonical_url, schema_type, priority) VALUES
('/', 'GLOBAL', 'en', 'Yogkart — Authentic Yoga Certification, Courses & Verified Teachers Worldwide', 'Discover authentic yoga certification programs, book top verified yoga instructors, join international webinars, and elevate your mind-body wellness.', ARRAY['yoga certification', 'yoga teacher training', 'online yoga classes', 'meditation therapy', 'yogkart'], 'https://yogkart.com/', 'Organization', 1.00),
('/', 'US', 'en', 'Yoga Teacher Training USA & Online Certification | Yogkart USA', 'Accredited Yoga Teacher Training & Certified Yoga Instructors in USA. Explore RYT 200, RYT 500 yoga certification programs and online classes.', ARRAY['yoga teacher training USA', 'online yoga classes USA', 'yoga certification America'], 'https://yogkart.com/us/', 'Organization', 1.00),
('/', 'UK', 'en', 'Yoga Teacher Training UK & Accredited Certification | Yogkart UK', 'Top accredited Yoga Teacher Training & verified yoga instructors in UK. Book online and studio yoga classes across London, Manchester & UK.', ARRAY['yoga teacher training UK', 'yoga certification UK', 'london yoga teachers'], 'https://yogkart.com/uk/', 'Organization', 1.00),
('/', 'CA', 'en', 'Yoga Teacher Training Canada & Wellness Courses | Yogkart Canada', 'Certified Yoga Teacher Training & holistic wellness instructors in Canada. Explore Toronto, Vancouver & online yoga certification courses.', ARRAY['yoga teacher training Canada', 'toronto yoga certification', 'canada yoga teachers'], 'https://yogkart.com/ca/', 'Organization', 1.00),
('/', 'AE', 'ar', 'تدريب معلمي اليوغا في الإمارات | دورات معتمدة ومدربون متميزون', 'احصل على شهادات يوغا معتمدة دولياً في الإمارات ودبي وأبوظبي. احجز أفضل مدربي اليوغا والتأمل عبر منصة يوغكارت.', ARRAY['تدريب يوغا الإمارات', 'مدرب يوغا دبي', 'شهادة يوغا معتمدة'], 'https://yogkart.com/ae/', 'Organization', 1.00),
('/', 'AU', 'en', 'Yoga Teacher Training Australia & Meditation Courses | Yogkart AU', 'Accredited Yoga Teacher Training & meditation instructors in Australia. Book Sydney, Melbourne & online yoga courses with Yogkart.', ARRAY['yoga teacher training Australia', 'sydney yoga certification', 'australian yoga instructors'], 'https://yogkart.com/au/', 'Organization', 1.00)
ON CONFLICT (page_path, country_code, language_code) DO NOTHING;

COMMIT;
