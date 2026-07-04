import type {
  Patient, PatientId, Vitals, MedicalRecord, Treatment, Outcome, ChatMessage,
} from '../../types';
import { supabase } from './supabase';

/* ============================================================================
 * Medical Diagnostic Tool — persistence layer (Supabase Postgres)
 *
 * The single seam between API routes and storage. Routes pass the human-facing
 * patient id (the "MRN"); this layer resolves it to the internal uuid and maps
 * DB rows to/from the wire types in types.ts. The wire contract is unchanged.
 * ========================================================================= */

// ---- Input shapes ---------------------------------------------------------

export interface NewPatientInput {
  patientId: PatientId;
  name: string;
  age: number;
  sex: string;
  occupation: string | null;
  allergies: string | null;
}

export type PatientCoreUpdate = NewPatientInput; // possibly-new MRN in patientId

// ---- Mapping helpers (exported for unit testing) --------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string): boolean => UUID_RE.test(s);

const tsToMs = (iso: string | null): number => (iso ? new Date(iso).getTime() : 0);
const msToIso = (ms: number | null | undefined): string =>
  new Date(typeof ms === 'number' && ms > 0 ? ms : Date.now()).toISOString();

/** "120/80" -> { systolic: 120, diastolic: 80 }; anything else -> nulls. */
export function parseBloodPressure(bp: string | null | undefined): {
  systolic: number | null;
  diastolic: number | null;
} {
  const m = bp?.match(/^\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*$/);
  return m
    ? { systolic: Number(m[1]), diastolic: Number(m[2]) }
    : { systolic: null, diastolic: null };
}

export function formatBloodPressure(
  sys: number | null,
  dia: number | null
): string {
  return sys != null && dia != null ? `${sys}/${dia}` : '';
}

export function senderToRole(sender: string): 'doctor' | 'ai' | 'system' {
  if (sender === 'Doctor') return 'doctor';
  if (sender === 'AI Assistant') return 'ai';
  return 'system';
}

export function roleToSender(role: string): string {
  if (role === 'doctor') return 'Doctor';
  if (role === 'ai') return 'AI Assistant';
  return 'System';
}

const ZERO_VITALS: Vitals = {
  heartRate: 0,
  bloodPressure: '',
  temperature: 0,
  respiratoryRate: 0,
  oxygenSaturation: 0,
};

// ---- Row -> wire-type mappers ---------------------------------------------
// Rows are typed loosely (`Row`) for brevity; generate database.types.ts with
// the Supabase CLI for full type safety.

type Row = Record<string, any>;

function rowToVitals(r: Row): Vitals {
  return {
    heartRate: r.heart_rate ?? 0,
    bloodPressure: formatBloodPressure(r.bp_systolic, r.bp_diastolic),
    temperature: r.temperature != null ? Number(r.temperature) : 0,
    respiratoryRate: r.respiratory_rate ?? 0,
    oxygenSaturation: r.oxygen_saturation ?? 0,
  };
}

function rowToMedicalRecord(r: Row): MedicalRecord {
  return {
    recordId: r.id,
    date: tsToMs(r.record_date),
    description: r.description,
    details: r.details ?? '',
  };
}

function rowToTreatment(r: Row): Treatment {
  return {
    treatmentId: r.id,
    date: tsToMs(r.treatment_date),
    description: r.description,
    method: r.method ?? '',
    doctorId: r.doctor_id ?? '',
  };
}

function rowToOutcome(r: Row): Outcome {
  return {
    outcomeId: r.id,
    treatmentId: r.treatment_id,
    date: tsToMs(r.outcome_date),
    result: r.result,
    metrics: r.metrics ?? '',
  };
}

function rowToChatMessage(r: Row, mrn: string): ChatMessage {
  return {
    messageId: r.id,
    timestamp: tsToMs(r.created_at),
    sender: roleToSender(r.role),
    content: r.content,
    patientId: mrn,
  };
}

/** Assembles a full Patient aggregate from a patients row with embedded children. */
function rowToPatient(row: Row): Patient {
  // selectPatient() orders the vitals embed newest-first and caps it at one
  // row, so the latest reading is just the first (and only) element.
  const latestVitals: Row | undefined = (row.vitals ?? [])[0];

  // Chat history = messages of the active (non-archived) conversation.
  const conversations: Row[] = row.conversations ?? [];
  const active = conversations.find((c) => !c.archived_at);
  const messages: Row[] = active?.chat_messages ?? [];

  return {
    patientId: row.mrn,
    name: row.name,
    age: row.age,
    sex: row.sex,
    occupation: row.occupation ?? null,
    allergies: row.allergies ?? null,
    reasonForVisit: row.reason_for_visit ?? null,
    patientReport: row.patient_report ?? null,
    currentStatus: latestVitals ? rowToVitals(latestVitals) : { ...ZERO_VITALS },
    medicalRecords: (row.medical_records ?? [])
      .map(rowToMedicalRecord)
      .sort((a: MedicalRecord, b: MedicalRecord) => b.date - a.date),
    treatments: (row.treatments ?? [])
      .map(rowToTreatment)
      .sort((a: Treatment, b: Treatment) => b.date - a.date),
    outcomes: (row.outcomes ?? [])
      .map(rowToOutcome)
      .sort((a: Outcome, b: Outcome) => b.date - a.date),
    chatHistory: messages
      .map((m) => rowToChatMessage(m, row.mrn))
      .sort((a, b) => a.timestamp - b.timestamp),
  };
}

