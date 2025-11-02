"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { termForDate } from '../lib/term';

type Row = Record<string, any>;

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseCode, setCourseCode] = useState<string | undefined>(undefined);
  const [courseNumber, setCourseNumber] = useState<string | undefined>(undefined);
  const [professor, setProfessor] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (courseCode) params.set('course_code', courseCode);
        if (courseNumber) params.set('course_number', courseNumber);
        if (professor) params.set('professor', professor);
        if (q) params.set('q', q);
        const url = `/api/public/list?${params.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        const j = await res.json();
        if (aborted) return;
        setRows(j?.data ?? []);
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        console.error(err);
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
        const res = await fetch(`/api/public/list`, { signal: controller.signal });
        const j = await res.json();
        if (aborted) return;
        setAllRows(j?.data ?? []);
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        console.error('Failed to load all rows for options', err);
      }
    }
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
      const term = q.trim().toLowerCase();
      return rows.filter((r) => {
        if (courseCode && String(r['course code'] ?? r.course_code ?? '') !== String(courseCode)) return false;
        if (courseNumber && String(r['course number'] ?? r.course_number ?? '') !== String(courseNumber)) return false;
        if (professor && String(r['professor'] ?? r.professor ?? '') !== String(professor)) return false;
        if (!term) return true;
        const title = String(r.title ?? r['title'] ?? '').toLowerCase();
        const prof = String(r.professor ?? r['professor'] ?? r.professor ?? '').toLowerCase();
        const cname = String(r['course name'] ?? r.course_name ?? '').toLowerCase();
        const ccode = String(r['course code'] ?? r.course_code ?? '').toLowerCase();
        const cnum = String(r['course number'] ?? r.course_number ?? '').toLowerCase();
        const path = String(r.path ?? '').toLowerCase();
        return (
          title.includes(term) ||
          prof.includes(term) ||
          cname.includes(term) ||
          ccode.includes(term) ||
          cnum.includes(term) ||
          path.includes(term)
        );
      });
  }, [rows, courseCode, courseNumber, professor, q]);

  return (
    <main className="min-h-screen p-6 bg-linear-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto pt-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-green-600 to-emerald-600">
            OSU PAL Document Search
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Find and download course materials, assignments, and resources for your classes
          </p>
        </div>

        <div className="rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 shadow-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 mb-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-center mb-4">
              {/* Dropdowns with enhanced styling */}
              <select
                className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                          hover:border-green-500 dark:hover:border-green-500"
                value={courseCode ?? ''}
                onChange={(e) => {
                const v = e.target.value || undefined;
                setCourseCode(v);
                setCourseNumber(undefined);
                setProfessor(undefined);
              }}
            >
              <option value="">Select Course Code</option>
              {courseCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Only show course number select after a course code is chosen */}
            {courseCode && (
              <select
                className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                          hover:border-green-500 dark:hover:border-green-500"
                value={courseNumber ?? ''}
                onChange={(e) => {
                  const v = e.target.value || undefined;
                  setCourseNumber(v);
                  setProfessor(undefined);
                }}
              >
                <option value="">Select Course Number</option>
                {courseNumbers.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}

            {/* Only show professor select after a course number is chosen */}
            {courseCode && courseNumber && (
              <select
                className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                          hover:border-green-500 dark:hover:border-green-500"
                value={professor ?? ''}
                onChange={(e) => setProfessor(e.target.value || undefined)}
              >
                <option value="">Select Professor</option>
                {professors.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
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
                <span>Found {filtered.length} document{filtered.length === 1 ? '' : 's'}</span>
              )}
            </div>
            <div className="text-sm text-slate-400">Click a card to download</div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {filtered.map((r) => (
              <button
                key={r.path ?? r.id}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/public/download?path=${encodeURIComponent(r.path)}`);
                    const j = await res.json();
                    if (j?.url) window.open(j.url, '_blank');
                    else alert(j?.error ?? 'Unable to generate download URL');
                  } catch (err) {
                    alert(String(err));
                  }
                }}
                className="text-left w-full group"
              >
                <div className="rounded-xl p-6 bg-white/80 dark:bg-slate-900/80 shadow-lg border border-slate-200/50 dark:border-slate-700/50 
                              hover:shadow-xl hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="grow">
                      <h3 className="text-lg font-semibold group-hover:text-green-600 transition-colors">
                        {r.title ?? r['title'] ?? 'Untitled'}
                      </h3>
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
            {filtered.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 mb-3 text-slate-400">
                  <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
                </svg>
                <p>No documents found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

