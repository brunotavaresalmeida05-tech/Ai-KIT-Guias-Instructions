# Recipe #7: GraphQL API Implementation

> Build scalable GraphQL API with subscriptions and real-time capabilities

---

## 📊 Overview

- **Use Case:** Flexible data queries, real-time subscriptions, reduced over-fetching
- **Tech Stack:** Node.js, Apollo Server, GraphQL, WebSocket
- **Time:** 4-5 hours
- **Difficulty:** Advanced
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+ with npm
- [ ] Database connection established
- [ ] Recipe #4: Error Handling & Logging completed
- [ ] Understanding of GraphQL concepts

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install apollo-server-express graphql graphql-tools @graphql-tools/schema
npm install subscriptions-transport-ws ws
npm install graphql-depth-limit graphql-rate-limit
npm install --save-dev @types/graphql
```

### Step 2: GraphQL Schema Definition

Create `src/graphql/schema.graphql`:

```graphql
# Users
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  isActive: Boolean!
  emailVerified: Boolean!
  createdAt: String!
  updatedAt: String!
  posts(limit: Int, offset: Int): [Post!]!
  postCount: Int!
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  cursor: String!
  node: User!
}

# Posts
type Post {
  id: ID!
  title: String!
  content: String!
  status: PostStatus!
  author: User!
  viewCount: Int!
  createdAt: String!
  updatedAt: String!
  comments(limit: Int, offset: Int): [Comment!]!
  commentCount: Int!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  cursor: String!
  node: Post!
}

# Comments
type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
  createdAt: String!
  updatedAt: String!
}

# Pagination
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Query
type Query {
  # User queries
  user(id: ID!): User
  users(
    first: Int
    after: String
    search: String
  ): UserConnection!
  me: User

  # Post queries
  post(id: ID!): Post
  posts(
    first: Int
    after: String
    status: PostStatus
    authorId: ID
  ): PostConnection!

  # Comment queries
  comment(id: ID!): Comment
  comments(
    postId: ID!
    first: Int
    after: String
  ): [Comment!]!
}

# Mutation
type Mutation {
  # User mutations
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
  changePassword(currentPassword: String!, newPassword: String!): Boolean!

  # Post mutations
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  publishPost(id: ID!): Post!

  # Comment mutations
  createComment(input: CreateCommentInput!): Comment!
  deleteComment(id: ID!): Boolean!
}

# Subscription
type Subscription {
  userCreated: User!
  userUpdated(id: ID!): User!
  userDeleted(id: ID!): User!

  postCreated: Post!
  postUpdated(id: ID!): Post!
  postPublished: Post!

  commentCreated(postId: ID!): Comment!
}

# Inputs
input CreateUserInput {
  email: String!
  name: String!
  password: String!
}

input UpdateUserInput {
  email: String
  name: String
  role: Role
}

input CreatePostInput {
  title: String!
  content: String!
  status: PostStatus
}

input UpdatePostInput {
  title: String
  content: String
  status: PostStatus
}

input CreateCommentInput {
  content: String!
  postId: ID!
}

# Error
type Error {
  code: String!
  message: String!
  field: String
}

schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
```

### Step 3: Resolvers

Create `src/graphql/resolvers.js`:

```javascript
const userRepository = require('../database/repositories/user.repository');
const postRepository = require('../database/repositories/post.repository');
const commentRepository = require('../database/repositories/comment.repository');
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const CacheService = require('../services/cache.service');

