'use client';

import { SubmissionHistoryItem } from '@/types';

interface SubmissionHistoryProps {
  history: SubmissionHistoryItem[];
}

export default function SubmissionHistory({ history }: SubmissionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="section-title flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Submission History
        </h2>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-white/40">No submissions yet</p>
          <p className="text-white/30 text-sm mt-1">Your form submissions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="section-title flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        Submission History
      </h2>

      <div className="space-y-3">
        {history.map((item, index) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-white/5 border border-white/10 animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                    {item.carerCode}
                  </span>
                  <span className={`status-badge ${
                    item.status === 'success' ? 'status-success' :
                    item.status === 'pending' ? 'status-pending' : 'status-error'
                  }`}>
                    {item.status === 'success' ? 'Submitted' :
                     item.status === 'pending' ? 'Pending' : 'Failed'}
                  </span>
                </div>
                <p className="font-medium text-white">{item.carerName}</p>
                <p className="text-sm text-white/50">{item.formName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/40">
                  {new Date(item.submittedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-white/30">
                  {new Date(item.submittedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            {item.message && (
              <p className="text-xs text-white/40 mt-2 pt-2 border-t border-white/10">
                {item.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

