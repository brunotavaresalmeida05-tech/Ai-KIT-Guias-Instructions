# Recipe #16: Testing & QA Strategy

> Comprehensive testing framework with unit, integration, and E2E tests

---

## 📊 Overview

- **Use Case:** Ensure code quality, prevent regressions, catch bugs early
- **Tech Stack:** Jest, Supertest, Cypress, Istanbul coverage
- **Time:** 4-5 hours
- **Difficulty:** Intermediate-Advanced
- **Target:** 80%+ code coverage with comprehensive test scenarios

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Test database available
- [ ] All previous recipes implemented
- [ ] Understanding of testing patterns

---

## 📖 Implementation

### Step 1: Install Testing Dependencies

```bash
npm install --save-dev jest supertest @testing-library/node
npm install --save-dev cypress cypress-plugin-snapshots
npm install --save-dev @faker-js/faker
npm install --save-dev jest-extended jest-mock-extended
npm install --save-dev nyc
```

### Step 2: Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
};
```

### Step 3: Test Setup

Create `src/tests/setup.js`:

```javascript
const { initializeMemoryDb } = require('./helpers/db.helper');
const logger = require('../config/logger.config');

// Suppress logs during tests
logger.transports.forEach((t) => {
  t.silent = true;
});

// Global test setup
beforeAll(async () => {
  await initializeMemoryDb();
});

// Global test teardown
afterAll(async () => {
  // Cleanup
});

// Per-test setup
beforeEach(async () => {
  jest.clearAllMocks();
});
```

### Step 4: Test Helpers

Create `src/tests/helpers/db.helper.js`:

```javascript
const { db } = require('../../database/connection');

/**
 * Initialize in-memory database for testing
 */
