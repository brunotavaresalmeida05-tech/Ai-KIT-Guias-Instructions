#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { loadConfig } from './config';
import { createRuntime } from './runtime';
import { serializeWorkflow } from './workflows/service';
import {
  loadSkillCatalog,
  validateSkillCatalog,
} from './skills/catalog';

const HELP = `AI-KIT CLI

Usage:
  ai-kit <command> [options]

Commands:
  init [dir]             Create a project folder with .env, data/ and an example workflow
  run <workflow.json>    Execute a workflow definition
  search <query>         Semantic search over the configured memory backend
  skills                 List skills from the catalog
  validate [skillsDir]   Validate SKILL.md frontmatter against the schema
  serve                  Start the HTTP API and dashboard
  migrate                Apply the PostgreSQL schema from db/init.sql
  version                Print the CLI version
  help                   Show this help

Environment:
  See .env.example. MEMORY_BACKEND=memory|json|sqlite|postgres,
  EMBEDDING_PROVIDER=hash|openai|ollama|fallback.
`;

function readVersion(): string {
  try {
    const packagePath = path.resolve(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

function skillsDirectory(argument?: string): string {
  return argument
    ? path.resolve(process.cwd(), argument)
    : path.resolve(__dirname, '..', 'skills');
}

function initProject(targetArg?: string): void {
  const target = path.resolve(process.cwd(), targetArg || '.');
  fs.mkdirSync(target, { recursive: true });

  const envExample = path.resolve(__dirname, '..', '.env.example');
  const envTarget = path.join(target, '.env');
  if (!fs.existsSync(envTarget) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envTarget);
    console.log(`Created ${envTarget}`);
  }

  fs.mkdirSync(path.join(target, 'data'), { recursive: true });
  fs.mkdirSync(path.join(target, 'workflows'), { recursive: true });

  const examplePath = path.join(target, 'workflows', 'example.json');
  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(
      examplePath,
      JSON.stringify(
        {
          name: 'example',
          strategy: 'sequential',
          tasks: [
            {
              name: 'hello',
              type: 'echo',
              payload: { message: 'AI-KIT is running' },
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Created ${examplePath}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Edit .env (set API_KEY and the backend you want)');
  console.log('  2. ai-kit validate');
  console.log('  3. ai-kit run workflows/example.json');
  console.log('  4. ai-kit serve');
}

async function runWorkflow(fileArg?: string): Promise<void> {
  if (!fileArg) {
    throw new Error('run requires a workflow JSON file');
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const definition = JSON.parse(raw);
  const runtime = await createRuntime();

  try {
    const workflow = await runtime.workflows.execute(definition);
    console.log(JSON.stringify(serializeWorkflow(workflow), null, 2));
    if (workflow.status !== 'completed') {
      process.exitCode = 1;
    }
  } finally {
    await runtime.close();
  }
}

async function searchMemory(query?: string): Promise<void> {
  if (!query) {
    throw new Error('search requires a query');
  }

  const runtime = await createRuntime();

  try {
    const results = await runtime.memory.search({ query, limit: 10 });
    if (results.length === 0) {
      console.log('No matches.');
      return;
    }

    for (const result of results) {
      console.log(
        `${result.rank}. ${(result.similarity * 100).toFixed(1)}%  ${result.document.type}  ${result.document.content.slice(0, 120)}`
      );
    }
  } finally {
    await runtime.close();
  }
}

function listSkills(directory: string): void {
  const catalog = loadSkillCatalog(directory);
  if (catalog.length === 0) {
    console.log(`No skills found in ${directory}`);
    return;
  }

  for (const entry of catalog) {
    const status = entry.metadata && !entry.error ? 'valid  ' : 'invalid';
    const category = entry.metadata?.category || '-';
    const description = (entry.metadata?.description || entry.error || '').slice(0, 90);
    console.log(`${status}  ${entry.id.padEnd(26)} ${category.padEnd(14)} ${description}`);
  }
}

function validateSkills(directory: string): void {
  const catalog = loadSkillCatalog(directory);
  const schemaPath = path.join(directory, '_framework', 'skill-schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`);
  }

  const report = validateSkillCatalog(catalog, schemaPath);
  console.log(
    `Skills: ${report.total} total, ${report.valid} valid, ${report.invalid} invalid`
  );

  for (const issue of report.issues) {
    console.log(`  - ${issue.skill}: ${issue.message} (${issue.path})`);
  }

  if (report.invalid > 0) {
    process.exitCode = 1;
  }
}

async function migrate(): Promise<void> {
  const config = loadConfig();

  if (config.memoryBackend !== 'postgres') {
    console.log(`MEMORY_BACKEND=${config.memoryBackend}; no external migration required.`);
    return;
  }

  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: config.databaseUrl });
  const sqlPath = path.resolve(__dirname, '..', 'db', 'init.sql');

  try {
    await pool.query(fs.readFileSync(sqlPath, 'utf8'));
    console.log('PostgreSQL schema applied.');
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'init':
      initProject(args[1]);
      break;
    case 'run':
      await runWorkflow(args[1]);
      break;
    case 'search':
      await searchMemory(args.slice(1).join(' ').trim());
      break;
    case 'skills':
      listSkills(skillsDirectory(args[1]));
      break;
    case 'validate':
      validateSkills(skillsDirectory(args[1]));
      break;
    case 'serve': {
      const { startServer } = await import('./server');
      await startServer();
      break;
    }
    case 'migrate':
      await migrate();
      break;
    case 'version':
      console.log(readVersion());
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Error: ${(error as Error).message}`);
  process.exitCode = 1;
});
