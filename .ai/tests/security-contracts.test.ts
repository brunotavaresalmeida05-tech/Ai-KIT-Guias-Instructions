import request from 'supertest';
import { loadConfig } from '../src/config';
import { createRuntime } from '../src/runtime';
import { buildApp } from '../src/app';

describe('secure runtime configuration', () => {
  it('binds to loopback by default', () => {
    expect(loadConfig({}).apiHost).toBe('127.0.0.1');
  });

  it.each([undefined, '', 'short', ' '.repeat(32)])('rejects an absent or weak production key (%s)', (key) => {
    expect(() => loadConfig({ NODE_ENV: 'production', API_KEY: key })).toThrow(/API_KEY/);
  });

  it('accepts a configured production key and rejects wildcard CORS', () => {
    const env = { NODE_ENV: 'production', API_KEY: 'a'.repeat(32) };
    expect(loadConfig(env).apiKey).toBe(env.API_KEY);
    expect(() => loadConfig({ ...env, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
  });

  it('allows an empty optional key for local development', () => {
    expect(loadConfig({ API_KEY: '' }).apiKey).toBeUndefined();
  });
});

describe('HTTP security contracts', () => {
  it('rate limits failed authentication before checking credentials', async () => {
    const runtime = await createRuntime(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', API_KEY: 'test', RATE_LIMIT_MAX: '2' }));
    try {
      const app = buildApp(runtime);
      expect((await request(app).get('/api/system/stats')).status).toBe(401);
      expect((await request(app).get('/api/system/stats')).status).toBe(401);
      expect((await request(app).get('/api/system/stats')).status).toBe(429);
      expect(app.get('trust proxy')).toBe(false);
    } finally { await runtime.close(); }
  });

  it('returns client errors for malformed or oversized JSON', async () => {
    const runtime = await createRuntime(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
    try {
      const app = buildApp(runtime);
      const malformed = await request(app).post('/api/workflows').set('content-type', 'application/json').send('{');
      expect(malformed.status).toBe(400);
      const large = await request(app).post('/api/workflows').send({ data: 'x'.repeat(1024 * 1024) });
      expect(large.status).toBe(413);
    } finally { await runtime.close(); }
  });
});
