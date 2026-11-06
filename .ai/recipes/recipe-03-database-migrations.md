# Recipe #3: Database Migrations & Schema Versioning

> Implement versioned database migrations with rollback support

---

## 📊 Overview

- **Use Case:** Schema versioning, backward compatibility, team collaboration
- **Tech Stack:** Node.js, Knex.js, PostgreSQL/MySQL
- **Time:** 2-3 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready

---

## ✅ Prerequisites

- [ ] PostgreSQL or MySQL installed
- [ ] Node.js 18+ with npm
- [ ] Database access credentials
- [ ] Basic SQL knowledge

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install knex pg mysql2
npm install --save-dev @types/knex
```

### Step 2: Knex Configuration

Create `knexfile.js`:

```javascript
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/database/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'js',
    },
  },

  testing: {
    client: 'pg',
    connection: process.env.DATABASE_TEST_URL,
    migrations: {
      directory: './src/database/migrations',
      extension: 'js',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/database/migrations',
      extension: 'js',
    },
    pool: {
      min: 5,
      max: 20,
    },
  },
};
```

### Step 3: Database Connection Service

Create `src/database/connection.js`:

```javascript
const knex = require('knex');
const config = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

const db = knex(knexConfig);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✓ Database connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  await db.destroy();
}

module.exports = {
  db,
  testConnection,
  closeConnection,
};
```

### Step 4: Create Migrations

```bash
npx knex migrate:make create_users_table
npx knex migrate:make create_posts_table
npx knex migrate:make add_verification_to_users
```

Create `src/database/migrations/001_create_users_table.js`:

```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255);
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255).nullable();
    table.timestamp('email_verified_at').nullable();
    table.timestamps(true, true); // created_at, updated_at
    table.index('email');
    table.index('role');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
};
```

Create `src/database/migrations/002_create_posts_table.js`:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.integer('view_count').defaultTo(0);
    table.timestamps(true, true);
    
    table.foreign('user_id')
      .references('users.id')
      .onDelete('CASCADE');
    
    table.index('user_id');
    table.index('status');
    table.index('created_at');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('posts');
};
```

Create `src/database/migrations/003_add_verification_to_users.js`:

```javascript
exports.up = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.string('verification_code', 6).nullable();
    table.timestamp('verification_code_expires_at').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.dropColumn('verification_code');
    table.dropColumn('verification_code_expires_at');
  });
};
```

### Step 5: Migration Scripts

Create `src/database/migrate.js`:

```javascript
const { db } = require('./connection');

/**
 * Run pending migrations
 */
async function migrate() {
  try {
    console.log('Running migrations...');
    const result = await db.migrate.latest();
    console.log(`✓ ${result[1].length} migrations completed`);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Rollback last batch of migrations
 */
async function rollback() {
  try {
    console.log('Rolling back migrations...');
    const result = await db.migrate.rollback();
    console.log(`✓ Rollback completed: ${result[1].length} migrations reverted`);
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    process.exit(1);
  }
}

/**
 * Reset database (development only)
 */
async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production');
  }

  try {
    console.log('Resetting database...');
    await db.migrate.rollback(null, true);
    await db.migrate.latest();
    console.log('✓ Database reset completed');
  } catch (error) {
    console.error('✗ Reset failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get migration status
 */
async function status() {
  try {
    const completed = await db.migrate.currentVersion();
    const pending = await db.migrate.list();
    
    console.log('Migration Status:');
    console.log(`Current: ${completed}`);
    console.log(`Pending: ${pending[1].length}`);
  } catch (error) {
    console.error('✗ Status check failed:', error.message);
  }
}

module.exports = {
  migrate,
  rollback,
  reset,
  status,
};
```

### Step 6: Database Repository Pattern

Create `src/database/repositories/user.repository.js`:

```javascript
const { db } = require('../connection');

class UserRepository {
  /**
   * Create user
   */
  async create(userData) {
    const [id] = await db('users').insert({
      email: userData.email,
      password_hash: userData.passwordHash,
      name: userData.name,
      role: userData.role || 'user',
    });

    return this.findById(id);
  }

  /**
   * Find by ID
   */
  async findById(id) {
    return db('users').where('id', id).first();
  }

  /**
   * Find by email
   */
  async findByEmail(email) {
    return db('users').where('email', email).first();
  }

  /**
   * Find all (with pagination)
   */
  async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db('users')
        .select('*')
        .offset(offset)
        .limit(limit)
        .orderBy('created_at', 'desc'),
      db('users').count('* as count').first(),
    ]);

    return {
      data: rows,
      total: countResult.count,
      page,
      limit,
      pages: Math.ceil(countResult.count / limit),
    };
  }

  /**
   * Update user
   */
  async update(id, updates) {
    await db('users')
      .where('id', id)
      .update(updates);

    return this.findById(id);
  }

  /**
   * Delete user
   */
  async delete(id) {
    return db('users').where('id', id).del();
  }

  /**
   * Verify email
   */
  async verifyEmail(id) {
    return this.update(id, {
      email_verified: true,
      email_verified_at: db.fn.now(),
      email_verification_token: null,
    });
  }
}

module.exports = new UserRepository();
```

### Step 7: Integration with Express

Create `src/app.js` setup:

```javascript
const express = require('express');
const { db, testConnection } = require('./database/connection');
const userRoutes = require('./routes/users.routes');

const app = express();

app.use(express.json());

// Test DB connection on startup
app.use(async (req, res, next) => {
  if (!app.locals.dbConnected) {
    const connected = await testConnection();
    app.locals.dbConnected = connected;
  }
  next();
});

app.use('/users', userRoutes);

module.exports = app;
```

---

## 📝 NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "migrate": "node -e \"require('./src/database/migrate').migrate()\"",
    "migrate:rollback": "node -e \"require('./src/database/migrate').rollback()\"",
    "migrate:reset": "node -e \"require('./src/database/migrate').reset()\"",
    "migrate:status": "node -e \"require('./src/database/migrate').status()\"",
    "seed": "knex seed:run"
  }
}
```

---

## 🧪 Testing

Create `src/tests/migrations.test.js`:

```javascript
const { db } = require('../database/connection');

describe('Database Migrations', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test('should have users table', async () => {
    const hasTable = await db.schema.hasTable('users');
    expect(hasTable).toBe(true);
  });

  test('should have posts table', async () => {
    const hasTable = await db.schema.hasTable('posts');
    expect(hasTable).toBe(true);
  });

  test('should insert and retrieve user', async () => {
    const user = await db('users').insert({
      email: 'test@example.com',
      password_hash: 'hash',
      name: 'Test User',
    });

    const retrieved = await db('users').where('id', user[0]).first();
    expect(retrieved.email).toBe('test@example.com');
  });
});
```

---

## ✅ Checklist

- [ ] Knex configured
- [ ] Migrations folder created
- [ ] First migration runs successfully
- [ ] Rollback works
- [ ] Database properly seeded
- [ ] Repository pattern implemented
- [ ] Tests pass
- [ ] Migrations documented

---

## 🐛 Common Issues

### Issue: "Cannot find module 'knex'"
**Solution:** `npm install knex pg`

### Issue: Migration file not found
**Solution:** Check file extension matches `.js` in knexfile

### Issue: Foreign key constraint errors
**Solution:** Ensure parent table migration runs first

---

## 📋 Recipe Metadata

- **Recipe #:** 3/20
- **Category:** Database
- **Status:** Production-Ready
- **Difficulty:** Intermediate

---

**Next Recipe (#4): Error Handling & Logging**

*Phase 3 Progress: 3/20 recipes complete (15%)*
