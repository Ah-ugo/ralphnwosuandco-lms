/** @format */

import { MongoClient, type Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'ralph_nwosu_library');
    cachedDb = db;

    console.log('✅ Connected to MongoDB database:', db.databaseName);
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw new Error(
      `MongoDB connection failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function testMongoConnection() {
  try {
    console.log('Testing MongoDB connection...');
    const db = await getDatabase();
    await db.admin().ping();
    console.log('✅ MongoDB connection verified');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw new Error(
      `MongoDB connection failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Export the client promise for advanced use cases
export default clientPromise;
