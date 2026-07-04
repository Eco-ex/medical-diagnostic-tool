/**
 * Home route ("/"). Shown when no patient is selected; choosing a patient
 * from the sidebar navigates to /patients/[patientId].
 */
export default function Home() {
  return (
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
  );
}
