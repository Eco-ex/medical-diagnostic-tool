'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Search, User, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddPatientModal from './AddPatientModal';
import EditPatientModal from './EditPatientModal';
import { useGetAllPatients, useDeletePatient } from '../../hooks/useQueries';
import { toast } from 'sonner';
import type { Patient } from '../../types';

function patientHref(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}`;
}

export default function PatientList() {
  const router = useRouter();
  // On "/patients/[patientId]" this yields the open patient; on "/" it is empty.
  const params = useParams<{ patientId?: string }>();
  const selectedPatientId = params?.patientId ?? null;

  const { data: patients = [], isLoading } = useGetAllPatients();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const deletePatientMutation = useDeletePatient();

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePatientAdded = (patientId: string) => {
    router.push(patientHref(patientId));
  };

  const handlePatientUpdated = (newPatientId: string) => {
    router.push(patientHref(newPatientId));
  };

  const handleEditClick = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToEdit(patient);
    setShowEditPatientModal(true);
  };

  const handleDeleteClick = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientToDelete(patient);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;

    try {
      await deletePatientMutation.mutateAsync(patientToDelete.patientId);
      toast.success('Patient deleted successfully');

      // If the deleted patient is the one currently open, return to the home view.
      if (selectedPatientId === patientToDelete.patientId) {
        router.push('/');
      }

      setShowDeleteDialog(false);
      setPatientToDelete(null);
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

  return (
    <>
      <aside className="w-80 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Patients</h2>
              <Button
                size="sm"
                onClick={() => setShowAddPatientModal(true)}
                className="h-8 gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchTerm ? 'No patients found' : 'No patients available'}
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.patientId}
                    className={cn(
                      'group relative w-full rounded-lg transition-colors hover:bg-accent',
                      selectedPatientId === patient.patientId && 'bg-accent'
                    )}
                  >
                    <Link
                      href={patientHref(patient.patientId)}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">{patient.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          ID: {patient.patientId}
                        </p>
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEditClick(patient, e)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Patient
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(patient, e)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Patient
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <AddPatientModal
        open={showAddPatientModal}
        onOpenChange={setShowAddPatientModal}
        onPatientAdded={handlePatientAdded}
      />

      {patientToEdit && (
        <EditPatientModal
          open={showEditPatientModal}
          onOpenChange={setShowEditPatientModal}
          patient={patientToEdit}
          onPatientUpdated={handlePatientUpdated}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{patientToDelete?.name}</strong>? This action cannot be undone and will permanently remove all patient data including medical records, treatments, and chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPatientToDelete(null)}>
              Cancel
            </AlertDialogCancel>
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
