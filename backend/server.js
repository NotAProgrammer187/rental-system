const app = require('./app');
const connectDB = require('./config/database');
const websocketService = require('./services/websocketService');
const http = require('http');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api (development)`);
      console.log(`🔗 Frontend should be running at ${process.env.FRONTEND_URL || 'http://localhost:3000 (development)'}`);
      console.log(`💬 WebSocket messaging enabled`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
