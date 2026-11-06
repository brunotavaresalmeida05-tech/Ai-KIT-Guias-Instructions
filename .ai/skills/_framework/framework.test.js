/**
 * Taste-Skill Framework Tests
 * Comprehensive test suite for skill management and discovery
 */

const { describe, it } = require('node:test');
const TasteSkillFramework = require('./index');
const SkillLoader = require('./skill-loader');
const SkillFinder = require('./skill-finder');
const SkillValidator = require('./skill-validator');

// Test utilities
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(message || 'Value does not exist');
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

// Tests
describe('SkillLoader', () => {
  it('should initialize with base path', () => {
    const loader = new SkillLoader('.ai/skills');
    assertExists(loader.basePath, 'Base path should be set');
    assertExists(loader.cache, 'Cache should be initialized');
  });

  it('should parse markdown with YAML frontmatter', () => {
    const mdContent = `---
name: test-skill
version: "1.0.0"
category: "testing"
description: "Test skill"
tags: ["test"]
when_to_use: "When testing"
input:
  type: "object"
  properties: {}
output:
  type: "object"
  properties: {}
execution_time:
  min_seconds: 10
  max_seconds: 60
  typical_seconds: 30
---

# Test Skill

This is the body`;

    const loader = new SkillLoader();
    const skill = loader.parseMDSkill(mdContent);

    assertEqual(skill.name, 'test-skill', 'Name should be parsed');
    assertEqual(skill.version, '1.0.0', 'Version should be parsed');
    assertExists(skill.body, 'Body should be captured');
  });

  it('should handle missing frontmatter', () => {
    const mdContent = `# No Frontmatter

This skill has no frontmatter.`;

    const loader = new SkillLoader();
    try {
      loader.parseMDSkill(mdContent);
      throw new Error('Should have thrown error');
    } catch (error) {
      assertTrue(
        error.message.includes('YAML frontmatter'),
        'Should mention frontmatter'
      );
    }
  });

  it('should clear cache', () => {
    const loader = new SkillLoader();
    loader.cache.set('test', { name: 'test' });
    loader.clearCache();
    assertEqual(loader.cache.size, 0, 'Cache should be empty');
  });
});

describe('SkillFinder', () => {
  const mockSkills = new Map([
    [
      'test-agent',
      {
        name: 'test-agent',
        category: 'testing',
        description: 'Write unit tests for your code',
        tags: ['testing', 'tdd', 'jest'],
        when_to_use: 'When you need to write tests',
        dependencies: [],
      },
    ],
    [
      'code-review',
      {
        name: 'code-review',
        category: 'code-quality',
        description: 'Review code quality and best practices',
        tags: ['review', 'quality', 'standards'],
        when_to_use: 'Before merging code',
        dependencies: ['test-agent'],
      },
    ],
    [
      'security-audit',
      {
        name: 'security-audit',
        category: 'security',
        description: 'Audit code for security vulnerabilities',
        tags: ['security', 'owasp', 'audit'],
        when_to_use: 'Before deployment',
        dependencies: ['code-review'],
      },
    ],
  ]);

  it('should extract keywords from task', () => {
    const finder = new SkillFinder(mockSkills);
    const keywords = finder.extractKeywords(
      'I need to write unit tests for my code'
    );
    assertTrue(keywords.has('unit'), 'Should extract "unit"');
    assertTrue(keywords.has('write'), 'Should extract "write"');
    assertTrue(keywords.has('tests'), 'Should extract "tests"');
  });

  it('should find skills by keyword matching', () => {
    const finder = new SkillFinder(mockSkills);
    const results = finder.findSkillsForTask('I need to write tests', {
      maxResults: 5,
    });
    assertTrue(results.length > 0, 'Should find skills');
    assertTrue(
      results[0].name === 'test-agent',
      'Should find test-agent as top result'
    );
  });

  it('should find skills by category', () => {
    const finder = new SkillFinder(mockSkills);
    const results = finder.findByCategory('testing');
    assertEqual(results.length, 1, 'Should find 1 testing skill');
    assertEqual(results[0].name, 'test-agent', 'Should be test-agent');
  });

  it('should find skills by tags', () => {
    const finder = new SkillFinder(mockSkills);
    const results = finder.findByTags(['security', 'audit']);
    assertEqual(results.length, 1, 'Should find 1 skill with both tags');
  });

  it('should find dependents', () => {
    const finder = new SkillFinder(mockSkills);
    const results = finder.findDependents('code-review');
    assertTrue(
      results.some(r => r.name === 'security-audit'),
      'Should find security-audit as dependent'
    );
  });

  it('should get skill chain with dependencies', () => {
    const finder = new SkillFinder(mockSkills);
    const chain = finder.getSkillChain('security-audit');
    assertTrue(chain.length >= 2, 'Should include security-audit and code-review');
    assertTrue(
      chain.some(s => s.name === 'code-review'),
      'Should include dependency'
    );
  });

  it('should get all categories', () => {
    const finder = new SkillFinder(mockSkills);
    const categories = finder.getCategories();
    assertTrue(categories.includes('testing'), 'Should include testing');
    assertTrue(categories.includes('security'), 'Should include security');
  });

  it('should get statistics', () => {
    const finder = new SkillFinder(mockSkills);
    const stats = finder.getStats();
    assertEqual(stats.totalSkills, 3, 'Should count 3 skills');
    assertExists(stats.byCategory, 'Should have category breakdown');
  });

  it('should find complementary skills', () => {
    const finder = new SkillFinder(mockSkills);
    const complementary = finder.findComplementarySkills('test-agent');
    assertTrue(complementary.length > 0, 'Should find complementary skills');
  });
});

