import { PriorityLevel } from './rules';
import { SyncStatus } from './patient';

export type FollowupStatus = 'CREATED' | 'PENDING' | 'DUE' | 'COMPLETED' | 'MISSED';

export interface Followup {
  id: string; // UUID
  patient_id: string;
  screening_id: string | null;
  reason: string;
  priority: PriorityLevel;
  due_date: string | null;
  status: FollowupStatus;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export type WorkerRole = 'ASHA' | 'SUPERVISOR';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  created_at: string;
}

export type EntityType = 'patient' | 'screening' | 'followup';
export type SyncOperation = 'create' | 'update';

export interface SyncQueueItem {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRecordItem {
  client_record_id: string;
  entity: EntityType;
  operation: SyncOperation;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface SyncPushPayload {
  device_id: string;
  worker_id: string;
  records: SyncRecordItem[];
}

export interface ProcessedSyncRecord {
  client_record_id: string;
  status: 'created' | 'updated' | 'already_exists';
}

export interface FailedSyncRecord {
  client_record_id: string;
  error: string;
}

export interface SyncPushResponse {
  success: boolean;
  processed: ProcessedSyncRecord[];
  failed: FailedSyncRecord[];
}
