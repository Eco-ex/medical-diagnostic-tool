import axios from 'axios';
import type { Patient } from '../../types';

export const ANALYSIS_MODEL = 'gpt-3.5-turbo';
export const ANALYSIS_PARAMS = { max_tokens: 500 } as const;

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAiResult {
  text: string; // markdown-stripped content shown to the user
  model: string | null;
  finishReason: string | null;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
  raw: unknown; // the full OpenAI response body
}

/** Error carrying the upstream HTTP status, so it can be recorded. */
export class OpenAiError extends Error {
  httpStatus: number | null;
  constructor(message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'OpenAiError';
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

/**
 * Builds the exact messages array sent to OpenAI. Exported so the route can
 * record it in the audit log whether the call succeeds or fails.
 */
export function buildAnalysisMessages(
  patient: Patient,
  treatmentDescription: string
): OpenAiMessage[] {
  return [
    {
      role: 'system',
      content:
        "You are a clinical decision support system. Focus on providing the probability of specific outcomes occurring based on the patient's historical records and relevant scientific literature. Always include reference links and citations for all information provided in your analysis.",
    },
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

/**
 * Calls OpenAI chat completions. Returns a rich result on success; throws
 * OpenAiError on failure.
 *
 * Note: the previous implementation hand-escaped the JSON with `escapeJson`
 * before handing the object to axios — which serializes to JSON itself. That
 * double-escaped the content. The manual step is dropped here.
 */
export async function callOpenAi(
  apiKey: string,
  messages: OpenAiMessage[],
  params: Record<string, unknown> = ANALYSIS_PARAMS
): Promise<OpenAiResult> {
  if (!apiKey) {
    throw new OpenAiError(
      'OpenAI API key is not configured. Please set your key in Admin Settings.'
    );
  }

  const url = 'https://api.openai.com/v1/chat/completions';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = { model: ANALYSIS_MODEL, messages, ...params };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post(url, body, { headers, timeout: 30000 });
      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenAiError('Unexpected response format from OpenAI');
      }
      return {
        text: removeMarkdownFormatting(content),
        model: response.data?.model ?? null,
        finishReason: response.data?.choices?.[0]?.finish_reason ?? null,
        usage: response.data?.usage ?? null,
        raw: response.data,
      };
    } catch (error: unknown) {
      attempt++;
      if (error instanceof OpenAiError) throw error;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? null;
        if (status === 401 || status === 403) {
          throw new OpenAiError(
            'Authentication failed. Please check your OpenAI API key and permissions.',
            status
          );
        }
        if (status === 404) {
          throw new OpenAiError(
            'OpenAI endpoint not found. Please verify the OpenAI API configuration.',
            status
          );
        }
        if (status === 429) {
          throw new OpenAiError(
            'API rate limit exceeded. Please wait a moment and try again.',
            status
          );
        }
        if (status && status >= 500) {
          if (attempt >= maxRetries) {
            throw new OpenAiError(
              'OpenAI service is currently unavailable. Please try again later.',
              status
            );
          }
          continue;
        }
      }

      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
        if (attempt >= maxRetries) {
          throw new OpenAiError(
            `OpenAI request timed out after ${maxRetries} attempts. Please try again later.`
          );
        }
        continue;
      }
      throw new OpenAiError(`Failed to analyze treatment with OpenAI: ${msg}`);
    }
  }
  throw new OpenAiError(
    'Unexpected error: OpenAI request failed after multiple attempts.'
  );
}