describe('SkillValidator', () => {
  it('should validate valid skill', () => {
    const validator = new SkillValidator();
    const validSkill = {
      name: 'test-skill',
      version: '1.0.0',
      category: 'testing',
      description: 'A test skill for validation',
      tags: ['test', 'validation'],
      when_to_use: 'For testing validation',
      input: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
      },
      output: {
        type: 'object',
        properties: {
          result: { type: 'string' },
        },
      },
      execution_time: {
        min_seconds: 10,
        max_seconds: 60,
        typical_seconds: 30,
      },
    };

    const result = validator.validateSkill(validSkill);
    assertTrue(result.valid, 'Valid skill should pass validation');
  });

  it('should reject invalid name', () => {
    const validator = new SkillValidator();
    const invalidSkill = {
      name: 'Invalid Name', // Invalid: not kebab-case
      version: '1.0.0',
      category: 'testing',
      description: 'A test skill',
      tags: ['test'],
      when_to_use: 'For testing',
      input: { type: 'object', properties: {} },
      output: { type: 'object', properties: {} },
      execution_time: {
        min_seconds: 10,
        max_seconds: 60,
        typical_seconds: 30,
      },
    };

    const result = validator.validateSkill(invalidSkill);
    assertTrue(!result.valid, 'Invalid name should fail validation');
  });

  it('should reject invalid version', () => {
    const validator = new SkillValidator();
    const invalidSkill = {
      name: 'test-skill',
      version: '1.0', // Invalid: not semantic
      category: 'testing',
      description: 'A test skill',
      tags: ['test'],
      when_to_use: 'For testing',
      input: { type: 'object', properties: {} },
      output: { type: 'object', properties: {} },
      execution_time: {
        min_seconds: 10,
        max_seconds: 60,
        typical_seconds: 30,
      },
    };

    const result = validator.validateSkill(invalidSkill);
    assertTrue(!result.valid, 'Invalid version should fail validation');
  });

  it('should validate execution time ranges', () => {
    const validator = new SkillValidator();
    const invalidSkill = {
      name: 'test-skill',
      version: '1.0.0',
      category: 'testing',
      description: 'A test skill',
      tags: ['test'],
      when_to_use: 'For testing',
      input: { type: 'object', properties: {} },
      output: { type: 'object', properties: {} },
      execution_time: {
        min_seconds: 60,
        max_seconds: 30, // Invalid: max < min
        typical_seconds: 30,
      },
    };

    const result = validator.validateSkill(invalidSkill);
    assertTrue(!result.valid, 'Invalid execution time should fail');
  });
});

describe('TasteSkillFramework', () => {
  it('should initialize framework', () => {
    const framework = new TasteSkillFramework('.ai/skills');
    assertTrue(!framework.initialized, 'Should not be initialized yet');
    // Note: actual initialization requires .ai/skills directory
  });

  it('should list skills with filter', () => {
    const framework = new TasteSkillFramework();
    framework.skills = new Map([
      ['skill1', { name: 'skill1', category: 'testing', tags: ['test'] }],
      ['skill2', { name: 'skill2', category: 'security', tags: ['security'] }],
    ]);
    framework.finder = new SkillFinder(framework.skills);

    const list = framework.listSkills({ category: 'testing' });
    assertEqual(list.length, 1, 'Should filter by category');
  });

  it('should export skill as JSON', () => {
    const framework = new TasteSkillFramework();
    framework.skills.set('test-skill', {
      name: 'test-skill',
      version: '1.0.0',
    });

    const exported = framework.exportSkill('test-skill');
    const parsed = JSON.parse(exported);
    assertEqual(parsed.name, 'test-skill', 'Exported skill should be valid JSON');
  });

  it('should throw error for non-existent skill', () => {
    const framework = new TasteSkillFramework();
    try {
      framework.getSkill('non-existent');
      // undefined is expected
    } catch (error) {
      throw new Error('Should not throw for get');
    }

    try {
      framework.describeSkill('non-existent');
      throw new Error('Should have thrown');
    } catch (error) {
      assertTrue(
        error.message.includes('not found'),
        'Should say skill not found'
      );
    }
  });
});


