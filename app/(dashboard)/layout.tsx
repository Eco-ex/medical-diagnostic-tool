import PatientList from '@/components/PatientList';

/**
 * Layout for the patient-facing routes ("/" and "/patients/[patientId]").
 * Adds the persistent patient sidebar; the route's page renders into <main>.
 * The /admin route sits outside this group, so it has no sidebar.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PatientList />
      <main className="flex-1 overflow-hidden bg-background">{children}</main>
    </>
  );
}
