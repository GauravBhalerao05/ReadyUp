const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;
let memoryServerInstance = null;

const connectDB = async (uriOverride = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const targetUri = uriOverride || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(targetUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] Standard MongoDB connection failed: ${error.message}`);

    // If in development or test, fall back to MongoMemoryServer for instant seamless developer experience
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      try {
        console.log('[Database] Starting in-memory MongoDB fallback...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
        const fallbackUri = memoryServerInstance.getUri();
        const fallbackConn = await mongoose.connect(fallbackUri, {
          autoIndex: true,
        });
        isConnected = true;
        console.log(`[Database] In-memory MongoDB connected: ${fallbackUri}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error('[Database] Failed to initialize in-memory MongoDB:', fallbackError.message);
        throw fallbackError;
      }
    }

    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
};

module.exports = { connectDB, disconnectDB };
