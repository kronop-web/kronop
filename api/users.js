const express = require('express');
const router = express.Router();
const ProfileService = require('../services/profileService');
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Sync Supabase user with MongoDB
router.post('/sync', async (req, res) => {
  try {
    const result = await userController.syncSupabaseUser(req, res);
    return result;
  } catch (error) {
    console.error('Sync Supabase User Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configure Multer for local uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Warning: Could not create directory ${uploadDir}:`, error.message);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.get('/profile', async (req, res) => {
  try {
    const { userId, phone } = req.query;
    if (!userId && !phone) {
       console.warn('[API] Missing userId or phone in /profile request');
       // Don't return error, just null data as before, or handle gracefully
    }
    
    const data = await ProfileService.getProfile({ userId, phone });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(200).json({ success: false, error: error.message, data: null });
  }
});

router.put('/profile', upload.any(), async (req, res) => {
  try {
    
    // Check for userId in various places (body, query, or params)
    const userId = req.body.userId || req.body.id || req.query.userId || req.params.id;
    
    if (!userId) {
      console.error('[API] Update Profile Error: No user identifier provided');
      return res.status(400).json({ error: 'User ID is required for profile updates' });
    }

    const payload = { ...req.body, id: userId };
    
    // Map userId to id for ProfileService compatibility
    if (!payload.id) {
      payload.id = userId;
    }
    
    // Handle file upload if present in the update request
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Take the first file
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      // Update avatar/profilePic fields
      payload.avatar = imageUrl;
      payload.profilePic = imageUrl;
    }

    const user = await ProfileService.updateProfile(payload);
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// Handle profile image upload (supports both file upload and direct URL)
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {

    const userId = req.body.userId;
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      // Construct full URL so frontend can display it immediately
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image file or URL is required' });
    }

    const url = await ProfileService.uploadProfileImage(userId, imageUrl);
    res.json({ success: true, data: url });
  } catch (error) {
    console.error('Upload Image Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/supporters', async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/supporting', async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await ProfileService.getProfile({ userId: req.params.id });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', upload.any(), async (req, res) => {
  try {
    const payload = { ...req.body, id: req.params.id };
    
    // Handle file upload if present
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${file.filename}`;
      payload.avatar = imageUrl;
      payload.profilePic = imageUrl;
    }

    const user = await ProfileService.updateProfile(payload);
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



