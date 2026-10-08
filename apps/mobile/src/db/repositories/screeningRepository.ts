import { getDatabase } from '../sqlite';
import { ScreeningRecord, SyncStatus, RuleResult, StructuredScreeningData, ScreeningType } from '@asha/shared';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ScreeningInsertInput {
  id?: string;
  patient_id: string;
  screening_type: ScreeningType;
  transcript: string | null;
  structured_data: StructuredScreeningData;
  rule_results: RuleResult[];
  summary: string | null;
  confirmed: boolean;
}

export class ScreeningRepository {
  async create(input: ScreeningInsertInput): Promise<ScreeningRecord> {
    const db = await getDatabase();
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'PENDING_SYNC';

    const record: ScreeningRecord = {
      id,
      patient_id: input.patient_id,
      screening_type: input.screening_type,
      transcript: input.transcript,
      structured_data: input.structured_data,
      rule_results: input.rule_results,
      summary: input.summary,
      confirmed: input.confirmed,
      created_at: now,
      updated_at: now,
      sync_status: syncStatus
    };

    await db.runAsync(
      `INSERT INTO screenings (id, patient_id, screening_type, transcript, structured_data, rule_results, summary, confirmed, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.patient_id,
        record.screening_type,
        record.transcript,
        JSON.stringify(record.structured_data),
        JSON.stringify(record.rule_results),
        record.summary,
        record.confirmed ? 1 : 0,
        record.created_at,
        record.updated_at,
        record.sync_status
      ]
    );

    // If any rule triggered high priority, automatically create a high priority follow-up!
    const highPriorityRule = record.rule_results.find((r) => r.triggered && r.priority === 'high');
    if (highPriorityRule) {
      const followupId = generateUUID();
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Due next day
      await db.runAsync(
        `INSERT INTO followups (id, patient_id, screening_id, reason, priority, due_date, status, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          followupId,
          record.patient_id,
          record.id,
          highPriorityRule.reason,
          'high',
          dueDate,
          'PENDING',
          now,
          now,
          'PENDING_SYNC'
        ]
      );

      // Enqueue followup into sync_queue
      await db.runAsync(
        `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          'followup',
          followupId,
          'create',
          JSON.stringify({
            id: followupId,
            patient_id: record.patient_id,
            screening_id: record.id,
            reason: highPriorityRule.reason,
            priority: 'high',
            due_date: dueDate,
            status: 'PENDING'
          }),
          now,
          now
        ]
      );
    }

    // Enqueue screening into sync_queue
    const queueId = generateUUID();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [queueId, 'screening', record.id, 'create', JSON.stringify(record), now, now]
    );

    return record;
  }

  async getById(id: string): Promise<ScreeningRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string;
      patient_id: string;
      screening_type: ScreeningType;
      transcript: string | null;
      structured_data: string;
      rule_results: string;
      summary: string | null;
      confirmed: number;
      created_at: string;
      updated_at: string;
      sync_status: SyncStatus;
    }>('SELECT * FROM screenings WHERE id = ?', [id]);

    if (!row) return null;

    return {
      ...row,
      structured_data: JSON.parse(row.structured_data),
      rule_results: JSON.parse(row.rule_results),
      confirmed: Boolean(row.confirmed)
    };
  }

  async listByPatient(patientId: string): Promise<ScreeningRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      patient_id: string;
      screening_type: ScreeningType;
      transcript: string | null;
      structured_data: string;
      rule_results: string;
      summary: string | null;
      confirmed: number;
      created_at: string;
      updated_at: string;
      sync_status: SyncStatus;
    }>('SELECT * FROM screenings WHERE patient_id = ? ORDER BY created_at DESC', [patientId]);

    return rows.map((r) => ({
      ...r,
      structured_data: JSON.parse(r.structured_data),
      rule_results: JSON.parse(r.rule_results),
      confirmed: Boolean(r.confirmed)
    }));
  }

  async listRecent(limit = 20): Promise<ScreeningRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      patient_id: string;
      screening_type: ScreeningType;
      transcript: string | null;
      structured_data: string;
      rule_results: string;
      summary: string | null;
      confirmed: number;
      created_at: string;
      updated_at: string;
      sync_status: SyncStatus;
    }>('SELECT * FROM screenings ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      ...r,
      structured_data: JSON.parse(r.structured_data),
      rule_results: JSON.parse(r.rule_results),
      confirmed: Boolean(r.confirmed)
    }));
  }
}

export const defaultScreeningRepository = new ScreeningRepository();
