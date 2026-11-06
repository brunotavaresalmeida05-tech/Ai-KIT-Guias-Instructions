import { randomBytes } from 'crypto';
import { context, propagation, trace, TraceFlags } from '@opentelemetry/api';

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

export function parseTraceparent(header?: string): Partial<RequestContext> {
  if (!header) {
    return {};
  }

  const parts = header.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return {};
  }

  const [, traceId, parentSpanId, flags] = parts;
  if (!/^[0-9a-f]{32}$/.test(traceId) || !/^[0-9a-f]{16}$/.test(parentSpanId)) {
    return {};
  }

  return {
    traceId,
    parentSpanId,
    spanId: randomHex(8),
    ...(flags === '01' ? { sampled: true } : {}),
  } as Partial<RequestContext>;
}

export function createRequestContext(traceparent?: string): RequestContext {
  const parsed = parseTraceparent(traceparent);
  return {
    requestId: randomHex(8),
    traceId: parsed.traceId || randomHex(16),
    spanId: parsed.spanId || randomHex(8),
    parentSpanId: parsed.parentSpanId,
  };
}

export function traceparent(ctx: RequestContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-01`;
}

export async function withSpan<T>(
  name: string,
  ctx: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('ai-kit');
  const span = tracer.startSpan(name, {
    attributes: {
      'request.id': ctx.requestId,
      'trace.id': ctx.traceId,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      return await fn();
    } finally {
      span.end();
    }
  });
}

export function injectTraceHeaders(ctx: RequestContext): Record<string, string> {
  const carrier: Record<string, string> = { traceparent: traceparent(ctx) };
  propagation.inject(context.active(), carrier);
  return carrier;
}

export { TraceFlags };
