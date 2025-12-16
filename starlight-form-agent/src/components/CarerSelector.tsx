'use client';

import { useState, useEffect, useCallback } from 'react';
import { Carer } from '@/types';

interface CarerSelectorProps {
  onCarerSelect: (carer: Carer) => void;
  selectedCarer?: Carer;
}

// Mock carers data (in production, this would come from the API)
const MOCK_CARERS: Carer[] = [
  { id: '1', code: 'FCC-20', name: 'RAIHANA AKHTAR / AKHTAR-UL HUSSAIN', areaLocality: 'Croydon', status: 'Approved', approvalDate: '30/06/2025', userName: 'Raihana20' },
  { id: '2', code: 'FCC-18', name: 'JOHN MARK', areaLocality: 'Covent Garden', status: 'Approved', approvalDate: '30/06/2025', userName: 'John18' },
  { id: '3', code: 'FCC-12', name: 'SERENA ZEBS', areaLocality: 'West Corner London', status: 'Approved', approvalDate: '04/06/2025', userName: 'Mathew12' },
  { id: '4', code: 'FCC-10', name: 'NANCY DWELLS', areaLocality: 'Northampton', status: 'Approved', approvalDate: '23/12/2023', userName: 'Nancy10' },
  { id: '5', code: 'FCC-6', name: 'KELLY ROYLE', areaLocality: 'NORTH HARROW', status: 'Approved', approvalDate: '08/02/2023', userName: 'Kelly6' },
  { id: '6', code: 'FCC-3', name: 'MARIA BOLT / STEPHEN BOLT', areaLocality: 'Meopham', status: 'Approved', approvalDate: '30/12/2022', userName: 'Maria3' },
  { id: '7', code: 'FCC-2', name: 'NICOLA BILLINGTON', areaLocality: 'Chatham', status: 'Approved', approvalDate: '24/12/2022', userName: 'NICOLA2' },
];

export default function CarerSelector({ onCarerSelect, selectedCarer }: CarerSelectorProps) {
  const [carers, setCarers] = useState<Carer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCarers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/carers');
      
      // Check if response is OK and is JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.includes('application/json')) {
        console.warn('API returned non-JSON response, using mock data');
        setCarers(MOCK_CARERS);
        return;
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success && data.data) {
        // Handle different response formats from the agent loop
        let carersList: Carer[] = [];
        
        if (Array.isArray(data.data)) {
          // Direct array format
          carersList = data.data;
        } else if (data.data.result && Array.isArray(data.data.result)) {
          // Agent loop format: { message: "...", result: [...] }
          carersList = data.data.result;
        } else if (typeof data.data === 'object') {
          // Try to find an array in the data object
          const possibleArrays = Object.values(data.data).filter(Array.isArray);
          if (possibleArrays.length > 0) {
            carersList = possibleArrays[0] as Carer[];
          }
        }
        
        if (carersList.length > 0) {
          setCarers(carersList);
        } else {
          console.warn('No carers found in response, using mock data');
          setCarers(MOCK_CARERS);
        }
      } else {
        // Use mock data if API fails
        console.warn('API call unsuccessful, using mock data');
        setCarers(MOCK_CARERS);
      }
    } catch (err) {
      console.error('Failed to load carers:', err);
      // Use mock data on error
      setCarers(MOCK_CARERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCarers();
  }, [loadCarers]);

  const filteredCarers = carers.filter(carer =>
    carer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    carer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    carer.areaLocality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card p-6">
      <h2 className="section-title flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
        Select Foster Carer
      </h2>

      {/* Search Input */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search carers by name, code, or area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
        <svg className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="ml-3 text-white/60">Loading carers...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadCarers} className="text-red-400 text-sm underline mt-2">
            Try again
          </button>
        </div>
      )}

      {/* Carers List */}
      {!loading && !error && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredCarers.length === 0 ? (
            <p className="text-white/40 text-center py-4">No carers found</p>
          ) : (
            filteredCarers.map((carer, index) => (
              <div
                key={carer.id}
                onClick={() => onCarerSelect(carer)}
                className={`
                  p-4 rounded-xl cursor-pointer transition-all duration-200 animate-fade-in
                  ${selectedCarer?.code === carer.code
                    ? 'bg-primary-500/20 border-2 border-primary-500/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                        {carer.code}
                      </span>
                      <span className="status-badge status-success text-xs">
                        {carer.status}
                      </span>
                    </div>
                    <h3 className="font-medium text-white mt-1">{carer.name}</h3>
                    <p className="text-sm text-white/50">{carer.areaLocality}</p>
                  </div>
                  <div className="text-right text-sm text-white/40">
                    <p>Approved</p>
                    <p>{carer.approvalDate}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={loadCarers}
        disabled={loading}
        className="mt-4 w-full btn-secondary flex items-center justify-center gap-2"
      >
        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? 'Refreshing...' : 'Refresh from Portal'}
      </button>
    </div>
  );
}

