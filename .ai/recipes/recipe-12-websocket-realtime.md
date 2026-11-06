# Recipe #12: WebSocket Real-time Updates

> Implement real-time bidirectional communication with Socket.IO

---

## 📊 Overview

- **Use Case:** Live notifications, collaborative editing, real-time data synchronization
- **Tech Stack:** Node.js, Socket.IO, Redis adapter, presence tracking
- **Time:** 3-4 hours
- **Difficulty:** Intermediate-Advanced
- **Scalability:** Works across multiple server instances with Redis adapter

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Redis instance running
- [ ] Recipe #6: Caching (Redis) completed
- [ ] Understanding of WebSocket concepts

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install socket.io socket.io-redis
npm install --save-dev @types/socket.io
```

### Step 2: Socket.IO Server Configuration

Create `src/config/socket-io.config.js`:

```javascript
const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('redis');
const logger = require('./logger.config');

/**
 * Configure Socket.IO
 */
function configureSocketIO(httpServer) {
  const io = new socketIO.Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 1e6, // 1 MB
    serializeError: (err) => ({
      message: err.message,
      code: err.code,
    }),
  });

  // Redis adapter for multi-instance communication
  const pubClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  });

  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✓ Socket.IO Redis adapter configured');
  }).catch((error) => {
    logger.error('Failed to configure Socket.IO adapter:', error);
  });

  return io;
}

module.exports = {
  configureSocketIO,
};
```

### Step 3: Socket Event Handlers

Create `src/websocket/events.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * User connection events
 */
const userEvents = {
  /**
   * Handle user connection
   */
  connect: (socket, io) => {
    logger.info('User connected', {
      socketId: socket.id,
      userId: socket.handshake.auth.userId,
    });

    // Join user room
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      
      // Broadcast user online status
      io.emit('user:online', { userId, socketId: socket.id });
    }

    // Broadcast to all connected users
    socket.emit('connection:established', {
      message: 'Connected to server',
      socketId: socket.id,
    });
  },

  /**
   * Handle user disconnection
   */
  disconnect: (socket, io) => {
    logger.info('User disconnected', { socketId: socket.id });

    const userId = socket.handshake.auth.userId;
    if (userId) {
      io.emit('user:offline', { userId, socketId: socket.id });
    }
  },

  /**
   * Handle presence update
   */
  presence: (socket, io, data) => {
    const userId = socket.handshake.auth.userId;

    socket.broadcast.emit('user:presence', {
      userId,
      status: data.status,
      timestamp: Date.now(),
    });

    logger.debug('Presence update', { userId, status: data.status });
  },
};

/**
 * Notification events
 */
const notificationEvents = {
  /**
   * Send notification
   */
  notify: (socket, io, data) => {
    const { userId, title, message, type } = data;

    io.to(`user:${userId}`).emit('notification:received', {
      title,
      message,
      type,
      timestamp: Date.now(),
    });

    logger.debug('Notification sent', { userId, type });
  },

  /**
   * Notification acknowledged
   */
  acknowledgeNotification: (socket, io, data) => {
    const { notificationId } = data;

    logger.debug('Notification acknowledged', { notificationId });
  },
};

/**
 * Real-time data events
 */
const dataEvents = {
  /**
   * Subscribe to data updates
   */
  subscribe: (socket, io, data) => {
    const { channel } = data;

    socket.join(`data:${channel}`);

    logger.debug('Client subscribed', {
      socketId: socket.id,
      channel,
    });

    socket.emit('subscribe:confirmed', { channel });
  },

  /**
   * Unsubscribe from data updates
   */
  unsubscribe: (socket, io, data) => {
    const { channel } = data;

    socket.leave(`data:${channel}`);

    logger.debug('Client unsubscribed', {
      socketId: socket.id,
      channel,
    });
  },

  /**
   * Broadcast data update
   */
  updateData: (socket, io, data) => {
    const { channel, payload } = data;

    io.to(`data:${channel}`).emit('data:updated', {
      channel,
      payload,
      timestamp: Date.now(),
    });

    logger.debug('Data update broadcasted', { channel });
  },
};

/**
 * Collaboration events (typing indicators, cursor positions, etc.)
 */
