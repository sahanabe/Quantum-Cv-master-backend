require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quantumcv';

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@quantumcv.com' });
    if (existingUser) {
      console.log('Test user already exists');
      process.exit(0);
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@quantumcv.com',
      password: hashedPassword,
      role: 'user',
      isVerified: true
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: test@quantumcv.com');
    console.log('Password: password123');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@quantumcv.com' });
    if (!adminExists) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@quantumcv.com',
        password: adminPassword,
        role: 'admin',
        isVerified: true
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
      console.log('Email: admin@quantumcv.com');
      console.log('Password: admin123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser(); 