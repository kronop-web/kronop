const jwt = require('jsonwebtoken');
const supabase = require('../services/supabaseClient');
const DatabaseService = require('../services/databaseService');

/**
 * Middleware to verify Supabase JWT Token
 * Usage: router.get('/protected-route', verifyToken, (req, res) => { ... });
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
    
    // Attach user info to request
    req.user = user;
    req.uid = user.id; // Supabase user ID

    // Fetch MongoDB user and attach
    const dbUser = await DatabaseService.findUserBySupabaseId(req.uid);
    if (dbUser) {
      req.dbUser = dbUser;
      req.userId = dbUser._id.toString();
    }

    next();
  } catch (error) {
    console.error('Token Verification Error:', error.message);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware to verify Mongo ID format (simple check to prevent CastErrors)
const validateMongoId = (paramName) => (req, res, next) => {
  const id = req.params[paramName] || req.query[paramName] || req.body[paramName];
  if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: `Invalid ${paramName} format` });
  }
  next();
};

module.exports = {
  verifyToken,
  validateMongoId
};
