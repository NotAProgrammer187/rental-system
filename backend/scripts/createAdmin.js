require('dotenv').config();
const connectDB = require('../config/database');
const User = require('../models/User');

async function main() {
  try {
    const name = process.env.ADMIN_NAME || 'Admin';
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment');
      process.exit(1);
    }

    await connectDB();

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, password, role: 'admin', verificationStatus: 'approved' });
      await user.save();
      console.log(`Created admin user ${email}`);
    } else {
      if (user.role !== 'admin') {
        user.role = 'admin';
        user.verificationStatus = 'approved';
        await user.save();
        console.log(`Promoted existing user ${email} to admin`);
      } else {
        console.log(`User ${email} is already an admin`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
}

main();