const collaborationEvents = {
  /**
   * User started typing
   */
  startTyping: (socket, io, data) => {
    const { userId, documentId } = data;

    socket.broadcast.to(`document:${documentId}`).emit('user:typing', {
      userId,
      documentId,
    });

    logger.debug('Typing started', { userId, documentId });
  },

  /**
   * User stopped typing
   */
  stopTyping: (socket, io, data) => {
    const { userId, documentId } = data;

    socket.broadcast.to(`document:${documentId}`).emit('user:stopTyping', {
      userId,
      documentId,
    });

    logger.debug('Typing stopped', { userId, documentId });
  },

  /**
   * Cursor position update
   */
  cursorMove: (socket, io, data) => {
    const { userId, documentId, position } = data;

    socket.broadcast.to(`document:${documentId}`).emit('cursor:moved', {
      userId,
      documentId,
      position,
      timestamp: Date.now(),
    });
  },

  /**
   * Join document collaboration
   */
  joinDocument: (socket, io, data) => {
    const { documentId, userId } = data;

    socket.join(`document:${documentId}`);

    io.to(`document:${documentId}`).emit('document:userJoined', {
      userId,
      documentId,
      timestamp: Date.now(),
    });

    logger.debug('User joined document', { userId, documentId });
  },

  /**
   * Leave document collaboration
   */
  leaveDocument: (socket, io, data) => {
    const { documentId, userId } = data;

    socket.leave(`document:${documentId}`);

    io.to(`document:${documentId}`).emit('document:userLeft', {
      userId,
      documentId,
      timestamp: Date.now(),
    });

    logger.debug('User left document', { userId, documentId });
  },
};

/**
 * Chat events
 */
