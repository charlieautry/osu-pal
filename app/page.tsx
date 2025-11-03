/**
 * Main Home Page Component - OSU PAL Course Material Search
 * 
 * This is the primary user interface for the OSU PAL (Past Assessment Library).
 * Features include:
 * - Course material search and filtering (by course code, number, professor, term)
 * - Interactive data grid with sortable columns
 * - File download functionality with Supabase storage integration
 * - Material request form with Cloudflare Turnstile protection
 * - Responsive design with light/dark mode support
 * - Real-time search with debounced API calls
 * - Modal dialogs for user interactions and feedback
 * 
 * The component manages state for search filters, modal visibility, and data fetching
 * from the public API endpoints.
 */
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { termForDate } from '../lib/term';

type Row = Record<string, any>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'confirm' | 'info';
}

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowMessage: (modal: {
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }) => void;
}

function RequestFormModal({ isOpen, onClose, onShowMessage }: RequestFormModalProps) {
  const [formData, setFormData] = useState({
    course: '',
    email: '',
    details: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const MAX_DETAILS_LENGTH = 500; // Limit details to 500 characters

  useEffect(() => {
    if (isOpen && !turnstileWidgetId) {
      // Wait for turnstile to be available
      const checkTurnstile = setInterval(() => {
        // @ts-ignore
        if (window.turnstile) {
          clearInterval(checkTurnstile);
          // @ts-ignore
          const widgetId = window.turnstile.render('#turnstile-request-container', {
            sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
            theme: 'auto',
          });
          setTurnstileWidgetId(widgetId);
        }
      }, 100);

      return () => clearInterval(checkTurnstile);
    }

    // Reset widget when modal closes
    if (!isOpen && turnstileWidgetId) {
      // @ts-ignore
      window.turnstile?.reset(turnstileWidgetId);
      setTurnstileWidgetId(null);
    }
  }, [isOpen, turnstileWidgetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      // Get the Turnstile token
      // @ts-ignore - turnstile will be available from the script
      const token = window.turnstile?.getResponse(turnstileWidgetId);
      
      if (!token) {
        onClose();
        onShowMessage({
          isOpen: true,
          type: 'error',
          title: 'Security Check Required',
          message: 'Please complete the security check'
        });
        setSubmitting(false);
        return;
      }

      // SECURITY: Send Turnstile token directly to request endpoint (server-side verification)
      console.log('Sending request with data:', formData);
      
      const response = await fetch('/api/public/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course: formData.course,
          email: formData.email || null,
          details: formData.details || null,
          turnstileToken: token // Include token for server-side verification
        }),
      });
      
      console.log('Response status:', response.status);

      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit request');
      }

      // Clear form and close modal on success
      setFormData({ course: '', email: '', details: '' });
      onClose();
      onShowMessage({
        isOpen: true,
        type: 'success',
        title: 'Request Submitted Successfully',
        message: responseData.message || 'Thanks! We\'ll review your request and add the materials if available.'
      });
    } catch (error: any) {
      console.error('Request submission error:', error);
      
      // Close the request modal and show appropriate error message
      onClose();
      
      let errorMessage = 'Failed to submit request. Please try again.';
      let errorTitle = 'Request Failed';
      
      // Handle specific error types
      if (error.message.includes('rate limit') || error.message.includes('Too many')) {
        errorTitle = 'Rate Limit Exceeded';
        errorMessage = 'You\'ve made too many requests recently. Please wait and try again later.';
      } else if (error.message.includes('Security verification')) {
        errorTitle = 'Security Check Failed';
        errorMessage = 'Please refresh the page and try again.';
      } else if (error.message.includes('Validation')) {
        errorTitle = 'Invalid Input';
        errorMessage = error.message;
      } else if (error.message.includes('duplicate') || error.message.includes('already submitted')) {
        errorTitle = 'Duplicate Request';
        errorMessage = 'You\'ve already submitted a request for this course recently. Please check back later.';
      }
      
      onShowMessage({
        isOpen: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Request Course Materials</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Let us know which course materials you'd like to see added to the platform.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Course (e.g., CSE 3901)
            </label>
            <input
              type="text"
              placeholder="Enter course code and number"
              value={formData.course}
              onChange={e => setFormData(prev => ({ ...prev, course: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                      hover:border-green-500 dark:hover:border-green-500"
              maxLength={50}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Example: "CS 1113" or "MATH 2144"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Your Email (optional)
            </label>
            <input
              type="email"
              placeholder="your.name@osu.edu"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                      hover:border-green-500 dark:hover:border-green-500"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-slate-500">
              We'll notify you when materials become available
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Additional Details
            </label>
            <textarea
              placeholder="Which materials are you looking for? (exams, homework, etc.)"
              value={formData.details}
              onChange={e => setFormData(prev => ({ ...prev, details: e.target.value.slice(0, MAX_DETAILS_LENGTH) }))}
              rows={3}
              maxLength={MAX_DETAILS_LENGTH}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                      hover:border-green-500 dark:hover:border-green-500 resize-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {formData.details.length}/{MAX_DETAILS_LENGTH} characters
            </p>
          </div>

          <div className="flex justify-center py-2">
            <div id="turnstile-request-container"></div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium
                       hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium 
                       hover:bg-green-700 transition-colors flex items-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Modal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  type = 'info'
}: ModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="flex-1">
            <h3 className="text-lg font-medium mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium
                         hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium 
                         hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-sm font-medium 
                       hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseCode, setCourseCode] = useState<string | undefined>(undefined);
  const [courseNumber, setCourseNumber] = useState<string | undefined>(undefined);
  const [professor, setProfessor] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'courseCode' | 'professor' | 'date'>('courseCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'confirm' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [showRequestForm, setShowRequestForm] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (courseCode) params.set('course_code', courseCode);
        if (courseNumber) params.set('course_number', courseNumber);
        if (professor) params.set('professor', professor);
        if (q) params.set('q', q);
        const url = `/api/public/list?${params.toString()}`;
        const res = await fetch(url, { 
          signal: controller.signal,
          cache: 'no-store'
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch data: ${res.status}`);
        }
        
        const j = await res.json();
        if (aborted) {
          return;
        }
        
        setRows(j?.data ?? []);
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [courseCode, courseNumber, professor, q]);

  // Fetch full unfiltered list once to populate dropdown options so selections
  // don't remove other possible choices. This runs only on mount.
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    async function loadAll() {
      try {
        setLoading(true); // Set loading state before fetch
        const res = await fetch(`/api/public/list`, { 
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch data: ${res.status}`);
        }
        const j = await res.json();
        if (aborted) {
          return;
        }
        setAllRows(j?.data ?? []);
        setRows(j?.data ?? []);
        setLoading(false); // Clear loading state after successful fetch
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        setLoading(false); // Clear loading state on error
      }
    }
    // Load immediately on mount
    loadAll();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  // Derived option lists
  const courseCodes = useMemo(() => {
    // derive codes from the full unfiltered list so options remain stable
    const set = new Set<string>();
    allRows.forEach((r) => {
      const c = r['course code'] ?? r.course_code ?? '';
      if (c) set.add(String(c));
    });
    return Array.from(set).sort();
  }, [allRows]);

  const courseNumbers = useMemo(() => {
    if (!courseCode) return [] as string[];
    const set = new Set<string>();
    // derive numbers from allRows so the set of options doesn't shrink when filters apply
    allRows.forEach((r) => {
      const c = r['course code'] ?? r.course_code ?? '';
      if (String(c) !== String(courseCode)) return;
      const n = r['course number'] ?? r.course_number ?? '';
      if (n) set.add(String(n));
    });
    return Array.from(set).sort();
  }, [allRows, courseCode]);

  const professors = useMemo(() => {
    if (!courseCode || !courseNumber) return [] as string[];
    const set = new Set<string>();
    allRows.forEach((r) => {
      const c = r['course code'] ?? r.course_code ?? '';
      const n = r['course number'] ?? r.course_number ?? '';
      if (String(c) !== String(courseCode) || String(n) !== String(courseNumber)) return;
      const p = r['professor'] ?? r.professor ?? '';
      if (p) set.add(String(p));
    });
    return Array.from(set).sort();
  }, [allRows, courseCode, courseNumber]);

  const filtered = useMemo(() => {
      // Normalize search term to handle both space and hyphen formats
      const termWithSpaces = q.trim().toLowerCase();
      const termWithHyphens = termWithSpaces.replace(/\s+/g, '-');
      
      return rows.filter((r) => {
        if (courseCode && String(r['course code'] ?? r.course_code ?? '') !== String(courseCode)) return false;
        if (courseNumber && String(r['course number'] ?? r.course_number ?? '') !== String(courseNumber)) return false;
        if (professor && String(r['professor'] ?? r.professor ?? '') !== String(professor)) return false;
        if (!termWithSpaces) return true;

        const title = String(r.title ?? r['title'] ?? '').toLowerCase();
        const prof = String(r.professor ?? r['professor'] ?? r.professor ?? '').toLowerCase();
        const cname = String(r['course name'] ?? r.course_name ?? '').toLowerCase();
        const ccode = String(r['course code'] ?? r.course_code ?? '').toLowerCase();
        const cnum = String(r['course number'] ?? r.course_number ?? '').toLowerCase();
        const date = String(r.date ?? '').toLowerCase();
        const path = String(r.path ?? '').toLowerCase();
        
        // Create two versions of the searchable text - one with spaces, one with hyphens
        const searchTextWithSpaces = `${title} ${prof} ${cname} ${ccode} ${cnum} ${date.replace(/-/g, ' ')} ${path}`;
        const searchTextWithHyphens = `${title} ${prof} ${cname} ${ccode} ${cnum} ${date} ${path}`;
        
        // Check if either version of the search term matches either version of the text
        return searchTextWithSpaces.includes(termWithSpaces) || 
               searchTextWithHyphens.includes(termWithHyphens);
      });
  }, [rows, courseCode, courseNumber, professor, q]);

  const sorted = useMemo(() => {
    const result = [...filtered];
    
    result.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';
      
      if (sortField === 'courseCode') {
        aVal = String(a['course code'] ?? a.course_code ?? '');
        bVal = String(b['course code'] ?? b.course_code ?? '');
      } else if (sortField === 'professor') {
        // Extract last name (text after last space, or entire string if no space)
        const aProf = String(a['professor'] ?? a.professor ?? '');
        const bProf = String(b['professor'] ?? b.professor ?? '');
        const aLastName = aProf.split(' ').pop()?.charAt(0).toUpperCase() ?? '';
        const bLastName = bProf.split(' ').pop()?.charAt(0).toUpperCase() ?? '';
        aVal = aLastName;
        bVal = bLastName;
      } else if (sortField === 'date') {
        aVal = String(a.date ?? a['date'] ?? '');
        bVal = String(b.date ?? b['date'] ?? '');
      }
      
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [filtered, sortField, sortOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950">
      <main className="p-4">
        <div className="max-w-7xl mx-auto pt-8">
          <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-green-600 to-emerald-600">
            OSU PAL Document Search
          </h1>
        </div>

        <div className="rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 shadow-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 mb-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Filter Dropdowns */}
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="All Course Codes"
                  isClearable
                  isSearchable
                  value={courseCode ? { value: courseCode, label: courseCode } : null}
                  onChange={(option) => {
                    setCourseNumber(undefined);
                    setProfessor(undefined);
                    setCourseCode(option?.value);
                  }}
                  options={courseCodes.map(c => ({ value: c, label: c }))}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minWidth: '180px',
                      borderRadius: '0.75rem',
                      borderWidth: '2px',
                      borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(226, 232, 240)',
                      backgroundColor: 'white',
                      padding: '0.125rem',
                      boxShadow: state.isFocused ? '0 0 0 2px rgb(34 197 94 / 0.2)' : 'none',
                      '&:hover': {
                        borderColor: 'rgb(34, 197, 94)',
                      },
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: 'rgb(30, 41, 59)',
                        borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(51, 65, 85)',
                      }
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'rgb(15, 23, 42)',
                      '@media (prefers-color-scheme: dark)': {
                        color: 'rgb(226, 232, 240)',
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(15, 23, 42)',
                      '@media (prefers-color-scheme: dark)': {
                        color: 'rgb(226, 232, 240)',
                      }
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'rgb(148, 163, 184)',
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'white',
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: 'rgb(30, 41, 59)',
                      }
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(240, 253, 244)' : 'white',
                      color: state.isSelected ? 'white' : 'rgb(15, 23, 42)',
                      '&:active': {
                        backgroundColor: 'rgb(34, 197, 94)',
                      },
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                        color: state.isSelected ? 'white' : 'rgb(226, 232, 240)',
                      }
                    }),
                  }}
                />

                {/* Only show course number select after a course code is chosen */}
                {courseCode && (
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="All Course Numbers"
                    isClearable
                    isSearchable
                    value={courseNumber ? { value: courseNumber, label: courseNumber } : null}
                    onChange={(option) => {
                      setProfessor(undefined);
                      setCourseNumber(option?.value);
                    }}
                    options={courseNumbers.map(n => ({ value: n, label: n }))}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minWidth: '180px',
                        borderRadius: '0.75rem',
                        borderWidth: '2px',
                        borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(226, 232, 240)',
                        backgroundColor: 'white',
                        padding: '0.125rem',
                        boxShadow: state.isFocused ? '0 0 0 2px rgb(34 197 94 / 0.2)' : 'none',
                        '&:hover': {
                          borderColor: 'rgb(34, 197, 94)',
                        },
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: 'rgb(30, 41, 59)',
                          borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(51, 65, 85)',
                        }
                      }),
                      input: (base) => ({
                        ...base,
                        color: 'rgb(15, 23, 42)',
                        '@media (prefers-color-scheme: dark)': {
                          color: 'rgb(226, 232, 240)',
                        }
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: 'rgb(15, 23, 42)',
                        '@media (prefers-color-scheme: dark)': {
                          color: 'rgb(226, 232, 240)',
                        }
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: 'rgb(148, 163, 184)',
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'white',
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: 'rgb(30, 41, 59)',
                        }
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(240, 253, 244)' : 'white',
                        color: state.isSelected ? 'white' : 'rgb(15, 23, 42)',
                        '&:active': {
                          backgroundColor: 'rgb(34, 197, 94)',
                        },
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                          color: state.isSelected ? 'white' : 'rgb(226, 232, 240)',
                        }
                      }),
                    }}
                  />
                )}

                {/* Only show professor select after a course number is chosen */}
                {courseCode && courseNumber && (
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="All Professors"
                    isClearable
                    isSearchable
                    value={professor ? { value: professor, label: professor } : null}
                    onChange={(option) => setProfessor(option?.value)}
                    options={professors.map(p => ({ value: p, label: p }))}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minWidth: '200px',
                        borderRadius: '0.75rem',
                        borderWidth: '2px',
                        borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(226, 232, 240)',
                        backgroundColor: 'white',
                        padding: '0.125rem',
                        boxShadow: state.isFocused ? '0 0 0 2px rgb(34 197 94 / 0.2)' : 'none',
                        '&:hover': {
                          borderColor: 'rgb(34, 197, 94)',
                        },
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: 'rgb(30, 41, 59)',
                          borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(51, 65, 85)',
                        }
                      }),
                      input: (base) => ({
                        ...base,
                        color: 'rgb(15, 23, 42)',
                        '@media (prefers-color-scheme: dark)': {
                          color: 'rgb(226, 232, 240)',
                        }
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: 'rgb(15, 23, 42)',
                        '@media (prefers-color-scheme: dark)': {
                          color: 'rgb(226, 232, 240)',
                        }
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: 'rgb(148, 163, 184)',
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'white',
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: 'rgb(30, 41, 59)',
                        }
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(240, 253, 244)' : 'white',
                        color: state.isSelected ? 'white' : 'rgb(15, 23, 42)',
                        '&:active': {
                          backgroundColor: 'rgb(34, 197, 94)',
                        },
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                          color: state.isSelected ? 'white' : 'rgb(226, 232, 240)',
                        }
                      }),
                    }}
                  />
                )}
              </div>

              {/* Sort and Order Controls - Right Aligned */}
              <div className="flex items-center gap-2">
                {/* Sort By Dropdown */}
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  value={{ value: sortField, label: sortField === 'courseCode' ? 'Course Code' : sortField === 'professor' ? 'Professor' : 'Date' }}
                  onChange={(option) => setSortField(option?.value as 'courseCode' | 'professor' | 'date')}
                  options={[
                    { value: 'courseCode' as const, label: 'Course Code' },
                    { value: 'professor' as const, label: 'Professor' },
                    { value: 'date' as const, label: 'Date' },
                  ]}
                  isSearchable={false}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minWidth: '160px',
                      borderRadius: '0.75rem',
                      borderWidth: '2px',
                      borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(226, 232, 240)',
                      backgroundColor: 'rgb(241, 245, 249)',
                      padding: '0.125rem',
                      boxShadow: state.isFocused ? '0 0 0 2px rgb(34 197 94 / 0.2)' : 'none',
                      '&:hover': {
                        borderColor: 'rgb(34, 197, 94)',
                      },
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: 'rgb(30, 41, 59)',
                        borderColor: state.isFocused ? 'rgb(34, 197, 94)' : 'rgb(51, 65, 85)',
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(15, 23, 42)',
                      '@media (prefers-color-scheme: dark)': {
                        color: 'rgb(226, 232, 240)',
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'white',
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: 'rgb(30, 41, 59)',
                      }
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(240, 253, 244)' : 'white',
                      color: state.isSelected ? 'white' : 'rgb(15, 23, 42)',
                      '&:active': {
                        backgroundColor: 'rgb(34, 197, 94)',
                      },
                      '@media (prefers-color-scheme: dark)': {
                        backgroundColor: state.isSelected ? 'rgb(34, 197, 94)' : state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                        color: state.isSelected ? 'white' : 'rgb(226, 232, 240)',
                      }
                    }),
                  }}
                />

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border-2 border-slate-200 dark:border-slate-700"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158v10.638A.75.75 0 0110 17z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 pl-12 pr-4 py-3 bg-white dark:bg-slate-800 
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                         hover:border-green-500 dark:hover:border-green-500"
                placeholder="Search by title, professor, or course name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-slate-500 font-medium">
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading results...</span>
                </div>
              ) : (
                <span>Found {sorted.length} document{sorted.length === 1 ? '' : 's'}</span>
              )}
            </div>
            <div className="text-sm text-slate-400">Click a card to download</div>
          </div>

          
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-green-600"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading documents...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
              {sorted.map((r) => (
              <button
                key={r.path ?? r.id}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/public/download?path=${encodeURIComponent(r.path)}`);
                    const j = await res.json();
                    if (j?.url) window.open(j.url, '_blank');
                    else {
                      setModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Download Failed',
                        message: j?.error ?? 'Unable to generate download URL'
                      });
                    }
                  } catch (err) {
                    setModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Download Error',
                      message: String(err)
                    });
                  }
                }}
                className="text-left w-full group"
              >
                <div className="rounded-xl p-6 bg-white dark:bg-slate-800 shadow-lg border border-slate-200/50 dark:border-slate-700/50 
                              hover:shadow-xl hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="grow">
                      <h3 className="text-lg font-semibold group-hover:text-green-600 transition-colors">
                        {r.title ?? r['title'] ?? 'Untitled'}
                      </h3>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {r['course name'] ?? r.course_name ?? ''}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {r['course code']} {r['course number']}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {r.professor}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {termForDate(r.date)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <div className="rounded-full p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 
                                    group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 mb-3 text-slate-400">
                    <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
                  </svg>
                  <p>No documents found matching your criteria</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </main>

      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-slate-200/50 dark:border-slate-700/50 mt-16">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowRequestForm(true)}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-medium 
                       hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Request New Course Materials
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">About the PAL</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                The OKST PAL is a student-run resource sharing platform designed to help Oklahoma State University students
                access past course materials, assignments, and study resources. Our goal is to foster collaborative
                learning and academic success.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Contact & Takedown Requests</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                If you have questions, or are a faculty member and wish to request the removal of specific materials, please contact me at the email below.
              </p>
              <a 
                href="mailto:charles.autry@okstate.edu"
                className="inline-flex items-center text-green-600 hover:text-green-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                  <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                  <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                </svg>
                charles.autry@okstate.edu
              </a>
            </div>
          </div>
          
          <div className="border-t border-slate-200/50 dark:border-slate-700/50 mt-8 pt-8">
            <p className="text-sm text-slate-500 text-center">
              Oklahoma State Past Assessment Library
            </p>
          </div>
        </div>
      </footer>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, type: 'info', title: '', message: '' })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <RequestFormModal
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        onShowMessage={setModal}
      />
    </div>
  );
}
