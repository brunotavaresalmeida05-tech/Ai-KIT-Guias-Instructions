import { Metrics, RequestContext, createRequestContext, injectTraceHeaders, traceparent } from '../src/observability';

describe('Metrics', () => {
  it('returns zero counts for an empty Metrics instance', () => {
    const metrics = new Metrics();
    expect(metrics.snapshot().counters).toEqual({});
    expect(metrics.snapshot().histograms).toEqual({});
    expect(metrics.render()).toBe('\n');
  });

  it('supports histogram percentiles and rolling window limits', () => {
    const metrics = new Metrics();

    for (let i = 0; i < 1005; i++) {
      metrics.observe('latency', i);
    }

    const snap = metrics.snapshot();
    expect((snap.histograms as any)['latency'].count).toBeLessThanOrEqual(1000);

    const rendered = metrics.render();
    expect(rendered).toContain('# TYPE latency summary');
    expect(rendered).toContain('latency_count');
    expect(rendered).toContain('latency_sum');
    expect(rendered).toContain('latency{quantile="0.95"}');
  });
});

describe('Tracing', () => {
  it('generates independent request contexts on every call', () => {
    const first = createRequestContext();
    const second = createRequestContext();

    expect(first.requestId).not.toBe(second.requestId);
    expect(first.traceId).not.toBe(second.traceId);
    expect(first.spanId).not.toBe(second.spanId);
  });

  it('keeps the parent traceId but creates a new spanId', () => {
    const parent = '00-aaaaaaaaaaaaaaaa1111111111111111-0000000000000001-01';
    const ctx = createRequestContext(parent);

    expect(ctx.traceId).toBe('aaaaaaaaaaaaaaaa1111111111111111');
    expect(ctx.parentSpanId).toBe('0000000000000001');
    expect(ctx.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(ctx.requestId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns the traceparent header for a context', () => {
    const ctx: RequestContext = {
      requestId: 'req-1',
      traceId: 'trace-1',
      spanId: 'span-1',
    };

    expect(traceparent(ctx)).toBe('00-trace-1-span-1-01');
  });

  it('injects trace headers for downstream calls', () => {
    const ctx = createRequestContext();
    const headers = injectTraceHeaders(ctx);

    expect(typeof headers.traceparent).toBe('string');
    expect(headers.traceparent).toContain(ctx.traceId);
  });
});
