import { NextResponse } from 'next/server';
import type { ChatMessage } from '@/types';
import {
  patientExists,
  getChatHistory,
  addChatMessage,
  clearChatHistory,
} from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string }> };

// Get chat history
export async function GET(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    if (!(await patientExists(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(await getChatHistory(patientId));
  } catch (error: unknown) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

// Append a chat message
export async function POST(request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const message = (await request.json().catch(() => null)) as ChatMessage | null;
    if (!message) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await addChatMessage(patientId, message))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Chat message added successfully' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Add chat message error:', error);
    return NextResponse.json(
      { error: 'Failed to add chat message' },
      { status: 500 }
    );
  }
}

// Clear chat history
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    if (!(await clearChatHistory(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Chat history cleared successfully' });
  } catch (error: unknown) {
    console.error('Clear chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
