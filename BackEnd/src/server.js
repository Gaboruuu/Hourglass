const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import cron jobs
const { startCronJobs } = require('./cron');

// Import routes
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const gamesRoutes = require('./routes/games.routes');

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/games', gamesRoutes);

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Hourglass API' });
});

// Import database connection
const db = require('./config/db.config');

// Set port and start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
  
  // Test database connection
  try {
    await db.testConnection();
    console.log('Database connection verified.');
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }

  // Start cron jobs
  startCronJobs();
});
