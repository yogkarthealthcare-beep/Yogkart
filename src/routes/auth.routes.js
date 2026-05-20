// ── routes/auth.routes.js ──────────────────────────────
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const ctrl        = require('../controllers/auth.controller');
const otpCtrl     = require('../controllers/otp.controller');
const googleCtrl  = require('../controllers/google-auth.controller'); // ✅ Google idToken verify
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

// Social login validation rules
const socialLoginRules = [
  param('provider')
    .exists().withMessage('Provider required')
    .isIn(['google', 'facebook', 'linkedin']).withMessage('Valid provider required'),
  body('uid')
    .if((value, { req }) => req.params.provider !== 'linkedin')
    .notEmpty().withMessage('uid required'),
  body('email')
    .if((value, { req }) => req.params.provider !== 'linkedin')
    .isEmail().normalizeEmail().withMessage('Valid email required'),
  body('name')
    .if((value, { req }) => req.params.provider !== 'linkedin')
    .trim().isLength({ min: 1 }).withMessage('name required'),
  body('accessToken').optional().isString().withMessage('accessToken must be a string'),
  body('code')
    .if((value, { req }) => req.params.provider === 'linkedin')
    .custom((value, { req }) => {
      if (!value && !req.body.accessToken) {
        throw new Error('LinkedIn code or accessToken required');
      }
      return true;
    }),
];

// ── Standard Auth ───────────────────────────────────────
router.post('/register',         registerRules,     validate, ctrl.register);
router.post('/login',            loginRules,        validate, ctrl.login);
router.post('/social/:provider', socialLoginRules,  validate, ctrl.socialLogin); // Google / Facebook / LinkedIn
router.post('/refresh',                                       ctrl.refresh);
router.post('/logout',                                        ctrl.logout);
router.post('/logout-all',       protect,                     ctrl.logoutAll);
router.get('/me',                protect,                     ctrl.me);
router.put('/me',                protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
], validate, ctrl.updateMe);
router.put('/change-password',   protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Min 6 characters'),
], validate, ctrl.changePassword);

// ── Google Auth ─────────────────────────────────────────
// Frontend Firebase → idToken → backend verify → JWT milega
// POST /api/auth/google   Body: { idToken: "..." }
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