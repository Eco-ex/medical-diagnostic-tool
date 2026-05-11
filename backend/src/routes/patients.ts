import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  Patient,
  NewPatient,
  Vitals,
  MedicalRecord,
  Treatment,
  Outcome,
  ChatMessage,
  UpdateSummaryRequest,
  AnalyzeTreatmentRequest,
} from '../types';
import {
  getAllPatients,
  getPatient,
  addPatient as dbAddPatient,
  updatePatient as dbUpdatePatient,
  deletePatient as dbDeletePatient,
  patientExists,
} from '../services/database';
import { analyzeTreatmentWithOpenAI } from '../services/openai';

const router = express.Router();

// The backend acts as a proxy to OpenAI under a caller-supplied key. Without a
// limit, anyone reachable on the network could use this endpoint to anonymize
// their own OpenAI traffic through our IP. Per-IP cap is intentionally loose
// enough not to interfere with normal use.
const analyzeTreatmentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many analysis requests. Please wait a minute and try again.' },
});

// Get all patients
router.get('/', (req: Request, res: Response) => {
  try {
    res.json(getAllPatients());
  } catch (error: unknown) {
    console.error('Get all patients error:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  }
});

// Get single patient
router.get('/:patientId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (error: unknown) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to get patient' });
  }
});

// Search patients
router.get('/search/:searchTerm', (req: Request, res: Response) => {
  try {
    const searchTerm = req.params.searchTerm.toLowerCase();
    const results = getAllPatients().filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.patientId.toLowerCase().includes(searchTerm)
    );
    res.json(results);
  } catch (error: unknown) {
    console.error('Search patients error:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Add new patient
router.post('/', (req: Request, res: Response) => {
  try {
    const newPatient: NewPatient = req.body;

    if (!newPatient.name || !newPatient.patientId || !newPatient.sex || newPatient.age === undefined) {
      res.status(400).json({ error: 'Name, Patient ID, Age, and Sex are required' });
      return;
    }

    if (patientExists(newPatient.patientId)) {
      res.status(409).json({ error: 'Patient ID already exists. Please use a unique patient ID.' });
      return;
    }

    const patient: Patient = {
      patientId: newPatient.patientId,
      name: newPatient.name,
      age: newPatient.age,
      sex: newPatient.sex,
      occupation: newPatient.occupation,
      allergies: newPatient.allergies,
      currentStatus: {
        heartRate: 0,
        bloodPressure: '',
        temperature: 0,
        respiratoryRate: 0,
        oxygenSaturation: 0,
      },
      medicalRecords: [],
      treatments: [],
      outcomes: [],
      chatHistory: [],
      reasonForVisit: null,
      patientReport: null,
    };

    dbAddPatient(patient);
    res.status(201).json({ message: 'Patient added successfully', patientId: patient.patientId });
  } catch (error: unknown) {
    console.error('Add patient error:', error);
    res.status(500).json({ error: 'Failed to add patient' });
  }
});

// Update patient
router.put('/:patientId', (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const updatedPatient: Patient = req.body;

    if (!updatedPatient.name || !updatedPatient.patientId || !updatedPatient.sex || updatedPatient.age === undefined) {
      res.status(400).json({ error: 'Name, Patient ID, Age, and Sex are required' });
      return;
    }

    if (updatedPatient.patientId !== patientId && patientExists(updatedPatient.patientId)) {
      res.status(409).json({ error: 'Patient ID already exists. Please use a unique patient ID.' });
      return;
    }

    dbUpdatePatient(patientId, updatedPatient);
    res.json({ message: 'Patient updated successfully', patientId: updatedPatient.patientId });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:patientId', (req: Request, res: Response) => {
  try {
    dbDeletePatient(req.params.patientId);
    res.json({ message: 'Patient deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Update vitals
router.put('/:patientId/vitals', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const vitals: Vitals = req.body;
    patient.currentStatus = vitals;
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Vitals updated successfully' });
  } catch (error: unknown) {
    console.error('Update vitals error:', error);
    res.status(500).json({ error: 'Failed to update vitals' });
  }
});

// Medical Records
router.post('/:patientId/medical-records', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const record: MedicalRecord = req.body;
    patient.medicalRecords.push(record);
    dbUpdatePatient(req.params.patientId, patient);

    res.status(201).json({ message: 'Medical record added successfully' });
  } catch (error: unknown) {
    console.error('Add medical record error:', error);
    res.status(500).json({ error: 'Failed to add medical record' });
  }
});

router.put('/:patientId/medical-records/:recordId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedRecord: MedicalRecord = req.body;
    const index = patient.medicalRecords.findIndex((r) => r.recordId === req.params.recordId);

    if (index === -1) {
      res.status(404).json({ error: 'Medical record not found' });
      return;
    }

    patient.medicalRecords[index] = updatedRecord;
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Medical record updated successfully' });
  } catch (error: unknown) {
    console.error('Update medical record error:', error);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

router.delete('/:patientId/medical-records/:recordId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.medicalRecords = patient.medicalRecords.filter((r) => r.recordId !== req.params.recordId);
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Medical record deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ error: 'Failed to delete medical record' });
  }
});

// Treatments
router.post('/:patientId/treatments', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const treatment: Treatment = req.body;
    patient.treatments.push(treatment);
    dbUpdatePatient(req.params.patientId, patient);

    res.status(201).json({ message: 'Treatment added successfully' });
  } catch (error: unknown) {
    console.error('Add treatment error:', error);
    res.status(500).json({ error: 'Failed to add treatment' });
  }
});

