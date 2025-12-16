/**
 * Agentic AI Workflow System
 * 
 * Architecture:
 * ┌─────────────────┐
 * │   Orchestrator  │  ← Coordinates all agents
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │ Planner/Review/ │  ← Specialized agents
 * │    Research     │
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │   Executor      │  ← Browser automation
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │ Agent Results   │  ← Success or Re-work
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │ Context Sync    │  ← State & Memory
 * └────────┬────────┘
 *          │
 * ┌────────▼────────┐
 * │ Compile Results │  ← Final output
 * └─────────────────┘
 */

import OpenAI from 'openai';
import {
  AgentRole,
  Task,
  TaskStatus,
  Plan,
  Review,
  ResearchResult,
  ExecutionResult,
  SharedContext,
  MemoryItem,
  HistoryEntry,
  WorkflowConfig,
  WorkflowResult,
  AgentMessage,
} from '@/types/agents';
import {
  login,
  extractCarers,
  selectCarer,
  navigateToSupervisoryHomeVisitForm,
  fillForm,
  submitForm,
  getPageState,
} from './browser-agent';

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default workflow configuration
const DEFAULT_CONFIG: WorkflowConfig = {
  maxIterations: 15,
  requireReview: true,
  autoRetry: true,
  retryLimit: 2,
  timeout: 300000, // 5 minutes
};

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SHARED CONTEXT MANAGER
// ============================================================================

class ContextManager {
  private context: SharedContext;

  constructor(goal: string) {
    this.context = {
      sessionId: generateId(),
      goal,
      completedTasks: [],
      pendingTasks: [],
      memory: [],
      state: { isLoggedIn: false },
      history: [],
    };
  }

  getContext(): SharedContext {
    return this.context;
  }

  // Update state
  updateState(updates: Partial<SharedContext['state']>): void {
    this.context.state = { ...this.context.state, ...updates };
    this.addHistory('orchestrator', 'state_update', updates, this.context.state);
  }

  // Memory management
  setMemory(key: string, value: unknown, source: AgentRole): void {
    const existing = this.context.memory.findIndex(m => m.key === key);
    const item: MemoryItem = {
      id: generateId(),
      key,
      value,
      source,
      timestamp: new Date().toISOString(),
    };
    
    if (existing >= 0) {
      this.context.memory[existing] = item;
    } else {
      this.context.memory.push(item);
    }
  }

  getMemory(key: string): unknown {
    return this.context.memory.find(m => m.key === key)?.value;
  }

  // Plan management
  setPlan(plan: Plan): void {
    this.context.currentPlan = plan;
    this.context.pendingTasks = [...plan.tasks];
  }

  // Task management
  updateTask(taskId: string, updates: Partial<Task>): void {
    const pending = this.context.pendingTasks.find(t => t.id === taskId);
    if (pending) {
      Object.assign(pending, updates, { updatedAt: new Date().toISOString() });
    }
  }

  completeTask(taskId: string, result: Task['result']): void {
    const idx = this.context.pendingTasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const task = this.context.pendingTasks[idx];
      task.status = 'completed';
      task.result = result;
      task.updatedAt = new Date().toISOString();
      this.context.completedTasks.push(task);
      this.context.pendingTasks.splice(idx, 1);
    }
  }

  getNextTask(): Task | undefined {
    return this.context.pendingTasks.find(t => 
      t.status === 'pending' || t.status === 'approved'
    );
  }

  // History tracking
  addHistory(agent: AgentRole, action: string, input?: unknown, output?: unknown): void {
    this.context.history.push({
      id: generateId(),
      agent,
      action,
      input,
      output,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// AGENT BASE CLASS
// ============================================================================

abstract class BaseAgent {
  protected role: AgentRole;
  protected context: ContextManager;

  constructor(role: AgentRole, context: ContextManager) {
    this.role = role;
    this.context = context;
  }

  // Call LLM for reasoning
  protected async think(prompt: string, systemPrompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });
    return completion.choices[0]?.message?.content || '';
  }

  // Parse JSON from response
  protected parseJson<T>(response: string): T | null {
    try {
      const match = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                    response.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[1] || match[0]);
      }
    } catch (e) {
      console.error(`${this.role}: Failed to parse JSON`, e);
    }
    return null;
  }
}

