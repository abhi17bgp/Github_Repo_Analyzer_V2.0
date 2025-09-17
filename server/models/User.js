const database = require('../config/database');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

class User {
  static async create(email, password, username) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      const userId = storage.userIdCounter++;
      
      // Generate username from email if not provided (for backward compatibility)
      let finalUsername = username;
      if (!finalUsername) {
        const emailPrefix = email.split('@')[0];
        finalUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
        if (finalUsername.length < 3) {
          finalUsername = finalUsername + 'user';
        }
        if (finalUsername.length > 20) {
          finalUsername = finalUsername.substring(0, 20);
        }
      }
      
      const user = {
        id: userId,
        email,
        username: finalUsername,
        password: hashedPassword,
        created_at: new Date()
      };
      storage.users.set(userId, user);
      return { id: userId, email, username: finalUsername };
    }

    try {
      const db = database.getDb();
      const result = await db.collection('users').insertOne({
        email,
        username,
        password: hashedPassword,
        created_at: new Date()
      });

      return {
        id: result.insertedId.toString(),
        email,
        username
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      for (const user of storage.users.values()) {
        if (user.email === email) {
          // Ensure username exists for backward compatibility
          if (!user.username) {
            const emailPrefix = user.email.split('@')[0];
            user.username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
            if (user.username.length < 3) {
              user.username = user.username + 'user';
            }
            if (user.username.length > 20) {
              user.username = user.username.substring(0, 20);
            }
          }
          return user;
        }
      }
      return null;
    }

    try {
      const db = database.getDb();
      const user = await db.collection('users').findOne({ email });
      if (user) {
        user.id = user._id.toString();
        // Ensure username exists for backward compatibility
        if (!user.username) {
          const emailPrefix = user.email.split('@')[0];
          user.username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
          if (user.username.length < 3) {
            user.username = user.username + 'user';
          }
          if (user.username.length > 20) {
            user.username = user.username.substring(0, 20);
          }
          // Update the user in database with the generated username
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { username: user.username } }
          );
        }
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async findByUsername(username) {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      for (const user of storage.users.values()) {
        if (user.username === username) {
          return user;
        }
      }
      return null;
    }

    try {
      const db = database.getDb();
      const user = await db.collection('users').findOne({ username });
      if (user) {
        user.id = user._id.toString();
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      const user = storage.users.get(parseInt(id));
      if (user && !user.username) {
        // Ensure username exists for backward compatibility
        const emailPrefix = user.email.split('@')[0];
        user.username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
        if (user.username.length < 3) {
          user.username = user.username + 'user';
        }
        if (user.username.length > 20) {
          user.username = user.username.substring(0, 20);
        }
      }
      return user || null;
    }

    try {
      const db = database.getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
      if (user) {
        user.id = user._id.toString();
        // Ensure username exists for backward compatibility
        if (!user.username) {
          const emailPrefix = user.email.split('@')[0];
          user.username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
          if (user.username.length < 3) {
            user.username = user.username + 'user';
          }
          if (user.username.length > 20) {
            user.username = user.username.substring(0, 20);
          }
          // Update the user in database with the generated username
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { username: user.username } }
          );
        }
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  static validatePassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  static async deleteById(id) {
    console.log(`🗑️ Attempting to delete user: ${id}`);
    
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      const userId = parseInt(id);
      if (storage.users.has(userId)) {
        storage.users.delete(userId);
        console.log(`✅ Deleted user from fallback storage: ${userId}`);
        return true;
      }
      console.log(`❌ User not found in fallback storage: ${userId}`);
      return false;
    }

    try {
      const db = database.getDb();
      const query = { _id: new ObjectId(id) };
      
      console.log(`🔍 Deleting user with query:`, query);
      const result = await db.collection('users').deleteOne(query);
      
      console.log(`📊 User delete result:`, {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged
      });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`❌ Error deleting user ${id}:`, error);
      throw error;
    }
  }

  static async countDocuments() {
    if (database.isUsingFallback()) {
      // Fallback storage
      const storage = database.getFallbackStorage();
      return storage.users.size;
    }

    try {
      const db = database.getDb();
      return await db.collection('users').countDocuments();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;