router.put('/:patientId/treatments/:treatmentId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedTreatment: Treatment = req.body;
    const index = patient.treatments.findIndex((t) => t.treatmentId === req.params.treatmentId);

    if (index === -1) {
      res.status(404).json({ error: 'Treatment not found' });
      return;
    }

    patient.treatments[index] = updatedTreatment;
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Treatment updated successfully' });
  } catch (error: unknown) {
    console.error('Update treatment error:', error);
    res.status(500).json({ error: 'Failed to update treatment' });
  }
});

router.delete('/:patientId/treatments/:treatmentId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const treatmentId = req.params.treatmentId;
    patient.treatments = patient.treatments.filter((t) => t.treatmentId !== treatmentId);
    patient.outcomes = patient.outcomes.filter((o) => o.treatmentId !== treatmentId);
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Treatment and associated outcomes deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete treatment error:', error);
    res.status(500).json({ error: 'Failed to delete treatment' });
  }
});

// Outcomes
router.post('/:patientId/outcomes', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const outcome: Outcome = req.body;
    patient.outcomes.push(outcome);
    dbUpdatePatient(req.params.patientId, patient);

    res.status(201).json({ message: 'Outcome logged successfully' });
  } catch (error: unknown) {
    console.error('Log outcome error:', error);
    res.status(500).json({ error: 'Failed to log outcome' });
  }
});

router.put('/:patientId/outcomes/:outcomeId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedOutcome: Outcome = req.body;
    const index = patient.outcomes.findIndex((o) => o.outcomeId === req.params.outcomeId);

    if (index === -1) {
      res.status(404).json({ error: 'Outcome not found' });
      return;
    }

    patient.outcomes[index] = updatedOutcome;
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Outcome updated successfully' });
  } catch (error: unknown) {
    console.error('Update outcome error:', error);
    res.status(500).json({ error: 'Failed to update outcome' });
  }
});

router.delete('/:patientId/outcomes/:outcomeId', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.outcomes = patient.outcomes.filter((o) => o.outcomeId !== req.params.outcomeId);
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Outcome deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete outcome error:', error);
    res.status(500).json({ error: 'Failed to delete outcome' });
  }
});

// Summary
router.put('/:patientId/summary', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const { reasonForVisit, patientReport }: UpdateSummaryRequest = req.body;
    patient.reasonForVisit = reasonForVisit;
    patient.patientReport = patientReport;
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Summary updated successfully' });
  } catch (error: unknown) {
    console.error('Update summary error:', error);
    res.status(500).json({ error: 'Failed to update summary' });
  }
});

router.get('/:patientId/summary', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({
      reasonForVisit: patient.reasonForVisit,
      patientReport: patient.patientReport,
    });
  } catch (error: unknown) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Chat
router.post('/:patientId/chat', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const message: ChatMessage = req.body;
    patient.chatHistory.push(message);
    dbUpdatePatient(req.params.patientId, patient);

    res.status(201).json({ message: 'Chat message added successfully' });
  } catch (error: unknown) {
    console.error('Add chat message error:', error);
    res.status(500).json({ error: 'Failed to add chat message' });
  }
});

router.get('/:patientId/chat', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient.chatHistory);
  } catch (error: unknown) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

router.delete('/:patientId/chat', (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.chatHistory = [];
    dbUpdatePatient(req.params.patientId, patient);

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error: unknown) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// AI Analysis — API key is supplied per-request via the X-OpenAI-Key header.
// The extractOpenAiKey middleware (see server.ts) validates the key's shape and
// moves it from req.headers onto req.openAiKey so it cannot be picked up by
// request loggers.
router.post(
  '/:patientId/analyze-treatment',
  analyzeTreatmentLimiter,
  async (req: Request, res: Response) => {
    try {
      const patient = getPatient(req.params.patientId);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const { treatmentDescription }: AnalyzeTreatmentRequest = req.body;
      if (!treatmentDescription) {
        res.status(400).json({ error: 'Treatment description is required' });
        return;
      }

      const apiKey = req.openAiKey;
      if (!apiKey) {
        res.status(400).json({
          error: 'OpenAI API key is missing or malformed. Please set a valid key in Admin Settings.',
        });
        return;
      }

      const analysis = await analyzeTreatmentWithOpenAI(apiKey, patient, treatmentDescription);
      res.json({ analysis });
    } catch (error: unknown) {
      console.error('Analyze treatment error:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze treatment';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
