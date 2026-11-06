# Recipe #11: Search & Indexing (Elasticsearch)

> Implement full-text search with Elasticsearch and real-time indexing

---

## 📊 Overview

- **Use Case:** Full-text search, autocomplete, filtering, analytics
- **Tech Stack:** Node.js, Elasticsearch, Kibana, Bull queues
- **Time:** 4-5 hours
- **Difficulty:** Advanced
- **Performance:** Sub-100ms search queries on millions of documents

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Elasticsearch 7.0+ installed or Docker container
- [ ] Node.js 18+
- [ ] Redis for job queue
- [ ] Database integration complete

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install @elastic/elasticsearch bull
npm install --save-dev @types/elasticsearch
```

### Step 2: Elasticsearch Configuration

Create `src/config/elasticsearch.config.js`:

```javascript
const { Client } = require('@elastic/elasticsearch');
const logger = require('./logger.config');

/**
 * Elasticsearch client
 */
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USER || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'password',
  },
  requestTimeout: 30000,
  maxRetries: 3,
});

/**
 * Health check
 */
async function healthCheck() {
  try {
    const health = await client.cluster.health();
    logger.info('✓ Elasticsearch connected', {
      status: health.status,
      nodes: health.number_of_nodes,
    });
    return true;
  } catch (error) {
    logger.error('Elasticsearch health check failed:', error);
    return false;
  }
}

/**
 * Create index with mappings
 */
async function createIndex(indexName, mappings) {
  try {
    const exists = await client.indices.exists({ index: indexName });

    if (exists) {
      logger.info('Index already exists:', { index: indexName });
      return;
    }

    await client.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              default: {
                type: 'standard',
                stopwords: '_english_',
              },
              autocomplete: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'autocomplete_filter'],
              },
            },
            filter: {
              autocomplete_filter: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 20,
              },
            },
          },
        },
        mappings: {
          properties: mappings,
        },
      },
    });

    logger.info('Index created:', { index: indexName });
  } catch (error) {
    logger.error('Failed to create index:', error);
    throw error;
  }
}

/**
 * Delete index
 */
async function deleteIndex(indexName) {
  try {
    await client.indices.delete({ index: indexName });
    logger.info('Index deleted:', { index: indexName });
  } catch (error) {
    if (error.meta?.body?.error?.type === 'index_not_found_exception') {
      logger.warn('Index not found:', { index: indexName });
      return;
    }
    throw error;
  }
}

module.exports = {
  client,
  healthCheck,
  createIndex,
  deleteIndex,
};
```

### Step 3: Index Mappings

Create `src/elasticsearch/mappings.js`:

```javascript
/**
 * User index mapping
 */
const userMapping = {
  id: {
    type: 'keyword',
  },
  email: {
    type: 'keyword',
  },
  name: {
    type: 'text',
    analyzer: 'standard',
    fields: {
      keyword: {
        type: 'keyword',
      },
      autocomplete: {
        type: 'text',
        analyzer: 'autocomplete',
      },
    },
  },
  role: {
    type: 'keyword',
  },
  isActive: {
    type: 'boolean',
  },
  createdAt: {
    type: 'date',
  },
  updatedAt: {
    type: 'date',
  },
};

/**
 * Post index mapping
 */
const postMapping = {
  id: {
    type: 'keyword',
  },
  title: {
    type: 'text',
    analyzer: 'standard',
    fields: {
      keyword: {
        type: 'keyword',
      },
      autocomplete: {
        type: 'text',
        analyzer: 'autocomplete',
      },
    },
  },
  content: {
    type: 'text',
    analyzer: 'standard',
  },
  status: {
    type: 'keyword',
  },
  authorId: {
    type: 'keyword',
  },
  viewCount: {
    type: 'integer',
  },
  tags: {
    type: 'keyword',
  },
  createdAt: {
    type: 'date',
  },
  updatedAt: {
    type: 'date',
  },
};

