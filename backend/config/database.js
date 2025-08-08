const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('\nTo fix this issue:');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. Or use MongoDB Atlas (cloud database)');
    console.log('3. Update the MONGODB_URI in your .env file');
    console.log('\nFor local MongoDB:');
    console.log('- Install MongoDB from https://www.mongodb.com/try/download/community');
    console.log('- Start MongoDB service');
    console.log('\nFor MongoDB Atlas:');
    console.log('- Create account at https://www.mongodb.com/atlas');
    console.log('- Create a cluster and get connection string');
    console.log('- Update MONGODB_URI in .env file');
    
    // Don't exit in development, just log the error
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
