// src/taste-skill/skill-framework.ts
/**
 * Taste-Skill Framework
 * Modular skill system for AI agents with automatic discovery and composition
 */

import { randomUUID as uuid } from 'crypto';
import pino from 'pino';

// Types
export interface SkillInput {
  [key: string]: any;
}

export interface SkillOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  requiredCapabilities: string[];
  providedCapabilities: string[];
  timeout: number;
  maxRetries: number;
  cacheable: boolean;
}

export interface SkillDefinition {
  name: string;
  description: string;
  version?: string;
  tags?: string[];
  requiredCapabilities?: string[];
  providedCapabilities?: string[];
  timeout?: number;
  maxRetries?: number;
  cacheable?: boolean;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  handler: (input: SkillInput) => Promise<SkillOutput>;
}

export interface SkillComposition {
  id: string;
  name: string;
  description: string;
  skills: string[];
  steps: SkillStep[];
  createdAt: Date;
}

export interface SkillStep {
  skillId: string;
  input: SkillInput | { $ref: string }; // Can reference outputs from previous steps
  condition?: (context: ExecutionContext) => boolean;
  onSuccess?: (output: SkillOutput, context: ExecutionContext) => void;
  onError?: (error: Error, context: ExecutionContext) => void;
}

export interface ExecutionContext {
  compositionId: string;
  stepIndex: number;
  outputs: SkillOutput[];
  startTime: Date;
  metadata: Record<string, any>;
}

// Base Skill Class
export abstract class Skill {
  protected metadata: SkillMetadata;
  protected logger: pino.Logger;
  protected cache: Map<string, SkillOutput> = new Map();

  constructor(definition: SkillDefinition, logger: pino.Logger = pino()) {
    this.logger = logger;
    this.metadata = {
      id: uuid(),
      name: definition.name,
      description: definition.description,
      version: definition.version || '1.0.0',
      tags: definition.tags || [],
      requiredCapabilities: definition.requiredCapabilities || [],
      providedCapabilities: definition.providedCapabilities || [],
      timeout: definition.timeout || 30000,
      maxRetries: definition.maxRetries || 3,
      cacheable: definition.cacheable || false,
    };
  }

  abstract execute(input: SkillInput): Promise<SkillOutput>;

  getMetadata(): SkillMetadata {
    return this.metadata;
  }

  protected generateCacheKey(input: SkillInput): string {
    return JSON.stringify(input);
  }

