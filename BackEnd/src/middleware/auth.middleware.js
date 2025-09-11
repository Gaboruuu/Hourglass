const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ 
      message: 'No token provided!' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Unauthorized!' 
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findById(req.userId);
    
    if (user && user.role === 'admin') {
      next();
      return;
    }
    
    res.status(403).json({ 
      message: 'Require Admin Role!' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message 
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin
};
