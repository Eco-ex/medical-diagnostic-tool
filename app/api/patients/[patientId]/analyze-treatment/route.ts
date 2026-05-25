import { NextResponse } from 'next/server';
import type { AnalyzeTreatmentRequest } from '@/types';
import { getPatient } from '@/lib/server/database';
import {
  buildAnalysisMessages,
  callAnthropic,
  ANALYSIS_MODEL,
  ANALYSIS_PARAMS,
  ANALYSIS_SYSTEM_PROMPT,
  AnthropicError,
} from '@/lib/server/anthropic';
import {
  recordAiInteraction,
  type RecordAiInteractionInput,
} from '@/lib/server/ai-interactions';
import { extractAnthropicKey } from '@/lib/server/anthropic-key';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

/** Audit logging must never break the feature it observes. */
async function safeRecord(input: RecordAiInteractionInput): Promise<void> {
  try {
    await recordAiInteraction(input);
  } catch (e) {
    console.error('Failed to record AI interaction:', e);
  }
}

// AI Analysis — the Anthropic key is supplied per-request via the X-Anthropic-Key
// header and is never persisted server-side.
//
// This route is a proxy to Anthropic under a caller-supplied key. Without a limit,
// anyone reachable on the network could use it to anonymize their own Anthropic
// traffic through our IP, so it is rate-limited per IP (10 req/min).
//
// Every call — success or failure — is recorded to ai_interactions for clinical
// audit, debugging, and cost tracking.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
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

    const body = (await request.json().catch(() => null)) as
      | AnalyzeTreatmentRequest
      | null;
    if (!body?.treatmentDescription) {
      return NextResponse.json(
        { error: 'Treatment description is required' },
        { status: 400 }
      );
    }

    const apiKey = extractAnthropicKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Anthropic API key is missing or malformed. Please set a valid key in Admin Settings.',
        },
        { status: 400 }
      );
    }

    // Build the exact prompt up front so it is recorded either way.
    const messages = buildAnalysisMessages(patient, body.treatmentDescription);
    const patientContext = {
      patientId: patient.patientId,
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      currentStatus: patient.currentStatus,
      medicalRecords: patient.medicalRecords,
      treatments: patient.treatments,
      outcomes: patient.outcomes,
      reasonForVisit: patient.reasonForVisit,
      patientReport: patient.patientReport,
    };
    const base = {
      patientId,
      userQuery: body.treatmentDescription,
      patientContext,
      requestModel: ANALYSIS_MODEL,
      requestMessages: messages,
      // Include the system prompt so audit rows are reproducible if the prompt
      // is ever tuned. Anthropic takes `system` as a top-level field, not part
      // of `messages`, so it would otherwise vanish from the log.
      requestParams: { ...ANALYSIS_PARAMS, system: ANALYSIS_SYSTEM_PROMPT },
      anthropicKeyLast4: apiKey.slice(-4),
    };
    const startedAt = Date.now();

    try {
      const result = await callAnthropic(apiKey, messages, ANALYSIS_PARAMS);

      await safeRecord({
        ...base,
        status: 'success',
        responseText: result.text,
        responseRaw: result.raw,
        responseModel: result.model,
        finishReason: result.finishReason,
        promptTokens: result.usage?.prompt_tokens ?? null,
        completionTokens: result.usage?.completion_tokens ?? null,
        totalTokens: result.usage?.total_tokens ?? null,
        latencyMs: Date.now() - startedAt,
        httpStatus: 200,
      });

      return NextResponse.json({ analysis: result.text });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze treatment';

      await safeRecord({
        ...base,
        status: 'error',
        errorMessage: message,
        httpStatus: err instanceof AnthropicError ? err.httpStatus : null,
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Analyze treatment error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to analyze treatment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
