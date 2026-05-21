import { useState } from 'react';
import { useAddTreatment, useUpdateTreatment, useDeleteTreatment, useLogOutcome, useUpdateOutcome, useDeleteOutcome } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Pill, ClipboardCheck, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient, Treatment, Outcome } from '../types';

interface TreatmentHistoryPanelProps {
  patient: Patient;
}

export default function TreatmentHistoryPanel({ patient }: TreatmentHistoryPanelProps) {
  const userId = 'current-user'; // This will be replaced by actual user ID from auth
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [isEditTreatmentOpen, setIsEditTreatmentOpen] = useState(false);
  const [isDeleteTreatmentOpen, setIsDeleteTreatmentOpen] = useState(false);
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);
  const [isEditOutcomeOpen, setIsEditOutcomeOpen] = useState(false);
  const [isDeleteOutcomeOpen, setIsDeleteOutcomeOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [newTreatment, setNewTreatment] = useState({
    description: '',
    method: '',
  });
  const [editTreatment, setEditTreatment] = useState({
    description: '',
    method: '',
  });
  const [newOutcome, setNewOutcome] = useState({
    result: '',
    metrics: '',
  });
  const [editOutcome, setEditOutcome] = useState({
    result: '',
    metrics: '',
  });
  const addTreatment = useAddTreatment();
  const updateTreatment = useUpdateTreatment();
  const deleteTreatment = useDeleteTreatment();
  const logOutcome = useLogOutcome();
  const updateOutcome = useUpdateOutcome();
  const deleteOutcome = useDeleteOutcome();

  const handleTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const treatment: Treatment = {
        treatmentId: `treat_${Date.now()}`,
        date: Date.now(),
        description: newTreatment.description,
        method: newTreatment.method,
        doctorId: userId,
      };
      await addTreatment.mutateAsync({ patientId: patient.patientId, treatment });
      toast.success('Treatment added successfully');
      setNewTreatment({ description: '', method: '' });
      setIsTreatmentOpen(false);
    } catch (error) {
      toast.error('Failed to add treatment');
      console.error(error);
    }
  };

  const handleEditTreatmentClick = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setEditTreatment({
      description: treatment.description,
      method: treatment.method,
    });
    setIsEditTreatmentOpen(true);
  };

  const handleEditTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment) return;

    try {
      const updatedTreatment: Treatment = {
        ...selectedTreatment,
        description: editTreatment.description,
        method: editTreatment.method,
      };
      await updateTreatment.mutateAsync({
        patientId: patient.patientId,
        treatmentId: selectedTreatment.treatmentId,
        updatedTreatment,
      });
      toast.success('Treatment updated successfully');
      setIsEditTreatmentOpen(false);
      setSelectedTreatment(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to update treatments');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to update treatment');
      }
      console.error(error);
    }
  };

  const handleDeleteTreatmentClick = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setIsDeleteTreatmentOpen(true);
  };

  const handleDeleteTreatmentConfirm = async () => {
    if (!selectedTreatment) return;

    try {
      await deleteTreatment.mutateAsync({
        patientId: patient.patientId,
        treatmentId: selectedTreatment.treatmentId,
      });
      toast.success('Treatment and associated outcomes deleted successfully');
      setIsDeleteTreatmentOpen(false);
      setSelectedTreatment(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to delete treatments');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to delete treatment');
      }
      console.error(error);
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const outcome: Outcome = {
        outcomeId: `out_${Date.now()}`,
        treatmentId: selectedTreatmentId,
        date: Date.now(),
        result: newOutcome.result,
        metrics: newOutcome.metrics,
      };
      await logOutcome.mutateAsync({ patientId: patient.patientId, outcome });
      toast.success('Outcome logged successfully');
      setNewOutcome({ result: '', metrics: '' });
      setIsOutcomeOpen(false);
    } catch (error) {
      toast.error('Failed to log outcome');
      console.error(error);
    }
  };

  const handleEditOutcomeClick = (outcome: Outcome) => {
    setSelectedOutcome(outcome);
    setEditOutcome({
      result: outcome.result,
      metrics: outcome.metrics,
    });
    setIsEditOutcomeOpen(true);
  };

  const handleEditOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutcome) return;

    try {
      const updatedOutcome: Outcome = {
        ...selectedOutcome,
        result: editOutcome.result,
        metrics: editOutcome.metrics,
      };
      await updateOutcome.mutateAsync({
        patientId: patient.patientId,
        outcomeId: selectedOutcome.outcomeId,
        updatedOutcome,
      });
      toast.success('Outcome updated successfully');
      setIsEditOutcomeOpen(false);
      setSelectedOutcome(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to update outcomes');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to update outcome');
      }
      console.error(error);
    }
  };

  const handleDeleteOutcomeClick = (outcome: Outcome) => {
    setSelectedOutcome(outcome);
    setIsDeleteOutcomeOpen(true);
  };

  const handleDeleteOutcomeConfirm = async () => {
    if (!selectedOutcome) return;

    try {
      await deleteOutcome.mutateAsync({
        patientId: patient.patientId,
        outcomeId: selectedOutcome.outcomeId,
      });
      toast.success('Outcome deleted successfully');
      setIsDeleteOutcomeOpen(false);
      setSelectedOutcome(null);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to delete outcomes');
      } else if (errorMessage.includes('NOT_FOUND')) {
        toast.error('Patient not found');
      } else {
        toast.error('Failed to delete outcome');
      }
      console.error(error);
    }
  };

  const sortedTreatments = [...patient.treatments].sort((a, b) => b.date - a.date);
  const sortedOutcomes = [...patient.outcomes].sort((a, b) => b.date - a.date);

  const getOutcomeCountForTreatment = (treatmentId: string) => {
    return patient.outcomes.filter((o) => o.treatmentId === treatmentId).length;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Treatment & Outcome History</h3>
          <p className="text-sm text-muted-foreground">Track treatments and their outcomes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTreatmentOpen} onOpenChange={setIsTreatmentOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Treatment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Treatment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTreatmentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Treatment description"
                    value={newTreatment.description}
                    onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <Textarea
                    id="method"
                    placeholder="Treatment method and details"
                    value={newTreatment.method}
                    onChange={(e) => setNewTreatment({ ...newTreatment, method: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addTreatment.isPending}>
                  {addTreatment.isPending ? 'Adding...' : 'Add Treatment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOutcomeOpen} onOpenChange={setIsOutcomeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Log Outcome
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Treatment Outcome</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleOutcomeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentId">Treatment</Label>
                  <select
                    id="treatmentId"
                    value={selectedTreatmentId}
                    onChange={(e) => setSelectedTreatmentId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select a treatment</option>
                    {sortedTreatments.map((treatment) => (
                      <option key={treatment.treatmentId} value={treatment.treatmentId}>
                        {treatment.description} -{' '}
                        {new Date(Number(treatment.date)).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="result">Result</Label>
                  <Textarea
                    id="result"
                    placeholder="Treatment outcome and observations"
                    value={newOutcome.result}
                    onChange={(e) => setNewOutcome({ ...newOutcome, result: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metrics">Metrics</Label>
                  <Textarea
                    id="metrics"
                    placeholder="Lab values, organ metrics, etc."
                    value={newOutcome.metrics}
                    onChange={(e) => setNewOutcome({ ...newOutcome, metrics: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={logOutcome.isPending}>
                  {logOutcome.isPending ? 'Logging...' : 'Log Outcome'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="treatments">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="treatments">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {sortedTreatments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Pill className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No treatments recorded</p>
                  </CardContent>
                </Card>
              ) : (
                sortedTreatments.map((treatment) => (
                  <Card key={treatment.treatmentId}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{treatment.description}</CardTitle>
                          <CardDescription>
                            {new Date(Number(treatment.date)).toLocaleDateString('en-US', {
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
                            <DropdownMenuItem onClick={() => handleEditTreatmentClick(treatment)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTreatmentClick(treatment)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground">{treatment.method}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="outcomes">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {sortedOutcomes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No outcomes recorded</p>
                  </CardContent>
                </Card>
              ) : (
                sortedOutcomes.map((outcome) => {
                  const treatment = patient.treatments.find((t) => t.treatmentId === outcome.treatmentId);
                  return (
                    <Card key={outcome.outcomeId}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {treatment?.description || 'Unknown Treatment'}
                            </CardTitle>
                            <CardDescription>
                              {new Date(Number(outcome.date)).toLocaleDateString('en-US', {
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
                              <DropdownMenuItem onClick={() => handleEditOutcomeClick(outcome)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteOutcomeClick(outcome)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Result</p>
                          <p className="text-sm">{outcome.result}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Metrics</p>
                          <p className="text-sm">{outcome.metrics}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Treatment Dialog */}
      <Dialog open={isEditTreatmentOpen} onOpenChange={setIsEditTreatmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Treatment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTreatmentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-treatment-description">Description</Label>
              <Input
                id="edit-treatment-description"
                placeholder="Treatment description"
                value={editTreatment.description}
                onChange={(e) => setEditTreatment({ ...editTreatment, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-treatment-method">Method</Label>
              <Textarea
                id="edit-treatment-method"
                placeholder="Treatment method and details"
                value={editTreatment.method}
                onChange={(e) => setEditTreatment({ ...editTreatment, method: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditTreatmentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateTreatment.isPending}>
                {updateTreatment.isPending ? 'Updating...' : 'Update Treatment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Treatment Confirmation Dialog */}
      <AlertDialog open={isDeleteTreatmentOpen} onOpenChange={setIsDeleteTreatmentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this treatment? This action cannot be undone.
              {selectedTreatment && (
                <>
                  <div className="mt-2 rounded-md bg-muted p-2">
                    <p className="font-medium">{selectedTreatment.description}</p>
                  </div>
                  {getOutcomeCountForTreatment(selectedTreatment.treatmentId) > 0 && (
                    <div className="mt-2 rounded-md bg-destructive/10 p-2 text-destructive">
                      <p className="text-sm font-medium">
                        Warning: This will also delete {getOutcomeCountForTreatment(selectedTreatment.treatmentId)} associated outcome(s).
                      </p>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTreatmentConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteTreatment.isPending}>
              {deleteTreatment.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Outcome Dialog */}
      <Dialog open={isEditOutcomeOpen} onOpenChange={setIsEditOutcomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Outcome</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditOutcomeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-outcome-result">Result</Label>
              <Textarea
                id="edit-outcome-result"
                placeholder="Treatment outcome and observations"
                value={editOutcome.result}
                onChange={(e) => setEditOutcome({ ...editOutcome, result: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-outcome-metrics">Metrics</Label>
              <Textarea
                id="edit-outcome-metrics"
                placeholder="Lab values, organ metrics, etc."
                value={editOutcome.metrics}
                onChange={(e) => setEditOutcome({ ...editOutcome, metrics: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOutcomeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateOutcome.isPending}>
                {updateOutcome.isPending ? 'Updating...' : 'Update Outcome'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Outcome Confirmation Dialog */}
      <AlertDialog open={isDeleteOutcomeOpen} onOpenChange={setIsDeleteOutcomeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this outcome? This action cannot be undone.
              {selectedOutcome && (
                <div className="mt-2 rounded-md bg-muted p-2">
                  <p className="text-xs font-medium text-muted-foreground">Result</p>
                  <p className="text-sm">{selectedOutcome.result}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOutcomeConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteOutcome.isPending}>
              {deleteOutcome.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
