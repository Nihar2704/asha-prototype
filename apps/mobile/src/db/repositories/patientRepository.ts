import { getDatabase } from '../sqlite';
import { Patient, PatientCreateInput, SyncStatus } from '@asha/shared';

function generateUUID(): string {
  // RFC4122 compliant UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class PatientRepository {
  async create(input: PatientCreateInput): Promise<Patient> {
    const db = await getDatabase();
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const syncStatus: SyncStatus = 'PENDING_SYNC';

    const patient: Patient = {
      id,
      name: input.name,
      age: input.age ?? null,
      sex: input.sex ?? null,
      phone: input.phone ?? null,
      village: input.village ?? null,
      household_id: input.household_id ?? null,
      created_at: now,
      updated_at: now,
      sync_status: syncStatus
    };

    await db.runAsync(
      `INSERT INTO patients (id, name, age, sex, phone, village, household_id, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.id,
        patient.name,
        patient.age,
        patient.sex,
        patient.phone,
        patient.village,
        patient.household_id,
        patient.created_at,
        patient.updated_at,
        patient.sync_status
      ]
    );

    // Enqueue into sync_queue
    const queueId = generateUUID();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [queueId, 'patient', patient.id, 'create', JSON.stringify(patient), now, now]
    );

    return patient;
  }

  async getById(id: string): Promise<Patient | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Patient>('SELECT * FROM patients WHERE id = ?', [id]);
  }

  async search(query: string): Promise<Patient[]> {
    const db = await getDatabase();
    const searchTerm = `%${query.trim()}%`;
    return db.getAllAsync<Patient>(
      'SELECT * FROM patients WHERE name LIKE ? OR village LIKE ? OR phone LIKE ? ORDER BY updated_at DESC',
      [searchTerm, searchTerm, searchTerm]
    );
  }

  async list(limit = 50): Promise<Patient[]> {
    const db = await getDatabase();
    return db.getAllAsync<Patient>('SELECT * FROM patients ORDER BY updated_at DESC LIMIT ?', [limit]);
  }

  async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE patients SET sync_status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
  }
}

export const defaultPatientRepository = new PatientRepository();
