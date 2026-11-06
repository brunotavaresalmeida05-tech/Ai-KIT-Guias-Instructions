# Recipe #8: File Upload & Storage

> Implement secure file uploads with cloud storage integration

---

## 📊 Overview

- **Use Case:** User avatars, document uploads, media storage
- **Tech Stack:** Node.js, Multer, AWS S3/Azure Blob, Sharp for image processing
- **Time:** 3-4 hours
- **Difficulty:** Intermediate-Advanced
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] AWS S3 or Azure Blob Storage account (or local storage for dev)
- [ ] Node.js 18+
- [ ] Recipe #4: Error Handling & Logging completed

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install multer sharp aws-sdk
npm install --save-dev @types/multer
```

### Step 2: Storage Configuration

Create `src/config/storage.config.js`:

```javascript
const aws = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const logger = require('./logger.config');

/**
 * Storage adapter interface
 */
class StorageAdapter {
  async upload(file, metadata = {}) {
    throw new Error('upload() must be implemented');
  }

  async delete(key) {
    throw new Error('delete() must be implemented');
  }

  async getUrl(key) {
    throw new Error('getUrl() must be implemented');
  }
}

/**
 * Local filesystem storage (development)
 */
class LocalStorage extends StorageAdapter {
  constructor(uploadDir = './uploads') {
    super();
    this.uploadDir = uploadDir;

    // Create upload directory if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async upload(file, metadata = {}) {
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    logger.info('File uploaded locally', {
      filename,
      size: file.size,
    });

    return {
      key: filename,
      url: `/uploads/${filename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async delete(key) {
    const filepath = path.join(this.uploadDir, key);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info('File deleted locally', { key });
      return true;
    }

    return false;
  }

  async getUrl(key) {
    return `/uploads/${key}`;
  }
}

/**
 * AWS S3 Storage
 */
class S3Storage extends StorageAdapter {
  constructor(bucketName = process.env.AWS_S3_BUCKET) {
    super();
    this.bucketName = bucketName;

    this.s3 = new aws.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async upload(file, metadata = {}) {
    const key = `${metadata.userId || 'public'}/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: metadata.public ? 'public-read' : 'private',
      Metadata: {
        originalName: file.originalname,
        uploadedBy: metadata.userId || 'anonymous',
      },
    };

    try {
      const result = await this.s3.upload(params).promise();

      logger.info('File uploaded to S3', {
        key,
        size: file.size,
        url: result.Location,
      });

      return {
        key,
        url: result.Location,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();

      logger.info('File deleted from S3', { key });
      return true;
    } catch (error) {
      logger.error('S3 delete failed:', error);
      return false;
    }
  }

  async getUrl(key, expiresIn = 3600) {
    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      });
    } catch (error) {
      logger.error('Failed to generate S3 URL:', error);
      throw error;
    }
  }
}

/**
 * Get storage adapter based on environment
 */
function getStorageAdapter() {
  if (process.env.STORAGE_TYPE === 's3') {
    return new S3Storage();
  }

  return new LocalStorage();
}

module.exports = {
  StorageAdapter,
  LocalStorage,
  S3Storage,
  getStorageAdapter,
};
```

### Step 3: Multer Configuration

Create `src/config/multer.config.js`:

```javascript
const multer = require('multer');
const path = require('path');
const { ValidationError } = require('../errors');

/**
 * File size limits (in bytes)
 */
const FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5 MB
  document: 10 * 1024 * 1024, // 10 MB
  video: 100 * 1024 * 1024, // 100 MB
};

/**
 * Allowed MIME types
 */
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  any: [],
};

/**
 * Create multer middleware
 */
function createMulterMiddleware(fileType = 'image') {
  const maxSize = FILE_SIZES[fileType] || FILE_SIZES.image;
  const allowedTypes = ALLOWED_TYPES[fileType] || ALLOWED_TYPES.any;

  const storage = multer.memoryStorage(); // Store in memory, upload to S3/local

  const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return cb(
        new ValidationError('Invalid file type', [
          {
            field: 'file',
            message: `Allowed types: ${allowedTypes.join(', ')}`,
          },
        ])
      );
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });
}

/**
 * Single file upload middleware
 */
const uploadSingle = (fieldName = 'file', fileType = 'image') => {
  return createMulterMiddleware(fileType).single(fieldName);
};

/**
 * Multiple files upload middleware
 */
const uploadMultiple = (fieldName = 'files', maxFiles = 5, fileType = 'image') => {
  return createMulterMiddleware(fileType).array(fieldName, maxFiles);
};

/**
 * Mixed file types upload
 */
const uploadMixed = (fields = []) => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
    },
  }).fields(fields);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadMixed,
  FILE_SIZES,
  ALLOWED_TYPES,
};
```

### Step 4: Image Processing Service

Create `src/services/image-processing.service.js`:

```javascript
const sharp = require('sharp');
const logger = require('../config/logger.config');

class ImageProcessingService {
  /**
   * Optimize image and create thumbnails
   */
  static async processImage(imageBuffer, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 80,
      format = 'webp',
    } = options;

