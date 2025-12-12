import OpenAI from 'openai';
import {
  login,
  extractCarers,
  selectCarer,
  navigateToSupervisoryHomeVisitForm,
  extractFormStructure,
  fillForm,
  submitForm,
  getPageState,
  closeBrowser,
} from './browser-agent';
import { AgentMessage, Carer, FormStructure, ApiResponse } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the agent
const SYSTEM_PROMPT = `You are a browser automation agent for a foster care management system called Starlight.
Your role is to help navigate the legacy Angular/PrimeNG web application, extract data, and fill out forms.

## Available Actions

You can perform these actions by responding with a JSON object:

1. **LOGIN** - Log into the portal (no params needed)
   - Use this first before any other action
   - The system will handle credentials automatically

2. **GET_CARERS** - Extract the list of foster carers from the Carer List page
   - Navigates to Foster Carer > Carer List
   - Returns array of carers with: code, name, areaLocality, status, approvalDate, userName

3. **SELECT_CARER** - Select a specific carer by their code
   - Params: { "carerCode": "FCC-XX" }
   - Clicks the Select button next to the carer

4. **NAVIGATE_TO_FORM** - Navigate to the Supervisory Home Visit form
   - Opens the form page after a carer is selected

5. **EXTRACT_FORM** - Extract the form structure and available fields
   - Returns the form fields, sections, and available options

6. **FILL_FORM** - Fill the form with provided data
   - Params: { "formData": { "fieldName": "value", ... } }
   - Field names: category, homeVisitType, dateOfVisit, homeFileSeen, medicationSheetChecked, 
     localAuthorityFeedbackRequested, natureOfVisit, attendeesDetails, additionalEmails,
     caringForChildren, workingAsPartOfTeam, trainingPersonalDevelopment, carerPersonalIssues,
     agencyIssues, safeEnvironment, concernsAllegations, dayCareRespite, supervisionSentToCarer,
     fosterCarerComments, lineManagerComments

7. **SUBMIT_FORM** - Submit the form
   - Params: { "submitType": "draft" | "submit" | "submitAndLock" }

8. **GET_STATE** - Get current page URL and title (useful for debugging)

## Response Format

Always respond with a JSON object:
{
  "action": "ACTION_NAME",
  "params": { ... },
  "reasoning": "Brief explanation"
}

## Important Guidelines

1. **Always LOGIN first** before attempting any other action
2. **Check action results** - If an action fails, try GET_STATE to see where you are
3. **Sequential workflow**: LOGIN -> GET_CARERS -> SELECT_CARER -> NAVIGATE_TO_FORM -> FILL_FORM -> SUBMIT_FORM
4. **When task is complete**, respond with plain text containing "Task complete" or "Finished"
5. **If stuck**, use GET_STATE to understand current page state

## Example Workflows

### Get list of carers:
1. LOGIN
2. GET_CARERS
3. "Task complete" with the carer list

### Fill and submit a form:
1. LOGIN
2. GET_CARERS (optional, if you need to find the carer)
3. SELECT_CARER with carerCode
4. NAVIGATE_TO_FORM
5. FILL_FORM with formData
6. SUBMIT_FORM with submitType
7. "Task complete"
`;

// Agent context to maintain conversation history
interface AgentContext {
  messages: AgentMessage[];
  isLoggedIn: boolean;
  selectedCarer?: Carer;
  formStructure?: FormStructure;
  carers?: Carer[];
}

// Create a new agent context
export function createAgentContext(): AgentContext {
  return {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    isLoggedIn: false,
  };
}

// Parse agent response to extract action
function parseAgentResponse(response: string): { action: string; params: Record<string, unknown>; reasoning: string } | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    console.error('Failed to parse agent response');
    return null;
  }
}

