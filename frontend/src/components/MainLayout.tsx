import { useState } from 'react';
import Header from './Header';
import PatientList from './PatientList';
import PatientDashboard from './PatientDashboard';
import AdminSettings from './AdminSettings';
import { useGetAllPatients } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { PatientId } from '../backend';

export default function MainLayout() {
  const [selectedPatientId, setSelectedPatientId] = useState<PatientId | null>(null);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  
  const { data: patients = [], isLoading: patientsLoading } = useGetAllPatients();

  const handlePatientDeleted = () => {
    setSelectedPatientId(null);
  };

  if (patientsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header onAdminSettingsClick={() => setShowAdminSettings(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        {showAdminSettings ? (
          <div className="flex-1 overflow-auto">
            <div className="border-b bg-card p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdminSettings(false)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Patients
              </Button>
            </div>
            <AdminSettings />
          </div>
        ) : (
          <>
            <PatientList
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
            />
            
            <main className="flex-1 overflow-hidden bg-background">
              {selectedPatientId ? (
                <PatientDashboard 
                  patientId={selectedPatientId} 
                  onPatientDeleted={handlePatientDeleted}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-muted-foreground">
                      Select a patient to view details
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Choose a patient from the list or add a new patient
                    </p>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
