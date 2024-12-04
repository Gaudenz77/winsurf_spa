const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const Message = require('./models/message');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            verifyClient: (info, cb) => {
                console.log('Verifying WebSocket connection...');
                
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
        
        global.wss = this.wss;
        this.clients = new Map();
        console.log('WebSocket server initialized');
        this.setupConnectionHandler();
    }

    // Handle chat messages
    async handleChatMessage(ws, data) {
        try {
            const { targetId, messageType, content, senderId, senderUsername, profile_image } = data;
            console.log('Handling chat message:', { targetId, messageType, content, senderId, senderUsername, profile_image });

            // Store message in database
            const messageId = await Message.create(content, senderId, targetId, messageType);
            console.log('Message stored in database with ID:', messageId);

            // Create message object with database ID
            const messageData = {
                type: 'CHAT_MESSAGE',
                id: messageId,
                content,
                targetId,
                messageType,
                senderId,
                senderUsername,
                profile_image,
                timestamp: new Date().toISOString()
            };

            // Broadcast message to all connected clients
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(messageData));
                }
            });
            
        } catch (error) {
            console.error('Error handling chat message:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Failed to process message'
            }));
        }
    }

    // Handle incoming messages
    async handleMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);

            switch (data.type) {
                case 'CHAT_MESSAGE':
                    await this.handleChatMessage(ws, data);
                    break;
                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    setupConnectionHandler() {
        this.wss.on('connection', (ws, req) => {
            const userId = req.userId;
            console.log('New WebSocket connection established for user:', userId);

            ws.userId = userId;

            if (!userId) {
                console.error('No user ID found in connection request');
                ws.close(1008, 'No user ID found');
                return;
            }

            if (!this.clients.has(userId)) {
                this.clients.set(userId, new Set());
            }
            this.clients.get(userId).add(ws);

            console.log(`Client connected. Total clients for user ${userId}: ${this.clients.get(userId).size}`);

            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', async (message) => {
                await this.handleMessage(ws, message);
            });

            ws.on('close', () => {
                console.log(`Client disconnected for user ${userId}`);
                if (this.clients.has(userId)) {
                    this.clients.get(userId).delete(ws);
                    if (this.clients.get(userId).size === 0) {
                        this.clients.delete(userId);
                    }
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            });
        });

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

    broadcastToChannel(channelId, message) {
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

    sendToUser(userId, message) {
        if (global.wss && global.wss.clients) {
            const userConnections = Array.from(global.wss.clients).filter(client => client.userId === userId);
            userConnections.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    }

    broadcast(message) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = WebSocketServer;
