const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

// POST /api/notifications/send
// Purpose: Send push notification to a specific user (Mocked since Firebase removed)
router.post('/send', async (req, res) => {
  const { recipientId, title, body, data } = req.body;

  if (!recipientId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Get Recipient's Push Token from MongoDB
    const recipient = await DatabaseService.getUserById(recipientId);
    
    if (!recipient || !recipient.pushToken) {
      console.warn(`[Notifications] No token found for user ${recipientId}`);
      return res.status(404).json({ error: 'User not reachable (No Push Token)' });
    }

    // 2. Mock sending notification
    // In a real app without Firebase, you might use expo-server-sdk here.

    res.json({ success: true, message: 'Notification sent (Mocked)' });

  } catch (error) {
    console.error('Notification Send Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/register-token
// Purpose: Save Push Token for the current user
router.post('/register-token', async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res.status(400).json({ error: 'UserId and Token required' });
  }

  try {
    await DatabaseService.updateUser(userId, { pushToken: pushToken });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification Register Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
