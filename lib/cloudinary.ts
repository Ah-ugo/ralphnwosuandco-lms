/** @format */
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a file buffer to Cloudinary
 */
export async function uploadFileToCloudinary(
  buffer: Buffer,
  folder: string,
  fileName?: string
) {
  console.log(`Starting Cloudinary upload to folder: ${folder}`);
  console.log(`Buffer size: ${buffer.length} bytes`);

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Missing required Cloudinary environment variables');
  }

  const getResourceType = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const imageExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'bmp',
      'tiff',
    ];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];

    if (imageExtensions.includes(extension || '')) {
      return 'image';
    } else if (videoExtensions.includes(extension || '')) {
      return 'video';
    } else {
      // For documents like PDF, DOC, etc., use 'raw' to preserve original format
      return 'raw';
    }
  };

  const resourceType = fileName ? getResourceType(fileName) : 'auto';
  console.log(
    `[v0] Using resource type: ${resourceType} for file: ${fileName}`
  );

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: `ralph-nwosu-library/${folder}`,
      resource_type: resourceType,
      timeout: 60000,
    };

    if (resourceType === 'image') {
      uploadOptions.quality = 'auto:good';
      uploadOptions.fetch_format = 'auto';
    }

    if (resourceType === 'raw' && fileName) {
      uploadOptions.public_id = `${folder}/${fileName.split('.')[0]}`;
      uploadOptions.use_filename = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return reject(
            new Error(`Cloudinary upload failed: ${error.message}`)
          );
        }
        if (!result) {
          console.error('❌ Cloudinary returned no result');
          return reject(new Error('No result from Cloudinary'));
        }
        console.log('✅ Cloudinary upload successful:', {
          url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          resource_type: result.resource_type,
        });
        resolve(result);
      }
    );

    // Convert buffer to stream
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Deletes a file from Cloudinary
 */
export async function deleteFileFromCloudinary(publicId: string) {
  if (!publicId) {
    throw new Error('Public ID is required for deletion');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error('Cloudinary deletion error:', error);
        return reject(
          new Error(`Cloudinary deletion failed: ${error.message}`)
        );
      }
      console.log('✅ Cloudinary deletion successful:', result);
      resolve(result);
    });
  });
}

export async function testCloudinaryConnection() {
  try {
    console.log('Testing Cloudinary connection...');
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection verified');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    throw new Error(
      `Cloudinary connection failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
