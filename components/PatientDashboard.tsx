'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetPatient, useDeletePatient } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Activity, FileText, Pill, MessageSquare, MoreVertical, Edit, Trash2, ClipboardList } from 'lucide-react';
import VitalsPanel from './VitalsPanel';
import MedicalRecordsPanel from './MedicalRecordsPanel';
import TreatmentHistoryPanel from './TreatmentHistoryPanel';
import ChatPanel from './ChatPanel';
import SummaryPanel from './SummaryPanel';
import EditPatientModal from './EditPatientModal';
import { toast } from 'sonner';
import type { PatientId } from '../types';

interface PatientDashboardProps {
  patientId: PatientId;
}

export default function PatientDashboard({ patientId }: PatientDashboardProps) {
  const router = useRouter();
  const { data: patient, isLoading } = useGetPatient(patientId);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deletePatientMutation = useDeletePatient();

  const handleConfirmDelete = async () => {
    if (!patient) return;

    try {
      await deletePatientMutation.mutateAsync(patient.patientId);
      toast.success('Patient deleted successfully');
      setShowDeleteDialog(false);

      // The patient is gone — leave the now-dead route for the home view.
      router.push('/');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to delete patients.');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found. The patient may have already been deleted.');
      } else {
        toast.error('Failed to delete patient. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-auto">
        <div className="border-b bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{patient.name}</h2>
              <p className="text-xs text-muted-foreground">Patient ID: {patient.patientId}</p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Patient
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Patient
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="vitals" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Vitals</span>
              </TabsTrigger>
              <TabsTrigger value="records" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Records</span>
              </TabsTrigger>
              <TabsTrigger value="treatments" className="gap-2">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Treatments</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">AI Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <SummaryPanel patient={patient} />
            </TabsContent>

            <TabsContent value="vitals" className="space-y-4">
              <VitalsPanel patient={patient} />
            </TabsContent>

            <TabsContent value="records" className="space-y-4">
              <MedicalRecordsPanel patient={patient} />
            </TabsContent>

            <TabsContent value="treatments" className="space-y-4">
              <TreatmentHistoryPanel patient={patient} />
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <ChatPanel patientId={patient.patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditPatientModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        patient={patient}
        onPatientUpdated={(newPatientId) => {
          // A renamed patient ID changes the URL — follow it so the route
          // stays valid instead of pointing at the old, now-missing id.
          if (newPatientId !== patient.patientId) {
            router.push(`/patients/${encodeURIComponent(newPatientId)}`);
          }
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{patient.name}</strong>? This action cannot be undone and will permanently remove all patient data including medical records, treatments, and chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePatientMutation.isPending}
            >
              {deletePatientMutation.isPending ? 'Deleting...' : 'Delete Patient'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
