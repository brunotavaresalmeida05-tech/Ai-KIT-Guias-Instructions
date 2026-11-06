---
name: test-generator
category: testing
version: 1.0.0
description: >
  Generate tests before code (TDD). Every feature gets test coverage, automated validation, integration tests.
tags:
  - testing
  - tdd
  - qa
  - quality
when_to_use: >
  Use when generating tests before implementing features following TDD methodology.
  Every feature should have corresponding test coverage.
input:
  type: object
  properties:
    feature_name:
      type: string
      description: Name of the feature to test
    requirements:
      type: array
      items:
        type: string
      description: List of requirements to test against
    language:
      type: string
      description: Target programming language
output:
  type: object
  properties:
    test_file:
      type: string
      description: Path to generated test file
    test_cases:
      type: array
      items:
        type: object
      description: List of generated test cases
execution_time:
  min_seconds: 10
  max_seconds: 600
  typical_seconds: 60
---

# TEST GENERATOR

Generate tests before code (TDD). Every feature gets test coverage, automated validation, integration tests.

## 1. TDD WORKFLOW

### The Process
```
1. READ SPEC
   ↓
2. WRITE FAILING TEST
   ↓
3. WRITE MINIMAL CODE (make test pass)
   ↓
4. REFACTOR
   ↓
5. COMMIT (with test reference)
```

## 2. TEST STRUCTURE

### Unit Test Template
```typescript
// tests/services/user.service.test.ts
import { UserService } from '../src/services/user.service'
import { UserRepository } from '../src/repository/user.repository'

describe('UserService', () => {
  let userService: UserService
  let userRepository: UserRepository

  beforeEach(() => {
    // Mock dependencies
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    userService = new UserService(userRepository)
  })

  describe('createUser', () => {
    it('should create user with encrypted password', async () => {
      // ARRANGE
      const input = {
        email: 'test@example.com',
        password: 'raw-password-123',
      }

      const expected = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password', // Not the raw password
      }

      userRepository.create.mockResolvedValue(expected)

      // ACT
      const result = await userService.createUser(input)

      // ASSERT
      expect(result.email).toBe('test@example.com')
      expect(result.password).not.toBe('raw-password-123') // Password is hashed
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      )
    })
  })
})
```

## 3. TEST TYPES & COVERAGE

| Type | Purpose | Coverage Target |
|------|---------|-----------------|
| **Unit** | Test single function/method in isolation | 90%+ |
| **Integration** | Test multiple modules together | 70%+ |
| **E2E** | Test full user workflow | Critical paths only |

## 4. EDGE CASES TO TEST

### Data Validation
- Valid input → Pass
- Empty input → Fail
- Invalid format (email, phone, etc.) → Fail
- Boundary values (max length, min value) → Tested

### API Endpoints
- Valid request → 200/201
- Missing required field → 400
- Unauthorized → 401
- Forbidden → 403
- Not found → 404

## 5. TEST COMMAND REFERENCE

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- user.service.test.ts
```

## 6. COVERAGE REQUIREMENTS

### Minimum Coverage Targets
```
Overall:  >80%
Lines:    >80%
Functions: >80%
```

## GUARDRAILS

```
ALWAYS write tests before implementation
ALWAYS include edge cases and error scenarios
ALWAYS verify coverage meets thresholds
IMPORTANT tests are documentation of expected behavior
```

## SAÍDA ESPERADA

Suite de testes completa com casos de uso, edge cases e validações.