// ============================================================================
// PLANNER AGENT
// ============================================================================

class PlannerAgent extends BaseAgent {
  constructor(context: ContextManager) {
    super('planner', context);
  }

  async createPlan(goal: string): Promise<Plan> {
    const systemPrompt = `You are a Planning Agent. Your job is to break down goals into executable tasks.

Rules:
- Create clear, specific, sequential tasks
- Each task should be atomic (one action)
- Consider dependencies between tasks
- Prioritize tasks appropriately

Output format (JSON):
{
  "tasks": [
    {
      "description": "Task description",
      "priority": "high|medium|low",
      "dependencies": [] // task indices this depends on
    }
  ]
}`;

    const prompt = `Create a plan to achieve this goal: "${goal}"

Current context:
- Logged in: ${this.context.getContext().state.isLoggedIn}
- Current page: ${this.context.getContext().state.currentPage || 'unknown'}
- Selected carer: ${this.context.getContext().state.selectedCarer || 'none'}

Available actions:
1. LOGIN - Log into the system
2. GET_CARERS - Get list of foster carers
3. SELECT_CARER - Select a specific carer
4. NAVIGATE_TO_FORM - Go to the home visit form
5. FILL_FORM - Fill form with data
6. SUBMIT_FORM - Submit the form`;

    this.context.addHistory('planner', 'create_plan', { goal }, null);
    
    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ tasks: Array<{ description: string; priority: string; dependencies: number[] }> }>(response);

