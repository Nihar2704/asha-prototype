import { getDatabase } from '../sqlite';
import { SyncQueueItem } from '@asha/shared';

export class SyncQueueRepository {
  async getPendingItems(limit = 50): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      entity_type: string;
      entity_id: string;
      operation: string;
      payload: string;
      attempts: number;
      last_error: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?', [limit]);

    return rows.map((r) => ({
      id: r.id,
      entity_type: r.entity_type as SyncQueueItem['entity_type'],
      entity_id: r.entity_id,
      operation: r.operation as SyncQueueItem['operation'],
      payload: JSON.parse(r.payload),
      attempts: r.attempts,
      last_error: r.last_error,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  async markSuccess(queueId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [queueId]);
  }

  async recordFailure(queueId: string, errorMsg: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE sync_queue SET attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?',
      [errorMsg, now, queueId]
    );
  }

  async getPendingCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue');
    return row?.count || 0;
  }
}

export const defaultSyncQueueRepository = new SyncQueueRepository();
