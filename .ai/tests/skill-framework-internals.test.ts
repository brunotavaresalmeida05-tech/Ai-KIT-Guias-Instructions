// tests/skill-framework-internals.test.ts
/**
 * Taste-Skill Framework — transforms, cache, references, callbacks
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Skill,
  SkillInput,
  SkillOutput,
  SkillExecutor,
  SkillRegistry,
  SkillComposer,
  DataTransformationSkill,
  TextProcessingSkill,
} from '../src/taste-skill/skill-framework';
import pino from 'pino';

const logger = pino({ level: 'silent' });

class CounterSkill extends Skill {
  public callCount = 0;

  constructor(logger?: pino.Logger) {
    super(
      {
        name: 'Counter',
        description: 'Counts calls',
        cacheable: true,
handler: async (input: SkillInput) => {
      const self = (this as any);
      self.callCount = (self.callCount || 0) + 1;
      return { success: true, data: { echo: (input as any).value, run: self.callCount } };
    },
      },
      logger
    );
    (this as any).callCount = 0;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    this.callCount++;
    return this.executeWithCache(input, async () => ({
      success: true,
      data: { echo: (input as any).value, run: this.callCount },
    }));
  }
}

describe('Skill cache', () => {
  it('caches successful outputs and can be cleared', async () => {
    const skill = new CounterSkill(logger);
    expect(skill.getMetadata().cacheable).toBe(true);

    const first = await skill.execute({ value: 1 });

    expect(skill.callCount).toBeGreaterThanOrEqual(1);
    const countAfterFirst = skill.callCount;

    const second = await skill.execute({ value: 1 });

    expect(first).toEqual(second);

    skill.clearCache();
    const third = await skill.execute({ value: 2 });
    expect(skill.callCount).toBeGreaterThan(countAfterFirst);
  });
});

describe('DataTransformationSkill', () => {
  let skill: DataTransformationSkill;
  let registry: SkillRegistry;
  let executor: SkillExecutor;

  beforeEach(() => {
    skill = new DataTransformationSkill(logger);
    registry = new SkillRegistry(logger);
    executor = new SkillExecutor(registry, logger);
    registry.register(skill);
  });

  it('converts JSON to CSV', async () => {
    const result = await executor.execute(skill.getMetadata().id, {
      data: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
      transform: 'json-to-csv',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe('name,age\n"Alice",30\n"Bob",25');
  });

  it('converts CSV to JSON', async () => {
    const result = await executor.execute(skill.getMetadata().id, {
      data: 'name,age\nAlice,30',
      transform: 'csv-to-json',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ name: 'Alice', age: '30' }]);
  });

  it('flattens and unflattens nested objects', async () => {
    const flatten = await executor.execute(skill.getMetadata().id, {
      data: { user: { name: 'Ada', address: { city: 'Lisbon' } } },
      transform: 'flatten',
    });
    expect(flatten.data).toEqual({
      'user.name': 'Ada',
      'user.address.city': 'Lisbon',
    });

    const unflatten = await executor.execute(skill.getMetadata().id, {
      data: { 'user.name': 'Ada', 'user.address.city': 'Lisbon' },
      transform: 'unflatten',
    });
    expect(unflatten.data).toEqual({ user: { name: 'Ada', address: { city: 'Lisbon' } } });
  });

  it('rejects unknown transforms and missing input', async () => {
    const unknown = await executor.execute(skill.getMetadata().id, {
      data: { a: 1 },
      transform: 'nope',
    });
    expect(unknown.success).toBe(false);
    expect(unknown.error).toContain('Unknown transform');

    const missing = await executor.execute(skill.getMetadata().id, {});
    expect(missing.success).toBe(false);
  });
});

describe('SkillExecutor edge paths', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;

  beforeEach(() => {
    registry = new SkillRegistry(logger);
    executor = new SkillExecutor(registry, logger);
  });

  it('returns not-found for unknown skills', async () => {
    await expect(executor.execute('ghost', {})).resolves.toMatchObject({ success: false });
    await expect(executor.executeByName('Ghost', {})).resolves.toMatchObject({
      error: expect.stringContaining('Skill not found'),
    });
  });

  it('times out long-running skills', async () => {
    class SlowSkill extends Skill {
      constructor() {
        super(
          {
            name: 'Slow',
            description: 'sleeps',
            timeout: 50,
            handler: async () => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              return { success: true };
            },
          },
          logger
        );
      }

      async execute(): Promise<SkillOutput> {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true };
      }
    }

    const slow = new SlowSkill();
    registry.register(slow);
    const result = await executor.execute(slow.getMetadata().id, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});

describe('SkillComposer', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;
  let composer: SkillComposer;

  beforeEach(() => {
    registry = new SkillRegistry(logger);
    executor = new SkillExecutor(registry, logger);
    composer = new SkillComposer(executor, logger);
  });

  it('defines, retrieves and executes compositions', async () => {
    const text = new TextProcessingSkill(logger);
    registry.register(text);

    const composition = composer.defineComposition('Upper', 'uppercase', [
      { skillId: text.getMetadata().id, input: { text: 'hello', operation: 'uppercase' } },
    ]);

    expect(composer.getComposition(composition.id)?.name).toBe('Upper');
    expect(composer.getComposition('missing')).toBeUndefined();

    const result = await composer.executeComposition(composition, {});
    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ success: true, data: 'HELLO' }]);
  });
});