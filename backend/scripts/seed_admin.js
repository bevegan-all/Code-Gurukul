require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models/postgres');
const { connectDBs } = require('../config/db');

async function seedAdmin() {
  await connectDBs();
  
  // Sync the tables (alter is true to update schema during development)
  await sequelize.sync({ alter: true });
  console.log('PostgreSQL synced successfully');

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@codegurukul.dev';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (existingAdmin) {
      console.log(`Admin user ${adminEmail} already exists!`);
      process.exit(0);
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      phone: '0000000000',
      password_hash: hashedPassword,
      role: 'admin',
      is_active: true
    });

    console.log(`Default admin created successfully!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