    const tasks: Task[] = (parsed?.tasks || []).map((t, idx) => ({
      id: `task-${idx}`,
      description: t.description,
      status: 'pending' as TaskStatus,
      priority: t.priority as 'low' | 'medium' | 'high',
      dependencies: t.dependencies?.map(d => `task-${d}`),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const plan: Plan = {
      id: generateId(),
      goal,
      tasks,
      estimatedSteps: tasks.length,
      createdAt: new Date().toISOString(),
    };

    this.context.setPlan(plan);
    this.context.addHistory('planner', 'plan_created', null, plan);
    
    return plan;
  }

  async revisePlan(feedback: string): Promise<Plan> {
    const currentPlan = this.context.getContext().currentPlan;
    
    const systemPrompt = `You are a Planning Agent. Revise the plan based on feedback.

Current plan tasks:
${currentPlan?.tasks.map(t => `- ${t.description} (${t.status})`).join('\n')}

Output the revised plan in the same JSON format.`;

    const prompt = `Feedback: ${feedback}

Please revise the remaining tasks.`;

    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ tasks: Array<{ description: string; priority: string; dependencies: number[] }> }>(response);

    const tasks: Task[] = (parsed?.tasks || []).map((t, idx) => ({
      id: `task-r-${idx}`,
      description: t.description,
      status: 'pending' as TaskStatus,
      priority: t.priority as 'low' | 'medium' | 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const plan: Plan = {
      id: generateId(),
      goal: currentPlan?.goal || '',
      tasks: [...(currentPlan?.tasks.filter(t => t.status === 'completed') || []), ...tasks],
      estimatedSteps: tasks.length,
      createdAt: new Date().toISOString(),
    };

    this.context.setPlan(plan);
    return plan;
  }
}

// ============================================================================
// REVIEWER AGENT
// ============================================================================

class ReviewerAgent extends BaseAgent {
  constructor(context: ContextManager) {
    super('reviewer', context);
  }

  async reviewTaskResult(task: Task, result: unknown): Promise<Review> {
    const systemPrompt = `You are a Reviewer Agent. Your job is to validate task results.

Rules:
- Check if the result matches the task description
- Identify any errors or issues
- Provide clear feedback
- Be concise but thorough

Output format (JSON):
{
  "approved": true/false,
  "feedback": "Your feedback",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    const prompt = `Review this task result:

Task: ${task.description}
Result: ${JSON.stringify(result)}

Goal context: ${this.context.getContext().goal}`;

    this.context.addHistory('reviewer', 'review_start', { taskId: task.id }, null);
    
    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ approved: boolean; feedback: string; suggestions?: string[] }>(response);

    const review: Review = {
      taskId: task.id,
      approved: parsed?.approved ?? true,
      feedback: parsed?.feedback || 'Review completed',
      suggestions: parsed?.suggestions,
      reviewedAt: new Date().toISOString(),
    };

    this.context.addHistory('reviewer', 'review_complete', null, review);
    
    // Update task status based on review
    this.context.updateTask(task.id, {
      status: review.approved ? 'approved' : 'rejected',
      result: { 
        success: review.approved, 
        data: result, 
        reviewNotes: review.feedback 
      },
    });

    return review;
  }

  async reviewPlan(plan: Plan): Promise<Review> {
    const systemPrompt = `You are a Reviewer Agent. Review this plan for completeness and correctness.

Output format (JSON):
{
  "approved": true/false,
  "feedback": "Your feedback",
  "suggestions": ["suggestion 1"]
}`;

    const prompt = `Review this plan:

Goal: ${plan.goal}
Tasks:
${plan.tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}`;

    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ approved: boolean; feedback: string; suggestions?: string[] }>(response);

    return {
      taskId: plan.id,
      approved: parsed?.approved ?? true,
      feedback: parsed?.feedback || 'Plan approved',
      suggestions: parsed?.suggestions,
      reviewedAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// RESEARCHER AGENT
// ============================================================================

class ResearcherAgent extends BaseAgent {
  constructor(context: ContextManager) {
    super('researcher', context);
  }

  async research(query: string): Promise<ResearchResult> {
    const systemPrompt = `You are a Researcher Agent. Your job is to gather information from context and memory.

Available context:
- Memory items: ${JSON.stringify(this.context.getContext().memory)}
- Current state: ${JSON.stringify(this.context.getContext().state)}
- Completed tasks: ${this.context.getContext().completedTasks.map(t => t.description).join(', ')}

Output format (JSON):
{
  "findings": ["finding 1", "finding 2"],
  "sources": ["source 1"],
  "confidence": 0.0 to 1.0
}`;

    const prompt = `Research query: ${query}`;

    this.context.addHistory('researcher', 'research_start', { query }, null);
    
    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ findings: string[]; sources: string[]; confidence: number }>(response);

    const result: ResearchResult = {
      query,
      findings: parsed?.findings || [],
      sources: parsed?.sources || ['context'],
      confidence: parsed?.confidence || 0.5,
      researchedAt: new Date().toISOString(),
    };

    this.context.addHistory('researcher', 'research_complete', null, result);
    
    return result;
  }

  async gatherContext(task: Task): Promise<Record<string, unknown>> {
    // Get relevant memory and state for the task
    const ctx = this.context.getContext();
    
    return {
      isLoggedIn: ctx.state.isLoggedIn,
      currentPage: ctx.state.currentPage,
      selectedCarer: ctx.state.selectedCarer,
      carers: this.context.getMemory('carers'),
      formData: ctx.state.formData,
      previousResults: ctx.completedTasks.slice(-3).map(t => ({
        task: t.description,
        result: t.result,
      })),
    };
  }
}

// ============================================================================
// EXECUTOR AGENT
// ============================================================================

class ExecutorAgent extends BaseAgent {
  constructor(context: ContextManager) {
    super('executor', context);
  }

  async execute(task: Task): Promise<ExecutionResult> {
    const systemPrompt = `You are an Executor Agent. Determine the correct action to perform.

Available actions:
- LOGIN: Log into the system
- GET_CARERS: Get list of carers
- SELECT_CARER: Select a carer (needs carerCode)
- NAVIGATE_TO_FORM: Go to home visit form
- FILL_FORM: Fill form (needs formData object)
- SUBMIT_FORM: Submit form (needs submitType: draft/submit/submitAndLock)
- GET_STATE: Check current page

Output format (JSON):
{
  "action": "ACTION_NAME",
  "params": {}
}`;

    const taskContext = {
      state: this.context.getContext().state,
      carers: this.context.getMemory('carers'),
      formData: this.context.getMemory('formData'),
    };

    const prompt = `Execute this task: ${task.description}

Context: ${JSON.stringify(taskContext)}`;

    this.context.addHistory('executor', 'execute_start', { taskId: task.id }, null);
    
    const response = await this.think(prompt, systemPrompt);
    const parsed = this.parseJson<{ action: string; params?: Record<string, unknown> }>(response);

    if (!parsed?.action) {
      return {
        taskId: task.id,
        success: false,
        actions: [],
        executedAt: new Date().toISOString(),
      };
    }

    // Execute the actual action
    const actionResult = await this.performAction(parsed.action, parsed.params || {});

    const result: ExecutionResult = {
      taskId: task.id,
      success: actionResult.success,
      output: actionResult.data,
      actions: [{
        type: 'browser',
        description: parsed.action,
        success: actionResult.success,
        result: actionResult.data,
        timestamp: new Date().toISOString(),
      }],
      executedAt: new Date().toISOString(),
    };

    this.context.addHistory('executor', 'execute_complete', { action: parsed.action }, result);
    
    return result;
  }

  private async performAction(action: string, params: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> {
    try {
      switch (action) {
        case 'LOGIN': {
          const success = await login();
          this.context.updateState({ isLoggedIn: success });
          return { success, data: { isLoggedIn: success } };
        }

        case 'GET_CARERS': {
          const carers = await extractCarers();
          this.context.setMemory('carers', carers, 'executor');
          return { success: carers.length > 0, data: carers };
        }

        case 'SELECT_CARER': {
          const carerCode = params.carerCode as string;
          if (!carerCode) return { success: false, data: 'Carer code required' };
          const success = await selectCarer(carerCode);
          if (success) this.context.updateState({ selectedCarer: carerCode });
          return { success, data: { selectedCarer: carerCode } };
        }

        case 'NAVIGATE_TO_FORM': {
          const success = await navigateToSupervisoryHomeVisitForm();
          if (success) this.context.updateState({ currentPage: 'home_visit_form' });
          return { success };
        }

        case 'FILL_FORM': {
          const formData = params.formData as Record<string, string | boolean>;
          if (!formData) return { success: false, data: 'Form data required' };
          this.context.setMemory('formData', formData, 'executor');
          const success = await fillForm(formData);
          return { success };
        }

        case 'SUBMIT_FORM': {
          const submitType = (params.submitType as 'draft' | 'submit' | 'submitAndLock') || 'draft';
          const result = await submitForm(submitType);
          return { success: result.success, data: result.message };
        }

        case 'GET_STATE': {
          const state = await getPageState();
          this.context.updateState({ currentPage: state.url });
          return { success: true, data: state };
        }

        default:
          return { success: false, data: `Unknown action: ${action}` };
      }
    } catch (error) {
      console.error(`Executor error for ${action}:`, error);
      return { success: false, data: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class Orchestrator {
  private config: WorkflowConfig;
  private contextManager: ContextManager;
  private planner: PlannerAgent;
  private reviewer: ReviewerAgent;
  private researcher: ResearcherAgent;
  private executor: ExecutorAgent;
  private messages: AgentMessage[] = [];

  constructor(goal: string, config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contextManager = new ContextManager(goal);
    
    // Initialize agents
    this.planner = new PlannerAgent(this.contextManager);
    this.reviewer = new ReviewerAgent(this.contextManager);
    this.researcher = new ResearcherAgent(this.contextManager);
    this.executor = new ExecutorAgent(this.contextManager);
  }

  // Send message between agents
  private sendMessage(from: AgentRole, to: AgentRole, type: AgentMessage['type'], content: string, payload?: unknown): void {
    this.messages.push({
      from,
      to,
      type,
      content,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // Main workflow execution
  async run(): Promise<WorkflowResult> {
    const startTime = Date.now();
    const ctx = this.contextManager.getContext();
    
    console.log(`\n🚀 Starting workflow: ${ctx.goal}`);
    console.log(`   Session: ${ctx.sessionId}\n`);

    try {
      // Step 1: Planner creates initial plan
      console.log('📋 [Planner] Creating plan...');
      const plan = await this.planner.createPlan(ctx.goal);
      console.log(`   Created ${plan.tasks.length} tasks\n`);

      // Step 2: Reviewer validates plan (optional)
      if (this.config.requireReview) {
        console.log('🔍 [Reviewer] Reviewing plan...');
        const planReview = await this.reviewer.reviewPlan(plan);
        if (!planReview.approved) {
          console.log(`   Plan rejected: ${planReview.feedback}`);
          await this.planner.revisePlan(planReview.feedback);
        } else {
          console.log('   Plan approved\n');
        }
      }

      // Step 3: Execute tasks in loop
      let iteration = 0;
      let retryCount = 0;

      while (iteration < this.config.maxIterations) {
        iteration++;
        
        const task = this.contextManager.getNextTask();
        if (!task) {
          console.log('✅ All tasks completed!\n');
          break;
        }

        console.log(`\n📌 [Iteration ${iteration}] Task: ${task.description}`);
        
        // Researcher gathers context
        console.log('   🔬 [Researcher] Gathering context...');
        const taskContext = await this.researcher.gatherContext(task);
        
        // Mark task as in progress
        this.contextManager.updateTask(task.id, { status: 'in_progress' });

        // Executor performs the action
        console.log('   ⚡ [Executor] Executing...');
        const execResult = await this.executor.execute(task);
        
        // Reviewer validates result (if enabled)
        if (this.config.requireReview && execResult.success) {
          console.log('   🔍 [Reviewer] Reviewing result...');
          const review = await this.reviewer.reviewTaskResult(task, execResult.output);
          
          if (!review.approved) {
            console.log(`   ❌ Review rejected: ${review.feedback}`);
            
            if (this.config.autoRetry && retryCount < this.config.retryLimit) {
              retryCount++;
              console.log(`   🔄 Retrying (${retryCount}/${this.config.retryLimit})...`);
              this.contextManager.updateTask(task.id, { status: 'pending' });
              continue;
            }
          } else {
            console.log('   ✓ Review approved');
            retryCount = 0;
          }
        }

        // Complete the task
        if (execResult.success) {
          this.contextManager.completeTask(task.id, {
            success: true,
            data: execResult.output,
          });
          console.log('   ✓ Task completed');
        } else {
          this.contextManager.updateTask(task.id, { status: 'failed' });
          console.log(`   ✗ Task failed: ${execResult.output}`);
          
          // Send error to planner for re-planning
          this.sendMessage('executor', 'planner', 'error', 'Task failed', execResult);
        }

        // Check timeout
        if (Date.now() - startTime > this.config.timeout) {
          console.log('⏰ Workflow timeout reached');
          break;
        }
      }

      // Compile final results
      const finalCtx = this.contextManager.getContext();
      const result: WorkflowResult = {
        success: finalCtx.pendingTasks.length === 0,
        sessionId: finalCtx.sessionId,
        goal: finalCtx.goal,
        completedTasks: finalCtx.completedTasks.length,
        totalTasks: (finalCtx.currentPlan?.tasks.length || 0),
        output: this.compileOutput(),
        duration: Date.now() - startTime,
        history: finalCtx.history,
      };

      console.log(`\n🏁 Workflow completed in ${result.duration}ms`);
      console.log(`   Tasks: ${result.completedTasks}/${result.totalTasks} completed`);
      
      return result;

    } catch (error) {
      console.error('❌ Workflow error:', error);
      
      return {
        success: false,
        sessionId: ctx.sessionId,
        goal: ctx.goal,
        completedTasks: ctx.completedTasks.length,
        totalTasks: ctx.currentPlan?.tasks.length || 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        history: ctx.history,
      };
    }
  }

  // Compile output from completed tasks
  private compileOutput(): unknown {
    const ctx = this.contextManager.getContext();
    
    return {
      state: ctx.state,
      results: ctx.completedTasks.map(t => ({
        task: t.description,
        result: t.result,
      })),
      memory: Object.fromEntries(
        ctx.memory.map(m => [m.key, m.value])
      ),
    };
  }

  // Get current context (for debugging/monitoring)
  getContext(): SharedContext {
    return this.contextManager.getContext();
  }

  // Get message history
  getMessages(): AgentMessage[] {
    return this.messages;
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Run an agentic workflow for a given goal
 */
export async function runAgenticWorkflow(
  goal: string,
  config?: Partial<WorkflowConfig>
): Promise<WorkflowResult> {
  const orchestrator = new Orchestrator(goal, config);
  return orchestrator.run();
}

