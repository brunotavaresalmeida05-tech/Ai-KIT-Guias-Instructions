---
name: security-audit
category: security
version: 1.0.0
description: Security Audit skill
tags:
- security
- audit
- compliance
when_to_use: Para auditoria de segurança completa do código/infraestrutura.
input:
  type: object
  properties:
    scope:
      type: string
    codebase:
      type: string
output:
  type: object
  properties:
    report:
      type: string
    vulnerabilities:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 60
  max_seconds: 1800
  typical_seconds: 300
---

# Security Audit

Security-Audit Skill

> **Purpose:** Proactively identify and fix security vulnerabilities.  
> Think like a hacker. Find weaknesses before malicious actors do.

---

## 1. SECURITY AUDIT CHECKLIST

### Pre-Code Submission Audit

```
🔐 OWASP TOP 10 REVIEW

[ ] A1 - Broken Access Control
    - [ ] Authorization checks on all protected endpoints
    - [ ] Role-based access control (RBAC) implemented
    - [ ] No privilege escalation vulnerabilities
    - [ ] User can only access own data

[ ] A2 - Cryptographic Failures
    - [ ] Passwords hashed with bcrypt/argon2 (not md5/sha1)
    - [ ] Sensitive data encrypted at rest (AES-256)
    - [ ] TLS/HTTPS enforced in production
    - [ ] No hardcoded secrets/keys

[ ] A3 - Injection
    - [ ] SQL: Parameterized queries everywhere
    - [ ] NoSQL: Query parameterization
    - [ ] Command injection: No shell commands with user input
    - [ ] LDAP injection: If LDAP used, parameterized

[ ] A4 - Insecure Design
    - [ ] Authentication flow documented (section 6 of AGENTS.md)
    - [ ] Rate limiting on login endpoint
    - [ ] Account lockout after failed attempts
    - [ ] Session timeout configured

[ ] A5 - Security Misconfiguration
    - [ ] Debug mode disabled in production
    - [ ] Error messages don't leak system details
    - [ ] Security headers set (CSP, X-Frame-Options, etc.)
    - [ ] CORS correctly configured (not wildcards in prod)
    - [ ] Unnecessary ports closed (only 22, 80, 443, 8080)

[ ] A6 - Vulnerable and Outdated Components
    - [ ] Dependencies audited: npm audit / pip check / cargo audit
    - [ ] No known CVEs in dependencies
    - [ ] Update policy documented
    - [ ] Dependency versions pinned (not wildcards)

[ ] A7 - Authentication Failures
    - [ ] JWT tokens signed with strong secret
    - [ ] Token expiration configured (15-60 min)
    - [ ] Refresh token rotation implemented
    - [ ] Password requirements enforced (min 12 chars, complexity)
    - [ ] 2FA available (if applicable)

[ ] A8 - Software/Data Integrity Failures
    - [ ] Code signed (commits GPG-signed)
    - [ ] Deployment artifacts verified
    - [ ] CI/CD pipeline logs audited
    - [ ] No unsigned/unverified dependencies

[ ] A9 - Logging & Monitoring Failures
    - [ ] Security events logged (login, access denied, etc.)
    - [ ] Logs don't contain sensitive data (passwords, tokens)
    - [ ] Log retention policy enforced
    - [ ] Alerts configured for suspicious activity

[ ] A10 - Server-Side Request Forgery (SSRF)
    - [ ] If fetching external URLs: Validate domain whitelist
    - [ ] No internal network access from user-supplied URLs
    - [ ] Timeouts on external requests
```

---

## 2. INPUT VALIDATION AUDIT

```typescript
// VULNERABLE - Don't do this
app.post('/api/users', (req, res) => {
  const user = {
    email: req.body.email,  // ❌ No validation
    role: req.body.role,    // ❌ User can set any role
    name: req.body.name,    // ❌ No length check
  }
  db.insert(user)
})

// SECURE - Do this
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'moderator']), // ✓ Whitelist only
})

app.post('/api/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body)
  
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() })
  }
  
  const user = result.data
  db.insert(user)
})
```

---

## 3. AUTHENTICATION AUDIT

```typescript
// VULNERABLE - Plaintext comparison
if (password === dbPassword) {
  // ❌ Timing attack vulnerability
}

// SECURE - Use constant-time comparison
import bcrypt from 'bcrypt'

const isPasswordValid = await bcrypt.compare(password, dbHashedPassword)
// ✓ Resistant to timing attacks
```

---

## 4. SQL INJECTION AUDIT

```typescript
// VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`
db.query(query)
// ❌ If email = "'; DROP TABLE users; --" → Database destroyed

// SECURE - Parameterized query
const query = 'SELECT * FROM users WHERE email = ?'
db.query(query, [email])
// ✓ User input treated as value, not SQL

// SECURE - ORM
const user = await User.findOne({ where: { email } })
// ✓ ORM handles parameterization
```

---

## 5. SENSITIVE DATA AUDIT

```
Data Classification:

