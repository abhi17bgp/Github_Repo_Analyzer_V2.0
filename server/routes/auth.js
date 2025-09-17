const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Statistics = require('../models/Statistics');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Email, username, and password are required' });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
    }

    // Check if username contains only alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Check if user already exists by email
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if username is already taken
    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Create new user
    const user = await User.create(email, password, username);
    
    // Increment user count in statistics
    await Statistics.incrementUsers();
    console.log('✅ User registration trigger: Incremented user count');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return res.json({ available: false, message: 'Username must be between 3 and 20 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.json({ available: false, message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Check if username exists
    const existingUser = await User.findByUsername(username);
    
    res.json({ 
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Delete user account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Import Repository model here to avoid circular dependency
    const Repository = require('../models/Repository');
    
    console.log(`🗑️ Starting account deletion for user: ${userId}`);
    
    // Delete all user's repositories with proper error handling
    const repositories = await Repository.findByUserId(userId);
    console.log(`📁 Found ${repositories.length} repositories to delete`);
    
    let deletedRepositories = 0;
    let failedDeletions = [];
    
    for (const repo of repositories) {
      try {
        const deleted = await Repository.deleteById(userId, repo.id);
        if (deleted) {
          deletedRepositories++;
          console.log(`✅ Deleted repository: ${repo.repo_url}`);
        } else {
          failedDeletions.push(repo.repo_url);
          console.log(`❌ Failed to delete repository: ${repo.repo_url}`);
        }
      } catch (repoError) {
        failedDeletions.push(repo.repo_url);
        console.error(`❌ Error deleting repository ${repo.repo_url}:`, repoError);
      }
    }
    
    // Delete user profile
    console.log(`👤 Deleting user profile: ${userId}`);
    const deleted = await User.deleteById(userId);
    
    if (!deleted) {
      console.log(`❌ Failed to delete user profile: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Account deletion completed: Removed user ${userId} and ${deletedRepositories}/${repositories.length} repositories`);
    
    // Return success even if some repositories failed to delete
    res.json({ 
      message: 'Account deleted successfully',
      deletedRepositories: deletedRepositories,
      totalRepositories: repositories.length,
      failedDeletions: failedDeletions.length > 0 ? failedDeletions : undefined
    });
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({ 
      message: 'Server error during account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;