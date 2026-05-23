/**
 * ============================================================
 * Dummy Data Generator Utility for Social Logins
 * ============================================================
 * Generates dummy data that complies with system and DB
 * validation rules, ensuring user registration succeeds.
 */

/**
 * Generates a random valid phone number format.
 * Format: +91 followed by 10 digits starting with 6-9
 * @returns {string}
 */
const generateDummyPhone = () => {
  const prefixes = ['6', '7', '8', '9'];
  const firstDigit = prefixes[Math.floor(Math.random() * prefixes.length)];
  let restDigits = '';
  for (let i = 0; i < 9; i++) {
    restDigits += Math.floor(Math.random() * 10).toString();
  }
  return `+91${firstDigit}${restDigits}`;
};

/**
 * Derives a clean name from email prefix if name is missing
 * @param {string} email
 * @returns {string}
 */

const generateDummyName = (email) => {
  if (!email) return 'Google User';

  const prefix = email.split('@')[0];

  return prefix
    .split(/[._+\-]/)
    .filter(word => word.trim() !== '')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
module.exports = {
  generateDummyPhone,
  generateDummyName
};
