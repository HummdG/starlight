import { NextResponse } from 'next/server';

// Dynamic import to avoid module-level errors
async function getAgentFunctions() {
  const { createAgentContext, runAgentLoop, cleanup } = await import('@/lib/agent-loop');
  return { createAgentContext, runAgentLoop, cleanup };
}

export async function GET() {
  try {
    const { createAgentContext, runAgentLoop, cleanup } = await getAgentFunctions();
    
    // Create a fresh agent context
    const context = createAgentContext();
    
    // Step 1: Login to the portal using the agent
    console.log('Agent: Starting login...');
    const loginResult = await runAgentLoop(
      'Login to the foster care portal using the credentials.',
      context,
      5 // max iterations for login
    );
    
    if (!loginResult.success) {
      await cleanup();
      return NextResponse.json(
        { success: false, error: loginResult.error || 'Failed to login to portal' },
        { status: 401 }
      );
    }
    
    // Step 2: Get the list of carers using the agent
    console.log('Agent: Getting carers list...');
    const carersResult = await runAgentLoop(
      'Navigate to the Foster Carer > Carer List and extract all carers from the table. Return the list of carers with their code, name, area/locality, status, approval date, and username.',
      context,
      10 // max iterations
    );
    
    // Cleanup browser
    await cleanup();
    
    if (!carersResult.success) {
      return NextResponse.json(
        { success: false, error: carersResult.error || 'Failed to get carers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: carersResult.data,
    });
  } catch (error) {
    console.error('API error:', error);
    // Try to cleanup on error
    try {
      const { cleanup } = await getAgentFunctions();
      await cleanup();
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

