/**
 * Agentic AI Workflow Types
 * 
 * Architecture:
 * Orchestrator → Planner/Review/Research → Executor → Agent Results → Context Sync → Output
 * 
 * This is a browser automation system (no database) - the Executor performs
 * Playwright actions to interact with legacy web applications.
 */

// Agent role definitions
export type AgentRole = 'orchestrator' | 'planner' | 'reviewer' | 'researcher' | 'executor';

// Agent status
export type AgentStatus = 'idle' | 'working' | 'waiting' | 'completed' | 'error';

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'rejected' | 'completed' | 'failed';

// Base agent interface
export interface Agent {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  capabilities: string[];
}

// Task definition
export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  assignedAgent?: AgentRole;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
}

// Task result
export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  reviewNotes?: string;
}

// Plan from Planner agent
export interface Plan {
  id: string;
  goal: string;
  tasks: Task[];
  estimatedSteps: number;
  createdAt: string;
}

// Review from Reviewer agent
export interface Review {
  taskId: string;
  approved: boolean;
  feedback: string;
  suggestions?: string[];
  reviewedAt: string;
}

// Research result from Researcher agent
export interface ResearchResult {
  query: string;
  findings: string[];
  sources: string[];
  confidence: number;
  researchedAt: string;
}

// Execution result from Executor agent
export interface ExecutionResult {
  taskId: string;
  success: boolean;
  output?: unknown;
  actions: ExecutedAction[];
  executedAt: string;
}

// Action executed by Executor (browser automation only - no database)
export interface ExecutedAction {
  type: 'browser';
  description: string;
  success: boolean;
  result?: unknown;
  timestamp: string;
}

// Shared context for all agents
export interface SharedContext {
  sessionId: string;
  goal: string;
  currentPlan?: Plan;
  completedTasks: Task[];
  pendingTasks: Task[];
  memory: MemoryItem[];
  state: ContextState;
  history: HistoryEntry[];
}

// Memory item for context synchronization
export interface MemoryItem {
  id: string;
  key: string;
  value: unknown;
  source: AgentRole;
  timestamp: string;
  ttl?: number; // Time to live in seconds
}

// Current state
export interface ContextState {
  isLoggedIn: boolean;
  currentPage?: string;
  selectedCarer?: string;
  formData?: Record<string, unknown>;
  lastError?: string;
}

// History entry for tracking
export interface HistoryEntry {
  id: string;
  agent: AgentRole;
  action: string;
  input?: unknown;
  output?: unknown;
  timestamp: string;
}

// Message between agents
export interface AgentMessage {
  from: AgentRole;
  to: AgentRole;
  type: 'request' | 'response' | 'notification' | 'error';
  content: string;
  payload?: unknown;
  timestamp: string;
}

// Workflow configuration
export interface WorkflowConfig {
  maxIterations: number;
  requireReview: boolean;
  autoRetry: boolean;
  retryLimit: number;
  timeout: number; // in milliseconds
}

// Workflow result
export interface WorkflowResult {
  success: boolean;
  sessionId: string;
  goal: string;
  completedTasks: number;
  totalTasks: number;
  output?: unknown;
  error?: string;
  duration: number; // in milliseconds
  history: HistoryEntry[];
}

