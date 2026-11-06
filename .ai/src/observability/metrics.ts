type Labels = Record<string, string | number>;

function labelKey(name: string, labels: Labels): string {
  const entries = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`);
  return entries.length > 0 ? `${name}{${entries.join(',')}}` : name;
}

export class Metrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  inc(name: string, labels: Labels = {}, value = 1): void {
    const key = labelKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  observe(name: string, value: number, labels: Labels = {}): void {
    const key = labelKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  render(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters) {
      lines.push(`# TYPE ${key.split('{')[0]} counter`);
      lines.push(`${key} ${value}`);
    }

    for (const [key, values] of this.histograms) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, item) => acc + item, 0);
      const count = sorted.length;
      const base = key.split('{')[0];
      lines.push(`# TYPE ${base} summary`);
      lines.push(`${key}_count ${count}`);
      lines.push(`${key}_sum ${sum}`);
      if (count > 0) {
        const p95 = sorted[Math.min(count - 1, Math.ceil(count * 0.95) - 1)];
        lines.push(`${key}{quantile="0.95"} ${p95}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  snapshot(): Record<string, unknown> {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          { count: values.length, avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0 },
        ])
      ),
    };
  }
}

export const metrics = new Metrics();
