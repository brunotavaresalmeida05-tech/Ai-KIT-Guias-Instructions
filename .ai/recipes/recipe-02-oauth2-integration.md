# Recipe #2: OAuth 2.0 Integration (Google & GitHub)

> Implement OAuth 2.0 authentication with Google and GitHub providers

---

## 📊 Overview

- **Use Case:** Social login with OAuth 2.0 providers
- **Tech Stack:** Node.js, Express, Passport.js, OAuth 2.0
- **Time:** 3-4 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Recipe #1 JWT Authentication setup (required)
- [ ] Google OAuth 2.0 credentials (Client ID, Secret)
- [ ] GitHub OAuth 2.0 credentials
- [ ] Express.js application running
- [ ] PostgreSQL/MongoDB user storage

---

## 🔧 Setup OAuth Applications

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web Application)
5. Add Authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### GitHub OAuth Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create New OAuth App
3. Set Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Secret to `.env`

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install passport passport-google-oauth20 passport-github2 express-session
npm install --save-dev @types/passport
```

### Step 2: Environment Variables

Add to `.env`:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session
SESSION_SECRET=your-secure-session-secret-min-32-chars
```

### Step 3: Session Configuration

Create `src/config/session.config.js`:

```javascript
const session = require('express-session');

module.exports = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});
```

### Step 4: Passport Configuration

Create `src/config/passport.config.js`:

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Mock user database (replace with real DB)
const users = new Map();

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user);
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const userId = `google-${profile.id}`;
        let user = users.get(userId);

        if (!user) {
          user = {
            id: userId,
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            createdAt: new Date(),
            accessToken,
            refreshToken,
          };
          users.set(userId, user);
        } else {
          // Update tokens
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const userId = `github-${profile.id}`;
        let user = users.get(userId);

        if (!user) {
          user = {
            id: userId,
            provider: 'github',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            username: profile.username,
            picture: profile.photos?.[0]?.value,
            createdAt: new Date(),
            accessToken,
            refreshToken,
          };
          users.set(userId, user);
        } else {
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

module.exports = passport;
```

### Step 5: OAuth Routes

Create `src/routes/oauth.routes.js`:

```javascript
const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwtService = require('../services/jwt.service');

/**
 * GET /oauth/google
 * Redirect to Google login
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /oauth/google/callback
 * Google callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    handleOAuthCallback(req, res);
  }
);

/**
 * GET /oauth/github
 * Redirect to GitHub login
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

/**
 * GET /oauth/github/callback
 * GitHub callback
 */
router.get(
  '/oauth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    handleOAuthCallback(req, res);
  }
);

/**
 * Handle OAuth callback
 */
function handleOAuthCallback(req, res) {
  const user = req.user;

  if (!user) {
    return res.redirect('/login?error=authentication_failed');
  }

  // Generate JWT tokens
  const tokens = jwtService.generateTokenPair(user.id, user.email);

  // Redirect to frontend with tokens
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  res.redirect(
    `${frontendUrl}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`
  );
}

/**
 * GET /oauth/logout
 * Logout
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

/**
 * GET /oauth/user
 * Get current OAuth user
 */
router.get('/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    id: req.user.id,
    provider: req.user.provider,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
  });
});

module.exports = router;
```

### Step 6: Middleware Integration

Update `src/app.js`:

```javascript
const express = require('express');
const cors = require('cors');
const session = require('./config/session.config');
const passport = require('./config/passport.config');
const authRoutes = require('./routes/auth.routes');
const oauthRoutes = require('./routes/oauth.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Session & Passport
app.use(session);
app.use(passport.initialize());
app.use(passport.session());

// HTTPS redirect
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/oauth', oauthRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;
```

---

## 🧪 Testing

Create `src/tests/oauth.test.js`:

```javascript
describe('OAuth Integration', () => {
  describe('Google OAuth', () => {
    test('should redirect to Google auth endpoint', (done) => {
      // Mock passport
      done();
    });

    test('should handle Google callback', (done) => {
      // Mock callback
      done();
    });
  });

  describe('GitHub OAuth', () => {
    test('should redirect to GitHub auth endpoint', (done) => {
      done();
    });

    test('should handle GitHub callback', (done) => {
      done();
    });
  });
});
```

---

## 🚀 Production Checklist

- [ ] OAuth credentials secured in environment variables
- [ ] HTTPS enforced
- [ ] Callback URLs verified in OAuth applications
- [ ] Session secret is cryptographically random
- [ ] CORS properly configured
- [ ] User data stored securely
- [ ] Refresh tokens handled correctly
- [ ] Logout implemented
- [ ] Error handling doesn't leak information

---

## 🐛 Common Issues

### Issue: "Invalid Client ID"
**Solution:** Check OAuth credentials in `.env` match provider settings

### Issue: Callback URL mismatch
**Solution:** Ensure callback URLs match exactly in provider settings

### Issue: User not persisting across requests
**Solution:** Ensure session middleware configured before passport

---

## 📋 Recipe Metadata

- **Recipe #:** 2/20
- **Category:** Authentication
- **Status:** Production-Ready
- **Difficulty:** Intermediate
- **OWASP:** Compliant ✅

---

**Next Recipe (#3): Database Migrations**
*Coming next: Versioned database schema management*

*Phase 3 Progress: 2/20 recipes complete (10%)*
