// src/utils/googleTokenVerifier.js
// Firebase ID Token and direct Google ID Token verification

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const https = require('https');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// In-memory cache for Firebase public certificates
let firebaseCertCache = null;
let firebaseCertCacheExpiry = 0;

/**
 * Fetch Firebase public certificates from Google API with caching.
 * Respects Cache-Control max-age header; defaults to 1 hour.
 * @returns {Promise<Record<string, string>>}
 */
const fetchFirebaseCerts = () => {
  return new Promise((resolve, reject) => {
    if (firebaseCertCache && Date.now() < firebaseCertCacheExpiry) {
      return resolve(firebaseCertCache);
    }

    https.get(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const certs = JSON.parse(data);

            // Honour Cache-Control max-age if present, else default to 1 hour
            const cacheControl = res.headers['cache-control'] || '';
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            const maxAge = maxAgeMatch
              ? parseInt(maxAgeMatch[1]) * 1000
              : 60 * 60 * 1000;

            firebaseCertCache = certs;
            firebaseCertCacheExpiry = Date.now() + maxAge;

            resolve(certs);
          } catch (err) {
            reject(new Error('Failed to parse Firebase certificates'));
          }
        });
      }
    ).on('error', reject);
  });
};

/**
 * Verify a Firebase ID token (RS256 JWT signed by Firebase).
 * @param {string} idToken
 * @returns {Promise<object>} Decoded payload
 */
const verifyWithFirebaseKeys = async (idToken) => {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) {
    throw new Error('Invalid token header');
  }

  const certs = await fetchFirebaseCerts();
  const publicKey = certs[decoded.header.kid];
  if (!publicKey) {
    throw new Error('Public key not found for kid: ' + decoded.header.kid);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'yogkart-eedb8';

  const verified = await new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      publicKey,
      {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
      },
      (err, payload) => (err ? reject(err) : resolve(payload))
    );
  });

  return {
    uid: verified.sub || verified.uid,
    email: verified.email,
    name: verified.name,
    picture: verified.picture,
    email_verified: verified.email_verified || false,
    source: 'firebase',
  };
};

/**
 * Verify a standard Google OAuth2 ID token via the Google Auth Library.
 * @param {string} idToken
 * @returns {Promise<object>} Normalised user payload
 */
const verifyWithGoogleAuthLibrary = async (idToken) => {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    email_verified: payload.email_verified,
    source: 'google-auth-library',
  };
};

/**
 * Verify a Google or Firebase ID token.
 * Strategy: try Firebase keys first, fall back to Google Auth Library.
 *
 * @param {string} idToken
 * @returns {Promise<{ uid: string, email: string, name: string, picture: string, email_verified: boolean, source: string }>}
 */
const verifyGoogleToken = async (idToken) => {
  if (!idToken) throw new Error('Token is required');

  try {
    return await verifyWithFirebaseKeys(idToken);
  } catch (firebaseErr) {
    try {
      return await verifyWithGoogleAuthLibrary(idToken);
    } catch (googleErr) {
      console.error('Google token verification failed:', {
        firebaseError: firebaseErr.message,
        googleError: googleErr.message,
      });
      throw new Error('Invalid or expired Google auth token');
    }
  }
};

module.exports = { verifyGoogleToken };