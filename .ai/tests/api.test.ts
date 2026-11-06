import path from 'path';
import request from 'supertest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createRuntime, Runtime } from '../src/runtime';

process.env.LOG_LEVEL = 'silent';

const skillsDir = path.resolve(__dirname, '..', 'skills');

async function makeRuntime(overrides: Record<string, string> = {}): Promise<Runtime> {
  return createRuntime(
    loadConfig({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      MEMORY_BACKEND: 'memory',
      EMBEDDING_PROVIDER: 'hash',
      SKILLS_DIR: skillsDir,
      ...overrides,
    })
  );
}

describe('HTTP API', () => {
  let runtime: Runtime;

  beforeAll(async () => {
    runtime = await makeRuntime();
  });

  afterAll(async () => {
    await runtime.close();
  });

  it('exposes health without authentication', async () => {
    const response = await request(buildApp(runtime)).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.backend).toBe('memory');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('serves OpenAPI and dashboard', async () => {
    const app = buildApp(runtime);

    const openapi = await request(app).get('/openapi.json');
    expect(openapi.status).toBe(200);
    expect(openapi.body.openapi).toBe('3.0.3');

    const dashboard = await request(app).get('/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain('AI-KIT Dashboard');
  });

  it('returns runtime statistics', async () => {
    const response = await request(buildApp(runtime)).get('/api/system/stats');

    expect(response.status).toBe(200);
    expect(response.body.memory.backend).toBe('memory');
    expect(response.body.skills.invalid).toBe(0);
  });

  it('executes an echo workflow', async () => {
    const response = await request(buildApp(runtime))
      .post('/api/workflows')
      .send({
        name: 'smoke',
        strategy: 'sequential',
        tasks: [{ name: 'hello', type: 'echo', payload: { message: 'hi' } }],
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('completed');
    expect(response.body.result.hello.echo.message).toBe('hi');
    expect(response.body.tasks[0].status).toBe('completed');
  });

  it('rejects invalid workflow payloads', async () => {
    const response = await request(buildApp(runtime))
      .post('/api/workflows')
      .send({ name: 'broken', tasks: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('bad_request');
  });

  it('stores and searches memory documents', async () => {
    const app = buildApp(runtime);

    const session = await request(app).post('/api/memory/sessions').send({ userId: 'tester' });
    expect(session.status).toBe(201);

    const document = await request(app).post('/api/memory/documents').send({
      content: 'Architecture decision: use Express and TypeScript',
      sessionId: session.body.id,
      type: 'reference',
    });
    expect(document.status).toBe(201);

    const search = await request(app)
      .get('/api/memory/search')
      .query({ q: 'architecture', sessionId: session.body.id });

    expect(search.status).toBe(200);
    expect(search.body.count).toBeGreaterThan(0);
    expect(search.body.results[0].document.content).toContain('Architecture');
  });

  it('ingests events and executes actions', async () => {
    const app = buildApp(runtime);

    const event = await request(app).post('/api/events').send({
      source: 'api',
      type: 'ci.failure',
      title: 'Critical build failure',
      description: 'Pipeline failed on main',
      priority: 9,
    });

    expect(event.status).toBe(201);
    expect(event.body.id).toBeDefined();

    const list = await request(app).get('/api/events');
    expect(list.status).toBe(200);
    expect(list.body.count).toBeGreaterThan(0);

    const status = await request(app).get(`/api/events/${event.body.id}`);
    expect(status.status).toBe(200);
    expect(status.body.event.title).toContain('build failure');

    const action = await request(app)
      .post(`/api/events/${event.body.id}/actions/acknowledge`)
      .send({ params: {} });

    expect(action.status).toBe(200);
    expect(action.body.result).toEqual({ acknowledged: true });
  });

  it('lists, validates and executes skills', async () => {
    const app = buildApp(runtime);

    const list = await request(app).get('/api/skills');
    expect(list.status).toBe(200);
    expect(list.body.count).toBeGreaterThan(0);
    expect(list.body.skills.every((skill: any) => skill.valid)).toBe(true);

    const report = await request(app).post('/api/skills/validate').send({});
    expect(report.status).toBe(200);
    expect(report.body.invalid).toBe(0);

    const detail = await request(app).get('/api/skills/code-review');
    expect(detail.status).toBe(200);
    expect(detail.body.category).toBe('code-quality');

    const guidance = await request(app)
      .post('/api/skills/code-review/execute')
      .send({ input: {} });
    expect(guidance.status).toBe(400);

    const executable = await request(app)
      .post('/api/skills/TextProcessing/execute')
      .send({ input: { text: 'Hello World', operation: 'tokenize' } });

    expect(executable.status).toBe(200);
    expect(executable.body.output.success).toBe(true);
    expect(executable.body.output.data).toEqual(['Hello', 'World']);
  });
});

describe('API authentication', () => {
  let runtime: Runtime;

  beforeAll(async () => {
    runtime = await makeRuntime({ API_KEY: 'test-secret-key' });
  });

  afterAll(async () => {
    await runtime.close();
  });

  it('rejects API requests without a key', async () => {
    const response = await request(buildApp(runtime)).get('/api/system/stats');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthorized');
  });

  it('accepts the x-api-key header', async () => {
    const response = await request(buildApp(runtime))
      .get('/api/system/stats')
      .set('x-api-key', 'test-secret-key');

    expect(response.status).toBe(200);
  });

  it('accepts a bearer token', async () => {
    const response = await request(buildApp(runtime))
      .get('/api/system/stats')
      .set('authorization', 'Bearer test-secret-key');

    expect(response.status).toBe(200);
  });
});
