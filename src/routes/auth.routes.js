const express = require('express');
const { body, param } = require('express-validator');
const router     = express.Router();
const ctrl       = require('../controllers/auth.controller');
const otpCtrl    = require('../controllers/otp.controller');
const googleCtrl = require('../controllers/google-auth.controller');
const { protect }  = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// ── Signup — 2 step OTP ───────────────────────────────────
router.post('/signup-init', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone required'),
], validate, ctrl.signupInit);

router.post('/signup-verify', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP required'),
], validate, ctrl.signupVerify);

router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('type').optional().isIn(['signup', 'password_reset']),
], validate, ctrl.resendOtp);

// ── Standard Auth ─────────────────────────────────────────
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
], validate, ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
], validate, ctrl.login);

router.post('/social/:provider', [
  param('provider').isIn(['google', 'facebook', 'linkedin']).withMessage('Valid provider required'),
  body('uid').optional().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().isLength({ min: 1 }),
  body('accessToken').optional().isString(),
  body('code').optional().isString(),
  body().custom((value, { req }) => {
    if (req.params.provider === 'linkedin') {
      if (!req.body.accessToken && !req.body.code && (!req.body.uid || !req.body.email || !req.body.name))
        throw new Error('LinkedIn requires code/accessToken or email, name, uid');
    } else {
      if (!req.body.uid || !req.body.email || !req.body.name)
        throw new Error('uid, email and name are required');
    }
    return true;
  }),
], validate, ctrl.socialLogin);

router.post('/refresh',    ctrl.refresh);
router.post('/logout',     ctrl.logout);
router.post('/logout-all', protect, ctrl.logoutAll);
router.get('/me',          protect, ctrl.me);
router.put('/me',          protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
], validate, ctrl.updateMe);
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Min 6 characters'),
], validate, ctrl.changePassword);

// ── Google ────────────────────────────────────────────────
router.post('/google', [
  body('idToken').notEmpty().withMessage('Google idToken required'),
], validate, googleCtrl.googleLogin);

// ── OTP / Forgot Password ─────────────────────────────────
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('type').optional().isIn(['email_verify', 'password_reset']),
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