// One query pulls a patient and every child via PostgREST resource embedding.
const PATIENT_SELECT = `
  *,
  vitals (*),
  medical_records (*),
  treatments (*),
  outcomes (*),
  conversations ( id, archived_at, chat_messages (*) )
`;

/**
 * Builds a patient-aggregate query. The `vitals` embed is ordered newest-first
 * and capped at one row: `currentStatus` only ever needs the latest reading, so
 * there is no point shipping — or sorting in Node — a patient's whole vitals
 * history. Backed by `vitals_patient_recorded_idx`, this resolves to an index
 * scan of one row per patient. Callers keep chaining (`.eq`, `.maybeSingle`, …).
 */
function selectPatient() {
  return supabase
    .from('patients')
    .select(PATIENT_SELECT)
    .order('recorded_at', { referencedTable: 'vitals', ascending: false })
    .limit(1, { referencedTable: 'vitals' });
}

// ---- Internal: id / conversation resolution -------------------------------

/** Resolves an MRN to the internal patient uuid, or null if not found. */
export async function patientUuid(mrn: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('mrn', mrn)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Returns the patient's single active conversation, creating one if needed. */
export async function getOrCreateActiveConversation(
  patientId: string
): Promise<string> {
  const find = async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patientId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  };

  const existing = await find();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ patient_id: patientId })
    .select('id')
    .single();
  if (error) {
    // 23505 = lost a create race against the partial unique index.
    if (error.code === '23505') {
      const again = await find();
      if (again) return again;
    }
    throw error;
  }
  return data.id;
}

// ---- Patients -------------------------------------------------------------

export async function getAllPatients(): Promise<Patient[]> {
  const { data, error } = await selectPatient();
  if (error) throw error;
  return (data ?? []).map(rowToPatient);
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  const { data, error } = await selectPatient().eq('mrn', patientId).maybeSingle();
  if (error) throw error;
  return data ? rowToPatient(data) : null;
}

export async function patientExists(patientId: string): Promise<boolean> {
  return (await patientUuid(patientId)) !== null;
}