PUBLIC (OK to expose)
  - Product names
  - Public documentation
  - Non-sensitive metadata

INTERNAL (Restricted)
  - Internal documentation
  - Non-user business data
  - Team communications

CONFIDENTIAL (Encrypt + Restrict)
  - User email addresses
  - User names
  - Business logic
  - API endpoints (if not public)

RESTRICTED (Max Security)
  - Passwords
  - API keys
  - Credit card numbers
  - Private health data
  - Authentication tokens

RULES:
  ✓ RESTRICTED → Encrypted at rest, hashed for passwords
  ✓ RESTRICTED → Never in logs, errors, or responses
  ✓ RESTRICTED → Only sent over HTTPS/TLS
  ✓ RESTRICTED → Rotate regularly
  ✓ CONFIDENTIAL → Encrypted at rest (optional)
  ✓ CONFIDENTIAL → Access controlled (RBAC)
```

---

## 6. API SECURITY AUDIT

```yaml
# Rate Limiting
Rate Limit Should Have:
  - [ ] Limit per IP address
  - [ ] Limit per authenticated user
  - [ ] Different limits for different endpoints
  - [ ] Sliding window or token bucket algorithm
  - [ ] Clear headers: X-RateLimit-Limit, X-RateLimit-Remaining
  - [ ] Return 429 when exceeded

# CORS (Cross-Origin Resource Sharing)
CORS Should Have:
  - [ ] Specific allowed origins (not * in production)
  - [ ] Allowed methods (GET, POST, etc.)
  - [ ] Allowed headers
  - [ ] Credentials handling (if needed)
  - [ ] Max-age for preflight cache

# Security Headers
Must Include:
  - [ ] Content-Security-Policy: Prevent XSS
  - [ ] X-Frame-Options: DENY (prevent clickjacking)
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security: HTTPS only
  - [ ] X-XSS-Protection: 1; mode=block (legacy)
  - [ ] Referrer-Policy: strict-origin-when-cross-origin

# API Versioning
  - [ ] Version in URL or header
  - [ ] Deprecation warnings for old versions
  - [ ] Migration guide to new version
  - [ ] Sunset date documented
```

---

## 7. DEPENDENCY SECURITY AUDIT

```bash
# Check for known vulnerabilities
npm audit                    # NPM
pip check                    # Python
cargo audit                  # Rust
mix deps.audit               # Elixir

# Generate SBOM (Software Bill of Materials)
npm list --json >sbom.json   # What dependencies, versions

# Update dependencies
npm update                   # Safe updates
npm audit fix                # Auto-fix vulnerabilities

# Lock versions
npm ci                       # Use package-lock.json
pip install -r requirements.txt  # Use pinned requirements.txt
```

---

## 8. ENVIRONMENT & SECRETS AUDIT

```bash
# CHECK: .env should NEVER be committed
if grep -r "DATABASE_URL=postgresql" .git/; then
  echo "❌ CRITICAL: Secrets committed to git"
  exit 1
fi

# CHECK: .gitignore should exclude .env
grep "^\.env$" .gitignore || echo "❌ .env not in .gitignore"

# CHECK: All secrets are environment variables (not hardcoded)
grep -r "password.*=" src/ --include="*.ts" --include="*.js" | grep -v "\.test\." | grep -v "TODO" || echo "✓ No hardcoded passwords"

# CHECK: Secrets are rotated
aws secretsmanager list-secret-version-ids --secret-id production-api-key

# CHECK: CI/CD doesn't log secrets
grep -r "echo.*\$.*PASSWORD\|echo.*\$.*KEY" .github/ && echo "❌ Secrets logged in CI"
```

---

## 9. PENETRATION TESTING SCENARIOS

### Scenario 1: Brute Force Login
```bash
# Attacker tries to guess password
for i in {1..1000}; do
  curl -X POST http://api.example.com/login \
    -d "email=admin@example.com&password=password$i"
done

# DEFENSE REQUIRED:
  [ ] Rate limiting on /login endpoint (max 5 attempts per minute)
  [ ] Account lockout after 5 failed attempts (30 min lockout)
  [ ] Log failed attempts
  [ ] Alert on multiple failures
  [ ] CAPTCHA after 3 failures
```

### Scenario 2: SQL Injection
```bash
# Attacker tries to extract data
curl "http://api.example.com/users?id=1; DROP TABLE users; --"
curl "http://api.example.com/users?id=1' UNION SELECT password FROM admin; --"

# DEFENSE REQUIRED:
  [ ] Parameterized queries everywhere
  [ ] Input validation (id should be number)
  [ ] Error messages don't expose DB structure
  [ ] WAF (Web Application Firewall) rules
```

### Scenario 3: Cross-Site Scripting (XSS)
```html
<!-- Attacker injects script -->
<input value="<script>alert('xss')</script>" />

<!-- When rendered on page, script executes -->
<!-- Steals cookies, tokens, or redirects user -->

