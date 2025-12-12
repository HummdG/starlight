'use client';

import { useState } from 'react';
import CarerSelector from '@/components/CarerSelector';
import DynamicForm from '@/components/DynamicForm';
import SubmissionHistory from '@/components/SubmissionHistory';
import { Carer, SubmissionHistoryItem } from '@/types';

export default function Home() {
  const [selectedCarer, setSelectedCarer] = useState<Carer | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastMessage, setLastMessage] = useState('');

  const handleCarerSelect = (carer: Carer) => {
    setSelectedCarer(carer);
    setShowSuccess(false);
  };

  const handleFormSubmit = async (formData: Record<string, string | boolean>, submitType: string) => {
    if (!selectedCarer) return;

    setIsSubmitting(true);
    setShowSuccess(false);

    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carerCode: selectedCarer.code,
          formData,
          submitType,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned an unexpected response. Please try again.');
      }

      const result = await response.json();

      const historyItem: SubmissionHistoryItem = {
        id: `sub_${Date.now()}`,
        carerName: selectedCarer.name,
        carerCode: selectedCarer.code,
        formName: 'Supervisory Home Visit',
        submittedAt: new Date().toISOString(),
        status: result.success ? 'success' : 'failed',
        message: result.data?.message || result.error,
      };

      setSubmissionHistory(prev => [historyItem, ...prev]);

      if (result.success) {
        setShowSuccess(true);
        setLastMessage(result.data?.message || 'Form submitted successfully');
      } else {
        setLastMessage(result.error || 'Submission failed');
      }
    } catch (error) {
      const historyItem: SubmissionHistoryItem = {
        id: `sub_${Date.now()}`,
        carerName: selectedCarer.name,
        carerCode: selectedCarer.code,
        formName: 'Supervisory Home Visit',
        submittedAt: new Date().toISOString(),
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      setSubmissionHistory(prev => [historyItem, ...prev]);
      setLastMessage('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
          Browser Automation Agent Active
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Supervisory Home Visit
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Form Automation
          </span>
        </h1>
        <p className="text-white/50 max-w-2xl mx-auto">
          Select a foster carer and fill out the supervisory home visit form. 
          The browser agent will automatically submit the form to the legacy system.
        </p>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-24 right-6 z-50 animate-slide-in">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 backdrop-blur-xl flex items-center gap-3 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-emerald-400">Success!</p>
              <p className="text-sm text-emerald-300/80">{lastMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="ml-4 text-emerald-300/60 hover:text-emerald-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Carer Selector */}
        <div className="lg:col-span-1 space-y-6">
          <CarerSelector
            onCarerSelect={handleCarerSelect}
            selectedCarer={selectedCarer}
          />
          <SubmissionHistory history={submissionHistory} />
        </div>

        {/* Right Column - Form */}
        <div className="lg:col-span-2">
          {selectedCarer ? (
            <DynamicForm
              carer={selectedCarer}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          ) : (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Select a Carer to Begin</h3>
              <p className="text-white/50 max-w-md mx-auto">
                Choose a foster carer from the list on the left to start filling out the 
                Supervisory Home Visit form. The form will be automatically submitted to the legacy system.
              </p>
              <div className="mt-8 flex items-center justify-center gap-8 text-sm text-white/40">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  7 Carers Available
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Supervisory Home Visit Form
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16 grid md:grid-cols-3 gap-6">
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">Browser Automation</h3>
          <p className="text-white/50 text-sm">
            Powered by Playwright for reliable browser automation. Navigates legacy systems just like a human would.
          </p>
        </div>

        <div className="card p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">AI-Powered Agent</h3>
          <p className="text-white/50 text-sm">
            OpenAI-powered agent loop for intelligent decision making and form navigation. Adapts to form changes.
          </p>
        </div>

        <div className="card p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">Form Validation</h3>
          <p className="text-white/50 text-sm">
            Automatic validation of required fields before submission. Ensures data integrity and compliance.
          </p>
        </div>
      </div>
    </div>
  );
}

