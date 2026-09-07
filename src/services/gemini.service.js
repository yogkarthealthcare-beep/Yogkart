/**
 * src/services/gemini.service.js
 * Google Gemini API Client (gemini-flash-latest / gemini-2.0-flash / gemini-1.5-flash)
 * Automatically fetches API key from Database (system_credentials / site_settings) or .env
 */

const { query } = require('../config/database');
const { decryptCredential } = require('../utils/encryption');

/**
 * Fetch Gemini API key from database (system_credentials or site_settings)
 * @returns {Promise<string|null>}
 */
async function getGeminiApiKeyFromDb() {
  try {
    // 1. Look in system_credentials table
    const credRes = await query(
      `SELECT credential_value FROM system_credentials 
       WHERE credential_key IN (
         'GEMINI_API_KEY',
         'GOOGLE_API_KEY',
         'API_KEY_GOOGLE',
         'GEMINI_SECRET',
         'GEMINI_KEY',
         'GOOGLE_GEMINI_API_KEY'
       )
       AND is_active = true 
       ORDER BY id DESC LIMIT 1`
    );

    if (credRes && credRes.rows && credRes.rows.length > 0) {
      const rawVal = credRes.rows[0].credential_value;
      if (rawVal) {
        try {
          const decrypted = decryptCredential(rawVal);
          if (decrypted && decrypted.trim()) return decrypted.trim();
        } catch {
          // If already plain text (not encrypted format)
          if (typeof rawVal === 'string' && rawVal.trim()) return rawVal.trim();
        }
      }
    }

    // 2. Fallback check in site_settings table
    const settingRes = await query(
      `SELECT setting_value FROM site_settings 
       WHERE setting_key IN ('gemini_api_key', 'google_api_key', 'gemini_config')
       LIMIT 1`
    );

    if (settingRes && settingRes.rows && settingRes.rows.length > 0) {
      const val = settingRes.rows[0].setting_value;
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (typeof val === 'object' && val) {
        const k = val.apiKey || val.api_key || val.key || val.secret;
        if (k) return String(k).trim();
      }
    }
  } catch (err) {
    console.warn('⚠️ [Gemini Service] Could not fetch Gemini API key from database:', err.message);
  }
  return null;
}

/**
 * Resolves Gemini API Key in priority order:
 * 1. Explicitly passed apiKey in function call
 * 2. Database (system_credentials / site_settings)
 * 3. Environment variable (GEMINI_API_KEY / GOOGLE_API_KEY)
 */
async function resolveGeminiApiKey(explicitKey = null) {
  if (explicitKey && String(explicitKey).trim()) {
    return String(explicitKey).trim();
  }

  // Check Database
  const dbKey = await getGeminiApiKeyFromDb();
  if (dbKey) {
    return dbKey;
  }

  // Check .env
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey && String(envKey).trim()) {
    return String(envKey).trim();
  }

  return null;
}

/**
 * Generate text or response from Google Gemini API
 * @param {Object} options
 * @param {string} options.prompt - Text prompt for Gemini
 * @param {string} [options.systemInstruction] - Optional system instructions
 * @param {string} [options.apiKey] - Google Gemini API Key (defaults to DB / process.env.GEMINI_API_KEY)
 * @param {string} [options.model] - Model name (default: 'gemini-flash-latest')
 * @param {number} [options.temperature] - Temperature (0.0 to 2.0)
 * @returns {Promise<{ text: string, raw: Object }>}
 */
async function generateGeminiContent({
  prompt,
  systemInstruction,
  apiKey = null,
  model = 'gemini-flash-latest',
  temperature = 0.7
}) {
  const key = await resolveGeminiApiKey(apiKey);

  if (!key) {
    throw new Error('Gemini API Key is not found in database (system_credentials) or environment variables (GEMINI_API_KEY).');
  }

  if (!prompt || !String(prompt).trim()) {
    throw new Error('Prompt is required for Gemini content generation.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const bodyPayload = {
    contents: [
      {
        parts: [
          {
            text: String(prompt).trim()
          }
        ]
      }
    ],
    generationConfig: {
      temperature: Number(temperature) || 0.7
    }
  };

  if (systemInstruction && String(systemInstruction).trim()) {
    bodyPayload.systemInstruction = {
      parts: [
        {
          text: String(systemInstruction).trim()
        }
      ]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': key
    },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(30000) // 30s timeout
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = { message: errText };
    }
    const message = parsedErr?.error?.message || errText || `Gemini API returned status ${response.status}`;
    throw new Error(`Gemini API Error (${response.status}): ${message}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    success: true,
    text: generatedText,
    model,
    raw: data
  };
}

module.exports = {
  getGeminiApiKeyFromDb,
  resolveGeminiApiKey,
  generateGeminiContent
};
