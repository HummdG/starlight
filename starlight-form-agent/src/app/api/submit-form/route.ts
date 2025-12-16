import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid module-level errors
async function getBrowserFunctions() {
  const { 
    login, 
    extractCarers, 
    selectCarer, 
    navigateToSupervisoryHomeVisitForm, 
    fillForm, 
    submitForm, 
    closeBrowser 
  } = await import('@/lib/browser-agent');
  return { login, extractCarers, selectCarer, navigateToSupervisoryHomeVisitForm, fillForm, submitForm, closeBrowser };
}

export async function POST(request: NextRequest) {
  let closeBrowserFn: (() => Promise<void>) | null = null;
  
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

    const { login, extractCarers, selectCarer, navigateToSupervisoryHomeVisitForm, fillForm, submitForm, closeBrowser } = await getBrowserFunctions();
    closeBrowserFn = closeBrowser;

    // Step 1: Login to the portal
    console.log('Browser: Starting login...');
    const loginSuccess = await login();
    
    if (!loginSuccess) {
      await closeBrowser();
      return NextResponse.json(
        { success: false, error: 'Failed to login to portal' },
        { status: 401 }
      );
    }
    console.log('Browser: Login successful');

    // Step 2: Navigate to carer list and extract carers
    console.log('Browser: Extracting carers...');
    const carers = await extractCarers();
    
    if (carers.length === 0) {
      await closeBrowser();
      return NextResponse.json(
        { success: false, error: 'No carers found in the system' },
        { status: 500 }
      );
    }
    console.log(`Browser: Found ${carers.length} carers`);

    // Step 3: Select the specified carer
    console.log(`Browser: Selecting carer ${carerCode}...`);
    const selectSuccess = await selectCarer(carerCode);
    
    if (!selectSuccess) {
      await closeBrowser();
      return NextResponse.json(
        { success: false, error: `Failed to select carer ${carerCode}` },
        { status: 500 }
      );
    }
    console.log('Browser: Carer selected');

    // Step 4: Navigate to the Supervisory Home Visit form
    console.log('Browser: Navigating to Supervisory Home Visit form...');
    const navigateSuccess = await navigateToSupervisoryHomeVisitForm();
    
    if (!navigateSuccess) {
      await closeBrowser();
      return NextResponse.json(
        { success: false, error: 'Failed to navigate to form' },
        { status: 500 }
      );
    }
    console.log('Browser: Navigated to form');

    // Step 5: Fill the form with the provided data
    console.log('Browser: Filling form...');
    const fillSuccess = await fillForm(formData);
    
    if (!fillSuccess) {
      await closeBrowser();
      return NextResponse.json(
        { success: false, error: 'Failed to fill form' },
        { status: 500 }
      );
    }
    console.log('Browser: Form filled');

    // Step 6: Submit the form
    const submitTypeValue = (submitType as 'draft' | 'submit' | 'submitAndLock') || 'draft';
    console.log(`Browser: Submitting form (${submitTypeValue})...`);
    const submitResult = await submitForm(submitTypeValue);

    // Cleanup browser resources
    await closeBrowser();

    if (!submitResult.success) {
      return NextResponse.json(
        { success: false, error: submitResult.message || 'Failed to submit form' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: submitResult.message || 'Form submitted successfully',
        submittedAt: new Date().toISOString(),
        carerCode,
        submitType: submitTypeValue,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    if (closeBrowserFn) {
      await closeBrowserFn();
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

