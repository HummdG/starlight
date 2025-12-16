import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DynamicForm from '@/components/DynamicForm';
import { Carer } from '@/types';

const mockCarer: Carer = {
  id: 'FCC-18',
  code: 'FCC-18',
  name: 'John Smith',
  areaLocality: 'London',
  status: 'Active',
  approvalDate: '2024-01-15',
  userName: 'jsmith',
};

describe('DynamicForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders carer information', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('FCC-18')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
  });

  it('renders form title', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    expect(screen.getByText('Supervisory Home Visit')).toBeInTheDocument();
  });

  it('renders section tabs', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    expect(screen.getByText('Carer Section A')).toBeInTheDocument();
    expect(screen.getByText('Carer Section B')).toBeInTheDocument();
  });

  it('renders required fields with asterisk', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    // Category is required
    const categoryLabel = screen.getByText('Category');
    expect(categoryLabel.parentElement?.querySelector('.required-indicator')).toBeInTheDocument();
  });

  it('switches between sections when clicking tabs', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    // Initially Section A should be active
    expect(screen.getByText('Nature of Visit')).toBeInTheDocument();

    // Click Section B tab
    fireEvent.click(screen.getByText('Carer Section B'));

    // Section B fields should now be visible
    expect(screen.getByText('Caring for Children')).toBeInTheDocument();
  });

  it('renders submit buttons', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    expect(screen.getByRole('button', { name: /Save as Draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Submit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit & Lock/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={false} 
      />
    );

    // Try to submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Save as Draft/i }));

    // Should show validation error
    expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
  });

  it('disables buttons when submitting', () => {
    render(
      <DynamicForm 
        carer={mockCarer} 
        onSubmit={mockOnSubmit} 
        isSubmitting={true} 
      />
    );

    const processingButtons = screen.getAllByRole('button', { name: /Processing/i });
    expect(processingButtons.length).toBeGreaterThan(0);
    processingButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});

