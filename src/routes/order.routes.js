const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/order.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// Public tracking by Order ID + Phone (Task 2.1)
router.get('/track', ctrl.trackOrder);

// POST order allows both guest and authenticated checkout (Task 2.1)
router.post('/', optionalAuth, [
  body('items').isArray({ min: 1 }).withMessage('At least 1 item required'),
  body('items.*.product_id').isInt().withMessage('Invalid product id'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('total').isFloat({ min: 0 }).withMessage('Invalid total'),
  body('payment_method').notEmpty().withMessage('Payment method required'),
  body('address.name').notEmpty().withMessage('Address name required'),
  body('address.phone').notEmpty().withMessage('Address phone required'),
  body('address.line1').notEmpty().withMessage('Address line1 required'),
  body('address.city').notEmpty().withMessage('City required'),
  body('address.state').notEmpty().withMessage('State required'),
  body('address.pincode').isLength({ min: 6, max: 6 }).withMessage('Invalid pincode'),
], validate, ctrl.placeOrder);

// Logged-in order history
router.get('/', protect, ctrl.getOrders);

// Order detail & invoice (allows authenticated user or guest matching session/phone)
router.get('/:id/invoice', optionalAuth, ctrl.downloadInvoice);
router.get('/:id', optionalAuth, ctrl.getOrder);

// Order cancellation requires authentication
router.put('/:id/cancel', protect, ctrl.cancelOrder);

module.exports = router;