<!-- DEFENSE REQUIRED: -->
  [ ] Sanitize user input on output
  [ ] Use templating engine that escapes HTML
  [ ] Content-Security-Policy header
  [ ] HTTPOnly flag on cookies
```

### Scenario 4: CSRF (Cross-Site Request Forgery)
```html
<!-- Attacker's site makes request to your API -->
<img src="http://api.example.com/api/users/delete?id=123" />

<!-- User browser automatically includes auth cookies -->
<!-- Request succeeds without user knowledge -->

<!-- DEFENSE REQUIRED: -->
  [ ] CSRF tokens on all state-changing requests
  [ ] SameSite cookie attribute
  [ ] Verify Origin/Referer headers
  [ ] Double-submit cookies
```

---

## 10. DEPLOYMENT SECURITY AUDIT

```yaml
# Production Checklist

INFRASTRUCTURE:
  [ ] HTTPS/TLS 1.2+ enforced
  [ ] Certificate valid and not self-signed
  [ ] Firewall rules: Only 22, 80, 443, 8080 open
  [ ] DDoS protection enabled (Cloudflare, AWS Shield)
  [ ] WAF (Web Application Firewall) enabled
  [ ] Intrusion detection enabled

DATABASE:
  [ ] Remote access restricted (only from app servers)
  [ ] Backups automated daily
  [ ] Backup encryption enabled
  [ ] Point-in-time recovery available
  [ ] Database credentials rotated monthly
  [ ] Query logs enabled and monitored
  [ ] Unused accounts removed

SECRETS MANAGEMENT:
  [ ] Secrets in vault (AWS Secrets Manager, HashiCorp Vault)
  [ ] Not hardcoded anywhere
  [ ] Rotation policy set (90 days)
  [ ] Audit log for secret access
  [ ] Access limited to necessary services

LOGGING & MONITORING:
  [ ] CloudWatch/ELK/Splunk configured
  [ ] Security events logged
  [ ] Suspicious activity alerts
  [ ] Performance monitoring
  [ ] Error rate alerts
  [ ] Uptime monitoring

UPDATES & PATCHES:
  [ ] Security patches applied within 24h of release
  [ ] OS patches scheduled monthly
  [ ] Dependency updates reviewed monthly
  [ ] Vulnerability scanning automated
  [ ] Patch testing on staging first
```

---

## 11. AUDIT AUTOMATION

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on: [pull_request, push]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Dependency audit
        run: npm audit --production
      
      - name: SAST (Static Application Security Testing)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
      
      - name: Secret scanning
        run: |
          pip install detect-secrets
          detect-secrets scan
      
      - name: Linting (includes security rules)
        run: npm run lint
      
      - name: Security headers check
        run: npx curl http://localhost:3000 | grep "Strict-Transport-Security"
```

---

## 12. INCIDENT RESPONSE

If vulnerability found in production:

```
PRIORITY 1: CONTAIN
  [ ] Disable affected feature (if possible)
  [ ] Rotate compromised credentials
  [ ] Lock affected user accounts
  [ ] Notify affected users immediately

PRIORITY 2: INVESTIGATE
  [ ] Determine attack vector
  [ ] Check logs for evidence of exploitation
  [ ] Scope: How many users affected?
  [ ] Check backup: When was it compromised?

PRIORITY 3: FIX
  [ ] Write test that reproduces vulnerability
  [ ] Fix code
  [ ] Test fix works
  [ ] Deploy to staging, then production
  [ ] Verify fix works

PRIORITY 4: COMMUNICATE
  [ ] Notify users (transparency)
  [ ] Provide reset links (if passwords exposed)
  [ ] Document root cause analysis
  [ ] Publish security advisory
  [ ] Create prevention measures

PRIORITY 5: PREVENT
  [ ] Update AGENTS.md security section
  [ ] Add automated test for this vulnerability
  [ ] Train team on prevention
  [ ] Schedule security audit (if not recent)
```

---

## 13. CHECKLIST BEFORE PRODUCTION DEPLOYMENT

```
[ ] OWASP Top 10 reviewed (section 1)
[ ] All inputs validated
[ ] All outputs encoded
[ ] SQL injection prevented (parameterized queries)
[ ] XSS prevented (sanitization + CSP)
[ ] CSRF tokens implemented
[ ] Authentication/authorization working
[ ] Secrets not in code
[ ] Dependencies audited
[ ] Security headers set
[ ] Rate limiting configured
[ ] Logging configured (no sensitive data)
[ ] Error messages don't leak info
[ ] HTTPS enforced
[ ] Database credentials encrypted
[ ] Backups tested & working
[ ] Monitoring/alerting configured
[ ] Incident response plan documented
[ ] Penetration testing completed (if critical)
[ ] Security review sign-off obtained
```

---

**This skill makes security a first-class citizen in the development process.**

**Last Updated:** 2024-01-15  
**Status:** Active