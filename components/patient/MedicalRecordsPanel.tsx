import { useState } from 'react';
import { useAddMedicalRecord, useUpdateMedicalRecord, useDeleteMedicalRecord } from '../../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, FileText, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient, MedicalRecord } from '../../types';

interface MedicalRecordsPanelProps {
  patient: Patient;
}

export default function MedicalRecordsPanel({ patient }: MedicalRecordsPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [newRecord, setNewRecord] = useState({
    description: '',
    details: '',
  });
  const [editRecord, setEditRecord] = useState({
    description: '',
    details: '',
  });
  const addRecord = useAddMedicalRecord();
  const updateRecord = useUpdateMedicalRecord();
  const deleteRecord = useDeleteMedicalRecord();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const record: MedicalRecord = {
        recordId: `rec_${Date.now()}`,
        date: Date.now(),
        description: newRecord.description,
        details: newRecord.details,
      };
      await addRecord.mutateAsync({ patientId: patient.patientId, record });
      toast.success('Medical record added successfully');
      setNewRecord({ description: '', details: '' });
      setIsAddOpen(false);
    } catch (error) {
      toast.error('Failed to add medical record');
      console.error(error);
    }
  };

  const handleEditClick = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setEditRecord({
      description: record.description,
      details: record.details,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      const updatedRecord: MedicalRecord = {
        ...selectedRecord,
        description: editRecord.description,
        details: editRecord.details,
      };
      await updateRecord.mutateAsync({
        patientId: patient.patientId,
        recordId: selectedRecord.recordId,
        updatedRecord,
      });
      toast.success('Medical record updated successfully');
      setIsEditOpen(false);
      setSelectedRecord(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to update medical records');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to update medical record');
      }
      console.error(error);
    }
  };

  const handleDeleteClick = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecord) return;

    try {
      await deleteRecord.mutateAsync({
        patientId: patient.patientId,
        recordId: selectedRecord.recordId,
      });
      toast.success('Medical record deleted successfully');
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to delete medical records');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to delete medical record');
      }
      console.error(error);
    }
  };

  const filteredRecords = patient.medicalRecords.filter(
    (record) =>
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRecords = [...filteredRecords].sort((a, b) => b.date - a.date);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medical Records</h3>
          <p className="text-sm text-muted-foreground">Patient medical history and documentation</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description"
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  placeholder="Detailed medical information"
                  value={newRecord.details}
                  onChange={(e) => setNewRecord({ ...newRecord, details: e.target.value })}
                  rows={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={addRecord.isPending}>
                {addRecord.isPending ? 'Adding...' : 'Add Record'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search medical records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {sortedRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No records found' : 'No medical records available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedRecords.map((record) => (
              <Card key={record.recordId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{record.description}</CardTitle>
                      <CardDescription>
                        {new Date(Number(record.date)).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(record)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(record)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{record.details}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Medical Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Brief description"
                value={editRecord.description}
                onChange={(e) => setEditRecord({ ...editRecord, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-details">Details</Label>
              <Textarea
                id="edit-details"
                placeholder="Detailed medical information"
                value={editRecord.details}
                onChange={(e) => setEditRecord({ ...editRecord, details: e.target.value })}
                rows={6}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateRecord.isPending}>
                {updateRecord.isPending ? 'Updating...' : 'Update Record'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical record? This action cannot be undone.
            </AlertDialogDescription>
            {selectedRecord && (
              <div className="mt-2 rounded-md bg-muted p-2">
                <p className="font-medium">{selectedRecord.description}</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteRecord.isPending}>
              {deleteRecord.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
