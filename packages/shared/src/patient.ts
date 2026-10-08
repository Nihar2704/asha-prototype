export type SexType = 'female' | 'male' | 'other';

export type SyncStatus = 'LOCAL_ONLY' | 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface Patient {
  id: string; // UUID
  name: string;
  age: number | null;
  sex: SexType | null;
  phone: string | null;
  village: string | null;
  household_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export type PatientCreateInput = Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'sync_status'> & {
  id?: string;
};
