const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { sequelize, connectDBs } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Allow all origins for dev/ngrok
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Attach io to request object so routes can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO event handling
require('./services/socketService')(io);

// Basic Health Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Main routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/compiler', require('./routes/compiler').router);
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/practice', require('./routes/practice'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to databases
  await connectDBs();

  // Sync PostgreSQL models (create tables if they don't exist)
  require('./models/postgres');
  
  if (process.env.NODE_ENV !== 'test') {
    // Only alter in dev, not tests
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL models synchronized');
  }
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