    try {
      const processed = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat(format, { quality })
        .toBuffer();

      logger.info('Image processed', {
        originalSize: imageBuffer.length,
        processedSize: processed.length,
        compression: Math.round(
          ((imageBuffer.length - processed.length) / imageBuffer.length) * 100
        ),
      });

      return processed;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail
   */
  static async createThumbnail(imageBuffer, size = 200) {
    try {
      return await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
        })
        .toBuffer();
    } catch (error) {
      logger.error('Thumbnail creation failed:', error);
      throw error;
    }
  }

  /**
   * Create multiple sizes
   */
  static async createMultipleSizes(imageBuffer, sizes = [200, 500, 1000]) {
    const results = {};

    for (const size of sizes) {
      results[size] = await this.createThumbnail(imageBuffer, size);
    }

    return results;
  }

  /**
   * Get image metadata
   */
  static async getMetadata(imageBuffer) {
    try {
      return await sharp(imageBuffer).metadata();
    } catch (error) {
      logger.error('Failed to get image metadata:', error);
      throw error;
    }
  }

  /**
   * Validate image dimensions
   */
  static async validateDimensions(imageBuffer, minWidth = 100, minHeight = 100) {
    const metadata = await this.getMetadata(imageBuffer);

    if (metadata.width < minWidth || metadata.height < minHeight) {
      throw new Error(
        `Image too small. Minimum: ${minWidth}x${minHeight}, Got: ${metadata.width}x${metadata.height}`
      );
    }

    return metadata;
  }
}

module.exports = ImageProcessingService;
```

### Step 5: File Upload Service

Create `src/services/file-upload.service.js`:

```javascript
const { getStorageAdapter } = require('../config/storage.config');
const ImageProcessingService = require('./image-processing.service');
const { ValidationError } = require('../errors');
const logger = require('../config/logger.config');
const cacheConfig = require('../config/cache.config');

class FileUploadService {
  constructor() {
    this.storage = getStorageAdapter();
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file, userId) {
    if (!file) {
      throw new ValidationError('File required', [
        { field: 'file', message: 'No file provided' },
      ]);
    }

    // Validate image
    await ImageProcessingService.validateDimensions(file.buffer, 100, 100);

    // Process image
    const processed = await ImageProcessingService.processImage(file.buffer, {
      maxWidth: 500,
      maxHeight: 500,
      quality: 85,
      format: 'webp',
    });

    // Create thumbnail
    const thumbnail = await ImageProcessingService.createThumbnail(file.buffer, 200);

    // Upload files
    const results = await Promise.all([
      this.storage.upload(
        { buffer: processed, originalname: `avatar-${userId}.webp`, mimetype: 'image/webp' },
        { userId, public: false }
      ),
      this.storage.upload(
        { buffer: thumbnail, originalname: `avatar-${userId}-thumb.webp`, mimetype: 'image/webp' },
        { userId, public: false }
      ),
    ]);

    logger.info('Avatar uploaded', {
      userId,
      originalSize: file.size,
      processedSize: processed.length,
    });

    // Invalidate user cache
    await cacheConfig.del(`user:${userId}`);

    return {
      full: results[0],
      thumbnail: results[1],
    };
  }

  /**
   * Upload document
   */
  async uploadDocument(file, userId, metadata = {}) {
    if (!file) {
      throw new ValidationError('File required');
    }

    const result = await this.storage.upload(file, {
      userId,
      ...metadata,
    });

    logger.info('Document uploaded', {
      userId,
      filename: file.originalname,
      size: file.size,
    });

    return result;
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files, userId, fileType = 'image') {
    if (!files || files.length === 0) {
      throw new ValidationError('No files provided');
    }

    const results = [];

    for (const file of files) {
      const result = await this.storage.upload(file, { userId });
      results.push(result);
    }

    logger.info('Batch upload completed', {
      userId,
      count: files.length,
    });

    return results;
  }

  /**
   * Delete file
   */
  async deleteFile(key) {
    const deleted = await this.storage.delete(key);

    if (deleted) {
      logger.info('File deleted', { key });
    }

    return deleted;
  }

  /**
   * Get file URL
   */
  async getFileUrl(key, expiresIn = 3600) {
    return this.storage.getUrl(key, expiresIn);
  }

  /**
   * Replace file
   */
  async replaceFile(oldKey, newFile, metadata = {}) {
    // Delete old file
    await this.deleteFile(oldKey);

    // Upload new file
    return this.storage.upload(newFile, metadata);
  }
}

module.exports = new FileUploadService();
```

### Step 6: File Upload Routes

Create `src/routes/upload.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { uploadSingle, uploadMultiple } = require('../config/multer.config');
const fileUploadService = require('../services/file-upload.service');
const { verifyToken } = require('../middleware/auth.middleware');

/**
 * POST /upload/avatar
 * Upload user avatar
 */
