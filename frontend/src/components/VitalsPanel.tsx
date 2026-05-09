import { useState } from 'react';
import { useUpdateVitals } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Thermometer, Wind, Droplet, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient, Vitals } from '../backend';

interface VitalsPanelProps {
  patient: Patient;
}

export default function VitalsPanel({ patient }: VitalsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vitals, setVitals] = useState<Vitals>(patient.currentStatus);
  const updateVitals = useUpdateVitals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateVitals.mutateAsync({ patientId: patient.patientId, vitals });
      toast.success('Vitals updated successfully');
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to update vitals');
      console.error(error);
    }
  };

  const vitalCards = [
    {
      icon: Heart,
      label: 'Heart Rate',
      value: `${patient.currentStatus.heartRate} bpm`,
      color: 'text-red-500',
    },
    {
      icon: Droplet,
      label: 'Blood Pressure',
      value: patient.currentStatus.bloodPressure,
      color: 'text-blue-500',
    },
    {
      icon: Thermometer,
      label: 'Temperature',
      value: `${patient.currentStatus.temperature}°C`,
      color: 'text-orange-500',
    },
    {
      icon: Wind,
      label: 'Respiratory Rate',
      value: `${patient.currentStatus.respiratoryRate} /min`,
      color: 'text-cyan-500',
    },
    {
      icon: Droplet,
      label: 'O₂ Saturation',
      value: `${patient.currentStatus.oxygenSaturation}%`,
      color: 'text-green-500',
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Current Vitals</h3>
          <p className="text-sm text-muted-foreground">Real-time patient vital signs</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Update Vitals
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Patient Vitals</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  value={vitals.heartRate.toString()}
                  onChange={(e) => setVitals({ ...vitals, heartRate: BigInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Blood Pressure</Label>
                <Input
                  id="bloodPressure"
                  placeholder="120/80"
                  value={vitals.bloodPressure}
                  onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={vitals.temperature.toString()}
                  onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  value={vitals.respiratoryRate.toString()}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: BigInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  value={vitals.oxygenSaturation.toString()}
                  onChange={(e) => setVitals({ ...vitals, oxygenSaturation: BigInt(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateVitals.isPending}>
                {updateVitals.isPending ? 'Updating...' : 'Update Vitals'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vitalCards.map((vital) => (
          <Card key={vital.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{vital.label}</CardTitle>
              <vital.icon className={`h-4 w-4 ${vital.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vital.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