const resolvers = {
  Query: {
    /**
     * Get user by ID
     */
    user: async (_, { id }, { user }) => {
      if (!id) {
        throw new Error('User ID required');
      }

      return userRepository.findById(id);
    },

    /**
     * Get all users with cursor-based pagination
     */
    users: async (_, { first = 10, after, search }, { user }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const cacheKey = `users:cursor:${after || 'start'}:${first}:${search || ''}`;

      return CacheService.getOrSet(cacheKey, async () => {
        const users = await userRepository.findAllCursor(first, after, search);
        return {
          edges: users.map((u, i) => ({
            cursor: Buffer.from(i.toString()).toString('base64'),
            node: u,
          })),
          pageInfo: {
            hasNextPage: users.length === first,
            hasPreviousPage: !!after,
            endCursor: users.length > 0
              ? Buffer.from((users.length - 1).toString()).toString('base64')
              : null,
          },
          totalCount: await userRepository.count(),
        };
      }, 600);
    },

    /**
     * Get current user
     */
    me: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      return userRepository.findById(user.id);
    },

    /**
     * Get post by ID
     */
    post: async (_, { id }) => {
      const post = await postRepository.findById(id);

      if (!post) {
        throw new Error('Post not found');
      }

      return post;
    },

    /**
     * Get all posts with cursor pagination
     */
    posts: async (_, { first = 10, after, status, authorId }) => {
      const cacheKey = `posts:${first}:${after || 'start'}:${status || ''}:${authorId || ''}`;

      return CacheService.getOrSet(cacheKey, async () => {
        const posts = await postRepository.findAllCursor(
          first,
          after,
          status,
          authorId
        );

        return {
          edges: posts.map((p, i) => ({
            cursor: Buffer.from(i.toString()).toString('base64'),
            node: p,
          })),
          pageInfo: {
            hasNextPage: posts.length === first,
            hasPreviousPage: !!after,
          },
          totalCount: await postRepository.count({ status, authorId }),
        };
      }, 600);
    },

    /**
     * Get comments for post
     */
    comments: async (_, { postId, first = 10, after }) => {
      return postRepository.findComments(postId, first, after);
    },
  },

  Mutation: {
    /**
     * Create user
     */
    createUser: async (_, { input }, { pubsub }) => {
      const user = await userRepository.create(input);

      // Publish subscription
      pubsub.publish('USER_CREATED', { userCreated: user });

      // Invalidate cache
      await CacheService.invalidateByTag('users');

      return user;
    },

    /**
     * Update user
     */
    updateUser: async (_, { id, input }, { user: currentUser, pubsub }) => {
      if (!currentUser || currentUser.id !== id) {
        throw new ForbiddenError('Cannot update other users');
      }

      const user = await userRepository.update(id, input);

      // Publish subscription
      pubsub.publish(`USER_UPDATED_${id}`, { userUpdated: user });

      // Invalidate cache
      await CacheService.invalidateByTag('users');

      return user;
    },

    /**
     * Delete user
     */
    deleteUser: async (_, { id }, { user: currentUser, pubsub }) => {
      if (!currentUser || (currentUser.id !== id && currentUser.role !== 'ADMIN')) {
        throw new ForbiddenError('Cannot delete this user');
      }

      const deleted = await userRepository.delete(id);

      // Publish subscription
      if (deleted) {
        pubsub.publish(`USER_DELETED_${id}`, { 
          userDeleted: { id, ...currentUser } 
        });
      }

      return deleted > 0;
    },

    /**
     * Create post
     */
    createPost: async (_, { input }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const post = await postRepository.create({
        ...input,
        authorId: user.id,
      });

      // Publish subscription
      pubsub.publish('POST_CREATED', { postCreated: post });

      return post;
    },

    /**
     * Update post
     */
    updatePost: async (_, { id, input }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const post = await postRepository.findById(id);

      if (!post || post.authorId !== user.id) {
        throw new ForbiddenError('Cannot update this post');
      }

      const updated = await postRepository.update(id, input);

      // Publish subscription
      pubsub.publish(`POST_UPDATED_${id}`, { postUpdated: updated });

      return updated;
    },

    /**
     * Publish post
     */
    publishPost: async (_, { id }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const post = await postRepository.update(id, { status: 'PUBLISHED' });

      // Publish subscription
      pubsub.publish('POST_PUBLISHED', { postPublished: post });

      // Invalidate cache
      await CacheService.invalidateByTag('posts');

      return post;
    },

    /**
     * Delete post
     */
    deletePost: async (_, { id }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const post = await postRepository.findById(id);

      if (!post || post.authorId !== user.id) {
        throw new ForbiddenError('Cannot delete this post');
      }

      return await postRepository.delete(id) > 0;
    },

    /**
     * Create comment
     */
    createComment: async (_, { input }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const comment = await commentRepository.create({
        ...input,
        authorId: user.id,
      });

      // Publish subscription
      pubsub.publish(`COMMENT_CREATED_${input.postId}`, {
        commentCreated: comment,
      });

      return comment;
    },

    /**
     * Delete comment
     */
    deleteComment: async (_, { id }, { user, pubsub }) => {
      if (!user) {
        throw new AuthenticationError('Requires authentication');
      }

      const comment = await commentRepository.findById(id);

      if (!comment || comment.authorId !== user.id) {
        throw new ForbiddenError('Cannot delete this comment');
      }

      return await commentRepository.delete(id) > 0;
    },
  },

  Subscription: {
    /**
     * Subscribe to new users
     */
    userCreated: {
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator(['USER_CREATED']);
      },
    },

    /**
     * Subscribe to user updates
     */
    userUpdated: {
      subscribe: (_, { id }, { pubsub }) => {
        return pubsub.asyncIterator([`USER_UPDATED_${id}`]);
      },
    },

    /**
     * Subscribe to new posts
     */
    postCreated: {
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator(['POST_CREATED']);
      },
    },

    /**
     * Subscribe to post updates
     */
    postUpdated: {
      subscribe: (_, { id }, { pubsub }) => {
        return pubsub.asyncIterator([`POST_UPDATED_${id}`]);
      },
    },

    /**
     * Subscribe to post publications
     */
    postPublished: {
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator(['POST_PUBLISHED']);
      },
    },

    /**
     * Subscribe to new comments
     */
    commentCreated: {
      subscribe: (_, { postId }, { pubsub }) => {
        return pubsub.asyncIterator([`COMMENT_CREATED_${postId}`]);
      },
    },
  },

  // Field resolvers
  User: {
    posts: async (parent) => {
      return postRepository.findByAuthorId(parent.id);
    },
    postCount: async (parent) => {
      return postRepository.countByAuthorId(parent.id);
    },
  },

  Post: {
    author: async (parent) => {
      return userRepository.findById(parent.authorId);
    },
    comments: async (parent, { limit, offset }) => {
      return commentRepository.findByPostId(parent.id, limit, offset);
    },
    commentCount: async (parent) => {
      return commentRepository.countByPostId(parent.id);
    },
  },

  Comment: {
    author: async (parent) => {
      return userRepository.findById(parent.authorId);
    },
    post: async (parent) => {
      return postRepository.findById(parent.postId);
    },
  },
};

