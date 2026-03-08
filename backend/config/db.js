const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

// --- PostgreSQL Connection (Sequelize) ---
const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USER,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    logging: false, // Turn off SQL query logging
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// --- MongoDB Connection (Mongoose) ---
const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const connectDBs = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    await connectMongo();
  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDBs,
};
