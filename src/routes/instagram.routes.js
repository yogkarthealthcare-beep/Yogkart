const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/instagram.controller');

// ── All Instagram Reel endpoints are public & auth-free ────────
router.get('/', ctrl.getPublicReels);
router.get('/admin/all', ctrl.getAdminReels);

// Admin mutation routes (create / update / delete / toggle)
router.post('/admin', ctrl.createReel);
router.put('/admin/:id', ctrl.updateReel);
router.delete('/admin/:id', ctrl.deleteReel);
router.patch('/admin/:id/toggle', ctrl.toggleReelActive);

module.exports = router;