module.exports = resolvers;
```

### Step 4: Apollo Server Setup

Create `src/graphql/apollo-server.js`:

```javascript
const { ApolloServer } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const depthLimit = require('graphql-depth-limit');
const rateLimit = require('graphql-rate-limit');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');
const logger = require('../config/logger.config');

// Read schema
const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.graphql'),
  'utf8'
);

// Create pub/sub
const pubsub = new PubSub();

// Rate limiting rules
const rateLimitRules = {
  Query: {
    users: rateLimit.createSimpleRateLimitDirective({
      windowMs: 60000,
      max: 10,
    }),
    posts: rateLimit.createSimpleRateLimitDirective({
      windowMs: 60000,
      max: 20,
    }),
  },
  Mutation: {
    createUser: rateLimit.createSimpleRateLimitDirective({
      windowMs: 3600000,
      max: 5,
    }),
    createPost: rateLimit.createSimpleRateLimitDirective({
      windowMs: 60000,
      max: 10,
    }),
  },
};

/**
 * Create Apollo Server instance
 */
async function createApolloServer(app) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [
      depthLimit(10), // Prevent deeply nested queries
    ],
    context: async ({ req, connection }) => {
      // Handle WebSocket subscriptions
      if (connection) {
        return {
          user: connection.context.user,
          pubsub,
        };
      }

      // Handle HTTP requests
      const token = req.headers.authorization?.replace('Bearer ', '');
      let user = null;

      if (token) {
        try {
          const jwtService = require('../services/jwt.service');
          user = jwtService.verifyAccessToken(token);
        } catch (error) {
          logger.warn('Invalid GraphQL token:', { error: error.message });
        }
      }

      return {
        user,
        pubsub,
      };
    },
    plugins: {
      /**
       * Log GraphQL operations
       */
      didResolveOperation(ctx) {
        logger.debug('GraphQL Operation', {
          operationName: ctx.operationName,
          operation: ctx.request.operationName,
          variables: ctx.request.variables,
        });
      },

      /**
       * Handle errors
       */
      didEncounterErrors(ctx) {
        for (const err of ctx.errors) {
          logger.error('GraphQL Error', {
            message: err.message,
            locations: err.locations,
            path: err.path,
          });
        }
      },
    },
    formatError: (error) => {
      logger.error('GraphQL Format Error:', error);

      // Don't expose internal details in production
      if (process.env.NODE_ENV === 'production') {
        return {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        };
      }

      return error;
    },
  });

  // Start server
  await server.start();

  // Apply middleware
  server.applyMiddleware({ app, path: '/graphql' });

  // Setup WebSocket subscriptions
  const httpServer = require('http').createServer(app);

  server.installSubscriptionHandlers(httpServer);

  return { server, httpServer };
}

