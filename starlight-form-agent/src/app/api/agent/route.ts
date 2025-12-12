import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid module-level errors
async function getAgentFunctions() {
  const { createAgentContext, runAgentLoop, cleanup } = await import('@/lib/agent-loop');
  return { createAgentContext, runAgentLoop, cleanup };
}

// Store agent contexts in memory (in production, use Redis or similar)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentContexts = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const { createAgentContext, runAgentLoop } = await getAgentFunctions();

    // Get or create agent context for this session
    let context = sessionId ? agentContexts.get(sessionId) : undefined;
    if (!context) {
      context = createAgentContext();
      const newSessionId = sessionId || `session_${Date.now()}`;
      agentContexts.set(newSessionId, context);
    }

    // Run the agent loop
    const result = await runAgentLoop(message, context);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      sessionId: sessionId || `session_${Date.now()}`,
    });
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cleanup endpoint
export async function DELETE() {
  try {
    const { cleanup } = await getAgentFunctions();
    await cleanup();
    agentContexts.clear();
    return NextResponse.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}