async function initializeMemoryDb() {
  try {
    // Run migrations
    await db.migrate.latest();

    console.log('✓ Test database initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Seed test data
 */
async function seedTestData() {
  const users = [
    {
      id: 1,
      email: 'user1@test.com',
      password_hash: 'hashed_password_1',
      name: 'Test User 1',
      role: 'user',
    },
    {
      id: 2,
      email: 'admin@test.com',
      password_hash: 'hashed_password_2',
      name: 'Admin User',
      role: 'admin',
    },
  ];

  await db('users').insert(users);

  const posts = [
    {
      id: 1,
      user_id: 1,
      title: 'Test Post 1',
      content: 'Content 1',
      status: 'published',
    },
    {
      id: 2,
      user_id: 1,
      title: 'Test Post 2',
      content: 'Content 2',
      status: 'draft',
    },
  ];

  await db('posts').insert(posts);

  return { users, posts };
}

/**
 * Clear all data
 */
async function clearAllData() {
  const tables = ['posts', 'users', 'sessions'];

  for (const table of tables) {
    await db(table).del();
  }
}

module.exports = {
  initializeMemoryDb,
  seedTestData,
  clearAllData,
};
```

Create `src/tests/helpers/auth.helper.js`:

```javascript
const jwtService = require('../../services/jwt.service');

/**
 * Generate test JWT token
 */
function generateTestToken(userId = 'test-user', role = 'user') {
  return jwtService.generateAccessToken(userId, `${userId}@test.com`);
}

/**
 * Create test user object
 */
function createTestUser(overrides = {}) {
  return {
    id: 'user-' + Date.now(),
    email: `user-${Date.now()}@test.com`,
    password_hash: 'hashed_password',
    name: 'Test User',
    role: 'user',
    isActive: true,
    emailVerified: true,
    ...overrides,
  };
}

module.exports = {
  generateTestToken,
  createTestUser,
};
```

### Step 5: Unit Tests

Create `src/services/__tests__/email.service.test.js`:

```javascript
const emailService = require('../email.service');
const ejs = require('ejs');

jest.mock('ejs');
jest.mock('../../config/logger.config');

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderTemplate', () => {
    test('should render template with data', async () => {
      const mockHtml = '<p>Welcome Test User</p>';
      ejs.renderFile.mockResolvedValue(mockHtml);

      const result = await emailService.renderTemplate('welcome', {
        name: 'Test User',
      });

      expect(result).toBe(mockHtml);
      expect(ejs.renderFile).toHaveBeenCalled();
    });

    test('should handle template rendering errors', async () => {
      ejs.renderFile.mockRejectedValue(new Error('Template not found'));

      await expect(
        emailService.renderTemplate('nonexistent', {})
      ).rejects.toThrow('Template not found');
    });
  });

  describe('sendWelcomeEmail', () => {
    test('should send welcome email', async () => {
      const to = 'user@test.com';
      const name = 'Test User';
      const token = 'verification-token';

      jest.spyOn(emailService, 'renderTemplate').mockResolvedValue('<p>Welcome</p>');

      const result = await emailService.sendWelcomeEmail(to, name, token);

      expect(result).toBeDefined();
    });

    test('should include verification URL', async () => {
      jest.spyOn(emailService, 'renderTemplate').mockResolvedValue('<p>Welcome</p>');

      const to = 'user@test.com';
      const token = 'test-token';

      await emailService.sendWelcomeEmail(to, 'User', token);

      expect(emailService.renderTemplate).toHaveBeenCalledWith(
        'welcome',
        expect.objectContaining({
          verificationUrl: expect.stringContaining(token),
        })
      );
    });
  });

  describe('sendBatch', () => {
    test('should send emails to multiple recipients', async () => {
      jest.spyOn(emailService.provider, 'send').mockResolvedValue({});

      const recipients = [
        { email: 'user1@test.com' },
        { email: 'user2@test.com' },
      ];

      const results = await emailService.sendBatch(
        recipients,
        'Test Subject',
        '<p>Test</p>'
      );

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    test('should handle partial failures', async () => {
      jest
        .spyOn(emailService.provider, 'send')
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Send failed'));

      const recipients = [
        { email: 'user1@test.com' },
        { email: 'user2@test.com' },
      ];

      const results = await emailService.sendBatch(
        recipients,
        'Subject',
        '<p>Test</p>'
      );

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
```

### Step 6: Integration Tests

Create `src/routes/__tests__/auth.routes.test.js`:

```javascript
const request = require('supertest');
const app = require('../../app');
const userRepository = require('../../database/repositories/user.repository');
const { seedTestData, clearAllData } = require('../helpers/db.helper');
const { generateTestToken } = require('../helpers/auth.helper');

describe('Authentication Routes', () => {
  beforeEach(async () => {
    await clearAllData();
    await seedTestData();
  });

  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@test.com',
          password: 'correct_password',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@test.com',
          password: 'wrong_password',
        });

      expect(response.status).toBe(401);
    });

    test('should rate limit after multiple failures', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: 'user1@test.com',
            password: 'wrong',
          });
      }

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@test.com',
          password: 'password',
        });

      expect(response.status).toBe(429);
    });
  });

  describe('POST /auth/register', () => {
    test('should register new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'StrongPass123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('accessToken');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'user@test.com',
          name: 'User',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too weak');
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'user1@test.com',
          name: 'Duplicate',
          password: 'StrongPass123!',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /auth/me', () => {
    test('should get current user when authenticated', async () => {
      const token = generateTestToken('user-1');

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
    });

    test('should reject unauthenticated request', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
```

### Step 7: E2E Tests (Cypress)

Create `cypress/e2e/auth.cy.js`:

```javascript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3001');
  });

  describe('Login', () => {
    it('should login with valid credentials', () => {
      cy.visit('http://localhost:3001/login');

      cy.get('[data-testid="email-input"]').type('user1@test.com');
      cy.get('[data-testid="password-input"]').type('correct_password');
      cy.get('[data-testid="login-button"]').click();

      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="welcome-message"]').should('be.visible');
    });

    it('should show error on invalid credentials', () => {
      cy.visit('http://localhost:3001/login');

      cy.get('[data-testid="email-input"]').type('wrong@test.com');
      cy.get('[data-testid="password-input"]').type('wrong_password');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
    });
  });

  describe('Registration', () => {
    it('should register new user', () => {
      cy.visit('http://localhost:3001/register');

      cy.get('[data-testid="name-input"]').type('New User');
      cy.get('[data-testid="email-input"]').type('newuser@test.com');
      cy.get('[data-testid="password-input"]').type('StrongPass123!');
      cy.get('[data-testid="confirm-password-input"]').type('StrongPass123!');
      cy.get('[data-testid="register-button"]').click();

      cy.url().should('include', '/verify-email');
      cy.get('[data-testid="verification-message"]').should('be.visible');
    });

    it('should prevent weak passwords', () => {
      cy.visit('http://localhost:3001/register');

      cy.get('[data-testid="name-input"]').type('User');
      cy.get('[data-testid="email-input"]').type('user@test.com');
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="password-error"]').should('be.visible');
    });
  });
});
```

### Step 8: Performance Tests

Create `src/tests/performance/api.perf.test.js`:

```javascript
const request = require('supertest');
const app = require('../../app');
const { generateTestToken } = require('../helpers/auth.helper');