module.exports = createApolloServer;
```

### Step 5: Express Integration

Create `src/app.js` (updated for GraphQL):

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const logger = require('./config/logger.config');
const createApolloServer = require('./graphql/apollo-server');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Initialize GraphQL
async function startServer() {
  try {
    const { server, httpServer } = await createApolloServer(app);
    logger.info('✓ Apollo Server started', {
      url: `${process.env.GRAPHQL_URL || 'http://localhost:4000'}/graphql`,
    });

    // Start HTTP server
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

module.exports = { app, startServer };
```

### Step 6: Client Usage Examples

Create `src/graphql/queries.graphql`:

```graphql
# Get user
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    name
    role
    posts(limit: 5) {
      id
      title
      status
    }
  }
}

# List users
query ListUsers($first: Int, $after: String) {
  users(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        email
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Get post with comments
query GetPostWithComments($id: ID!) {
  post(id: $id) {
    id
    title
    content
    author {
      id
      name
    }
    comments(limit: 10) {
      id
      content
      author {
        name
      }
      createdAt
    }
  }
}

# Get current user
query GetCurrentUser {
  me {
    id
    email
    name
    posts {
      id
      title
    }
  }
}
```

Create `src/graphql/mutations.graphql`:

```graphql
# Create post
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    content
    status
    createdAt
  }
}

# Publish post
mutation PublishPost($id: ID!) {
  publishPost(id: $id) {
    id
    status
    updatedAt
  }
}

# Create comment
mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) {
    id
    content
    author {
      name
    }
    createdAt
  }
}

# Update user
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    name
    updatedAt
  }
}
```

Create `src/graphql/subscriptions.graphql`:

```graphql
# Subscribe to new posts
subscription OnPostCreated {
  postCreated {
    id
    title
    author {
      name
    }
  }
}

# Subscribe to post updates
subscription OnPostUpdated($id: ID!) {
  postUpdated(id: $id) {
    id
    title
    status
    updatedAt
  }
}

# Subscribe to new comments
subscription OnCommentCreated($postId: ID!) {
  commentCreated(postId: $postId) {
    id
    content
    author {
      name
    }
    createdAt
  }
}
```

---

## 🧪 Testing

Create `src/tests/graphql.test.js`:

```javascript
const { gql } = require('apollo-server-express');
const request = require('supertest');
const { ApolloClient, InMemoryCache, HttpLink } = require('@apollo/client');

describe('GraphQL API', () => {
  const GET_USER = gql`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        name
      }
    }
  `;

  const CREATE_POST = gql`
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        title
        status
      }
    }
  `;

  test('should query user', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: GET_USER,
        variables: { id: '1' },
      });

    expect(response.body.data.user).toBeDefined();
  });

  test('should create post', async () => {
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: CREATE_POST,
        variables: {
          input: { title: 'Test', content: 'Content' },
        },
      });

    expect(response.body.data.createPost.id).toBeDefined();
  });

  test('should reject deep queries', async () => {
    const deepQuery = gql`
      query {
        users(first: 10) {
          edges {
            node {
              posts {
                comments {
                  author {
                    posts {
                      comments {
                        author {
                          posts {
                            comments {
                              author {
                                posts {
                                  comments {
                                    author {
                                      id
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query: deepQuery });

    expect(response.body.errors).toBeDefined();
  });
});
```

---

## ✅ Checklist

- [ ] GraphQL schema defined
- [ ] Resolvers implemented for Query, Mutation, Subscription
- [ ] Apollo Server configured
- [ ] WebSocket subscriptions working
- [ ] Authentication integrated
- [ ] Rate limiting configured
- [ ] Depth limiting enabled
- [ ] Cache integration complete
- [ ] Error handling implemented
- [ ] Tests passing
- [ ] Client queries created
- [ ] Subscriptions tested

---

## 🐛 Common Issues

### Issue: "Cannot read property of undefined"
**Solution:** Ensure database repositories return consistent shapes

### Issue: "WebSocket connection fails"
**Solution:** Check firewall and WSS configuration

### Issue: "Subscriptions not firing"
**Solution:** Verify pubsub is shared across resolvers

---

## 📋 Recipe Metadata

- **Recipe #:** 7/20
- **Category:** API Development
- **Status:** Production-Ready
- **Difficulty:** Advanced
- **OWASP:** Compliant ✅

---

**Next Recipe (#8): File Upload & Storage**

*Phase 3 Progress: 7/20 recipes complete (35%)*
