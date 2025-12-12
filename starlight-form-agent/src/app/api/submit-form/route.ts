import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid module-level errors
async function getAgentFunctions() {
  const { createAgentContext, runAgentLoop, cleanup } = await import('@/lib/agent-loop');
  return { createAgentContext, runAgentLoop, cleanup };
}

export async function POST(request: NextRequest) {
  let cleanupFn: (() => Promise<void>) | null = null;
  
  try {
    const body = await request.json();
    const { carerCode, formData, submitType } = body;

    if (!carerCode) {
      return NextResponse.json(
        { success: false, error: 'Carer code is required' },
        { status: 400 }
      );
    }

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    const { createAgentContext, runAgentLoop, cleanup } = await getAgentFunctions();
    cleanupFn = cleanup;

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

    // Step 2: Select the carer
    console.log(`Agent: Selecting carer ${carerCode}...`);
    const selectCarerResult = await runAgentLoop(
      `Navigate to the Foster Carer > Carer List, find the carer with code "${carerCode}", and click their Select button.`,
      context,
      10
    );
    
    if (!selectCarerResult.success) {
      await cleanup();
      return NextResponse.json(
        { success: false, error: selectCarerResult.error || `Failed to select carer ${carerCode}` },
        { status: 500 }
      );
    }

    // Step 3: Navigate to the Supervisory Home Visit form
    console.log('Agent: Navigating to Supervisory Home Visit form...');
    const navigateResult = await runAgentLoop(
      'Navigate to the Supervisory Home Visit form. Look for it in the menu or sidebar. Once found, click "Add" to create a new form entry.',
      context,
      10
    );
    
    if (!navigateResult.success) {
      await cleanup();
      return NextResponse.json(
        { success: false, error: navigateResult.error || 'Failed to navigate to form' },
        { status: 500 }
      );
    }

    // Step 4: Fill the form with the provided data
    console.log('Agent: Filling form...');
    const formDataDescription = Object.entries(formData)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
    
    const fillResult = await runAgentLoop(
      `Fill the Supervisory Home Visit form with the following data: ${formDataDescription}. 
       Make sure to select the correct values for dropdowns, check the appropriate checkboxes, 
       and fill in the text areas. If the form has multiple sections (like Section A and Section B), 
       navigate between them as needed.`,
      context,
      15
    );
    
    if (!fillResult.success) {
      await cleanup();
      return NextResponse.json(
        { success: false, error: fillResult.error || 'Failed to fill form' },
        { status: 500 }
      );
    }

    // Step 5: Submit the form
    const submitAction = submitType === 'submit' ? 'Submit' : 
                         submitType === 'submitAndLock' ? 'Submit & Lock' : 
                         'Save as Draft';
    
    console.log(`Agent: Submitting form (${submitAction})...`);
    const submitResult = await runAgentLoop(
      `Click the "${submitAction}" button to ${submitType === 'draft' ? 'save the form as a draft' : 'submit the form'}. 
       Wait for confirmation that the action was successful.`,
      context,
      5
    );

    // Cleanup browser resources
    await cleanup();

    if (!submitResult.success) {
      return NextResponse.json(
        { success: false, error: submitResult.error || 'Failed to submit form' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Form submitted successfully via agent',
        submittedAt: new Date().toISOString(),
        carerCode,
        submitType: submitType || 'draft',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    if (cleanupFn) {
      await cleanupFn();
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