const chatEvents = {
  /**
   * Send message
   */
  sendMessage: (socket, io, data) => {
    const { roomId, userId, message, timestamp } = data;

    io.to(`chat:${roomId}`).emit('message:received', {
      userId,
      message,
      timestamp: timestamp || Date.now(),
    });

    logger.debug('Chat message sent', { roomId, userId });
  },

  /**
   * Join chat room
   */
  joinRoom: (socket, io, data) => {
    const { roomId, userId } = data;

    socket.join(`chat:${roomId}`);

    io.to(`chat:${roomId}`).emit('room:userJoined', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    logger.debug('User joined chat room', { userId, roomId });
  },

  /**
   * Leave chat room
   */
  leaveRoom: (socket, io, data) => {
    const { roomId, userId } = data;

    socket.leave(`chat:${roomId}`);

    io.to(`chat:${roomId}`).emit('room:userLeft', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    logger.debug('User left chat room', { userId, roomId });
  },
};

module.exports = {
  userEvents,
  notificationEvents,
  dataEvents,
  collaborationEvents,
  chatEvents,
};
```

### Step 4: Socket Namespace Handlers

Create `src/websocket/namespaces.js`:

```javascript
const logger = require('../config/logger.config');
const {
  userEvents,
  notificationEvents,
  dataEvents,
  collaborationEvents,
  chatEvents,
} = require('./events');

/**
 * Setup Socket.IO namespaces
 */
function setupNamespaces(io) {
  /**
   * Default namespace
   */
  io.on('connection', (socket) => {
    userEvents.connect(socket, io);

    // User events
    socket.on('presence', (data) => userEvents.presence(socket, io, data));
    socket.on('disconnect', () => userEvents.disconnect(socket, io));

    // Notification events
    socket.on('notify', (data) => notificationEvents.notify(socket, io, data));
    socket.on('acknowledge:notification', (data) =>
      notificationEvents.acknowledgeNotification(socket, io, data)
    );

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  /**
   * Real-time data namespace
   */
  const dataNamespace = io.of('/data');
  dataNamespace.on('connection', (socket) => {
    logger.info('Client connected to /data namespace', { socketId: socket.id });

    socket.on('subscribe', (data) => dataEvents.subscribe(socket, io, data));
    socket.on('unsubscribe', (data) => dataEvents.unsubscribe(socket, io, data));
    socket.on('update', (data) => dataEvents.updateData(socket, io, data));
  });

  /**
   * Collaboration namespace
   */
  const collabNamespace = io.of('/collaborate');
  collabNamespace.on('connection', (socket) => {
    logger.info('Client connected to /collaborate namespace', { socketId: socket.id });

    socket.on('startTyping', (data) =>
      collaborationEvents.startTyping(socket, io, data)
    );
    socket.on('stopTyping', (data) =>
      collaborationEvents.stopTyping(socket, io, data)
    );
    socket.on('cursorMove', (data) =>
      collaborationEvents.cursorMove(socket, io, data)
    );
    socket.on('joinDocument', (data) =>
      collaborationEvents.joinDocument(socket, io, data)
    );
    socket.on('leaveDocument', (data) =>
      collaborationEvents.leaveDocument(socket, io, data)
    );
  });

  /**
   * Chat namespace
   */
  const chatNamespace = io.of('/chat');
  chatNamespace.on('connection', (socket) => {
    logger.info('Client connected to /chat namespace', { socketId: socket.id });

    socket.on('sendMessage', (data) => chatEvents.sendMessage(socket, io, data));
    socket.on('joinRoom', (data) => chatEvents.joinRoom(socket, io, data));
    socket.on('leaveRoom', (data) => chatEvents.leaveRoom(socket, io, data));
  });

  logger.info('✓ Socket.IO namespaces configured');
}

module.exports = {
  setupNamespaces,
};
```

### Step 5: Presence Tracking Service

Create `src/services/presence.service.js`:

```javascript
const redis = require('redis');
const logger = require('../config/logger.config');

class PresenceService {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    this.redisClient.connect().catch((err) => {
      logger.error('Presence service Redis connection failed:', err);
    });
  }

  /**
   * Mark user as online
   */
  async setUserOnline(userId, socketId) {
    const key = `presence:${userId}`;
    const data = {
      socketId,
      status: 'online',
      lastSeen: Date.now(),
    };

    await this.redisClient.setex(key, 24 * 60 * 60, JSON.stringify(data));

    logger.debug('User marked online', { userId });
  }

  /**
   * Mark user as offline
   */
  async setUserOffline(userId) {
    const key = `presence:${userId}`;
    await this.redisClient.del(key);

    logger.debug('User marked offline', { userId });
  }

  /**
   * Update user presence
   */
  async updatePresence(userId, status, metadata = {}) {
    const key = `presence:${userId}`;
    const data = {
      status,
      metadata,
      lastSeen: Date.now(),
    };

    await this.redisClient.setex(key, 24 * 60 * 60, JSON.stringify(data));

    logger.debug('Presence updated', { userId, status });
  }

  /**
   * Get user presence
   */
  async getUserPresence(userId) {
    const key = `presence:${userId}`;
    const data = await this.redisClient.get(key);

    return data ? JSON.parse(data) : null;
  }

  /**
   * Get multiple users presence
   */
  async getUsersPresence(userIds) {
    const results = {};

    for (const userId of userIds) {
      const presence = await this.getUserPresence(userId);
      results[userId] = presence;
    }

    return results;
  }

  /**
   * Get online users
   */
  async getOnlineUsers() {
    const keys = await this.redisClient.keys('presence:*');
    const onlineUsers = [];

    for (const key of keys) {
      const data = await this.redisClient.get(key);
      if (data) {
        const userId = key.replace('presence:', '');
        onlineUsers.push({
          userId,
          ...JSON.parse(data),
        });
      }
    }

    return onlineUsers;
  }

  /**
   * Get online user count
   */
  async getOnlineCount() {
    const keys = await this.redisClient.keys('presence:*');
    return keys.length;
  }
}

module.exports = new PresenceService();
```

### Step 6: Notification Service for WebSocket

Create `src/services/websocket-notification.service.js`:

```javascript
const logger = require('../config/logger.config');

class WebSocketNotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   */
  notifyUser(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification:received', {
      ...notification,
      timestamp: Date.now(),
      id: `notif-${Date.now()}`,
    });

    logger.info('WebSocket notification sent', {
      userId,
      type: notification.type,
    });
  }

  /**
   * Send notification to multiple users
   */
  notifyUsers(userIds, notification) {
    for (const userId of userIds) {
      this.notifyUser(userId, notification);
    }

    logger.info('Broadcast notification sent', {
      count: userIds.length,
      type: notification.type,
    });
  }

  /**
   * Broadcast notification to all
   */
  broadcastNotification(notification) {
    this.io.emit('notification:broadcast', {
      ...notification,
      timestamp: Date.now(),
    });

    logger.info('Global notification broadcasted', {
      type: notification.type,
    });
  }

  /**
   * Send update to data channel
   */
  updateData(channel, payload) {
    this.io.of('/data').to(`data:${channel}`).emit('data:updated', {
      channel,
      payload,
      timestamp: Date.now(),
    });

    logger.debug('Data update sent', { channel });
  }

  /**
   * Get room statistics
   */
  async getRoomStats(room) {
    const sockets = await this.io.in(room).fetchSockets();
    return {
      room,
      clients: sockets.length,
      sockets: sockets.map((s) => ({
        id: s.id,
        userId: s.handshake.auth.userId,
      })),
    };
  }
}

