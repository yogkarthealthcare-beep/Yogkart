// src/routes/blog.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/blog.controller');

// Admin routes (must be defined before /:slug)
router.get('/admin/all', ctrl.adminGetBlogs);
router.post('/admin', ctrl.createBlog);
router.put('/admin/:id', ctrl.updateBlog);
router.delete('/admin/:id', ctrl.deleteBlog);

// Public routes
router.get('/', ctrl.getBlogs);
router.get('/:slug', ctrl.getBlogBySlug);

module.exports = router;