describe('API Performance', () => {
  const token = generateTestToken();

  test('should list users within 100ms', async () => {
    const start = Date.now();

    await request(app)
      .get('/api/v2/users')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  test('should search within 50ms', async () => {
    const start = Date.now();

    await request(app)
      .post('/search/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'test' });

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });

  test('should handle 100 concurrent requests', async () => {
    const requests = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .get('/api/v2/users?limit=5')
          .set('Authorization', `Bearer ${token}`)
      );

    const results = await Promise.all(requests);

    const successCount = results.filter((r) => r.status === 200).length;

    expect(successCount).toBeGreaterThan(95); // Allow 5% failure
  });
});
```

### Step 9: Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### Step 10: Coverage Reports

Create `src/tests/coverage.config.js`:

```javascript
const path = require('path');

module.exports = {
  checkCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/config/**',
    '!src/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/**/*.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

---

## 🧪 Test Strategy

```
Unit Tests (40%):
├── Services
├── Utilities
└── Helpers

Integration Tests (40%):
├── API Routes
├── Database Operations
└── External Services

E2E Tests (20%):
├── User Flows
├── Critical Paths
└── Cross-browser
```

---

## ✅ Checklist

- [ ] Jest configured with coverage thresholds
- [ ] Unit tests for services
- [ ] Integration tests for routes
- [ ] E2E tests with Cypress
- [ ] Performance tests added
- [ ] Test database setup
- [ ] Test helpers created
- [ ] CI/CD test pipeline configured
- [ ] Coverage reports generated
- [ ] 80%+ code coverage achieved
- [ ] All tests passing
- [ ] Flaky tests eliminated
- [ ] Performance benchmarks set

---

## 📊 Coverage Goals

```
Current:  0%
Target:   80%
Critical: 90%

Priority:
1. Services (highest value)
2. Routes (critical paths)
3. Utilities (supporting code)
4. Config (lowest priority)
```

---

## 🐛 Common Issues

### Issue: "Tests timeout"
**Solution:** Increase Jest timeout or optimize slow operations

### Issue: "Flaky tests"
**Solution:** Isolate tests, use proper setup/teardown, avoid time-dependent code

### Issue: "Cannot connect to test database"
**Solution:** Ensure test database is initialized before tests run

---

## 📋 Recipe Metadata

- **Recipe #:** 16/20
- **Category:** QA/Testing
- **Status:** Production-Ready
- **Difficulty:** Intermediate-Advanced
- **Coverage:** 80%+ target

---

**Next Recipe (#17): Performance Optimization**

*Phase 3 Progress: 16/20 recipes complete (80%)*
