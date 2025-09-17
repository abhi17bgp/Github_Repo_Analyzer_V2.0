const express = require('express');
const router = express.Router();
const Statistics = require('../models/Statistics');

// Get application statistics
router.get('/', async (req, res) => {
  try {
    console.log('Fetching statistics...');
    
    // Get persistent statistics that only increase
    const stats = await Statistics.getStats();
    console.log('Total users:', stats.totalUsers);
    console.log('Total analyses:', stats.totalAnalyses);
    
    // Hardcoded values for uptime and response time
    const uptime = "95.9%";
    const averageResponseTime = "<5s";
    
    const response = {
      activeUsers: stats.totalUsers,
      repositoriesAnalyzed: stats.totalAnalyses,
      uptime: uptime,
      averageResponseTime: averageResponseTime
    };
    
    console.log('Stats response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      activeUsers: 0,
      repositoriesAnalyzed: 0,
      uptime: "95.9%",
      averageResponseTime: "<5s"
    });
  }
});

// Test endpoint to verify stats route is working
router.get('/test', (req, res) => {
  res.json({
    message: 'Stats route is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
