import fs from 'fs';
import yaml from 'js-yaml';
import { Agent } from '../strix/orchestrator';

interface RegistryAgent {
  id?: string;
  role?: string;
  description?: string;
  skills?: string[];
  capabilities?: unknown;
  constraints?: unknown;
}

interface RegistryFile {
  agents?: Record<string, RegistryAgent>;
}

export type AgentSeed = Omit<Agent, 'id' | 'currentTasks'>;

function maxParallel(constraints: unknown): number {
  if (!Array.isArray(constraints)) {
    return 1;
  }

  for (const constraint of constraints) {
    if (constraint && typeof constraint === 'object') {
      const value = (constraint as Record<string, unknown>).max_parallel;
      if (typeof value === 'number' && value > 0) {
        return value;
      }
    }
  }

  return 1;
}

export function loadAgentSeeds(registryPath: string): AgentSeed[] {
  if (!fs.existsSync(registryPath)) {
    return [];
  }

  const parsed = yaml.load(fs.readFileSync(registryPath, 'utf8')) as RegistryFile;
  const agents = parsed?.agents || {};

  return Object.entries(agents).map(([name, definition]) => ({
    name,
    type: 'specialist' as const,
    skills: Array.isArray(definition.skills) ? definition.skills : [],
    status: 'idle' as const,
    capabilities: {
      role: definition.role,
      description: definition.description,
      details: definition.capabilities,
    },
    maxConcurrent: maxParallel(definition.constraints),
  }));
}