export async function addPatient(input: NewPatientInput): Promise<void> {
  const { error } = await supabase.from('patients').insert({
    mrn: input.patientId,
    name: input.name,
    age: input.age,
    sex: input.sex,
    occupation: input.occupation,
    allergies: input.allergies,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Patient ID already exists');
    throw error;
  }
}

/** Updates demographic fields only. Child collections have their own endpoints. */
export async function updatePatientCore(
  patientId: string,
  update: PatientCoreUpdate
): Promise<void> {
  const { data, error } = await supabase
    .from('patients')
    .update({
      mrn: update.patientId,
      name: update.name,
      age: update.age,
      sex: update.sex,
      occupation: update.occupation,
      allergies: update.allergies,
    })
    .eq('mrn', patientId)
    .select('id');
  if (error) {
    if (error.code === '23505') throw new Error('Patient ID already exists');
    throw error;
  }
  if (!data || data.length === 0) throw new Error('Patient not found');
}

export async function deletePatient(patientId: string): Promise<void> {
  // Children cascade-delete via the foreign keys.
  const { data, error } = await supabase
    .from('patients')
    .delete()
    .eq('mrn', patientId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Patient not found');
}

export async function searchPatients(term: string): Promise<Patient[]> {
  // Simple in-memory filter, matching the current behavior. For a large
  // patient population, push this into SQL with `.or('name.ilike...,mrn.ilike...')`.
  const t = term.toLowerCase();
  return (await getAllPatients()).filter(
    (p) =>
      p.name.toLowerCase().includes(t) ||
      p.patientId.toLowerCase().includes(t)
  );
}

// ---- Summary --------------------------------------------------------------

export async function getPatientSummary(
  patientId: string
): Promise<{ reasonForVisit: string | null; patientReport: string | null } | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('reason_for_visit, patient_report')
    .eq('mrn', patientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    reasonForVisit: data.reason_for_visit ?? null,
    patientReport: data.patient_report ?? null,
  };
}

export async function updateSummary(
  patientId: string,
  reasonForVisit: string,
  patientReport: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('patients')
    .update({ reason_for_visit: reasonForVisit, patient_report: patientReport })
    .eq('mrn', patientId)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

// ---- Vitals ---------------------------------------------------------------

/** Appends a vitals reading. "Current" vitals = the most recent reading. */
export async function addVitalsReading(
  patientId: string,
  vitals: Vitals
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  const bp = parseBloodPressure(vitals.bloodPressure);
  const { error } = await supabase.from('vitals').insert({
    patient_id: uuid,
    heart_rate: vitals.heartRate || null,
    bp_systolic: bp.systolic,
    bp_diastolic: bp.diastolic,
    temperature: vitals.temperature || null,
    respiratory_rate: vitals.respiratoryRate || null,
    oxygen_saturation: vitals.oxygenSaturation || null,
  });
  if (error) throw error;
  return true;
}

// ---- Medical records ------------------------------------------------------

export async function addMedicalRecord(
  patientId: string,
  record: MedicalRecord
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  const { error } = await supabase.from('medical_records').insert({
    patient_id: uuid,
    description: record.description,
    details: record.details,
    record_date: msToIso(record.date),
  });
  if (error) throw error;
  return true;
}

export async function updateMedicalRecord(
  patientId: string,
  recordId: string,
  record: MedicalRecord
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(recordId)) return false;
  const { data, error } = await supabase
    .from('medical_records')
    .update({
      description: record.description,
      details: record.details,
      record_date: msToIso(record.date),
    })
    .eq('id', recordId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

export async function deleteMedicalRecord(
  patientId: string,
  recordId: string
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(recordId)) return false;
  const { data, error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', recordId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

// ---- Treatments -----------------------------------------------------------

export async function addTreatment(
  patientId: string,
  t: Treatment
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  const { error } = await supabase.from('treatments').insert({
    patient_id: uuid,
    description: t.description,
    method: t.method,
    doctor_id: t.doctorId || null,
    treatment_date: msToIso(t.date),
  });
  if (error) throw error;
  return true;
}

export async function updateTreatment(
  patientId: string,
  treatmentId: string,
  t: Treatment
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(treatmentId)) return false;
  const { data, error } = await supabase
    .from('treatments')
    .update({
      description: t.description,
      method: t.method,
      doctor_id: t.doctorId || null,
      treatment_date: msToIso(t.date),
    })
    .eq('id', treatmentId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

export async function deleteTreatment(
  patientId: string,
  treatmentId: string
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(treatmentId)) return false;
  // Associated outcomes cascade-delete via the foreign key.
  const { data, error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', treatmentId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

// ---- Outcomes -------------------------------------------------------------

export async function addOutcome(
  patientId: string,
  o: Outcome
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  const { error } = await supabase.from('outcomes').insert({
    patient_id: uuid,
    treatment_id: o.treatmentId,
    result: o.result,
    metrics: o.metrics,
    outcome_date: msToIso(o.date),
  });
  if (error) throw error; // 23503 here means treatmentId references no treatment
  return true;
}

export async function updateOutcome(
  patientId: string,
  outcomeId: string,
  o: Outcome
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(outcomeId)) return false;
  const { data, error } = await supabase
    .from('outcomes')
    .update({ result: o.result, metrics: o.metrics, outcome_date: msToIso(o.date) })
    .eq('id', outcomeId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

export async function deleteOutcome(
  patientId: string,
  outcomeId: string
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid || !isUuid(outcomeId)) return false;
  const { data, error } = await supabase
    .from('outcomes')
    .delete()
    .eq('id', outcomeId)
    .eq('patient_id', uuid)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

// ---- Chat -----------------------------------------------------------------

export async function getChatHistory(patientId: string): Promise<ChatMessage[]> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('patient_id', uuid)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => rowToChatMessage(m, patientId));
}

export async function addChatMessage(
  patientId: string,
  message: ChatMessage
): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  const conversationId = await getOrCreateActiveConversation(uuid);
  // The DB generates id and created_at; the client-supplied messageId and
  // timestamp are ignored (the client refetches and gets the real values).
  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    patient_id: uuid,
    role: senderToRole(message.sender),
    content: message.content,
  });
  if (error) throw error;
  return true;
}

export async function clearChatHistory(patientId: string): Promise<boolean> {
  const uuid = await patientUuid(patientId);
  if (!uuid) return false;
  // Deleting conversations cascades to chat_messages. ai_interactions are
  // retained — their conversation_id is set null — so the AI audit log
  // survives a "Clear History".
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('patient_id', uuid);
  if (error) throw error;
  return true;
}