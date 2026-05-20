import { NextResponse } from 'next/server';
import type { ChatMessage } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string }> };

// Get chat history
export async function GET(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(patient.chatHistory);
  } catch (error: unknown) {
    console.error('Get chat history error:', error);
    return NextResponse.json({ error: 'Failed to get chat history' }, { status: 500 });
  }
}

// Append a chat message
export async function POST(request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const message = (await request.json().catch(() => null)) as ChatMessage | null;
    if (!message) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    patient.chatHistory.push(message);
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Chat message added successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Add chat message error:', error);
    return NextResponse.json({ error: 'Failed to add chat message' }, { status: 500 });
  }
}

// Clear chat history
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    patient.chatHistory = [];
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Chat history cleared successfully' });
  } catch (error: unknown) {
    console.error('Clear chat history error:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}
