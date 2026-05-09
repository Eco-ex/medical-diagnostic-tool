import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdatePatient } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Patient } from '../backend';

interface EditPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onPatientUpdated?: (patientId: string) => void;
}

export default function EditPatientModal({ open, onOpenChange, patient, onPatientUpdated }: EditPatientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    patientId: '',
    age: '',
    sex: '',
    occupation: '',
    allergies: '',
  });

  const updatePatientMutation = useUpdatePatient();

  // Pre-populate form with patient data when modal opens
  useEffect(() => {
    if (open && patient) {
      setFormData({
        name: patient.name,
        patientId: patient.patientId,
        age: patient.age.toString(),
        sex: patient.sex,
        occupation: patient.occupation || '',
        allergies: patient.allergies || '',
      });
    }
  }, [open, patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (!formData.patientId.trim()) {
      toast.error('Patient ID is required');
      return;
    }
    if (!formData.age || parseInt(formData.age) <= 0) {
      toast.error('Valid age is required');
      return;
    }
    if (!formData.sex) {
      toast.error('Sex is required');
      return;
    }

    const updatedPatient: Patient = {
      ...patient,
      name: formData.name.trim(),
      patientId: formData.patientId.trim(),
      age: BigInt(parseInt(formData.age)),
      sex: formData.sex,
      occupation: formData.occupation.trim() || undefined,
      allergies: formData.allergies.trim() || undefined,
    };

    try {
      const newPatientId = await updatePatientMutation.mutateAsync({
        patientId: patient.patientId,
        updatedPatient,
      });
      toast.success('Patient updated successfully');
      
      // Close modal
      onOpenChange(false);
      
      // Notify parent component
      if (onPatientUpdated) {
        onPatientUpdated(newPatientId);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('DUPLICATE_PATIENT_ID')) {
        toast.error('Patient ID already exists. Please use a unique patient ID.');
      } else if (errorMessage.includes('VALIDATION_ERROR')) {
        toast.error('Please fill in all required fields.');
      } else if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to update patients.');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found. The patient may have been deleted.');
      } else {
        toast.error('Failed to update patient. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update the patient's information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Patient Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter patient's full name"
              disabled={updatePatientMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientId">
              Patient ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="patientId"
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              placeholder="e.g., 62C-109-77D"
              disabled={updatePatientMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">
                Age <span className="text-destructive">*</span>
              </Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="150"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Enter age"
                disabled={updatePatientMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">
                Sex <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.sex}
                onValueChange={(value) => setFormData({ ...formData, sex: value })}
                disabled={updatePatientMutation.isPending}
              >
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              placeholder="Enter occupation (optional)"
              disabled={updatePatientMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="List any known allergies (optional)"
              rows={3}
              disabled={updatePatientMutation.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updatePatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePatientMutation.isPending}>
              {updatePatientMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Patient...
                </>
              ) : (
                'Update Patient'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
