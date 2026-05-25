import axios from 'axios';
import type { Patient } from '../../types';

export const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_API_VERSION = '2023-06-01';
export const ANALYSIS_PARAMS = { max_tokens: 1500 } as const;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicResult {
  text: string; // markdown-stripped content shown to the user
  model: string | null;
  finishReason: string | null;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  raw: unknown; // the full Anthropic response body
}

/** Error carrying the upstream HTTP status, so it can be recorded. */
export class AnthropicError extends Error {
  httpStatus: number | null;
  constructor(message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'AnthropicError';
    this.httpStatus = httpStatus;
  }
}

function buildPatientContext(patient: Patient): string {
  const v = patient.currentStatus;
  const medicalRecords = patient.medicalRecords
    .map((r) => `${r.description}: ${r.details}`)
    .join(', ');
  const treatments = patient.treatments
    .map((t) => `${t.description} (${t.method})`)
    .join(', ');
  const outcomes = patient.outcomes
    .map((o) => `${o.result} (${o.metrics})`)
    .join(', ');

  return `Patient Information:
Name: ${patient.name}
Age: ${patient.age}
Sex: ${patient.sex}
Vitals: Heart Rate ${v.heartRate}, Blood Pressure ${v.bloodPressure}, Temperature ${v.temperature}, Respiratory Rate ${v.respiratoryRate}, Oxygen Saturation ${v.oxygenSaturation}
Medical Records: ${medicalRecords}
Treatments: ${treatments}
Outcomes: ${outcomes}
Reason for Visit: ${patient.reasonForVisit || ''}
Patient Report: ${patient.patientReport || ''}
`;
}

function removeMarkdownFormatting(input: string): string {
  return input
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '');
}

export const ANALYSIS_SYSTEM_PROMPT =
  "You are a clinical decision support system. Focus on providing the probability of specific outcomes occurring based on the patient's historical records and relevant scientific literature. Always include reference links and citations for all information provided in your analysis.";

/**
 * Builds the exact messages array sent to Anthropic. Exported so the route can
 * record it in the audit log whether the call succeeds or fails. Anthropic's
 * Messages API takes `system` separately from `messages`, so the system prompt
 * is not part of this array — the route records it under `request_params`.
 */
export function buildAnalysisMessages(
  patient: Patient,
  treatmentDescription: string
): AnthropicMessage[] {
  return [
    {
      role: 'user',
      content:
        `Analyze the following treatment for patient ${patient.patientId}: ` +
        `${treatmentDescription}. Provide the probability of success and ` +
        `potential risks based on historical data and scientific literature. ` +
        `Include reference links and citations for all information provided.\n\n` +
        buildPatientContext(patient),
    },
  ];
}

interface AnthropicResponseBody {
  content?: Array<{ type: string; text?: string }>;
  model?: string;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface AnthropicErrorBody {
  error?: { type?: string; message?: string };
}

/** Pulls Anthropic's structured error message out of a failed axios response. */
function upstreamMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const body = error.response?.data as AnthropicErrorBody | undefined;
  const msg = body?.error?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : null;
}

function withDetail(base: string, detail: string | null): string {
  return detail ? `${base} (${detail})` : base;
}

/**
 * Calls Anthropic's Messages API. Returns a rich result on success; throws
 * AnthropicError on failure.
 */
export async function callAnthropic(
  apiKey: string,
  messages: AnthropicMessage[],
  params: Record<string, unknown> = ANALYSIS_PARAMS,
  system: string = ANALYSIS_SYSTEM_PROMPT
): Promise<AnthropicResult> {
  if (!apiKey) {
    throw new AnthropicError(
      'Anthropic API key is not configured. Please set your key in Admin Settings.'
    );
  }

  const url = 'https://api.anthropic.com/v1/messages';
  const headers = {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_API_VERSION,
    'content-type': 'application/json',
  };
  const body = { model: ANALYSIS_MODEL, system, messages, ...params };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post<AnthropicResponseBody>(url, body, {
        headers,
        timeout: 30000,
      });
      const text = response.data?.content
        ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('');
      if (!text) {
        throw new AnthropicError('Unexpected response format from Anthropic');
      }
      const inputTokens = response.data?.usage?.input_tokens;
      const outputTokens = response.data?.usage?.output_tokens;
      const totalTokens =
        typeof inputTokens === 'number' && typeof outputTokens === 'number'
          ? inputTokens + outputTokens
          : undefined;
      const stopReason = response.data?.stop_reason ?? null;
      let displayText = removeMarkdownFormatting(text);
      if (stopReason === 'max_tokens') {
        displayText +=
          '\n\n[Response truncated — the model hit the max_tokens limit. ' +
          'Consider narrowing the question for a complete answer.]';
      }
      return {
        text: displayText,
        model: response.data?.model ?? null,
        finishReason: stopReason,
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: totalTokens,
        },
        raw: response.data,
      };
    } catch (error: unknown) {
      attempt++;
      if (error instanceof AnthropicError) throw error;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? null;
        const detail = upstreamMessage(error);

        if (status === 401 || status === 403) {
          throw new AnthropicError(
            withDetail(
              'Authentication failed. Please check your Anthropic API key and permissions.',
              detail
            ),
            status
          );
        }
        if (status === 404) {
          throw new AnthropicError(
            withDetail(
              'Anthropic endpoint not found. Please verify the Anthropic API configuration.',
              detail
            ),
            status
          );
        }
        if (status === 429) {
          throw new AnthropicError(
            withDetail(
              'API rate limit exceeded. Please wait a moment and try again.',
              detail
            ),
            status
          );
        }
        if (status && status >= 500) {
          if (attempt >= maxRetries) {
            throw new AnthropicError(
              withDetail(
                'Anthropic service is currently unavailable. Please try again later.',
                detail
              ),
              status
            );
          }
          continue;
        }

        // No response = transient network error (DNS, ECONNREFUSED, ECONNRESET,
        // timeout). Retry — these are the failures the loop exists for.
        if (!error.response) {
          if (attempt >= maxRetries) {
            throw new AnthropicError(
              `Anthropic request failed after ${maxRetries} attempts: ${error.message}`
            );
          }
          continue;
        }

        // Other 4xx (400 invalid_request_error, 413 request_too_large,
        // 422 unprocessable). These are caller bugs, not transient — surface
        // Anthropic's actual reason instead of a generic message.
        if (status) {
          throw new AnthropicError(
            withDetail(`Anthropic rejected the request (HTTP ${status}).`, detail),
            status
          );
        }
      }

      const msg = error instanceof Error ? error.message : String(error);
      throw new AnthropicError(`Failed to analyze treatment with Anthropic: ${msg}`);
    }
  }
  throw new AnthropicError(
    'Unexpected error: Anthropic request failed after multiple attempts.'
  );
}
