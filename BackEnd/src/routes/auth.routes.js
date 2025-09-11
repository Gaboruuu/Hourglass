const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    // Check if username or email already exists
    const existingUser = await User.findByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(req.body.email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create new user
    const newUser = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'user'
    });

    res.status(201).json({ 
      message: 'User was registered successfully!', 
      userId: newUser.id 
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    // Find user by username
    const user = await User.findByUsername(req.body.username);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password validity
    const passwordIsValid = await bcrypt.compare(req.body.password, user.password);
    
    if (!passwordIsValid) {
      return res.status(401).json({
        accessToken: null,
        message: 'Invalid Password!'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      accessToken: token
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message 
    });
  }
});

// Get current user info
router.get('/me', require('../middleware/auth.middleware').verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ 
      message: error.message 
    });
  }
});

module.exports = router;
