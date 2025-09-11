const { CronJob } = require('cron');
const axios = require('axios');

// URL of your service on Render - replace with your actual URL
const serviceUrl = process.env.RENDER_URL || "https://your-render-service-url.onrender.com";

// Ping the service every 13 minutes to prevent it from going inactive
// Render free tier goes inactive after 15 minutes of inactivity
const keepAliveJob = new CronJob('*/13 * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Pinging service to keep it alive...`);
    // Make a GET request to the games endpoint with ID 1 to keep the server active
    const response = await axios.get(`${serviceUrl}/api/games/1`);
    console.log(`[${new Date().toISOString()}] Ping successful, status: ${response.status}, retrieved game ID: 1`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ping failed:`, error.message);
  }
});

// Export function to start cron jobs
exports.startCronJobs = function() {
  console.log('Starting cron jobs...');
  keepAliveJob.start();
  console.log('Keep alive job started, will ping every 13 minutes');
};