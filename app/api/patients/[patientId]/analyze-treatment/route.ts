import { NextResponse } from 'next/server';
import type { AnalyzeTreatmentRequest } from '@/types';
import { getPatient } from '@/lib/server/database';
import { analyzeTreatmentWithOpenAI } from '@/lib/server/openai';
import { extractOpenAiKey } from '@/lib/server/openai-key';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

// AI Analysis — the OpenAI key is supplied per-request via the X-OpenAI-Key
// header and is never persisted server-side.
//
// This route is a proxy to OpenAI under a caller-supplied key. Without a limit,
// anyone reachable on the network could use it to anonymize their own OpenAI
// traffic through our IP, so it is rate-limited per IP (10 req/min).
export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    if (!rateLimit(`analyze:${clientKey(request)}`, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many analysis requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as AnalyzeTreatmentRequest | null;
    if (!body?.treatmentDescription) {
      return NextResponse.json({ error: 'Treatment description is required' }, { status: 400 });
    }

    const apiKey = extractOpenAiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'OpenAI API key is missing or malformed. Please set a valid key in Admin Settings.',
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeTreatmentWithOpenAI(apiKey, patient, body.treatmentDescription);
    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    console.error('Analyze treatment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze treatment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