/**
 * Comment index mapping
 */
const commentMapping = {
  id: {
    type: 'keyword',
  },
  content: {
    type: 'text',
    analyzer: 'standard',
  },
  authorId: {
    type: 'keyword',
  },
  postId: {
    type: 'keyword',
  },
  createdAt: {
    type: 'date',
  },
};

module.exports = {
  userMapping,
  postMapping,
  commentMapping,
};
```

### Step 4: Elasticsearch Service

Create `src/services/elasticsearch.service.js`:

```javascript
const { client } = require('../config/elasticsearch.config');
const logger = require('../config/logger.config');

class ElasticsearchService {
  /**
   * Index document
   */
  async index(indexName, documentId, document) {
    try {
      const result = await client.index({
        index: indexName,
        id: documentId,
        body: document,
        refresh: 'wait_for', // Wait for indexing to complete
      });

      logger.debug('Document indexed', {
        index: indexName,
        id: documentId,
        version: result._version,
      });

      return result;
    } catch (error) {
      logger.error('Failed to index document:', error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(indexName, documents) {
    try {
      const operations = [];

      for (const doc of documents) {
        operations.push(
          { index: { _index: indexName, _id: doc.id } },
          doc
        );
      }

      const result = await client.bulk({
        body: operations,
        refresh: 'wait_for',
      });

      logger.info('Bulk indexing completed', {
        index: indexName,
        count: documents.length,
        errors: result.errors,
      });

      return result;
    } catch (error) {
      logger.error('Failed to bulk index:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async search(indexName, query, options = {}) {
    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = '_score',
        sortOrder = 'desc',
        highlight = false,
        aggregations = null,
      } = options;

      const searchBody = {
        query,
        from: offset,
        size: limit,
        sort: [{ [sortBy]: { order: sortOrder } }],
      };

      if (highlight) {
        searchBody.highlight = {
          fields: {
            title: {},
            content: {},
            name: {},
          },
        };
      }

      if (aggregations) {
        searchBody.aggs = aggregations;
      }

      const result = await client.search({
        index: indexName,
        body: searchBody,
      });

      return {
        total: result.hits.total.value,
        hits: result.hits.hits.map((hit) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        aggregations: result.aggregations,
      };
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Full-text search
   */
  async fullTextSearch(indexName, searchTerm, fields, options = {}) {
    const query = {
      multi_match: {
        query: searchTerm,
        fields: fields,
        fuzziness: 'AUTO',
        operator: 'or',
      },
    };

    return this.search(indexName, query, options);
  }

  /**
   * Autocomplete search
   */
  async autocomplete(indexName, searchTerm, field, limit = 10) {
    try {
      const result = await client.search({
        index: indexName,
        body: {
          query: {
            match: {
              [`${field}.autocomplete`]: searchTerm,
            },
          },
          size: limit,
          _source: [field],
        },
      });

      return result.hits.hits.map((hit) => ({
        id: hit._id,
        value: hit._source[field],
      }));
    } catch (error) {
      logger.error('Autocomplete failed:', error);
      throw error;
    }
  }

  /**
   * Filter search
   */
  async filterSearch(indexName, filters, options = {}) {
    const must = [];

    for (const [field, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        must.push({
          terms: { [field]: value },
        });
      } else {
        must.push({
          term: { [field]: value },
        });
      }
    }

    const query = {
      bool: {
        must,
      },
    };

    return this.search(indexName, query, options);
  }

  /**
   * Range search
   */
  async rangeSearch(indexName, field, gte, lte, options = {}) {
    const query = {
      range: {
        [field]: {
          gte,
          lte,
        },
      },
    };

    return this.search(indexName, query, options);
  }

  /**
   * Delete document
   */
  async delete(indexName, documentId) {
    try {
      const result = await client.delete({
        index: indexName,
        id: documentId,
        refresh: 'wait_for',
      });

      logger.debug('Document deleted', {
        index: indexName,
        id: documentId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async update(indexName, documentId, updates) {
    try {
      const result = await client.update({
        index: indexName,
        id: documentId,
        body: {
          doc: updates,
        },
        refresh: 'wait_for',
      });

      logger.debug('Document updated', {
        index: indexName,
        id: documentId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw error;
    }
  }

  /**
   * Get aggregations
   */
  async aggregate(indexName, aggregations, query = null) {
    try {
      const searchBody = {
        aggs: aggregations,
        size: 0,
      };

      if (query) {
        searchBody.query = query;
      }

      const result = await client.search({
        index: indexName,
        body: searchBody,
      });

      return result.aggregations;
    } catch (error) {
      logger.error('Aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async get(indexName, documentId) {
    try {
      const result = await client.get({
        index: indexName,
        id: documentId,
      });

      return {
        id: result._id,
        ...result._source,
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      logger.error('Failed to get document:', error);
      throw error;
    }
  }

  /**
   * Clear index
   */
  async clearIndex(indexName) {
    try {
      await client.deleteByQuery({
        index: indexName,
        body: {
          query: { match_all: {} },
        },
      });

      logger.info('Index cleared:', { index: indexName });
    } catch (error) {
      logger.error('Failed to clear index:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();
```

### Step 5: Indexing Queue

Create `src/config/indexing-queue.config.js`:

```javascript
const Queue = require('bull');
const elasticsearchService = require('../services/elasticsearch.service');
const logger = require('./logger.config');

/**
 * Create indexing queue
 */
const indexingQueue = new Queue('elasticsearch-indexing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

/**
 * Process indexing jobs
 */
indexingQueue.process(async (job) => {
  const { action, indexName, document, documentId } = job.data;

  logger.info('Processing indexing job', {
    jobId: job.id,
    action,
    index: indexName,
  });

  try {
    let result;

    switch (action) {
      case 'index':
        result = await elasticsearchService.index(indexName, documentId, document);
        break;
      case 'update':
        result = await elasticsearchService.update(indexName, documentId, document);
        break;
      case 'delete':
        result = await elasticsearchService.delete(indexName, documentId);
        break;
      case 'bulk':
        result = await elasticsearchService.bulkIndex(indexName, document);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    logger.info('Indexing job completed', {
      jobId: job.id,
      action,
    });

    return result;
  } catch (error) {
    logger.error('Indexing job failed:', {
      jobId: job.id,
      error: error.message,
      attempt: job.attemptsMade,
    });

    throw error;
  }
});

/**
 * Queue event handlers
 */
indexingQueue.on('completed', (job) => {
  logger.debug('Indexing job completed', { jobId: job.id });
});

indexingQueue.on('failed', (job, err) => {
  logger.error('Indexing job failed permanently', {
    jobId: job.id,
    error: err.message,
  });
});

/**
 * Add indexing job
 */
async function addIndexingJob(action, indexName, document, documentId, options = {}) {
  const job = await indexingQueue.add(
    {
      action,
      indexName,
      document,
      documentId,
    },
    {
      delay: options.delay,
      priority: options.priority || 'normal',
    }
  );

  logger.debug('Indexing job queued', {
    jobId: job.id,
    action,
    index: indexName,
  });

  return job;
}

module.exports = {
  indexingQueue,
  addIndexingJob,
};
```

### Step 6: Search Routes

Create `src/routes/search.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const elasticsearchService = require('../services/elasticsearch.service');
const cacheConfig = require('../config/cache.config');

/**
 * POST /search/posts
 * Search posts
 */
router.post('/posts', async (req, res, next) => {
  try {
    const { query, limit = 10, offset = 0, sortBy = '_score' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const cacheKey = `search:posts:${query}:${limit}:${offset}`;

    const results = await elasticsearchService.fullTextSearch(
      'posts',
      query,
      ['title^2', 'content', 'tags'],
      {
        limit,
        offset,
        sortBy,
        highlight: true,
      }
    );

    // Cache results for 5 minutes
    await cacheConfig.set(cacheKey, results, 300);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search/posts/autocomplete
 * Autocomplete post search
 */
router.get('/posts/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = await elasticsearchService.autocomplete('posts', q, 'title', 10);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/posts/filter
 * Filter posts
 */
router.post('/posts/filter', async (req, res, next) => {
  try {
    const { status, authorId, tags, createdAfter, createdBefore, limit = 10, offset = 0 } = req.body;

    const filters = {};

    if (status) filters.status = status;
    if (authorId) filters.authorId = authorId;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    let results;

    if (createdAfter || createdBefore) {
      results = await elasticsearchService.rangeSearch(
        'posts',
        'createdAt',
        createdAfter,
        createdBefore,
        { limit, offset }
      );
    } else {
      results = await elasticsearchService.filterSearch('posts', filters, {
        limit,
        offset,
      });
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search/posts/stats
 * Get post statistics
 */
router.get('/posts/stats', async (req, res, next) => {
  try {
    const aggregations = {
      status_dist: {
        terms: { field: 'status' },
      },
      top_authors: {
        terms: { field: 'authorId', size: 10 },
      },
      posts_over_time: {
        date_histogram: {
          field: 'createdAt',
          calendar_interval: 'day',
        },
      },
      avg_views: {
        avg: { field: 'viewCount' },
      },
    };

    const stats = await elasticsearchService.aggregate('posts', aggregations);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/users
 * Search users
 */
router.post('/users', async (req, res, next) => {
  try {
    const { query, limit = 10, offset = 0 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const results = await elasticsearchService.fullTextSearch(
      'users',
      query,
      ['name^2', 'email'],
      { limit, offset }
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /search/comments
 * Search comments
 */
router.post('/comments', async (req, res, next) => {
  try {
    const { query, limit = 10, offset = 0 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const results = await elasticsearchService.fullTextSearch(
      'comments',
      query,
      ['content'],
      { limit, offset, highlight: true }
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 7: Real-time Indexing Integration

Create `src/services/indexing-sync.service.js`:

```javascript
const { addIndexingJob } = require('../config/indexing-queue.config');
const logger = require('../config/logger.config');

class IndexingSyncService {
  /**
   * Sync user to Elasticsearch
   */
  async syncUser(user) {
    try {
      await addIndexingJob('index', 'users', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }, user.id);

      logger.debug('User sync queued', { userId: user.id });
    } catch (error) {
      logger.error('User sync failed:', error);
    }
  }

  /**
   * Sync post to Elasticsearch
   */
  async syncPost(post) {
    try {
      await addIndexingJob('index', 'posts', {
        id: post.id,
        title: post.title,
        content: post.content,
        status: post.status,
        authorId: post.authorId,
        viewCount: post.viewCount || 0,
        tags: post.tags || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      }, post.id);

      logger.debug('Post sync queued', { postId: post.id });
    } catch (error) {
      logger.error('Post sync failed:', error);
    }
  }

  /**
   * Sync comment to Elasticsearch
   */
  async syncComment(comment) {
    try {
      await addIndexingJob('index', 'comments', {
        id: comment.id,
        content: comment.content,
        authorId: comment.authorId,
        postId: comment.postId,
        createdAt: comment.createdAt,
      }, comment.id);

      logger.debug('Comment sync queued', { commentId: comment.id });
    } catch (error) {
      logger.error('Comment sync failed:', error);
    }
  }

  /**
   * Delete from index
   */
  async deleteFromIndex(indexName, documentId) {
    try {
      await addIndexingJob('delete', indexName, null, documentId);
      logger.debug('Delete queued', { index: indexName, id: documentId });
    } catch (error) {
      logger.error('Delete sync failed:', error);
    }
  }

  /**
   * Bulk sync (for backfilling)
   */
  async bulkSync(indexName, documents) {
    try {
      await addIndexingJob('bulk', indexName, documents, null, {
        priority: 'low',
      });

      logger.info('Bulk sync queued', {
        index: indexName,
        count: documents.length,
      });
    } catch (error) {
      logger.error('Bulk sync failed:', error);
    }
  }
}

module.exports = new IndexingSyncService();
```

### Step 8: Environment Variables

Add to `.env`:

```env
# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=password

# Indexing
ELASTICSEARCH_ENABLED=true
AUTO_SYNC_ENABLED=true
```

---

## 🧪 Testing

Create `src/tests/elasticsearch.test.js`:

```javascript
const elasticsearchService = require('../services/elasticsearch.service');
const { createIndex, deleteIndex, client } = require('../config/elasticsearch.config');

describe('Elasticsearch Search', () => {
  const testIndex = 'test-posts';

  beforeAll(async () => {
    // Create test index
    await createIndex(testIndex, {
      title: { type: 'text' },
      content: { type: 'text' },
      status: { type: 'keyword' },
      createdAt: { type: 'date' },
    });
  });

  afterAll(async () => {
    // Clean up
    await deleteIndex(testIndex);
  });

  test('should index document', async () => {
    const result = await elasticsearchService.index(testIndex, 'post-1', {
      title: 'Test Post',
      content: 'This is a test post',
      status: 'published',
    });

    expect(result._index).toBe(testIndex);
    expect(result._id).toBe('post-1');
  });

  test('should search documents', async () => {
    await elasticsearchService.index(testIndex, 'post-2', {
      title: 'Another Test',
      content: 'More test content',
      status: 'published',
    });

    const results = await elasticsearchService.fullTextSearch(
      testIndex,
      'test',
      ['title', 'content']
    );

    expect(results.total).toBeGreaterThan(0);
  });

  test('should autocomplete', async () => {
    const results = await elasticsearchService.autocomplete(
      testIndex,
      'Test',
      'title',
      10
    );

    expect(Array.isArray(results)).toBe(true);
  });

  test('should filter', async () => {
    const results = await elasticsearchService.filterSearch(testIndex, {
      status: 'published',
    });

    expect(results.total).toBeGreaterThan(0);
  });

  test('should delete document', async () => {
    await elasticsearchService.delete(testIndex, 'post-1');

    const doc = await elasticsearchService.get(testIndex, 'post-1');
    expect(doc).toBeNull();
  });
});
```

---

## 📝 Docker Setup

Create `docker-compose.elasticsearch.yml`:

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

volumes:
  elasticsearch-data:
```

Run with: `docker-compose -f docker-compose.elasticsearch.yml up`

---

## ✅ Checklist

- [ ] Elasticsearch installed and running
- [ ] Client connection configured
- [ ] Index mappings created
- [ ] Search service implemented
- [ ] Indexing queue configured
- [ ] Search routes created
- [ ] Real-time sync implemented
- [ ] Autocomplete working
- [ ] Filtering working
- [ ] Aggregations working
- [ ] Highlighting working
- [ ] Tests passing
- [ ] Kibana for monitoring accessible

---

## 🐛 Common Issues

### Issue: "Connection refused"
**Solution:** Ensure Elasticsearch is running: `docker-compose -f docker-compose.elasticsearch.yml up`

### Issue: "Index not found"
**Solution:** Create index first with `createIndex()`

### Issue: "Search too slow"
**Solution:** Add field index bosting (`title^2`), use appropriate analyzers

---

## 📋 Recipe Metadata

- **Recipe #:** 11/20
- **Category:** Search/Database
- **Status:** Production-Ready
- **Difficulty:** Advanced
- **Performance:** <100ms queries on millions of documents

---

**Next Recipe (#12): WebSocket Real-time Updates**

*Phase 3 Progress: 11/20 recipes complete (55%)*