// Execute an action based on agent decision
async function executeAction(
  action: string,
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ success: boolean; result: unknown; message: string }> {
  switch (action) {
    case 'LOGIN': {
      const success = await login();
      context.isLoggedIn = success;
      return {
        success,
        result: { isLoggedIn: success },
        message: success ? 'Successfully logged in' : 'Login failed',
      };
    }

    case 'GET_CARERS': {
      if (!context.isLoggedIn) {
        return { success: false, result: null, message: 'Not logged in' };
      }
      const carers = await extractCarers();
      context.carers = carers;
      return {
        success: carers.length > 0,
        result: carers,
        message: `Found ${carers.length} carers`,
      };
    }

    case 'SELECT_CARER': {
      const carerCode = params.carerCode as string;
      if (!carerCode) {
        return { success: false, result: null, message: 'Carer code is required' };
      }
      const success = await selectCarer(carerCode);
      if (success && context.carers) {
        context.selectedCarer = context.carers.find(c => c.code === carerCode);
      }
      return {
        success,
        result: { selectedCarer: context.selectedCarer },
        message: success ? `Selected carer ${carerCode}` : 'Failed to select carer',
      };
    }

    case 'NAVIGATE_TO_FORM': {
      const success = await navigateToSupervisoryHomeVisitForm();
      return {
        success,
        result: null,
        message: success ? 'Navigated to form' : 'Failed to navigate to form',
      };
    }

    case 'EXTRACT_FORM': {
      const formStructure = await extractFormStructure();
      context.formStructure = formStructure;
      return {
        success: formStructure.sections.length > 0,
        result: formStructure,
        message: 'Form structure extracted',
      };
    }

    case 'FILL_FORM': {
      const formData = params.formData as Record<string, string | boolean>;
      if (!formData) {
        return { success: false, result: null, message: 'Form data is required' };
      }
      const success = await fillForm(formData);
      return {
        success,
        result: null,
        message: success ? 'Form filled successfully' : 'Failed to fill form',
      };
    }

    case 'SUBMIT_FORM': {
      const submitType = (params.submitType as 'draft' | 'submit' | 'submitAndLock') || 'draft';
      const result = await submitForm(submitType);
      return {
        success: result.success,
        result,
        message: result.message,
      };
    }

    case 'GET_STATE': {
      const state = await getPageState();
      return {
        success: true,
        result: state,
        message: `Current page: ${state.title}`,
      };
    }

    default:
      return { success: false, result: null, message: `Unknown action: ${action}` };
  }
}

// Main agent loop - processes a user request through multiple steps
export async function runAgentLoop(
  userRequest: string,
  context: AgentContext,
  maxIterations: number = 10
): Promise<ApiResponse<unknown>> {
  // Add user message to context
  context.messages.push({ role: 'user', content: userRequest });

  let iteration = 0;
  let finalResult: unknown = null;

  while (iteration < maxIterations) {
    iteration++;

    try {
      // Call OpenAI to get the next action
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: context.messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        temperature: 0.1,
        max_tokens: 1000,
      });

      const assistantMessage = completion.choices[0]?.message?.content || '';
      context.messages.push({ role: 'assistant', content: assistantMessage });

      // Check if the agent wants to end the conversation
      if (
        assistantMessage.toLowerCase().includes('task complete') ||
        assistantMessage.toLowerCase().includes('finished') ||
        assistantMessage.toLowerCase().includes('done')
      ) {
        return { success: true, data: finalResult };
      }

      // Parse the action from the response
      const parsedAction = parseAgentResponse(assistantMessage);

      if (!parsedAction) {
        // No action to perform, return the final result
        // If we have a result, return it directly; otherwise wrap with message
        if (finalResult !== null) {
          return { success: true, data: finalResult };
        }
        return { success: true, data: { message: assistantMessage } };
      }

      // Execute the action
      const actionResult = await executeAction(parsedAction.action, parsedAction.params || {}, context);

      // Add the result to context
      context.messages.push({
        role: 'user',
        content: `Action result: ${JSON.stringify(actionResult)}`,
      });

      finalResult = actionResult.result;

      // If action failed and it's critical, return error
      if (!actionResult.success && ['LOGIN', 'SELECT_CARER'].includes(parsedAction.action)) {
        return { success: false, error: actionResult.message };
      }
    } catch (error) {
      console.error('Agent loop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in agent loop',
      };
    }
  }

  return { success: false, error: 'Max iterations reached' };
}

// Simplified functions for direct API use (without OpenAI orchestration)
export async function directLogin(): Promise<ApiResponse<boolean>> {
  try {
    const success = await login();
    return { success, data: success };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
  }
}

export async function directGetCarers(): Promise<ApiResponse<Carer[]>> {
  try {
    const carers = await extractCarers();
    return { success: true, data: carers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get carers' };
  }
}

export async function directGetFormStructure(carerCode: string): Promise<ApiResponse<FormStructure>> {
  try {
    await selectCarer(carerCode);
    await navigateToSupervisoryHomeVisitForm();
    const formStructure = await extractFormStructure();
    return { success: true, data: formStructure };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get form structure' };
  }
}

export async function directSubmitForm(
  carerCode: string,
  formData: Record<string, string | boolean>,
  submitType: 'draft' | 'submit' | 'submitAndLock' = 'draft'
): Promise<ApiResponse<{ message: string }>> {
  try {
    await selectCarer(carerCode);
    await navigateToSupervisoryHomeVisitForm();
    await fillForm(formData);
    const result = await submitForm(submitType);
    return { success: result.success, data: { message: result.message } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit form' };
  }
}

// Cleanup function
export async function cleanup(): Promise<void> {
  await closeBrowser();
}

