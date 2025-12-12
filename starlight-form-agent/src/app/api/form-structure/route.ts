import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid module-level errors
async function getAgentFunctions() {
  const { directLogin, directGetFormStructure } = await import('@/lib/agent-loop');
  return { directLogin, directGetFormStructure };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const carerCode = searchParams.get('carerCode');

  if (!carerCode) {
    return NextResponse.json(
      { success: false, error: 'Carer code is required' },
      { status: 400 }
    );
  }

  try {
    const { directLogin, directGetFormStructure } = await getAgentFunctions();
    
    // First, login to the portal
    const loginResult = await directLogin();
    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to login to portal' },
        { status: 401 }
      );
    }

    // Get the form structure
    const formResult = await directGetFormStructure(carerCode);
    
    if (!formResult.success) {
      return NextResponse.json(
        { success: false, error: formResult.error || 'Failed to get form structure' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formResult.data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

