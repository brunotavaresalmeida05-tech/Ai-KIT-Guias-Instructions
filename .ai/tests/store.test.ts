import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createLogger } from '../src/logger';
import {
  EMBEDDING_DIMENSIONS,
  FixedDimensionEmbeddingProvider,
  HashEmbeddingProvider,
} from '../src/claude-mem/embeddings';
import { InMemoryBackend } from '../src/claude-mem/store/memory-store';
import { JsonFileBackend } from '../src/claude-mem/store/json-store';
import { SqliteBackend } from '../src/claude-mem/store/sqlite-store';
import {
  findSkills,
  loadSkillCatalog,
  validateSkillCatalog,
} from '../src/skills/catalog';

const logger = createLogger('test', 'silent');
const embedding = new HashEmbeddingProvider();

function hasSqlite(): boolean {
  try {
    require('node:sqlite');
    return true;
  } catch {
    return false;
  }
}

describe('embeddings', () => {
  it('produces deterministic normalized vectors', async () => {
    const first = await embedding.embed('architecture decisions');
    const second = await embedding.embed('architecture decisions');
    const different = await embedding.embed('deployment pipeline');

    expect(first).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(first).toEqual(second);
    expect(first).not.toEqual(different);

    const norm = Math.sqrt(first.reduce((acc, value) => acc + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('pads or truncates provider output to the fixed dimension', async () => {
    const provider = new FixedDimensionEmbeddingProvider(
      {
        embed: async () => [1, 0],
        embedBatch: async (texts: string[]) => texts.map(() => [1, 0]),
      },
      4
    );

    expect(await provider.embed('x')).toEqual([1, 0, 0, 0]);
  });
});

describe('InMemoryBackend', () => {
  it('stores and semantically searches documents', async () => {
    const backend = new InMemoryBackend(embedding, logger);
    await backend.init();

    const session = await backend.createSession('user-1');
    await backend.store('Architecture decisions for the API', session.id, 'context');
    await backend.store('Deployment pipeline and rollback', session.id, 'context');

    const results = await backend.search({ query: 'architecture api', sessionId: session.id });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.content).toContain('Architecture');
    expect(results[0].similarity).toBeGreaterThan(0);
    expect(await backend.getSessionDocuments(session.id)).toHaveLength(2);
  });

  it('rejects documents for unknown sessions', async () => {
    const backend = new InMemoryBackend(embedding, logger);
    await backend.init();

    await expect(backend.store('orphan', '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /Session not found/
    );
  });

  it('cleans expired sessions and documents', async () => {
    const backend = new InMemoryBackend(embedding, logger);
    await backend.init();

    const session = await backend.createSession('user-1', -1);
    await backend.store('expired', session.id);

    await backend.cleanup();

    expect(await backend.getSessionDocuments(session.id)).toHaveLength(0);
    expect((await backend.getStats()).sessions).toBe(0);
  });
});

describe('JsonFileBackend', () => {
  let directory: string;
  let filePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-json-'));
    filePath = path.join(directory, 'memory.json');
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('persists state across instances', async () => {
    const first = new JsonFileBackend(filePath, embedding, logger);
    await first.init();
    const session = await first.createSession('user-1');
    await first.store('persistent context', session.id);

    const second = new JsonFileBackend(filePath, embedding, logger);
    await second.init();

    expect(await second.getSessionDocuments(session.id)).toHaveLength(1);
    const results = await second.search({ query: 'persistent' });
    expect(results).toHaveLength(1);
  });

  it('persists concurrent sessions and documents without losing updates', async () => {
    const backend = new JsonFileBackend(filePath, embedding, logger);
    await backend.init();
    const sessions = await Promise.all(
      Array.from({ length: 12 }, (_, index) => backend.createSession(`user-${index}`))
    );
    await Promise.all(sessions.flatMap((session) =>
      Array.from({ length: 3 }, (_, index) => backend.store(`document-${index}`, session.id))
    ));

    const reopened = new JsonFileBackend(filePath, embedding, logger);
    await reopened.init();
    expect((await reopened.getStats()).sessions).toBe(12);
    for (const session of sessions) {
      expect(await reopened.getSessionDocuments(session.id)).toHaveLength(3);
    }
  });

  it('allows later writes after a failed persistence attempt', async () => {
    const backend = new JsonFileBackend(filePath, embedding, logger);
    await backend.init();
    const rename = jest.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Disk unavailable'));
    try {
      await expect(backend.createSession('failed')).rejects.toThrow('Disk unavailable');
      const session = await backend.createSession('recovered');
      await backend.store('recovered write', session.id);
      const reopened = new JsonFileBackend(filePath, embedding, logger);
      await reopened.init();
      expect(await reopened.getSessionDocuments(session.id)).toHaveLength(1);
    } finally {
      rename.mockRestore();
    }
  });
});

describe('SqliteBackend', () => {
  let directory: string;
  let filePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-sqlite-'));
    filePath = path.join(directory, 'memory.db');
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const maybeIt = hasSqlite() ? it : it.skip;

  maybeIt('persists and searches documents', async () => {
    const backend = new SqliteBackend(filePath, embedding, logger);
    await backend.init();

    const session = await backend.createSession('user-1');
    await backend.store('SQLite architecture notes', session.id, 'reference');
    await backend.store('SQLite deployment notes', session.id, 'reference');

    const results = await backend.search({
      query: 'architecture',
      sessionId: session.id,
      type: 'reference',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.content).toContain('architecture');
    expect((await backend.getStats()).documents).toBe(2);

    await backend.close();

    const reopened = new SqliteBackend(filePath, embedding, logger);
    await reopened.init();
    expect(await reopened.getSessionDocuments(session.id)).toHaveLength(2);
    await reopened.close();
  });
});

describe('skill catalog', () => {
  const skillsDir = path.resolve(__dirname, '..', 'skills');

  it('validates every SKILL.md against the schema', () => {
    const catalog = loadSkillCatalog(skillsDir);
    const report = validateSkillCatalog(
      catalog,
      path.join(skillsDir, '_framework', 'skill-schema.json')
    );

    expect(report.total).toBeGreaterThan(0);
    expect(report.invalid).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('finds skills by name, tag and description', () => {
    const catalog = loadSkillCatalog(skillsDir);
    const results = findSkills(catalog, 'security');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.skill.id.includes('security'))).toBe(true);
  });
});
