import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  Patient, 
  NewPatient, 
  Vitals, 
  MedicalRecord, 
  Treatment, 
  Outcome, 
  ChatMessage,
  UpdateSummaryRequest,
  AnalyzeTreatmentRequest 
} from '../types';
import {
  getAllPatients,
  getPatient,
  addPatient as dbAddPatient,
  updatePatient as dbUpdatePatient,
  deletePatient as dbDeletePatient,
  patientExists
} from '../services/database';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth';
import { analyzeTreatmentWithOpenAI } from '../services/openai';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all patients
router.get('/', requireUser, (req: Request, res: Response) => {
  try {
    const patients = getAllPatients();
    res.json(patients);
  } catch (error: any) {
    console.error('Get all patients error:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  }
});

// Get single patient
router.get('/:patientId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (error: any) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to get patient' });
  }
});

// Search patients
router.get('/search/:searchTerm', requireUser, (req: Request, res: Response) => {
  try {
    const searchTerm = req.params.searchTerm.toLowerCase();
    const patients = getAllPatients();
    const results = patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.patientId.toLowerCase().includes(searchTerm)
    );
    res.json(results);
  } catch (error: any) {
    console.error('Search patients error:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Add new patient
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const newPatient: NewPatient = req.body;

    // Validate required fields
    if (!newPatient.name || !newPatient.patientId || !newPatient.sex || newPatient.age === undefined) {
      res.status(400).json({ error: 'Name, Patient ID, Age, and Sex are required' });
      return;
    }

    // Check for duplicate patient ID
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
        oxygenSaturation: 0
      },
      medicalRecords: [],
      treatments: [],
      outcomes: [],
      chatHistory: [],
      assignedDoctor: req.user!.userId,
      reasonForVisit: null,
      patientReport: null
    };

    dbAddPatient(patient);
    res.status(201).json({ message: 'Patient added successfully', patientId: patient.patientId });
  } catch (error: any) {
    console.error('Add patient error:', error);
    res.status(500).json({ error: 'Failed to add patient' });
  }
});

// Update patient
router.put('/:patientId', requireAdmin, (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const updatedPatient: Patient = req.body;

    // Validate required fields
    if (!updatedPatient.name || !updatedPatient.patientId || !updatedPatient.sex || updatedPatient.age === undefined) {
      res.status(400).json({ error: 'Name, Patient ID, Age, and Sex are required' });
      return;
    }

    // Check for duplicate patient ID (excluding current patient)
    if (updatedPatient.patientId !== patientId && patientExists(updatedPatient.patientId)) {
      res.status(409).json({ error: 'Patient ID already exists. Please use a unique patient ID.' });
      return;
    }

    dbUpdatePatient(patientId, updatedPatient);
    res.json({ message: 'Patient updated successfully', patientId: updatedPatient.patientId });
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:patientId', requireAdmin, (req: Request, res: Response) => {
  try {
    dbDeletePatient(req.params.patientId);
    res.json({ message: 'Patient deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Update vitals
router.put('/:patientId/vitals', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Update vitals error:', error);
    res.status(500).json({ error: 'Failed to update vitals' });
  }
});

// Medical Records
router.post('/:patientId/medical-records', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Add medical record error:', error);
    res.status(500).json({ error: 'Failed to add medical record' });
  }
});

router.put('/:patientId/medical-records/:recordId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedRecord: MedicalRecord = req.body;
    const index = patient.medicalRecords.findIndex(r => r.recordId === req.params.recordId);
    
    if (index === -1) {
      res.status(404).json({ error: 'Medical record not found' });
      return;
    }

    patient.medicalRecords[index] = updatedRecord;
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Medical record updated successfully' });
  } catch (error: any) {
    console.error('Update medical record error:', error);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

router.delete('/:patientId/medical-records/:recordId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.medicalRecords = patient.medicalRecords.filter(r => r.recordId !== req.params.recordId);
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Medical record deleted successfully' });
  } catch (error: any) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ error: 'Failed to delete medical record' });
  }
});

// Treatments
router.post('/:patientId/treatments', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Add treatment error:', error);
    res.status(500).json({ error: 'Failed to add treatment' });
  }
});

router.put('/:patientId/treatments/:treatmentId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedTreatment: Treatment = req.body;
    const index = patient.treatments.findIndex(t => t.treatmentId === req.params.treatmentId);
    
    if (index === -1) {
      res.status(404).json({ error: 'Treatment not found' });
      return;
    }

    patient.treatments[index] = updatedTreatment;
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Treatment updated successfully' });
  } catch (error: any) {
    console.error('Update treatment error:', error);
    res.status(500).json({ error: 'Failed to update treatment' });
  }
});

router.delete('/:patientId/treatments/:treatmentId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const treatmentId = req.params.treatmentId;
    patient.treatments = patient.treatments.filter(t => t.treatmentId !== treatmentId);
    // Also delete associated outcomes
    patient.outcomes = patient.outcomes.filter(o => o.treatmentId !== treatmentId);
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Treatment and associated outcomes deleted successfully' });
  } catch (error: any) {
    console.error('Delete treatment error:', error);
    res.status(500).json({ error: 'Failed to delete treatment' });
  }
});

// Outcomes
router.post('/:patientId/outcomes', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Log outcome error:', error);
    res.status(500).json({ error: 'Failed to log outcome' });
  }
});

router.put('/:patientId/outcomes/:outcomeId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const updatedOutcome: Outcome = req.body;
    const index = patient.outcomes.findIndex(o => o.outcomeId === req.params.outcomeId);
    
    if (index === -1) {
      res.status(404).json({ error: 'Outcome not found' });
      return;
    }

    patient.outcomes[index] = updatedOutcome;
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Outcome updated successfully' });
  } catch (error: any) {
    console.error('Update outcome error:', error);
    res.status(500).json({ error: 'Failed to update outcome' });
  }
});

router.delete('/:patientId/outcomes/:outcomeId', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.outcomes = patient.outcomes.filter(o => o.outcomeId !== req.params.outcomeId);
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Outcome deleted successfully' });
  } catch (error: any) {
    console.error('Delete outcome error:', error);
    res.status(500).json({ error: 'Failed to delete outcome' });
  }
});

// Summary
router.put('/:patientId/summary', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Update summary error:', error);
    res.status(500).json({ error: 'Failed to update summary' });
  }
});

router.get('/:patientId/summary', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({
      reasonForVisit: patient.reasonForVisit,
      patientReport: patient.patientReport
    });
  } catch (error: any) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Chat
router.post('/:patientId/chat', requireUser, (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Add chat message error:', error);
    res.status(500).json({ error: 'Failed to add chat message' });
  }
});

router.get('/:patientId/chat', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient.chatHistory);
  } catch (error: any) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

router.delete('/:patientId/chat', requireUser, (req: Request, res: Response) => {
  try {
    const patient = getPatient(req.params.patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    patient.chatHistory = [];
    dbUpdatePatient(req.params.patientId, patient);
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error: any) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// AI Analysis
router.post('/:patientId/analyze-treatment', requireUser, async (req: Request, res: Response) => {
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

    const analysis = await analyzeTreatmentWithOpenAI(patient, treatmentDescription);
    res.json({ analysis });
  } catch (error: any) {
    console.error('Analyze treatment error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze treatment' });
  }
});

export default router;


