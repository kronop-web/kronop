const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// GET /content/photo/user
router.get('/photo/user', contentController.getUserPhotos);

// GET /content/photo (PUBLIC - for all photos)
router.get('/photo', contentController.getUserPhotos);

// GET /content/video (PUBLIC - for all videos)
router.get('/video', contentController.getUserVideos);

// GET /content/reels (PUBLIC - for all reels)
router.get('/reels', contentController.getUserReels);

// GET /content/story (PUBLIC)
router.get('/story', contentController.getUserStories);

// GET /content/shayari-photo (PUBLIC - for all shayari photos)
router.get('/shayari-photo', contentController.getUserShayariPhotos);

module.exports = router;
