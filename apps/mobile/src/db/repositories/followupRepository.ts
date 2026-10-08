import { getDatabase } from '../sqlite';
import { Followup, FollowupStatus, SyncStatus } from '@asha/shared';

export class FollowupRepository {
  async listPending(): Promise<Followup[]> {
    const db = await getDatabase();
    return db.getAllAsync<Followup>(
      "SELECT * FROM followups WHERE status IN ('PENDING', 'DUE') ORDER BY priority = 'high' DESC, due_date ASC"
    );
  }

  async listHighPriority(): Promise<Followup[]> {
    const db = await getDatabase();
    return db.getAllAsync<Followup>(
      "SELECT * FROM followups WHERE priority = 'high' AND status != 'COMPLETED' ORDER BY due_date ASC"
    );
  }

  async markCompleted(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE followups SET status = 'COMPLETED', updated_at = ?, sync_status = 'PENDING_SYNC' WHERE id = ?",
      [now, id]
    );

    // Enqueue status update in sync_queue
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'sq_' + Date.now(),
        'followup',
        id,
        'update',
        JSON.stringify({ id, status: 'COMPLETED', updated_at: now }),
        now,
        now
      ]
    );
  }
}

export const defaultFollowupRepository = new FollowupRepository();
