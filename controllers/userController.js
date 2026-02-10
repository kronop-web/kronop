const User = require('../models/User');
const supabase = require('../services/supabaseClient');

const getProfile = async (req, res) => {
    try {
        const { userId, supabaseId, phone } = req.query;
        let query = {};
        
        if (userId) query._id = userId;
        else if (supabaseId) query.supabase_id = supabaseId;
        else if (phone) query.phone = phone;
        else return res.status(400).json({ error: 'Missing identifier (userId, supabaseId, or phone)' });

        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const saveProfile = async (req, res) => {
    try {
        const { supabaseId, phone, email, displayName, avatar, bio } = req.body;
        
        if (!supabaseId && !phone) {
            return res.status(400).json({ error: 'supabaseId or phone is required' });
        }

        let user = await User.findOne({ 
            $or: [
                { supabase_id: supabaseId },
                { phone: phone }
            ].filter(q => Object.values(q)[0] !== undefined)
        });

        if (user) {
            if (email) user.email = email;
            if (displayName) user.displayName = displayName;
            if (avatar) user.avatar = avatar;
            if (bio) user.bio = bio;
            await user.save();
        } else {
            user = new User({
                supabase_id: supabaseId,
                phone,
                email,
                displayName,
                avatar,
                bio
            });
            await user.save();
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const syncSupabaseUser = async (req, res) => {
    try {
        const { supabaseId, email, displayName } = req.body;
        
        if (!supabaseId) {
            return res.status(400).json({ 
                success: false,
                error: 'supabaseId is required' 
            });
        }

        let user = await User.findOne({ supabase_id: supabaseId });
        
        if (!user) {
            // SECURITY: Only allow existing users to login
            // Check if user exists by email as fallback
            if (email) {
                user = await User.findOne({ email: email });
                if (user) {
                    // Update existing user with supabase ID
                    user.supabase_id = supabaseId;
                    if (displayName) user.displayName = displayName;
                    await user.save();
                    return res.json({ 
                        success: true, 
                        data: user,
                        message: 'User synced successfully'
                    });
                }
            }
            
            // User not found in MongoDB - Access Denied
            return res.status(403).json({ 
                success: false,
                error: 'Access Denied - User not found in database' 
            });
        }

        // Update existing user data
        if (email) user.email = email;
        if (displayName) user.displayName = displayName;
        await user.save();

        res.json({ 
            success: true, 
            data: user,
            message: 'User synced successfully'
        });
    } catch (error) {
        console.error('Sync Supabase User Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to sync user' 
        });
    }
};

const uploadImage = async (req, res) => {
    try {
        // Get user from token (assuming auth middleware is implemented)
        const userId = req.user?.id || req.body.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'User authentication required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const image = req.file;
        const type = req.body.type || 'profile'; // 'profile' or 'cover'
        
        // Get user from MongoDB
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // For now, we'll store image data as base64 in MongoDB
        // In production, you might want to use a CDN like BunnyCDN
        const imageBase64 = image.buffer.toString('base64');
        const imageUrl = `data:${image.mimetype};base64,${imageBase64}`;
        
        // Update user profile with image URL
        if (type === 'profile') {
            user.avatar_url = imageUrl;
        } else if (type === 'cover') {
            user.cover_image_url = imageUrl;
        }
        
        await user.save();
        
        res.json({ 
            success: true, 
            data: imageUrl,
            message: `${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully`
        });
        
    } catch (error) {
        console.error('Upload Image Error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

module.exports = {
    getProfile,
    saveProfile,
    syncSupabaseUser,
    uploadImage
};
