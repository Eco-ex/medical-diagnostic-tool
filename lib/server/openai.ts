import axios from 'axios';
import { Patient } from '../../types';

function escapeJson(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\b/g, '\\b')
    .replace(/\f/g, '\\f');
}

function buildPatientContext(patient: Patient): string {
  const vitals = patient.currentStatus;
  const medicalRecords = patient.medicalRecords
    .map((record) => `${record.description}: ${record.details}`)
    .join(', ');

  const treatments = patient.treatments
    .map((treatment) => `${treatment.description} (${treatment.method})`)
    .join(', ');

  const outcomes = patient.outcomes
    .map((outcome) => `${outcome.result} (${outcome.metrics})`)
    .join(', ');

  const reasonForVisit = patient.reasonForVisit || '';
  const patientReport = patient.patientReport || '';

  return `Patient Information:
Name: ${patient.name}
Age: ${patient.age}
Sex: ${patient.sex}
Vitals: Heart Rate ${vitals.heartRate}, Blood Pressure ${vitals.bloodPressure}, Temperature ${vitals.temperature}, Respiratory Rate ${vitals.respiratoryRate}, Oxygen Saturation ${vitals.oxygenSaturation}
Medical Records: ${medicalRecords}
Treatments: ${treatments}
Outcomes: ${outcomes}
Reason for Visit: ${reasonForVisit}
Patient Report: ${patientReport}
`;
}

function removeMarkdownFormatting(input: string): string {
  return input
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '');
}

export async function analyzeTreatmentWithOpenAI(
  apiKey: string,
  patient: Patient,
  treatmentDescription: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set your key in Admin Settings.');
  }

  const openAiUrl = 'https://api.openai.com/v1/chat/completions';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const patientContext = buildPatientContext(patient);
  const escapedTreatmentDescription = escapeJson(treatmentDescription);
  const escapedPatientContext = escapeJson(patientContext);

  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content:
          "You are a clinical decision support system. Focus on providing the probability of specific outcomes occurring based on the patient's historical records and relevant scientific literature. Always include reference links and citations for all information provided in your analysis.",
      },
      {
        role: 'user',
        content: `Analyze the following treatment for patient ${patient.patientId}: ${escapedTreatmentDescription}. Provide the probability of success and potential risks based on historical data and scientific literature. Include reference links and citations for all information provided.\n\n${escapedPatientContext}`,
      },
    ],
    max_tokens: 500,
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post(openAiUrl, requestBody, {
        headers,
        timeout: 30000,
      });

      if (response.data?.choices?.[0]?.message?.content) {
        const content = response.data.choices[0].message.content;
        return removeMarkdownFormatting(content);
      }

      throw new Error('Unexpected response format from OpenAI');
    } catch (error: unknown) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401 || status === 403) {
          throw new Error('Authentication failed. Please check your OpenAI API key and permissions.');
        }

        if (status === 404) {
          throw new Error('OpenAI endpoint not found. Please verify the OpenAI API configuration.');
        }

        if (status === 429) {
          throw new Error('API rate limit exceeded. Please wait a moment and try again.');
        }

        if (status && status >= 500) {
          if (attempt >= maxRetries) {
            throw new Error('OpenAI service is currently unavailable. Please try again later.');
          }
          continue;
        }
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        if (attempt >= maxRetries) {
          throw new Error(`OpenAI request timed out after ${maxRetries} attempts. Please try again later.`);
        }
        continue;
      }

      throw new Error(`Failed to analyze treatment with OpenAI: ${errorMessage}`);
    }
  }

  throw new Error('Unexpected error: OpenAI request failed after multiple attempts.');
}
