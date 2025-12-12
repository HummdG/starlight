// Form field types
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'dropdown' 
  | 'checkbox' 
  | 'datetime' 
  | 'multiselect'
  | 'email';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: DropdownOption[];
  description?: string;
  section: string;
  defaultValue?: string | boolean;
}

export interface FormStructure {
  formName: string;
  formUrl: string;
  sections: {
    id: string;
    name: string;
    fields: FormField[];
  }[];
  buttons: {
    id: string;
    label: string;
    action: string;
  }[];
}

// Carer types
export interface Carer {
  id: string;
  code: string;
  name: string;
  areaLocality: string;
  status: string;
  approvalDate: string;
  userName: string;
  details?: CarerDetails;
}

export interface CarerDetails {
  agencySocialWorker: string;
  areaOffice: string;
  approvedVacancy: number;
  availableVacancy: number;
  categoryOfApproval: string;
  ageRange: string;
  gender: string;
  siblingsGroupsAccepted: boolean;
}

// Form submission types
export interface FormSubmission {
  carerId: string;
  formName: string;
  data: Record<string, string | boolean>;
  submittedAt: string;
  status: 'pending' | 'submitted' | 'failed';
}

// Agent types
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'extract' | 'wait' | 'screenshot';
  selector?: string;
  value?: string;
  description: string;
}

export interface AgentState {
  currentUrl: string;
  pageTitle: string;
  isLoggedIn: boolean;
  selectedCarer?: Carer;
  extractedData?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Submission history
export interface SubmissionHistoryItem {
  id: string;
  carerName: string;
  carerCode: string;
  formName: string;
  submittedAt: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

