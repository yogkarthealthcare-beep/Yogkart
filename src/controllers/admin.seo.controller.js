const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all BCP-47 Locales
 */
const getLocales = async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM seo_locales ORDER BY code ASC`);
    return successResponse(res, rows, 'Locales fetched successfully');
  } catch (err) {
    console.error('Error fetching locales:', err);
    return errorResponse(res, 'Failed to fetch locales', 'LOCALES_FETCH_ERROR', 500);
  }
};

/**
 * Upsert BCP-47 Locale
 */
const upsertLocale = async (req, res) => {
  try {
    const { code, countryCode, languageCode, name, currencyCode, currencySymbol, exchangeRate, taxRule, isActive } = req.body;

    if (!code || !countryCode || !languageCode || !currencyCode) {
      return errorResponse(res, 'Code, CountryCode, LanguageCode, and CurrencyCode are required', 'MISSING_PARAMS', 400);
    }

    const { rows } = await db.query(
      `INSERT INTO seo_locales (
        code, country_code, language_code, name, currency_code, currency_symbol, exchange_rate, tax_rule, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (code) DO UPDATE SET
        country_code = EXCLUDED.country_code,
        language_code = EXCLUDED.language_code,
        name = EXCLUDED.name,
        currency_code = EXCLUDED.currency_code,
        currency_symbol = EXCLUDED.currency_symbol,
        exchange_rate = EXCLUDED.exchange_rate,
        tax_rule = EXCLUDED.tax_rule,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *`,
      [
        code.toLowerCase(),
        countryCode.toUpperCase(),
        languageCode.toLowerCase(),
        name,
        currencyCode.toUpperCase(),
        currencySymbol,
        parseFloat(exchangeRate) || 1.0,
        taxRule || 'gst_inclusive',
        isActive !== undefined ? isActive : true
      ]
    );

    return successResponse(res, rows[0], 'Locale saved successfully');
  } catch (err) {
    console.error('Error saving locale:', err);
    return errorResponse(res, 'Failed to save locale', 'LOCALE_SAVE_ERROR', 500);
  }
};

/**
 * Get AI Crawlers Rules
 */
const getAiCrawlers = async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM seo_ai_crawlers ORDER BY bot_name ASC`);
    return successResponse(res, rows, 'AI crawlers fetched successfully');
  } catch (err) {
    console.error('Error fetching AI crawlers:', err);
    return errorResponse(res, 'Failed to fetch AI crawlers', 'CRAWLERS_FETCH_ERROR', 500);
  }
};

/**
 * Update AI Crawler Rule Status (allow / disallow)
 */
const updateAiCrawler = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return errorResponse(res, 'ID and Status are required', 'MISSING_PARAMS', 400);
    }

    const { rows } = await db.query(
      `UPDATE seo_ai_crawlers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status.toLowerCase(), id]
    );

    return successResponse(res, rows[0], 'AI crawler status updated');
  } catch (err) {
    console.error('Error updating AI crawler:', err);
    return errorResponse(res, 'Failed to update AI crawler', 'CRAWLER_UPDATE_ERROR', 500);
  }
};

/**
 * Get 301 Redirect Mappings
 */
const getRedirects = async (_req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM seo_redirect_mappings ORDER BY created_at DESC`);
    return successResponse(res, rows, 'Redirect mappings fetched successfully');
  } catch (err) {
    console.error('Error fetching redirects:', err);
    return errorResponse(res, 'Failed to fetch redirects', 'REDIRECTS_FETCH_ERROR', 500);
  }
};

/**
 * Upsert Redirect Mapping
 */
const upsertRedirect = async (req, res) => {
  try {
    const { oldPath, newPath, redirectCode = 301 } = req.body;
    if (!oldPath || !newPath) {
      return errorResponse(res, 'OldPath and NewPath are required', 'MISSING_PARAMS', 400);
    }

    const { rows } = await db.query(
      `INSERT INTO seo_redirect_mappings (old_path, new_path, redirect_code, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (old_path) DO UPDATE SET
         new_path = EXCLUDED.new_path,
         redirect_code = EXCLUDED.redirect_code,
         updated_at = NOW()
       RETURNING *`,
      [oldPath, newPath, parseInt(redirectCode, 10)]
    );

    return successResponse(res, rows[0], 'Redirect mapping saved');
  } catch (err) {
    console.error('Error saving redirect mapping:', err);
    return errorResponse(res, 'Failed to save redirect mapping', 'REDIRECT_SAVE_ERROR', 500);
  }
};

module.exports = {
  getLocales,
  upsertLocale,
  getAiCrawlers,
  updateAiCrawler,
  getRedirects,
  upsertRedirect
};
