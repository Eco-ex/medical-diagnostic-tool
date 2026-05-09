import fs from 'fs';
import path from 'path';
import { Patient, User, AuditLog, AdminSettings } from '../types';

const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file paths
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit-logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Initialize files if they don't exist
function initFile<T>(filePath: string, defaultData: T): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

// Initialize default data
initFile<Patient[]>(PATIENTS_FILE, []);
initFile<User[]>(USERS_FILE, []);
initFile<AuditLog[]>(AUDIT_LOGS_FILE, []);
initFile<AdminSettings>(SETTINGS_FILE, { openAiApiKey: '' });

// Generic read/write functions
function readData<T>(filePath: string): T {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

function writeData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// Patient operations
export function getAllPatients(): Patient[] {
  return readData<Patient[]>(PATIENTS_FILE);
}

export function getPatient(patientId: string): Patient | null {
  const patients = getAllPatients();
  return patients.find(p => p.patientId === patientId) || null;
}

export function addPatient(patient: Patient): void {
  const patients = getAllPatients();
  patients.push(patient);
  writeData(PATIENTS_FILE, patients);
}

export function updatePatient(patientId: string, updatedPatient: Patient): void {
  let patients = getAllPatients();
  const index = patients.findIndex(p => p.patientId === patientId);
  if (index === -1) throw new Error('Patient not found');
  
  // If patient ID changed, remove old entry
  if (updatedPatient.patientId !== patientId) {
    patients = patients.filter(p => p.patientId !== patientId);
  } else {
    patients.splice(index, 1);
  }
  
  patients.push(updatedPatient);
  writeData(PATIENTS_FILE, patients);
}

export function deletePatient(patientId: string): void {
  const patients = getAllPatients();
  const filtered = patients.filter(p => p.patientId !== patientId);
  if (filtered.length === patients.length) throw new Error('Patient not found');
  writeData(PATIENTS_FILE, filtered);
}

export function patientExists(patientId: string): boolean {
  const patients = getAllPatients();
  return patients.some(p => p.patientId === patientId);
}

// User operations
export function getAllUsers(): User[] {
  return readData<User[]>(USERS_FILE);
}

export function getUser(userId: string): User | null {
  const users = getAllUsers();
  return users.find(u => u.userId === userId) || null;
}

export function getUserByUsername(username: string): User | null {
  const users = getAllUsers();
  return users.find(u => u.username === username) || null;
}

export function addUser(user: User): void {
  const users = getAllUsers();
  users.push(user);
  writeData(USERS_FILE, users);
}

export function updateUser(userId: string, updatedUser: User): void {
  const users = getAllUsers();
  const index = users.findIndex(u => u.userId === userId);
  if (index === -1) throw new Error('User not found');
  users[index] = updatedUser;
  writeData(USERS_FILE, users);
}

export function userExists(username: string): boolean {
  const users = getAllUsers();
  return users.some(u => u.username === username);
}

// Audit log operations
export function addAuditLog(log: AuditLog): void {
  const logs = readData<AuditLog[]>(AUDIT_LOGS_FILE);
  logs.push(log);
  writeData(AUDIT_LOGS_FILE, logs);
}

export function getAllAuditLogs(): AuditLog[] {
  return readData<AuditLog[]>(AUDIT_LOGS_FILE);
}

// Settings operations
export function getSettings(): AdminSettings {
  return readData<AdminSettings>(SETTINGS_FILE);
}

export function updateSettings(settings: AdminSettings): void {
  writeData(SETTINGS_FILE, settings);
}


