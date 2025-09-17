const database = require('../config/database');
const User = require('../models/User');
const Repository = require('../models/Repository');
const Statistics = require('../models/Statistics');
require('dotenv').config();

async function initializeStats() {
  try {
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Connected to database');

    // Get current counts
    const totalUsers = await User.countDocuments();
    const totalRepositories = await Repository.countDocuments();

    console.log(`Current users: ${totalUsers}`);
    console.log(`Current repositories: ${totalRepositories}`);

    // Get or create statistics document
    let stats = await Statistics.getStats();
    
    if (stats.totalUsers === 0 && stats.totalAnalyses === 0) {
      // Initialize with current data
      if (database.isUsingFallback()) {
        const storage = database.getFallbackStorage();
        storage.statistics = {
          totalUsers: totalUsers,
          totalAnalyses: totalRepositories,
          lastUpdated: new Date()
        };
        stats = storage.statistics;
      } else {
        const db = database.getDb();
        await db.collection('statistics').updateOne(
          {},
          { 
            $set: { 
              totalUsers: totalUsers,
              totalAnalyses: totalRepositories,
              lastUpdated: new Date()
            }
          },
          { upsert: true }
        );
        stats = await Statistics.getStats();
      }
      console.log('✅ Updated user count to', stats.totalUsers);
    } else {
      console.log('Statistics already exist:', stats);
    }

    console.log('📊 Final statistics:');
    console.log(`   Users: ${stats.totalUsers}`);
    console.log(`   Analyses: ${stats.totalAnalyses}`);
    console.log(`   Last Updated: ${stats.lastUpdated}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing stats:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeStats();
}

module.exports = initializeStats;
