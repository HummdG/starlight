import { createAgentContext } from '@/lib/agent-loop';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Task complete' } }],
        }),
      },
    },
  }));
});

// Mock browser-agent
jest.mock('@/lib/browser-agent', () => ({
  login: jest.fn().mockResolvedValue(true),
  extractCarers: jest.fn().mockResolvedValue([
    { id: 'FCC-18', code: 'FCC-18', name: 'John Doe', areaLocality: 'London', status: 'Active', approvalDate: '2024-01-01', userName: 'jdoe' },
  ]),
  selectCarer: jest.fn().mockResolvedValue(true),
  navigateToSupervisoryHomeVisitForm: jest.fn().mockResolvedValue(true),
  extractFormStructure: jest.fn().mockResolvedValue({ sections: [], buttons: [] }),
  fillForm: jest.fn().mockResolvedValue(true),
  submitForm: jest.fn().mockResolvedValue({ success: true, message: 'Form submitted' }),
  getPageState: jest.fn().mockResolvedValue({ url: 'http://test.com', title: 'Test Page' }),
  closeBrowser: jest.fn().mockResolvedValue(undefined),
}));

describe('Agent Loop', () => {
  describe('createAgentContext', () => {
    it('should create a new agent context with system message', () => {
      const context = createAgentContext();
      
      expect(context).toHaveProperty('messages');
      expect(context).toHaveProperty('isLoggedIn');
      expect(context.isLoggedIn).toBe(false);
      expect(context.messages.length).toBe(1);
      expect(context.messages[0].role).toBe('system');
    });

    it('should initialize with empty carers and no selected carer', () => {
      const context = createAgentContext();
      
      expect(context.carers).toBeUndefined();
      expect(context.selectedCarer).toBeUndefined();
      expect(context.formStructure).toBeUndefined();
    });
  });
});

