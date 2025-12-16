import { Carer, FormField, FormStructure, ApiResponse } from '@/types';

describe('Types', () => {
  describe('Carer type', () => {
    it('should accept valid carer object', () => {
      const carer: Carer = {
        id: 'FCC-18',
        code: 'FCC-18',
        name: 'John Smith',
        areaLocality: 'London',
        status: 'Active',
        approvalDate: '2024-01-15',
        userName: 'jsmith',
      };

      expect(carer.id).toBe('FCC-18');
      expect(carer.name).toBe('John Smith');
      expect(carer.status).toBe('Active');
    });

    it('should accept carer with optional details', () => {
      const carer: Carer = {
        id: 'FCC-19',
        code: 'FCC-19',
        name: 'Jane Doe',
        areaLocality: 'Manchester',
        status: 'Active',
        approvalDate: '2024-02-01',
        userName: 'jdoe',
        details: {
          agencySocialWorker: 'Sarah Wilson',
          areaOffice: 'Manchester Central',
          approvedVacancy: 2,
          availableVacancy: 1,
          categoryOfApproval: 'Standard',
          ageRange: '0-18',
          gender: 'Any',
          siblingsGroupsAccepted: true,
        },
      };

      expect(carer.details?.agencySocialWorker).toBe('Sarah Wilson');
      expect(carer.details?.approvedVacancy).toBe(2);
    });
  });

  describe('FormField type', () => {
    it('should accept dropdown field with options', () => {
      const field: FormField = {
        id: 'category',
        name: 'category',
        label: 'Category',
        type: 'dropdown',
        required: true,
        section: 'Section A',
        options: [
          { value: '', label: 'Select Category' },
          { value: 'Individual Child', label: 'Individual Child' },
        ],
      };

      expect(field.type).toBe('dropdown');
      expect(field.options?.length).toBe(2);
    });

    it('should accept textarea field', () => {
      const field: FormField = {
        id: 'notes',
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        required: false,
        section: 'Section B',
        placeholder: 'Enter notes here...',
      };

      expect(field.type).toBe('textarea');
      expect(field.placeholder).toBe('Enter notes here...');
    });

    it('should accept checkbox field', () => {
      const field: FormField = {
        id: 'homeFileSeen',
        name: 'homeFileSeen',
        label: 'Home File Seen',
        type: 'checkbox',
        required: false,
        section: 'Section A',
        defaultValue: false,
      };

      expect(field.type).toBe('checkbox');
      expect(field.defaultValue).toBe(false);
    });
  });

  describe('FormStructure type', () => {
    it('should accept valid form structure', () => {
      const formStructure: FormStructure = {
        formName: 'Supervisory Home Visit',
        formUrl: '/forms/supervisory-home-visit',
        sections: [
          {
            id: 'sectionA',
            name: 'Section A',
            fields: [],
          },
          {
            id: 'sectionB',
            name: 'Section B',
            fields: [],
          },
        ],
        buttons: [
          { id: 'save', label: 'Save', action: 'draft' },
          { id: 'submit', label: 'Submit', action: 'submit' },
        ],
      };

      expect(formStructure.formName).toBe('Supervisory Home Visit');
      expect(formStructure.sections.length).toBe(2);
      expect(formStructure.buttons.length).toBe(2);
    });
  });

  describe('ApiResponse type', () => {
    it('should accept success response', () => {
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Form submitted successfully' },
      };

      expect(response.success).toBe(true);
      expect(response.data?.message).toBe('Form submitted successfully');
    });

    it('should accept error response', () => {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to submit form',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to submit form');
    });
  });
});

