/**
 * Agentic AI Workflow API
 * 
 * POST /api/agentic
 * Body: { goal: string, config?: WorkflowConfig }
 * 
 * Returns: WorkflowResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgenticWorkflow } from '@/lib/agentic-workflow';
import { WorkflowConfig } from '@/types/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, config } = body as { 
      goal: string; 
      config?: Partial<WorkflowConfig> 
    };

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal is required' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🤖 AGENTIC WORKFLOW API');
    console.log(`${'='.repeat(60)}`);
    console.log(`Goal: ${goal}`);
    if (config) console.log(`Config: ${JSON.stringify(config)}`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await runAgenticWorkflow(goal, config);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Agentic API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for status/health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/agentic',
    description: 'Agentic AI Workflow API',
    usage: {
      method: 'POST',
      body: {
        goal: 'Your goal description (required)',
        config: {
          maxIterations: 'number (default: 15)',
          requireReview: 'boolean (default: true)',
          autoRetry: 'boolean (default: true)',
          retryLimit: 'number (default: 2)',
          timeout: 'number in ms (default: 300000)',
        },
      },
    },
    agents: [
      { role: 'orchestrator', description: 'Coordinates the workflow' },
      { role: 'planner', description: 'Creates and revises task plans' },
      { role: 'reviewer', description: 'Validates plans and results' },
      { role: 'researcher', description: 'Gathers context and information' },
      { role: 'executor', description: 'Performs browser automation actions' },
    ],
  });
}

