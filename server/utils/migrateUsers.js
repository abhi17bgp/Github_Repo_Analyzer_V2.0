const database = require('../config/database');

/**
 * Migration script to add usernames to existing users
 * This script generates usernames from email addresses for existing users
 */
async function migrateUsers() {
  console.log('Starting user migration...');

  if (database.isUsingFallback()) {
    console.log('Using fallback storage - no migration needed');
    return;
  }

  try {
    const db = database.getDb();
    const usersCollection = db.collection('users');

    // Find all users without usernames
    const usersWithoutUsername = await usersCollection.find({ 
      username: { $exists: false } 
    }).toArray();

    console.log(`Found ${usersWithoutUsername.length} users without usernames`);

    for (const user of usersWithoutUsername) {
      // Generate username from email
      const emailPrefix = user.email.split('@')[0];
      let username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '');
      
      // Ensure username is at least 3 characters
      if (username.length < 3) {
        username = username + 'user';
      }
      
      // Ensure username is not longer than 20 characters
      if (username.length > 20) {
        username = username.substring(0, 20);
      }

      // Check if username already exists and add number if needed
      let finalUsername = username;
      let counter = 1;
      
      while (await usersCollection.findOne({ username: finalUsername })) {
        finalUsername = `${username}${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          finalUsername = `${username}${Date.now()}`;
          break;
        }
      }

      // Update user with username
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { username: finalUsername } }
      );

      console.log(`Updated user ${user.email} with username: ${finalUsername}`);
    }

    console.log('User migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsers().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateUsers }; 