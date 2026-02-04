const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /users/profile
router.get('/profile', userController.getProfile);

// POST /users/profile
router.post('/profile', userController.saveProfile);

module.exports = router;
