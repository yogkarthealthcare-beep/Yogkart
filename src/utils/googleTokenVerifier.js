<<<<<<< HEAD
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const https = require('https');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// In-memory cache for Firebase public certificates
let firebaseCertCache = null;
let firebaseCertCacheExpiry = 0;

/**
 * Fetch Firebase public certificates from Google API with caching
 * @returns {Promise<Record<string, string>>}
 */
const fetchFirebaseCerts = () => {
  return new Promise((resolve, reject) => {
    if (firebaseCertCache && Date.now() < firebaseCertCacheExpiry) {
      return resolve(firebaseCertCache);
    }

    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com', (res) => {
=======
// src/utils/googleTokenVerifier.js
// Firebase ID Token aur direct Google ID Token dono verify karta hai

const https   = require('https');
const jwt     = require('jsonwebtoken');

// Google public keys cache
let googleKeysCache = null;
let googleKeysCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const fetchGooglePublicKeys = () => {
  return new Promise((resolve, reject) => {
    if (googleKeysCache && Date.now() - googleKeysCacheTime < CACHE_TTL) {
      return resolve(googleKeysCache);
    }
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', res => {
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
<<<<<<< HEAD
          const certs = JSON.parse(data);
          
          // Cache for the duration specified in Cache-Control header (or 1 hour default)
          const cacheControl = res.headers['cache-control'] || '';
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3600 * 1000;
          
          firebaseCertCache = certs;
          firebaseCertCacheExpiry = Date.now() + maxAge;
          
          resolve(certs);
        } catch (err) {
          reject(new Error('Failed to parse Firebase certificates'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Verifies a Firebase ID token.
 * Firebase ID tokens are signed RS256 JWTs.
 * @param {string} token 
 * @returns {Promise<any>}
 */
const verifyFirebaseToken = async (token) => {
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
    throw new Error('Invalid token format');
  }

  const kid = decodedToken.header.kid;
  const certs = await fetchFirebaseCerts();
  const cert = certs[kid];

  if (!cert) {
    throw new Error('Public key not found for token kid');
  }

  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'yogkart-eedb8';

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      cert,
      {
        algorithms: ['RS256'],
        audience: firebaseProjectId,
        issuer: `https://securetoken.google.com/${firebaseProjectId}`
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
};

/**
 * Securely verifies a Google ID Token or Firebase Google ID Token.
 * @param {string} idToken 
 * @returns {Promise<{ uid: string, email: string, name: string, picture: string, email_verified: boolean }>}
 */
const verifyGoogleToken = async (idToken) => {
  if (!idToken) throw new Error('Token is required');

  // Try direct Google OAuth2 token verification first
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    return {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    };
  } catch (directErr) {
    // If direct verification fails, attempt verifying as Firebase ID Token
    try {
      const payload = await verifyFirebaseToken(idToken);
      return {
        uid: payload.sub, // Firebase UID
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || '',
        email_verified: payload.email_verified || false
      };
    } catch (firebaseErr) {
      console.error('Google token verification failed:', {
        directError: directErr.message,
        firebaseError: firebaseErr.message
      });
      throw new Error('Invalid or expired Google auth token');
=======
          googleKeysCache = JSON.parse(data);
          googleKeysCacheTime = Date.now();
          resolve(googleKeysCache);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

// Google Auth Library se verify (direct Google token)
const verifyWithGoogleAuthLibrary = async (idToken) => {
  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
      uid:     payload.sub,
      email:   payload.email,
      name:    payload.name,
      picture: payload.picture,
      source:  'google-auth-library'
    };
  } catch (e) {
    throw new Error(`Google auth library verify failed: ${e.message}`);
  }
};

// Firebase public keys se verify
const verifyWithFirebaseKeys = async (idToken) => {
  const keys = await fetchGooglePublicKeys();
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw new Error('Invalid token header');

  const publicKey = keys[decoded.header.kid];
  if (!publicKey) throw new Error('Public key not found for kid: ' + decoded.header.kid);

  const projectId = process.env.FIREBASE_PROJECT_ID || 'yogkart-eedb8';
  const verified  = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience:   projectId,
    issuer:     `https://securetoken.google.com/${projectId}`,
  });

  return {
    uid:     verified.sub || verified.uid,
    email:   verified.email,
    name:    verified.name,
    picture: verified.picture,
    source:  'firebase'
  };
};

// Main verifier — Firebase pehle try karo, phir Google Auth Library
const verifyGoogleToken = async (idToken) => {
  try {
    return await verifyWithFirebaseKeys(idToken);
  } catch (firebaseErr) {
    try {
      return await verifyWithGoogleAuthLibrary(idToken);
    } catch (googleErr) {
      throw new Error(`Token verification failed. Firebase: ${firebaseErr.message} | Google: ${googleErr.message}`);
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
    }
  }
};

<<<<<<< HEAD
module.exports = {
  verifyGoogleToken
};
=======
module.exports = { verifyGoogleToken };
>>>>>>> 704c657f540f366cfc5df90c9e9cb1d246df1e11