router.post(
  '/avatar',
  verifyToken,
  uploadSingle('avatar', 'image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await fileUploadService.uploadAvatar(req.file, req.user.id);

      res.json({
        message: 'Avatar uploaded successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /upload/document
 * Upload document
 */
router.post(
  '/document',
  verifyToken,
  uploadSingle('document', 'document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await fileUploadService.uploadDocument(
        req.file,
        req.user.id,
        { name: req.body.name }
      );

      res.json({
        message: 'Document uploaded successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /upload/multiple
 * Upload multiple files
 */
router.post(
  '/multiple',
  verifyToken,
  uploadMultiple('files', 10, 'image'),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = await fileUploadService.uploadMultiple(
        req.files,
        req.user.id
      );

      res.json({
        message: 'Files uploaded successfully',
        count: results.length,
        files: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /upload/:key
 * Delete file
 */
router.delete('/:key', verifyToken, async (req, res, next) => {
  try {
    const { key } = req.params;
    const deleted = await fileUploadService.deleteFile(key);

    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /upload/:key
 * Get file download URL
 */
router.get('/:key', verifyToken, async (req, res, next) => {
  try {
    const { key } = req.params;
    const expiresIn = req.query.expiresIn || 3600;

    const url = await fileUploadService.getFileUrl(key, expiresIn);

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 7: Database Integration

Create `src/database/repositories/file.repository.js`:

```javascript
const { db } = require('../connection');

class FileRepository {
  /**
   * Create file record
   */
  async create(fileData) {
    const [id] = await db('files').insert({
      userId: fileData.userId,
      key: fileData.key,
      url: fileData.url,
      filename: fileData.filename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      type: fileData.type,
    });

    return this.findById(id);
  }

  /**
   * Find file by ID
   */
  async findById(id) {
    return db('files').where('id', id).first();
  }

  /**
   * Find files by user
   */
  async findByUserId(userId, limit = 20, offset = 0) {
    return db('files')
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find by key
   */
  async findByKey(key) {
    return db('files').where('key', key).first();
  }

  /**
   * Delete file record
   */
  async delete(id) {
    return db('files').where('id', id).del();
  }

  /**
   * Delete by key
   */
  async deleteByKey(key) {
    return db('files').where('key', key).del();
  }
}

module.exports = new FileRepository();
```

### Step 8: Environment Variables

Add to `.env`:

```env
# Storage
STORAGE_TYPE=local # or 's3'
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Upload limits
MAX_FILE_SIZE=52428800 # 50MB in bytes
MAX_IMAGE_WIDTH=1920
MAX_IMAGE_HEIGHT=1920
```

---

## 🧪 Testing

Create `src/tests/file-upload.test.js`:

```javascript
const request = require('supertest');
const app = require('../app');
const fs = require('fs');
const path = require('path');

describe('File Upload', () => {
  const testImagePath = path.join(__dirname, 'fixtures/test-image.jpg');

  test('should upload avatar', async () => {
    const res = await request(app)
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', testImagePath);

    expect(res.statusCode).toBe(200);
    expect(res.body.full).toBeDefined();
    expect(res.body.thumbnail).toBeDefined();
  });

  test('should reject invalid file type', async () => {
    const res = await request(app)
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', 'path/to/file.txt');

    expect(res.statusCode).toBe(400);
  });

  test('should upload multiple files', async () => {
    const res = await request(app)
      .post('/upload/multiple')
      .set('Authorization', `Bearer ${token}`)
      .attach('files', testImagePath)
      .attach('files', testImagePath);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });

  test('should delete file', async () => {
    const uploadRes = await request(app)
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', testImagePath);

    const key = uploadRes.body.full.key;

    const deleteRes = await request(app)
      .delete(`/upload/${key}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.statusCode).toBe(200);
  });
});
```

---

## ✅ Checklist

- [ ] Storage adapter configured (local or S3)
- [ ] Multer middleware configured
- [ ] Image processing service implemented
- [ ] File upload service created
- [ ] Upload routes configured
- [ ] Database migration for files table
- [ ] Authentication integrated
- [ ] Error handling for file types
- [ ] File size limits enforced
- [ ] Tests passing
- [ ] Environment variables set
- [ ] Thumbnail generation working

---

## 📊 Database Migration

Create migration `src/database/migrations/xxx_create_files_table.js`:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('files', (table) => {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable();
    table.string('key').notNullable();
    table.string('url').notNullable();
    table.string('filename').notNullable();
    table.string('mimeType').notNullable();
    table.integer('size').notNullable();
    table.enum('type', ['avatar', 'document', 'image', 'video']).notNullable();
    table.timestamps(true, true);

    table.foreign('userId').references('users.id').onDelete('CASCADE');
    table.index(['userId', 'type']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('files');
};
```

---

## 🐛 Common Issues

### Issue: "File too large"
**Solution:** Check `FILE_SIZES` configuration and multipart form size limits

### Issue: "Cannot read property of buffer"
**Solution:** Ensure multer middleware is applied before route handler

### Issue: "S3 upload fails with permission denied"
**Solution:** Check AWS IAM permissions for S3:PutObject

---

## 📋 Recipe Metadata

- **Recipe #:** 8/20
- **Category:** File Handling
- **Status:** Production-Ready
- **Difficulty:** Intermediate-Advanced
- **OWASP:** Compliant ✅

---

**Next Recipe (#9): Email Service Integration**

*Phase 3 Progress: 8/20 recipes complete (40%)*
