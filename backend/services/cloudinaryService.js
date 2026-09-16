const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from environment variables
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️ Cloudinary media storage initialized and connected.');
} else {
  console.log('ℹ️ Cloudinary credentials not detected; using local static storage fallback (/uploads).');
}

/**
 * Upload an image file (path or base64) to Cloudinary or local fallback.
 * @param {string} filePath - Absolute or relative path to the image file on disk.
 * @param {string} folder - Folder name in Cloudinary (defaults to 'campusshare_items').
 * @returns {Promise<{ url: string, provider: 'cloudinary' | 'local', publicId?: string }>}
 */
async function uploadImage(filePath, folder = 'campusshare_items') {
  if (isCloudinaryConfigured && filePath) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
      });

      // Optionally clean up local temp file after successful cloud upload
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupErr) {
        // Non-blocking cleanup warning
      }

      return {
        url: result.secure_url,
        provider: 'cloudinary',
        publicId: result.public_id,
      };
    } catch (err) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local storage URL:', err.message);
    }
  }

  // Fallback to local storage URL
  const filename = path.basename(filePath);
  return {
    url: `/uploads/${filename}`,
    provider: 'local',
  };
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImage,
};
