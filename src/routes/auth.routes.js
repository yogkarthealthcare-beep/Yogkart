// ── routes/auth.routes.js ──────────────────────────────
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const ctrl        = require('../controllers/auth.controller');
const otpCtrl     = require('../controllers/otp.controller');
const googleCtrl  = require('../controllers/google-auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
];

// ── Social login validation ─────────────────────────────
// Google / Facebook: uid + email + name required
// LinkedIn: code bheja hai toh uid/email/name optional —
//           backend khud LinkedIn se fetch karega
const socialLoginRules = [
  param('provider')
    .exists().withMessage('Provider required')
    .isIn(['google', 'facebook', 'linkedin']).withMessage('Valid provider required'),

  // ✅ FIX: Sab fields optional rakho — custom validator neeche sab handle karega
  body('uid').optional().notEmpty().withMessage('uid required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('name required'),
  body('accessToken').optional().isString().withMessage('accessToken must be a string'),
  body('idToken').optional().isString().withMessage('idToken must be a string'),
  body('code').optional().isString().withMessage('code must be a string'),
  body('redirectUri').optional().isString(),
  body('photoUrl').optional().isString(),
  body('provider').optional().isString(),
  body('password').optional().isString(),

  // ✅ FIX: Provider-aware custom validation
  body().custom((value, { req }) => {
    const provider = req.params.provider;
    const { uid, email, name, accessToken, code } = req.body;

    if (provider === 'linkedin') {
      // LinkedIn: code ya accessToken bheja hai → valid
      // Ya directly uid + email + name bheja hai → valid
      const hasCode        = !!code;
      const hasToken       = !!accessToken;
      const hasDirectData  = uid && email && name;

      if (!hasCode && !hasToken && !hasDirectData) {
        throw new Error('LinkedIn requires: code, accessToken, or uid+email+name');
      }
    } else {
      // Google / Facebook: uid + email + name required
      if (!uid)   throw new Error('uid required');
      if (!email) throw new Error('Valid email required');
      if (!name)  throw new Error('name required');
    }

    return true;
  }),
];

// ── Standard Auth ───────────────────────────────────────
router.post('/register',         registerRules,    validate, ctrl.register);
router.post('/login',            loginRules,       validate, ctrl.login);
router.post('/social/:provider', socialLoginRules, validate, ctrl.socialLogin);
router.post('/refresh',                                      ctrl.refresh);
router.post('/logout',                                       ctrl.logout);
router.post('/logout-all',       protect,                    ctrl.logoutAll);
router.get('/me',                protect,                    ctrl.me);
router.put('/me',                protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
], validate, ctrl.updateMe);
router.put('/change-password',   protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Min 6 characters'),
], validate, ctrl.changePassword);

// ── Google Auth ─────────────────────────────────────────
router.post('/google', [
  body('idToken').notEmpty().withMessage('Google idToken required'),
], validate, googleCtrl.googleLogin);

// ── OTP Routes ─────────────────────────────────────────
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], validate, otpCtrl.sendOtp);
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP required'),
], validate, otpCtrl.verifyOtpHandler);
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Min 6 characters'),
], validate, otpCtrl.resetPassword);

module.exports = router;