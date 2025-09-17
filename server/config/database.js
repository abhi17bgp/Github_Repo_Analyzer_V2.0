const { MongoClient } = require("mongodb");

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.connect();
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI;
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db("github-analyzer");
      console.log("Connected to MongoDB successfully");

      // Create indexes for better performance
      await this.createIndexes();
    } catch (error) {
      console.error("MongoDB connection error:", error);
      // For development, we'll use a simple in-memory store if MongoDB is not available
      this.setupFallbackStorage();
    }
  }

  async createIndexes() {
    try {
      // Create unique index on email for users collection
      await this.db
        .collection("users")
        .createIndex({ email: 1 }, { unique: true });

      // Create index on user_id for repositories collection
      await this.db.collection("repositories").createIndex({ user_id: 1 });

      console.log("Database indexes created successfully");
    } catch (error) {
      console.error("Error creating indexes:", error);
    }
  }

  setupFallbackStorage() {
    console.log("Setting up fallback in-memory storage...");
    this.fallbackStorage = {
      users: new Map(),
      repositories: new Map(),
      userIdCounter: 1,
      repoIdCounter: 1,
    };

    // Add some sample users with usernames for testing
    this.addSampleUsers();
  }

  addSampleUsers() {
    // Add a sample user with username for testing
    const sampleUser = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      password: "$2a$10$dummy.hash.for.testing",
      created_at: new Date()
    };
    this.fallbackStorage.users.set(1, sampleUser);
    this.fallbackStorage.userIdCounter = 2;
  }

  getDb() {
    return this.db;
  }

  getClient() {
    return this.client;
  }

  // Fallback methods for when MongoDB is not available
  getFallbackStorage() {
    return this.fallbackStorage;
  }

  isUsingFallback() {
    return !this.db && this.fallbackStorage;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = new Database();
