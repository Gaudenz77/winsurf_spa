const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const cookie = require('cookie');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  console.log('WebSocket server created');

  // Store client connections with their user IDs
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection attempt');
    
    try {
      // Get token from cookies
      const cookies = cookie.parse(req.headers.cookie || '');
      const token = cookies.token;

      if (!token) {
        console.log('No token provided, closing connection');
        ws.close();
        return;
      }

      console.log('Attempting to verify token:', token.substring(0, 20) + '...');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      console.log('User authenticated:', userId);

      // Store the connection
      if (!clients.has(userId)) {
        clients.set(userId, new Set());
      }
      clients.get(userId).add(ws);

      console.log(`Client connected. Total clients for user ${userId}: ${clients.get(userId).size}`);

      // Handle client disconnection
      ws.on('close', () => {
        console.log(`Client disconnected for user ${userId}`);
        clients.get(userId).delete(ws);
        if (clients.get(userId).size === 0) {
          clients.delete(userId);
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('Error in WebSocket connection:', error);
      if (error.name === 'JsonWebTokenError') {
        console.error('Invalid token provided');
      }
      ws.close();
    }
  });

  // Function to send notification to a specific user
  const sendNotification = (userId, notification) => {
    console.log(`Attempting to send notification to user ${userId}:`, notification);
    
    const userClients = clients.get(userId);
    if (!userClients) {
      console.log(`No active connections for user ${userId}`);
      return;
    }

    const message = JSON.stringify({
      type: 'NOTIFICATION',
      notification
    });

    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Sending notification to client');
        client.send(message);
      }
    });
  };

  return {
    sendNotification,
    getConnectedClients: () => clients
  };
}

module.exports = setupWebSocketServer;