module.exports = WebSocketNotificationService;
```

### Step 7: Express Integration

Create `src/app.js` (updated with Socket.IO):

```javascript
const express = require('express');
const cors = require('cors');
const http = require('http');
require('express-async-errors');
const { configureSocketIO } = require('./config/socket-io.config');
const { setupNamespaces } = require('./websocket/namespaces');
const logger = require('./config/logger.config');

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Configure Socket.IO
const io = configureSocketIO(httpServer);
setupNamespaces(io);

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Routes
app.get('/ws/stats', (req, res) => {
  const stats = {
    connectedClients: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
  };

  res.json(stats);
});

// Export for server startup
module.exports = { app, httpServer, io };
```

### Step 8: Server Startup

Create `src/server.js`:

```javascript
const { app, httpServer, io } = require('./app');
const logger = require('./config/logger.config');

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`✓ Server running on port ${PORT}`);
  logger.info(`✓ WebSocket available at ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  io.close();
  httpServer.close(() => {
    logger.info('✓ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});
```

---

## 🧪 Testing

Create `src/tests/websocket.test.js`:

```javascript
const io = require('socket.io-client');
const { app, httpServer } = require('../app');

describe('WebSocket Events', () => {
  let server;
  let client;
  let clientSocket;

  beforeAll((done) => {
    server = httpServer.listen(() => {
      const port = server.address().port;
      client = io(`http://localhost:${port}`, {
        auth: { userId: 'test-user-1' },
      });

      client.on('connect', done);
    });
  });

  afterAll(() => {
    io.disconnect();
    server.close();
  });

  test('should connect and receive connection established', (done) => {
    client.on('connection:established', (data) => {
      expect(data.socketId).toBeDefined();
      done();
    });
  });

  test('should send and receive notifications', (done) => {
    const client2 = io(`http://localhost:${server.address().port}`, {
      auth: { userId: 'test-user-2' },
    });

    client2.on('notification:received', (data) => {
      expect(data.message).toBe('Test notification');
      client2.disconnect();
      done();
    });

    client.emit('notify', {
      userId: 'test-user-2',
      title: 'Test',
      message: 'Test notification',
      type: 'info',
    });
  });

  test('should subscribe to data channel', (done) => {
    const dataSocket = io(`http://localhost:${server.address().port}/data`, {
      auth: { userId: 'test-user-3' },
    });

    dataSocket.on('subscribe:confirmed', (data) => {
      expect(data.channel).toBe('users');
      dataSocket.disconnect();
      done();
    });

    dataSocket.emit('subscribe', { channel: 'users' });
  });

  test('should handle user typing', (done) => {
    const collabSocket = io(
      `http://localhost:${server.address().port}/collaborate`,
      { auth: { userId: 'test-user-4' } }
    );

    collabSocket.on('user:typing', (data) => {
      expect(data.userId).toBe('test-user-1');
      collabSocket.disconnect();
      done();
    });

    client.emit('startTyping', {
      userId: 'test-user-1',
      documentId: 'doc-1',
    });
  });
});
```

---

## 📝 Client Implementation

```javascript
// Frontend client example (React)
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useSocket(userId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      auth: { userId },
    });

    newSocket.on('connect', () => {
      console.log('Connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('notification:received', (notification) => {
      setNotifications((prev) => [...prev, notification]);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId]);

  return { socket, connected, notifications };
}

export default useSocket;
```

---

## ✅ Checklist

- [ ] Socket.IO installed and configured
- [ ] Redis adapter set up
- [ ] Namespaces configured
- [ ] User connection handling working
- [ ] Notification events working
- [ ] Data subscription working
- [ ] Collaboration events working
- [ ] Chat events working
- [ ] Presence tracking working
- [ ] Tests passing
- [ ] Client implementation ready
- [ ] Error handling configured
- [ ] Graceful shutdown implemented

---

## 📊 Environment Variables

Add to `.env`:

```env
# Socket.IO
SOCKET_IO_ENABLED=true
SOCKET_IO_PING_INTERVAL=10000
SOCKET_IO_PING_TIMEOUT=5000

# Redis for Socket.IO adapter
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🐛 Common Issues

### Issue: "WebSocket connection failed"
**Solution:** Check CORS configuration and firewall

### Issue: "Messages not received in other rooms"
**Solution:** Ensure Redis adapter is connected

### Issue: "High memory usage"
**Solution:** Implement cleanup for old socket rooms

---

## 📋 Recipe Metadata

- **Recipe #:** 12/20
- **Category:** Real-time Communication
- **Status:** Production-Ready
- **Difficulty:** Intermediate-Advanced
- **Scalability:** Multi-instance with Redis adapter

---

**Next Recipe (#13): Background Jobs & Scheduling**

*Phase 3 Progress: 12/20 recipes complete (60%)*
