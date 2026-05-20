import { useState } from 'react';
import { useUpdateSummary } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient } from '../types';

interface SummaryPanelProps {
  patient: Patient;
}

export default function SummaryPanel({ patient }: SummaryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reasonForVisit, setReasonForVisit] = useState(patient.reasonForVisit || '');
  const [patientReport, setPatientReport] = useState(patient.patientReport || '');
  const [shownPatientId, setShownPatientId] = useState(patient.patientId);
  const updateSummary = useUpdateSummary();

  // Re-sync the editable fields when a different patient is shown. Done during
  // render (React's documented pattern for adjusting state on prop change)
  // instead of in an effect, which avoids an extra render pass.
  if (patient.patientId !== shownPatientId) {
    setShownPatientId(patient.patientId);
    setReasonForVisit(patient.reasonForVisit || '');
    setPatientReport(patient.patientReport || '');
  }

  const handleSave = async () => {
    try {
      await updateSummary.mutateAsync({
        patientId: patient.patientId,
        reasonForVisit,
        patientReport,
      });
      toast.success('Summary updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to update patient summary.');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found. The patient may have been deleted.');
      } else {
        toast.error('Failed to update summary. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setReasonForVisit(patient.reasonForVisit || '');
    setPatientReport(patient.patientReport || '');
    setIsEditing(false);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Patient Summary</h3>
          <p className="text-sm text-muted-foreground">Visit reason and patient assessment</p>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
            Edit Summary
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reason for Visit</CardTitle>
            <CardDescription>Primary reason for the patient&apos;s current visit</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Input
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="Enter reason for visit"
                disabled={updateSummary.isPending}
              />
            ) : (
              <p className="text-sm">
                {patient.reasonForVisit || (
                  <span className="text-muted-foreground italic">No reason for visit recorded</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient Report</CardTitle>
            <CardDescription>Comprehensive patient assessment and notes</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={patientReport}
                onChange={(e) => setPatientReport(e.target.value)}
                placeholder="Enter patient report and assessment notes"
                rows={10}
                disabled={updateSummary.isPending}
                className="resize-none"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm">
                {patient.patientReport || (
                  <span className="text-muted-foreground italic">No patient report recorded</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateSummary.isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSummary.isPending}
              className="gap-2"
            >
              {updateSummary.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Summary
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
