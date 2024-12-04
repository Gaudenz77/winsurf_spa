const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            verifyClient: (info, cb) => {
                console.log('Verifying WebSocket connection...');
                console.log('Headers:', info.req.headers);
                
                try {
                    const cookies = cookie.parse(info.req.headers.cookie || '');
                    const token = cookies.token;

                    if (!token) {
                        console.log('No token found in cookies');
                        cb(false, 401, 'Unauthorized');
                        return;
                    }

                    // Verify token
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    console.log('Token verified for user:', decoded.userId);
                    info.req.userId = decoded.userId;
                    cb(true);
                } catch (error) {
                    console.error('WebSocket verification error:', error);
                    cb(false, 401, 'Unauthorized');
                }
            }
        });
        
        // Store WSS instance globally for message handlers
        global.wss = this.wss;
        
        this.clients = new Map(); // userId -> Set of WebSocket connections
        console.log('WebSocket server initialized');
        this.setupConnectionHandler();
    }

    setupConnectionHandler() {
        this.wss.on('connection', (ws, req) => {
            const userId = req.userId;
            console.log('New WebSocket connection established for user:', userId);

            // Store userId on the socket instance
            ws.userId = userId;

            if (!userId) {
                console.error('No user ID found in connection request');
                ws.close(1008, 'No user ID found');
                return;
            }

            // Store the connection
            if (!this.clients.has(userId)) {
                this.clients.set(userId, new Set());
            }
            this.clients.get(userId).add(ws);

            console.log(`Client connected. Total clients for user ${userId}: ${this.clients.get(userId).size}`);

            // Setup ping-pong
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Handle incoming messages
            ws.on('message', (message) => {
                handleMessage(ws, message);
            });

            // Handle client disconnection
            ws.on('close', () => {
                console.log(`Client disconnected for user ${userId}`);
                if (this.clients.has(userId)) {
                    this.clients.get(userId).delete(ws);
                    if (this.clients.get(userId).size === 0) {
                        this.clients.delete(userId);
                    }
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            });
        });

        // Setup ping interval to keep connections alive
        this.setupPingInterval();
    }

    setupPingInterval() {
        const interval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    console.log('Terminating inactive connection');
                    return ws.terminate();
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);

        this.wss.on('close', () => {
            clearInterval(interval);
        });
    }

    sendNotification(userId, notification) {
        try {
            if (!this.clients.has(userId)) {
                console.log(`No active connections for user ${userId}`);
                return;
            }

            console.log(`Sending notification to user ${userId}:`, notification);
            const userConnections = this.clients.get(userId);
            const message = JSON.stringify({
                type: 'notification',
                data: notification
            });

            userConnections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log('Sending WebSocket message:', message);
                    ws.send(message);
                } else {
                    console.log('WebSocket not in OPEN state:', ws.readyState);
                }
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    broadcastToAll(message) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

// Message Types
const MESSAGE_TYPES = {
  NOTIFICATION: 'NOTIFICATION',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  USER_STATUS: 'USER_STATUS'
}

// Handle incoming messages
function handleMessage(ws, message) {
  try {
    console.log('Received WebSocket message:', message.toString())
    const data = JSON.parse(message.toString())
    
    switch (data.type) {
      case MESSAGE_TYPES.CHAT_MESSAGE:
        console.log('Processing chat message:', data)
        handleChatMessage(ws, data)
        break
      // Handle other message types...
      default:
        console.log('Unknown message type:', data.type)
    }
  } catch (error) {
    console.error('Error handling message:', error)
  }
}

// Handle chat messages
function handleChatMessage(ws, data) {
  const { targetId, messageType, content, senderId, senderUsername } = data
  console.log('Handling chat message:', { targetId, messageType, content, senderId, senderUsername })
  
  // Create message object
  const message = {
    type: MESSAGE_TYPES.CHAT_MESSAGE,
    id: Date.now(),
    content,
    senderId,
    senderUsername,
    targetId,
    messageType,
    timestamp: new Date().toISOString()
  }

  console.log('Broadcasting message:', message)

  // Broadcast to appropriate recipients
  if (messageType === 'channel') {
    // Broadcast to all users in the channel
    broadcastToChannel(targetId, message)
  } else {
    // Send to specific user (DM)
    sendToUser(targetId, message)
    // Also send back to sender if they're not the target
    if (targetId !== senderId) {
      sendToUser(senderId, message)
    }
  }
}

// Broadcast message to all users in a channel
function broadcastToChannel(channelId, message) {
  console.log(`Broadcasting to channel ${channelId}:`, message)
  if (global.wss) {
    global.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Sending to client:', client.userId)
        client.send(JSON.stringify(message))
      }
    })
  } else {
    console.error('WebSocket server not available')
  }
}

// Send message to specific user
function sendToUser(userId, message) {
  // Use the clients map from the class
  if (global.wss && global.wss.clients) {
    const userConnections = Array.from(global.wss.clients).filter(client => client.userId === userId);
    userConnections.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

module.exports = WebSocketServer;
