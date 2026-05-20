'use client';

import { useParams } from 'next/navigation';
import PatientDashboard from '@/components/PatientDashboard';

/**
 * Patient route ("/patients/[patientId]"). The id comes from the URL, so the
 * page is deep-linkable and survives a refresh. useParams returns the decoded
 * segment value.
 */
export default function PatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  return <PatientDashboard patientId={patientId} />;
}
