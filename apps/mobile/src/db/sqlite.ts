import { SQL_INIT_SCHEMA } from './schema';

export interface IDatabaseConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

// In-memory mock for headless testing environments (Jest / Node)
class InMemoryDatabaseConnection implements IDatabaseConnection {
  private tables: Map<string, Map<string, Record<string, unknown>>> = new Map();

  async execAsync(sql: string): Promise<void> {
    // schema initializations
  }

  async runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    return { lastInsertRowId: 1, changes: 1 };
  }

  async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return [];
  }

  async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return null;
  }
}

let dbInstance: IDatabaseConnection | null = null;

export async function getDatabase(): Promise<IDatabaseConnection> {
  if (dbInstance) return dbInstance;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require('expo-sqlite');
    const nativeDb = await SQLite.openDatabaseAsync('asha_copilot.db');
    await nativeDb.execAsync(SQL_INIT_SCHEMA);
    dbInstance = nativeDb;
  } catch {
    // Fallback for tests or non-Expo environments
    dbInstance = new InMemoryDatabaseConnection();
    await dbInstance.execAsync(SQL_INIT_SCHEMA);
  }

  return dbInstance!;
}

export function setMockDatabase(mockDb: IDatabaseConnection): void {
  dbInstance = mockDb;
}
