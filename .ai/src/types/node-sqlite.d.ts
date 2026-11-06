declare module 'node:sqlite' {
  export interface StatementResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResult;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Array<Record<string, unknown>>;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
