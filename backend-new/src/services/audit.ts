import { v4 as uuidv4 } from 'uuid';
import { addAuditLog } from './database';
import { PatientId } from '../types';

export function logAudit(params: {
  userId: string;
  action: string;
  patientId?: PatientId | null;
  details?: string;
}): void {
  try {
    addAuditLog({
      logId: uuidv4(),
      timestamp: Date.now(),
      userId: params.userId,
      action: params.action,
      patientId: params.patientId ?? null,
      details: params.details ?? '',
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
