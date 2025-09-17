const database = require('../config/database');

class Statistics {
  static async getStats() {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      if (!storage.statistics) {
        storage.statistics = {
          totalUsers: 0,
          totalAnalyses: 0,
          lastUpdated: new Date()
        };
      }
      return storage.statistics;
    }

    try {
      const db = database.getDb();
      let stats = await db.collection('statistics').findOne();
      if (!stats) {
        stats = {
          totalUsers: 0,
          totalAnalyses: 0,
          lastUpdated: new Date()
        };
        await db.collection('statistics').insertOne(stats);
      }
      return stats;
    } catch (error) {
      throw error;
    }
  }

  static async incrementUsers() {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      if (!storage.statistics) {
        storage.statistics = {
          totalUsers: 0,
          totalAnalyses: 0,
          lastUpdated: new Date()
        };
      }
      storage.statistics.totalUsers += 1;
      storage.statistics.lastUpdated = new Date();
      return storage.statistics;
    }

    try {
      const db = database.getDb();
      const result = await db.collection('statistics').findOneAndUpdate(
        {},
        { 
          $inc: { totalUsers: 1 },
          $set: { lastUpdated: new Date() }
        },
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async incrementAnalyses() {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      if (!storage.statistics) {
        storage.statistics = {
          totalUsers: 0,
          totalAnalyses: 0,
          lastUpdated: new Date()
        };
      }
      storage.statistics.totalAnalyses += 1;
      storage.statistics.lastUpdated = new Date();
      return storage.statistics;
    }

    try {
      const db = database.getDb();
      const result = await db.collection('statistics').findOneAndUpdate(
        {},
        { 
          $inc: { totalAnalyses: 1 },
          $set: { lastUpdated: new Date() }
        },
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Statistics;
