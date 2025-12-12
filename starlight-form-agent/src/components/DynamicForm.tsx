'use client';

import { useState, useEffect } from 'react';
import { FormStructure, FormField, Carer } from '@/types';

interface DynamicFormProps {
  carer: Carer;
  onSubmit: (data: Record<string, string | boolean>, submitType: string) => void;
  isSubmitting: boolean;
}

// Default form structure (extracted from the legacy system)
const defaultFormStructure: FormStructure = {
  formName: 'Supervisory Home Visit',
  formUrl: '',
  sections: [
    {
      id: 'sectionA',
      name: 'Carer Section A',
      fields: [
        {
          id: 'category',
          name: 'category',
          label: 'Category',
          type: 'dropdown',
          required: true,
          section: 'Carer Section A',
          options: [
            { value: '', label: 'Select Category' },
            { value: 'Individual Child', label: 'Individual Child' },
            { value: 'Mother & Baby', label: 'Mother & Baby' },
            { value: 'Multiple Unrelated Children', label: 'Multiple Unrelated Children' },
            { value: 'No Child in Placement', label: 'No Child in Placement' },
            { value: 'Respite', label: 'Respite' },
            { value: 'Sibling Group', label: 'Sibling Group' },
            { value: 'Solo Placements', label: 'Solo Placements' },
            { value: 'Staying Put', label: 'Staying Put' },
          ],
        },
        {
          id: 'homeVisitType',
          name: 'homeVisitType',
          label: 'Home Visit Type',
          type: 'dropdown',
          required: false,
          section: 'Carer Section A',
          options: [
            { value: '', label: 'Select Home Visit Type' },
            { value: 'Announced', label: 'Announced' },
            { value: 'Cancelled', label: 'Cancelled' },
            { value: 'Rescheduled', label: 'Rescheduled' },
          ],
        },
        {
          id: 'dateOfVisit',
          name: 'dateOfVisit',
          label: 'Date Of Visit',
          type: 'datetime',
          required: true,
          placeholder: 'dd/mm/yyyy hh:mm',
          section: 'Carer Section A',
        },
        {
          id: 'homeFileSeen',
          name: 'homeFileSeen',
          label: 'Home File Seen',
          type: 'checkbox',
          required: false,
          section: 'Carer Section A',
        },
        {
          id: 'medicationSheetChecked',
          name: 'medicationSheetChecked',
          label: 'Medication Sheet Checked',
          type: 'checkbox',
          required: false,
          section: 'Carer Section A',
        },
        {
          id: 'localAuthorityFeedbackRequested',
          name: 'localAuthorityFeedbackRequested',
          label: 'Local Authority Feedback Requested',
          type: 'checkbox',
          required: false,
          section: 'Carer Section A',
        },
        {
          id: 'natureOfVisit',
          name: 'natureOfVisit',
          label: 'Nature of Visit',
          type: 'textarea',
          required: false,
          section: 'Carer Section A',
        },
        {
          id: 'attendeesDetails',
          name: 'attendeesDetails',
          label: 'Names of all those present at the meeting. Details of any new placements since the last visit. Note if children were seen alone. If not seen at all, reason why?',
          type: 'textarea',
          required: false,
          section: 'Carer Section A',
        },
        {
          id: 'additionalEmails',
          name: 'additionalEmails',
          label: 'Additional Email Addresses to be notified',
          type: 'email',
          required: false,
          description: 'Email Addresses should be separated by commas',
          section: 'Carer Section A',
        },
      ],
    },
    {
      id: 'sectionB',
      name: 'Carer Section B',
      fields: [
        {
          id: 'caringForChildren',
          name: 'caringForChildren',
          label: 'Caring for Children',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'workingAsPartOfTeam',
          name: 'workingAsPartOfTeam',
          label: 'Working as part of a team',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'trainingPersonalDevelopment',
          name: 'trainingPersonalDevelopment',
          label: 'Training & Personal Development',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'carerPersonalIssues',
          name: 'carerPersonalIssues',
          label: 'Carer Personal Issues',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'agencyIssues',
          name: 'agencyIssues',
          label: 'Agency Issues',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'safeEnvironment',
          name: 'safeEnvironment',
          label: 'Providing a Safe Environment / Safe Care Issues',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'concernsAllegations',
          name: 'concernsAllegations',
          label: 'Concerns / Allegations / Commendations',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'dayCareRespite',
          name: 'dayCareRespite',
          label: 'Day Care / Household Respite Carer and Respite Training',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'supervisionSentToCarer',
          name: 'supervisionSentToCarer',
          label: 'Has the Supervision sent to Carer?',
          type: 'checkbox',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'fosterCarerComments',
          name: 'fosterCarerComments',
          label: 'Foster Carer Comments on Supervision',
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
        {
          id: 'lineManagerComments',
          name: 'lineManagerComments',
          label: "Line Manager's Comments on Supervision",
          type: 'textarea',
          required: false,
          section: 'Carer Section B',
        },
      ],
    },
  ],
  buttons: [
    { id: 'saveAsDraft', label: 'Save as Draft', action: 'draft' },
    { id: 'submit', label: 'Submit', action: 'submit' },
    { id: 'submitAndLock', label: 'Submit & Lock', action: 'submitAndLock' },
  ],
};

export default function DynamicForm({ carer, onSubmit, isSubmitting }: DynamicFormProps) {
  const [formStructure] = useState<FormStructure>(defaultFormStructure);
  const [activeSection, setActiveSection] = useState(0);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize form data with default values
    const initialData: Record<string, string | boolean> = {};
    formStructure.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.id] = false;
        } else if (field.type === 'dropdown' && field.options?.[0]) {
          initialData[field.id] = field.options[0].value;
        } else {
          initialData[field.id] = '';
        }
      });
    });
    setFormData(initialData);
  }, [formStructure]);

  const handleFieldChange = (fieldId: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when field is changed
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    formStructure.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required) {
          const value = formData[field.id];
          if (value === '' || value === undefined || value === null) {
            newErrors[field.id] = `${field.label} is required`;
          }
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (submitType: string) => {
    if (validateForm()) {
      onSubmit(formData, submitType);
    }
  };

  const renderField = (field: FormField) => {
    // Ensure value is never undefined to keep inputs controlled
    const rawValue = formData[field.id];
    const value = field.type === 'checkbox' 
      ? (rawValue ?? false) 
      : (rawValue ?? '');
    const hasError = !!errors[field.id];

    switch (field.type) {
      case 'dropdown':
        return (
          <select
            id={field.id}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`select-field ${hasError ? 'field-error' : ''}`}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={`textarea-field ${hasError ? 'field-error' : ''}`}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={field.id}
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="checkbox-field"
            />
            <label htmlFor={field.id} className="text-white/80 cursor-pointer">
              {field.label}
            </label>
          </div>
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            id={field.id}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`input-field ${hasError ? 'field-error' : ''}`}
          />
        );

      default:
        return (
          <input
            type={field.type === 'email' ? 'email' : 'text'}
            id={field.id}
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={`input-field ${hasError ? 'field-error' : ''}`}
          />
        );
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Carer Info Header */}
      <div className="bg-gradient-to-r from-primary-600/20 to-accent-600/20 p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
            {carer.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">{carer.name}</h3>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span className="font-mono">{carer.code}</span>
              <span>•</span>
              <span>{carer.areaLocality}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Title */}
      <div className="p-6 border-b border-white/10">
        <h2 className="section-title mb-0">{formStructure.formName}</h2>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-white/10">
        {formStructure.sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(index)}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeSection === index
                ? 'bg-white/10 text-white border-b-2 border-primary-500'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {section.name}
          </button>
        ))}
      </div>

      {/* Form Fields */}
      <div className="p-6">
        <div className="space-y-6">
          {formStructure.sections[activeSection].fields.map((field, index) => (
            <div
              key={field.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {field.type !== 'checkbox' && (
                <label htmlFor={field.id} className="label">
                  {field.label}
                  {field.required && <span className="required-indicator">*</span>}
                </label>
              )}
              {field.description && (
                <p className="text-xs text-white/40 mb-2">{field.description}</p>
              )}
              {renderField(field)}
              {errors[field.id] && (
                <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Navigation and Submit Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {activeSection > 0 && (
              <button
                onClick={() => setActiveSection(prev => prev - 1)}
                className="btn-secondary"
              >
                ← Previous Section
              </button>
            )}
            {activeSection < formStructure.sections.length - 1 && (
              <button
                onClick={() => setActiveSection(prev => prev + 1)}
                className="btn-secondary"
              >
                Next Section →
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {formStructure.buttons.map(button => (
              <button
                key={button.id}
                onClick={() => handleSubmit(button.action)}
                disabled={isSubmitting}
                className={
                  button.action === 'submit' || button.action === 'submitAndLock'
                    ? 'btn-accent'
                    : 'btn-primary'
                }
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="loading-spinner w-4 h-4"></span>
                    Processing...
                  </span>
                ) : (
                  button.label
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