  protected async executeWithCache(
    input: SkillInput,
    executor: () => Promise<SkillOutput>
  ): Promise<SkillOutput> {
    if (!this.metadata.cacheable) {
      return executor();
    }

    const cacheKey = this.generateCacheKey(input);
    if (this.cache.has(cacheKey)) {
      this.logger.debug({ skill: this.metadata.name }, 'Cache hit');
      return this.cache.get(cacheKey)!;
    }

    const output = await executor();
    if (output.success) {
      this.cache.set(cacheKey, output);
    }

    return output;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Common Skill Implementations
export class TextProcessingSkill extends Skill {
  constructor(logger?: pino.Logger) {
    super(
      {
        name: 'TextProcessing',
        description: 'Process and analyze text',
        tags: ['text', 'nlp'],
        providedCapabilities: ['text-processing'],
        handler: async (input) => this.execute(input),
      },
      logger
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { text, operation } = input;

      if (!text || !operation) {
        return { success: false, error: 'Missing text or operation' };
      }

      let result: any;

      switch (operation) {
        case 'tokenize':
          result = text.split(/\s+/);
          break;
        case 'lowercase':
          result = text.toLowerCase();
          break;
        case 'uppercase':
          result = text.toUpperCase();
          break;
        case 'reverse':
          result = text.split('').reverse().join('');
          break;
        case 'wordcount':
          result = text.split(/\s+/).length;
          break;
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

export class DataValidationSkill extends Skill {
  constructor(logger?: pino.Logger) {
    super(
      {
        name: 'DataValidation',
        description: 'Validate and sanitize data',
        tags: ['validation', 'data'],
        providedCapabilities: ['data-validation'],
        handler: async (input) => this.execute(input),
      },
      logger
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { data, schema } = input;

      if (!data || !schema) {
        return { success: false, error: 'Missing data or schema' };
      }

      const errors: string[] = [];

      for (const [key, rules] of Object.entries(schema)) {
        const value = (data as Record<string, any>)[key];
        const ruleObj = rules as Record<string, any>;

        if (ruleObj.required && value === undefined) {
          errors.push(`${key} is required`);
        }

        if (ruleObj.type && typeof value !== ruleObj.type) {
          errors.push(`${key} must be of type ${ruleObj.type}`);
        }

        if (ruleObj.minLength && value?.length < ruleObj.minLength) {
          errors.push(`${key} must be at least ${ruleObj.minLength} characters`);
        }

        if (ruleObj.maxLength && value?.length > ruleObj.maxLength) {
          errors.push(`${key} must not exceed ${ruleObj.maxLength} characters`);
        }

        if (ruleObj.pattern && !new RegExp(ruleObj.pattern).test(value)) {
          errors.push(`${key} does not match required pattern`);
        }
      }

      if (errors.length > 0) {
        return { success: false, error: errors.join('; ') };
      }

      return { success: true, data: { validated: true } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

export class DataTransformationSkill extends Skill {
  constructor(logger?: pino.Logger) {
    super(
      {
        name: 'DataTransformation',
        description: 'Transform data between formats',
        tags: ['transformation', 'data'],
        providedCapabilities: ['data-transformation'],
        handler: async (input) => this.execute(input),
      },
      logger
    );
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { data, transform } = input;

      if (!data || !transform) {
        return { success: false, error: 'Missing data or transform' };
      }

      let result = data;

      if (transform === 'json-to-csv') {
        result = this.jsonToCsv(data);
      } else if (transform === 'csv-to-json') {
        result = this.csvToJson(data);
      } else if (transform === 'flatten') {
        result = this.flatten(data);
      } else if (transform === 'unflatten') {
        result = this.unflatten(data);
      } else {
        return { success: false, error: `Unknown transform: ${transform}` };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private jsonToCsv(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = (row as Record<string, any>)[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csv.push(values.join(','));
    }

    return csv.join('\n');
  }

  private csvToJson(csv: string): any[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const obj: Record<string, any> = {};
      const values = lines[i].split(',');

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }

      result.push(obj);
    }

    return result;
  }

  private flatten(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        Object.assign(result, this.flatten(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private unflatten(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }
}

// Skill Registry
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private logger: pino.Logger;

  constructor(logger: pino.Logger = pino()) {
    this.logger = logger;
  }

  register(skill: Skill): void {
    const metadata = skill.getMetadata();
    this.skills.set(metadata.id, skill);
    this.logger.info({ skillId: metadata.id, skillName: metadata.name }, 'Skill registered');
  }

  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getSkillByName(name: string): Skill | undefined {
    return Array.from(this.skills.values()).find(
      (skill) => skill.getMetadata().name.toLowerCase() === name.toLowerCase()
    );
  }

  getSkillsByCapability(capability: string): Skill[] {
    return Array.from(this.skills.values()).filter((skill) =>
      skill.getMetadata().providedCapabilities.includes(capability)
    );
  }

  getSkillsByTag(tag: string): Skill[] {
    return Array.from(this.skills.values()).filter((skill) =>
      skill.getMetadata().tags.includes(tag)
    );
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getRegistry(): Record<string, SkillMetadata> {
    const registry: Record<string, SkillMetadata> = {};

    for (const skill of this.skills.values()) {
      const metadata = skill.getMetadata();
      registry[metadata.id] = metadata;
    }

    return registry;
  }
}

// Skill Executor
export class SkillExecutor {
  private registry: SkillRegistry;
  private logger: pino.Logger;

  constructor(registry: SkillRegistry, logger: pino.Logger = pino()) {
    this.registry = registry;
    this.logger = logger;
  }

  async executeByName(name: string, input: SkillInput): Promise<SkillOutput> {
    const skill = this.registry.getSkillByName(name);
    if (!skill) {
      return { success: false, error: `Skill not found: ${name}` };
    }
    return this.execute(skill.getMetadata().id, input);
  }

  async execute(skillId: string, input: SkillInput): Promise<SkillOutput> {
    const skill = this.registry.getSkill(skillId);

    if (!skill) {
      return { success: false, error: `Skill not found: ${skillId}` };
    }

    const metadata = skill.getMetadata();

    try {
      const promise = skill.execute(input);
      const result = await Promise.race([
        promise,
        this.timeout(metadata.timeout),
      ]) as SkillOutput;

      return result;
    } catch (error) {
      this.logger.error(
        { skillId, error: (error as Error).message },
        'Skill execution failed'
      );
      return { success: false, error: (error as Error).message };
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Skill execution timeout')), ms);
      timer.unref?.();
    });
  }

  async resolveInput(input: SkillInput | { $ref: string }, context: ExecutionContext): Promise<SkillInput> {
    if (typeof input !== 'object' || !('$ref' in input)) {
      return input as SkillInput;
    }

    const ref = input.$ref as string;
    const [sourceStep, ...pathParts] = ref.split('.');

    if (sourceStep === 'previous') {
      let value = context.outputs[context.stepIndex - 1]?.data;

      for (const part of pathParts) {
        value = (value as Record<string, any>)[part];
      }

      return value;
    }

    throw new Error(`Unknown reference: ${ref}`);
  }
}

// Skill Composer
export class SkillComposer {
  private executor: SkillExecutor;
  private logger: pino.Logger;
  private compositions: Map<string, SkillComposition> = new Map();

  constructor(executor: SkillExecutor, logger: pino.Logger = pino()) {
    this.executor = executor;
    this.logger = logger;
  }

  async executeComposition(composition: SkillComposition, initialInput: SkillInput): Promise<any> {
    const context: ExecutionContext = {
      compositionId: composition.id,
      stepIndex: 0,
      outputs: [],
      startTime: new Date(),
      metadata: initialInput,
    };

    try {
      for (let i = 0; i < composition.steps.length; i++) {
        const step = composition.steps[i];
        context.stepIndex = i;

        // Check condition
        if (step.condition && !step.condition(context)) {
          this.logger.debug({ step: i, composition: composition.id }, 'Step skipped');
          context.outputs.push({ success: true, data: null });
          continue;
        }

        // Resolve input
        const resolvedInput = await this.executor.resolveInput(step.input, context);

        // Execute skill
        const output = await this.executor.execute(step.skillId, resolvedInput);
        context.outputs.push(output);

        // Handle callbacks
        if (output.success && step.onSuccess) {
          step.onSuccess(output, context);
        } else if (!output.success && step.onError) {
          step.onError(new Error(output.error), context);
        }
      }

      return {
        success: true,
        data: context.outputs,
      };
    } catch (error) {
      this.logger.error(
        { compositionId: composition.id, error: (error as Error).message },
        'Composition execution failed'
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  defineComposition(
    name: string,
    description: string,
    steps: SkillStep[]
  ): SkillComposition {
    const composition: SkillComposition = {
      id: uuid(),
      name,
      description,
      skills: Array.from(new Set(steps.map((s) => s.skillId))),
      steps,
      createdAt: new Date(),
    };

    this.compositions.set(composition.id, composition);
    this.logger.info({ compositionId: composition.id }, 'Composition defined');

    return composition;
  }

  getComposition(compositionId: string): SkillComposition | undefined {
    return this.compositions.get(compositionId);
  }
}

export default {
  Skill,
  TextProcessingSkill,
  DataValidationSkill,
  DataTransformationSkill,
  SkillRegistry,
  SkillExecutor,
  SkillComposer,
};
