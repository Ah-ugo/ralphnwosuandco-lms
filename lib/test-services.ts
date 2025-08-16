/** @format */

import { testCloudinaryConnection } from './cloudinary';
import { testEmailConnection } from './email';
import { testMongoConnection } from './mongodb';

export async function testAllServices() {
  console.log('🧪 Testing all services...\n');

  const results = {
    cloudinary: false,
    email: false,
    mongodb: false,
  };

  // Test Cloudinary
  try {
    await testCloudinaryConnection();
    results.cloudinary = true;
  } catch (error) {
    console.error('Cloudinary test failed:', error);
  }

  // Test Email
  try {
    await testEmailConnection();
    results.email = true;
  } catch (error) {
    console.error('Email test failed:', error);
  }

  // Test MongoDB
  try {
    await testMongoConnection();
    results.mongodb = true;
  } catch (error) {
    console.error('MongoDB test failed:', error);
  }

  console.log('\n📊 Service Test Results:');
  console.log(`MongoDB: ${results.mongodb ? '✅ Working' : '❌ Failed'}`);
  console.log(`Cloudinary: ${results.cloudinary ? '✅ Working' : '❌ Failed'}`);
  console.log(`Email: ${results.email ? '✅ Working' : '❌ Failed'}`);

  return results;
}
