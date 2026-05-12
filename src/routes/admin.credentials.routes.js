const express = require('express');
const router = express.Router();
const { adminProtect, superAdminOnly } = require('../middleware/admin.auth.middleware');
const credentialsCtrl = require('../controllers/admin.credentials.controller');

// All credential routes require admin auth
router.use(adminProtect);

// ── Credentials Management ─────────────────────────────
// List credentials
router.get('/', credentialsCtrl.getCredentials);

// Get credential categories
router.get('/categories', credentialsCtrl.getCredentialCategories);

// Get single credential (with decrypted value - requires super admin)
router.get('/:id', superAdminOnly, credentialsCtrl.getCredentialById);

// Create new credential (super admin only)
router.post('/', superAdminOnly, credentialsCtrl.createCredential);

// Update credential (super admin only)
router.put('/:id', superAdminOnly, credentialsCtrl.updateCredential);

// Toggle credential active/inactive
router.patch('/:id/toggle', superAdminOnly, credentialsCtrl.toggleCredential);

// Test credential connectivity
router.post('/:id/test', credentialsCtrl.testCredential);

// Delete credential (super admin only)
router.delete('/:id', superAdminOnly, credentialsCtrl.deleteCredential);

module.exports = router;
