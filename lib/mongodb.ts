import mongoose from 'mongoose';

// 1. Ensure the MONGODB_URI environment variable is defined
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// 2. Caching mechanism for Next.js
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB, using a cached connection if available.
 */
async function dbConnect() {
  // Return cached connection if available
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection.');
    return cached.conn;
  }

  // If no connection promise is pending, create a new one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'project', // Specify database name as "project"
    };

    // Connect to MongoDB with database name "project"
    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      console.log('✨ New MongoDB connection established to database: project');
      return mongoose;
    });
  }
  
  // Wait for the promise to resolve
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
