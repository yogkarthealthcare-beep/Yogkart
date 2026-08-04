const express = require('express');
const router = express.Router();
const commCtrl = require('../controllers/community.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

// Public feed & challenge endpoints
router.get('/posts', optionalAuth, commCtrl.listPosts);
router.get('/posts/:id/comments', commCtrl.getPostComments);
router.get('/challenges', commCtrl.listChallenges);

// Protected actions (Post composer, Like, Comment)
router.use(protect);
router.post('/posts', commCtrl.createPost);
router.post('/posts/:id/like', commCtrl.toggleLikePost);
router.post('/posts/:id/comments', commCtrl.addComment);

module.exports = router;
