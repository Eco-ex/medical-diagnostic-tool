import { supabase } from './supabase';
import { patientUuid, getOrCreateActiveConversation } from './database';

export interface RecordAiInteractionInput {
  patientId: string; // the MRN
  kind?: 'treatment_analysis' | 'chat';

  // INPUT
  userQuery: string;
  patientContext: unknown;
  requestModel: string;
  requestMessages: unknown;
  requestParams?: unknown;

  // OUTPUT
  status: 'success' | 'error';
  responseText?: string | null;
  responseRaw?: unknown;
  responseModel?: string | null;
  finishReason?: string | null;

  // OBSERVABILITY
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;

  // SECURITY
  openaiKeyLast4?: string | null;
}

/**
 * Persists one OpenAI call — full input and output — to ai_interactions.
 * Returns the new row id, or null if the patient could not be resolved.
 */
export async function recordAiInteraction(
  input: RecordAiInteractionInput
): Promise<string | null> {
  const uuid = await patientUuid(input.patientId);
  if (!uuid) return null;
  const conversationId = await getOrCreateActiveConversation(uuid);

  const { data, error } = await supabase
    .from('ai_interactions')
    .insert({
      patient_id: uuid,
      conversation_id: conversationId,
      kind: input.kind ?? 'treatment_analysis',
      user_query: input.userQuery,
      patient_context: input.patientContext ?? null,
      request_model: input.requestModel,
      request_messages: input.requestMessages,
      request_params: input.requestParams ?? null,
      status: input.status,
      response_text: input.responseText ?? null,
      response_raw: input.responseRaw ?? null,
      response_model: input.responseModel ?? null,
      finish_reason: input.finishReason ?? null,
      prompt_tokens: input.promptTokens ?? null,
      completion_tokens: input.completionTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      http_status: input.httpStatus ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      openai_key_last4: input.openaiKeyLast4 ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
