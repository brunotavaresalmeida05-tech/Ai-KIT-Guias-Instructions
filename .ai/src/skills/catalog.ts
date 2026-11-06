import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import yaml from 'js-yaml';

export interface SkillMetadata {
  name: string;
  version: string;
  category: string;
  description: string;
  tags: string[];
  when_to_use: string;
  input: Record<string, any>;
  output: Record<string, any>;
  execution_time: Record<string, number>;
  [key: string]: any;
}

export interface SkillEntry {
  id: string;
  path: string;
  metadata?: SkillMetadata;
  body: string;
  error?: string;
}

export interface ValidationIssue {
  skill: string;
  path: string;
  message: string;
}

export interface ValidationReport {
  total: number;
  valid: number;
  invalid: number;
  issues: ValidationIssue[];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseSkillMarkdown(content: string): {
  metadata: SkillMetadata;
  body: string;
} {
  const match = content.match(FRONTMATTER);
  if (!match) {
    throw new Error('SKILL.md must start with YAML frontmatter delimited by ---');
  }

  const parsed = yaml.load(match[1]);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('SKILL.md frontmatter must be a YAML mapping');
  }

  return {
    metadata: parsed as SkillMetadata,
    body: content.slice(match[0].length).trim(),
  };
}

export function loadSkillCatalog(skillsDir: string): SkillEntry[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries: SkillEntry[] = [];

  for (const dirent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith('_')) {
      continue;
    }

    const skillPath = path.join(skillsDir, dirent.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      const { metadata, body } = parseSkillMarkdown(content);
      entries.push({ id: dirent.name, path: skillPath, metadata, body });
    } catch (error) {
      entries.push({
        id: dirent.name,
        path: skillPath,
        body: '',
        error: (error as Error).message,
      });
    }
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function validateSkillCatalog(
  entries: SkillEntry[],
  schemaPath: string
): ValidationReport {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  const validate = ajv.compile(schema);

  const issues: ValidationIssue[] = [];
  let valid = 0;

  for (const entry of entries) {
    if (entry.error || !entry.metadata) {
      issues.push({
        skill: entry.id,
        path: entry.path,
        message: entry.error || 'Missing metadata',
      });
      continue;
    }

    if (validate(entry.metadata)) {
      valid += 1;
      continue;
    }

    for (const error of validate.errors || []) {
      issues.push({
        skill: entry.id,
        path: `${entry.path}${error.instancePath || ''}`,
        message: error.message || 'Invalid value',
      });
    }
  }

  return {
    total: entries.length,
    valid,
    invalid: entries.length - valid,
    issues,
  };
}

export function findSkills(
  entries: SkillEntry[],
  query: string,
  limit = 10
): Array<{ skill: SkillEntry; score: number }> {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries.slice(0, limit).map((skill) => ({ skill, score: 0 }));
  }

  const scored = entries.map((skill) => {
    const metadata = skill.metadata;
    let score = 0;

    if (!metadata) {
      return { skill, score };
    }

    if (metadata.name === needle) score += 100;
    if (metadata.name.includes(needle)) score += 50;
    if (metadata.category?.includes(needle)) score += 30;
    if (metadata.tags?.some((tag) => tag.includes(needle))) score += 25;
    if (metadata.description?.toLowerCase().includes(needle)) score += 10;
    if (skill.body.toLowerCase().includes(needle)) score += 5;

    return { skill, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
