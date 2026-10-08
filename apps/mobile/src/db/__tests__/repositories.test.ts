import { PatientRepository } from '../repositories/patientRepository';
import { ScreeningRepository } from '../repositories/screeningRepository';
import { FollowupRepository } from '../repositories/followupRepository';
import { SyncQueueRepository } from '../repositories/syncQueueRepository';
import { setMockDatabase, IDatabaseConnection } from '../sqlite';
import { NCDScreeningData } from '@asha/shared';

// Comprehensive in-memory test database for repositories
class MockDb implements IDatabaseConnection {
  patients: any[] = [];
  screenings: any[] = [];
  followups: any[] = [];
  syncQueue: any[] = [];

  async execAsync(sql: string): Promise<void> {}

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    if (sql.includes('INSERT INTO patients')) {
      this.patients.push({
        id: params[0],
        name: params[1],
        age: params[2],
        sex: params[3],
        phone: params[4],
        village: params[5],
        household_id: params[6],
        created_at: params[7],
        updated_at: params[8],
        sync_status: params[9]
      });
    } else if (sql.includes('INSERT INTO screenings')) {
      this.screenings.push({
        id: params[0],
        patient_id: params[1],
        screening_type: params[2],
        transcript: params[3],
        structured_data: params[4],
        rule_results: params[5],
        summary: params[6],
        confirmed: params[7],
        created_at: params[8],
        updated_at: params[9],
        sync_status: params[10]
      });
    } else if (sql.includes('INSERT INTO followups')) {
      this.followups.push({
        id: params[0],
        patient_id: params[1],
        screening_id: params[2],
        reason: params[3],
        priority: params[4],
        due_date: params[5],
        status: params[6],
        created_at: params[7],
        updated_at: params[8],
        sync_status: params[9]
      });
    } else if (sql.includes('INSERT INTO sync_queue')) {
      this.syncQueue.push({
        id: params[0],
        entity_type: params[1],
        entity_id: params[2],
        operation: params[3],
        payload: params[4],
        attempts: 0,
        last_error: null,
        created_at: params[5],
        updated_at: params[6]
      });
    } else if (sql.includes('DELETE FROM sync_queue')) {
      this.syncQueue = this.syncQueue.filter((q) => q.id !== params[0]);
    } else if (sql.includes('UPDATE followups SET status')) {
      const item = this.followups.find((f) => f.id === params[1]);
      if (item) item.status = 'COMPLETED';
    }
    return { lastInsertRowId: 1, changes: 1 };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (sql.includes('FROM patients')) return [...this.patients] as unknown as T[];
    if (sql.includes('FROM screenings')) return [...this.screenings] as unknown as T[];
    if (sql.includes('FROM followups')) return [...this.followups] as unknown as T[];
    if (sql.includes('FROM sync_queue')) return [...this.syncQueue] as unknown as T[];
    return [];
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    if (sql.includes('FROM patients WHERE id = ?')) {
      return (this.patients.find((p) => p.id === params[0]) || null) as unknown as T;
    }
    if (sql.includes('FROM screenings WHERE id = ?')) {
      return (this.screenings.find((s) => s.id === params[0]) || null) as unknown as T;
    }
    if (sql.includes('COUNT(*) as count FROM sync_queue')) {
      return { count: this.syncQueue.length } as unknown as T;
    }
    return null;
  }
}

describe('Offline SQLite Repositories & Sync Queue', () => {
  let mockDb: MockDb;
  let patientRepo: PatientRepository;
  let screeningRepo: ScreeningRepository;
  let followupRepo: FollowupRepository;
  let syncQueueRepo: SyncQueueRepository;

  beforeEach(() => {
    mockDb = new MockDb();
    setMockDatabase(mockDb);
    patientRepo = new PatientRepository();
    screeningRepo = new ScreeningRepository();
    followupRepo = new FollowupRepository();
    syncQueueRepo = new SyncQueueRepository();
  });

  it('should create a patient and enqueue to sync_queue', async () => {
    const patient = await patientRepo.create({
      name: 'सुनीता देवी',
      age: 45,
      sex: 'female',
      phone: '9876543210',
      village: 'रामपुर',
      household_id: 'HH-101'
    });

    expect(patient.id).toBeDefined();
    expect(patient.sync_status).toBe('PENDING_SYNC');
    expect(mockDb.patients).toHaveLength(1);
    expect(mockDb.syncQueue).toHaveLength(1);
    expect(mockDb.syncQueue[0].entity_type).toBe('patient');
    expect(mockDb.syncQueue[0].entity_id).toBe(patient.id);
  });

  it('should create a screening and automatically create a high-priority followup if triggered', async () => {
    const ncdData: NCDScreeningData = {
      bp_systolic: { value: 160, status: 'known' },
      bp_diastolic: { value: 100, status: 'known' },
      blood_glucose: { value: 210, status: 'known' },
      tobacco_use: { value: false, status: 'known' },
      alcohol_use: { value: false, status: 'known' },
      known_hypertension: { value: false, status: 'known' },
      known_diabetes: { value: false, status: 'known' },
      medication_adherence: { value: 'adherent', status: 'known' },
      symptoms: { value: [], status: 'known' }
    };

    const screening = await screeningRepo.create({
      patient_id: 'pat_sunita',
      screening_type: 'NCD',
      transcript: 'बीपी 160/100',
      structured_data: ncdData,
      rule_results: [
        {
          ruleId: 'NCD_BP_EVALUATION',
          ruleName: 'Blood Pressure Screening Rule',
          triggered: true,
          priority: 'high',
          reason: 'High BP recorded',
          source: 'Protocol v1',
          nextWorkflow: 'Referral'
        }
      ],
      summary: 'उच्च बीपी दर्ज हुआ',
      confirmed: true
    });

    expect(screening.id).toBeDefined();
    expect(screening.sync_status).toBe('PENDING_SYNC');

    // High priority rule triggered -> automatically created followup!
    expect(mockDb.followups).toHaveLength(1);
    expect(mockDb.followups[0].priority).toBe('high');
    expect(mockDb.followups[0].patient_id).toBe('pat_sunita');

    // Both screening and followup queued for sync
    const screeningQueueItem = mockDb.syncQueue.find((q) => q.entity_type === 'screening');
    const followupQueueItem = mockDb.syncQueue.find((q) => q.entity_type === 'followup');
    expect(screeningQueueItem).toBeDefined();
    expect(followupQueueItem).toBeDefined();
  });

  it('should complete a followup and enqueue status update', async () => {
    mockDb.followups.push({ id: 'f_1', status: 'PENDING' });
    await followupRepo.markCompleted('f_1');

    expect(mockDb.followups[0].status).toBe('COMPLETED');
    const updateItem = mockDb.syncQueue.find((q) => q.entity_type === 'followup' && q.operation === 'update');
    expect(updateItem).toBeDefined();
  });

  it('should process sync queue items and mark success', async () => {
    mockDb.syncQueue.push({
      id: 'sq_1',
      entity_type: 'patient',
      entity_id: 'p_1',
      operation: 'create',
      payload: JSON.stringify({ name: 'रामेश' }),
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const pending = await syncQueueRepo.getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('sq_1');

    await syncQueueRepo.markSuccess('sq_1');
    expect(mockDb.syncQueue).toHaveLength(0);
  });
});
