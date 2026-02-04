const { Server } = require('ws');

class RealtimeService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.isInitialized = false;
  }

  // Initialize WebSocket server
  initialize(server) {
    if (this.isInitialized) {
      console.log('⚠️ Realtime service already initialized');
      return;
    }

    this.wss = new Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      console.log('📱 New mobile client connected');
      this.clients.add(ws);
      
      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Kronop real-time updates',
        timestamp: new Date().toISOString()
      }));

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 Received from client:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              break;
            case 'subscribe':
              // Client wants to subscribe to specific updates
              ws.send(JSON.stringify({
                type: 'subscribed',
                channels: data.channels || ['all'],
                timestamp: new Date().toISOString()
              }));
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing client message:', error.message);
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log('📱 Mobile client disconnected');
        this.clients.delete(ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.clients.delete(ws);
      });
    });

    this.isInitialized = true;
    console.log('✅ Realtime WebSocket service initialized');
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    if (!this.isInitialized || this.clients.size === 0) {
      return;
    }

    const messageData = {
      ...message,
      timestamp: new Date().toISOString()
    };

    const messageString = JSON.stringify(messageData);
    let sentCount = 0;

    this.clients.forEach((client) => {
      try {
        if (client.readyState === client.OPEN) {
          client.send(messageString);
          sentCount++;
        } else {
          // Remove dead connections
          this.clients.delete(client);
        }
      } catch (error) {
        console.error('❌ Error sending to client:', error.message);
        this.clients.delete(client);
      }
    });

    console.log(`📢 Broadcast sent to ${sentCount} clients:`, message.type);
  }

  // Notify clients about new content
  notifyNewContent(newItems, contentType) {
    this.broadcast({
      type: 'new_content',
      data: {
        contentType,
        newItemsCount: newItems.length,
        items: newItems.map(item => ({
          id: item._id,
          title: item.title,
          type: item.type,
          thumbnail: item.thumbnail,
          url: item.url,
          createdAt: item.createdAt
        }))
      }
    });
  }

  // Notify clients about sync status
  notifySyncUpdate(status, newItemsCount) {
    this.broadcast({
      type: 'sync_update',
      data: {
        status,
        newItemsCount,
        lastSync: new Date().toISOString()
      }
    });
  }

  // Notify clients about general updates
  notifyUpdate(message, data = {}) {
    this.broadcast({
      type: 'general_update',
      data: {
        message,
        ...data
      }
    });
  }

  // Get connection status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      connectedClients: this.clients.size,
      uptime: this.isInitialized ? process.uptime() : 0
    };
  }

  // Send ping to all clients to keep connections alive
  pingAllClients() {
    this.broadcast({
      type: 'ping',
      message: 'Server ping'
    });
  }
}

module.exports = new RealtimeService();
