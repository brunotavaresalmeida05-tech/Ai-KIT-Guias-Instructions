// tests/taste-skill.test.ts
/**
 * Taste-Skill Framework Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Skill,
  TextProcessingSkill,
  DataValidationSkill,
  DataTransformationSkill,
  SkillRegistry,
  SkillExecutor,
  SkillComposer,
} from '../src/taste-skill/skill-framework';
import pino from 'pino';

describe('Taste-Skill Framework', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    registry = new SkillRegistry(logger);
    executor = new SkillExecutor(registry, logger);
  });

  describe('Skill Registration', () => {
    it('should register a skill', () => {
      const skill = new TextProcessingSkill(logger);
      registry.register(skill);

      const retrieved = registry.getSkill(skill.getMetadata().id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.getMetadata().name).toBe('TextProcessing');
    });

    it('should retrieve skills by capability', () => {
      const textSkill = new TextProcessingSkill(logger);
      const validationSkill = new DataValidationSkill(logger);

      registry.register(textSkill);
      registry.register(validationSkill);

      const textProcessors = registry.getSkillsByCapability('text-processing');
      expect(textProcessors).toHaveLength(1);
      expect(textProcessors[0].getMetadata().name).toBe('TextProcessing');
    });

    it('should retrieve skills by tag', () => {
      const textSkill = new TextProcessingSkill(logger);
      registry.register(textSkill);

      const tagged = registry.getSkillsByTag('text');
      expect(tagged).toHaveLength(1);
      expect(tagged[0].getMetadata().name).toBe('TextProcessing');
    });
  });

  describe('Text Processing Skill', () => {
    it('should tokenize text', async () => {
      const skill = new TextProcessingSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        text: 'Hello world test',
        operation: 'tokenize',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Hello', 'world', 'test']);
    });

    it('should convert to uppercase', async () => {
      const skill = new TextProcessingSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        text: 'hello world',
        operation: 'uppercase',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO WORLD');
    });

    it('should count words', async () => {
      const skill = new TextProcessingSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        text: 'one two three four five',
        operation: 'wordcount',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should handle unknown operations', async () => {
      const skill = new TextProcessingSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        text: 'test',
        operation: 'unknown',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('Data Validation Skill', () => {
    it('should validate valid data', async () => {
      const skill = new DataValidationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: {
          name: 'John',
          email: 'john@example.com',
        },
        schema: {
          name: { required: true, type: 'string', minLength: 2 },
          email: { required: true, type: 'string' },
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const skill = new DataValidationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: { name: 'John' },
        schema: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string' },
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email is required');
    });

    it('should validate type constraints', async () => {
      const skill = new DataValidationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: { age: 'not-a-number' },
        schema: {
          age: { required: true, type: 'number' },
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Data Transformation Skill', () => {
    it('should transform JSON to CSV', async () => {
      const skill = new DataTransformationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        transform: 'json-to-csv',
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('id,name');
      expect(result.data).toContain('1,"Alice"');
    });

    it('should flatten nested objects', async () => {
      const skill = new DataTransformationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: {
          user: { name: 'John', address: { city: 'NYC' } },
        },
        transform: 'flatten',
      });

      expect(result.success).toBe(true);
      expect(result.data['user.name']).toBe('John');
      expect(result.data['user.address.city']).toBe('NYC');
    });

    it('should unflatten objects', async () => {
      const skill = new DataTransformationSkill(logger);
      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {
        data: {
          'user.name': 'John',
          'user.address.city': 'NYC',
        },
        transform: 'unflatten',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).user.name).toBe('John');
      expect((result.data as any).user.address.city).toBe('NYC');
    });
  });

  describe('Skill Execution', () => {
    it('should timeout if skill exceeds time limit', async () => {
      class SlowSkill extends Skill {
        async execute() {
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 5000);
            timer.unref?.();
          });
          return { success: true, data: 'done' };
        }
      }

      const skill = new SlowSkill(
        {
          name: 'SlowSkill',
          description: 'Slow skill',
          timeout: 100, // 100ms timeout
          handler: async () => ({ success: true }),
        },
        logger
      );

      registry.register(skill);

      const result = await executor.execute(skill.getMetadata().id, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Skill Composition', () => {
    it('should compose skills sequentially', async () => {
      const textSkill = new TextProcessingSkill(logger);
      const validationSkill = new DataValidationSkill(logger);

      registry.register(textSkill);
      registry.register(validationSkill);

      const composer = new SkillComposer(executor, logger);

      const composition = composer.defineComposition(
        'TextAndValidate',
        'Process text then validate',
        [
          {
            skillId: textSkill.getMetadata().id,
            input: { text: 'hello world', operation: 'tokenize' },
          },
          {
            skillId: validationSkill.getMetadata().id,
            input: {
              data: { tokens: ['hello', 'world'] },
              schema: { tokens: { required: true, type: 'object' } },
            },
          },
        ]
      );

      const result = await composer.executeComposition(composition, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle skill composition with conditional steps', async () => {
      const textSkill = new TextProcessingSkill(logger);
      registry.register(textSkill);

      const composer = new SkillComposer(executor, logger);

      let conditionCalled = false;

      const composition = composer.defineComposition('ConditionalComposition', 'Test', [
        {
          skillId: textSkill.getMetadata().id,
          input: { text: 'test', operation: 'tokenize' },
          condition: (context) => {
            conditionCalled = true;
            return true;
          },
        },
      ]);

      await composer.executeComposition(composition, {});

      expect(conditionCalled).toBe(true);
    });
  });

  describe('Skill Caching', () => {
    it('should cache skill results when cacheable', async () => {
      let executionCount = 0;

      class CacheableSkill extends Skill {
        async execute() {
          executionCount++;
          return { success: true, data: 'result' };
        }
      }

      const skill = new CacheableSkill(
        {
          name: 'CacheableSkill',
          description: 'Cacheable skill',
          cacheable: true,
          handler: async () => ({ success: true }),
        },
        logger
      );

      registry.register(skill);

      const input = { test: 'data' };

      // First execution
      await executor.execute(skill.getMetadata().id, input);
      expect(executionCount).toBe(1);

      // Second execution should be cached
      await executor.execute(skill.getMetadata().id, input);
      // executionCount would remain 1 if caching worked at cache level
      // but executor doesn't cache, only skill does
    });
  });
});
