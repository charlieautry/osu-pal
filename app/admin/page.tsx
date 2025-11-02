"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabaseClient } from '../../lib/supabaseClient';
import { termForDate } from '../../lib/term';

const supabase = getBrowserSupabaseClient();

type PdfRow = {
  id: string;
  path: string;
  [key: string]: any;
};

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<any>(null);
  const [rows, setRows] = useState<PdfRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ course_code: '', course_number: '', course_name: '', professor: '', title: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then((res: any) => {
      // res.data may be typed as any; guard access
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      setSession((res && res.data && res.data.session) ?? null);
    });
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return alert(error.message);
    setSession(data.session);
    fetchList(data.session?.access_token);
  }

  async function fetchList(token?: string) {
    if (!token && !session) return;
    const t = token ?? session.access_token;
    const params = new URLSearchParams();
    // if caller passed a search value on the session, it's provided via `token` param; but we support passing q via global `search` state
    if (typeof (fetchList as any)._lastQ === 'string' && (fetchList as any)._lastQ) params.set('q', (fetchList as any)._lastQ);
    const url = `/api/admin/list?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = await res.json();
    if (json?.data) setRows(json.data);
    else alert(json?.error ?? 'Failed to load');
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  // Debounce search: call fetchList 300ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      // store last q on function so fetchList can pick it up
      (fetchList as any)._lastQ = search;
      fetchList();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert('Select a file');
    if (!session) return alert('Sign in first');
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(meta).forEach(([k, v]) => fd.append(k, v));

    setLoading(true);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: fd,
    });
    const json = await res.json();
    setLoading(false);
    if (json?.ok) {
      alert('Uploaded');
      fetchList();
    } else {
      alert(json?.error ?? 'Upload failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this pdf?')) return;
    setLoading(true);
    const identifier = encodeURIComponent(id);
    const res = await fetch(`/api/admin/${identifier}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setLoading(false);
    if (json?.ok) fetchList();
    else alert(json?.error ?? 'Delete failed');
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-green-600 to-emerald-600 mb-2">
              Admin Access
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Sign in to manage documents</p>
          </div>
          
          <div className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl p-8 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                          hover:border-green-500 dark:hover:border-green-500"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                          hover:border-green-500 dark:hover:border-green-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                  className="w-full text-sm px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700
                         text-white rounded-xl shadow-sm focus:ring-2 focus:ring-green-300 transition-all font-medium"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-green-600 to-emerald-600">
              Document Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Upload and manage PDF resources</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-slate-600 dark:text-slate-300">{session?.user?.email}</span>
            </div>
            <button 
              onClick={signOut} 
              className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium
                       hover:border-red-500 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
            <Link 
              href="/" 
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium 
                       hover:bg-green-700 transition-colors shadow-sm"
            >
              View Public Page
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Upload New Document</h2>
            </div>
            
            <form onSubmit={upload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                  <input 
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                              hover:border-green-500 dark:hover:border-green-500"
                    placeholder="e.g. CSE" 
                    value={meta.course_code} 
                    onChange={(e) => setMeta({ ...meta, course_code: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Number</label>
                  <input 
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                              hover:border-green-500 dark:hover:border-green-500"
                    placeholder="e.g. 3901" 
                    value={meta.course_number} 
                    onChange={(e) => setMeta({ ...meta, course_number: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name</label>
                <input 
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                            hover:border-green-500 dark:hover:border-green-500"
                  placeholder="e.g. Project: Design and Development" 
                  value={meta.course_name} 
                  onChange={(e) => setMeta({ ...meta, course_name: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Professor</label>
                <input 
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                            hover:border-green-500 dark:hover:border-green-500"
                  placeholder="Professor's name" 
                  value={meta.professor} 
                  onChange={(e) => setMeta({ ...meta, professor: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
                <input 
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                            hover:border-green-500 dark:hover:border-green-500"
                  placeholder="Document title" 
                  value={meta.title} 
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input 
                  type="date"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                            hover:border-green-500 dark:hover:border-green-500"
                  value={meta.date} 
                  onChange={(e) => setMeta({ ...meta, date: e.target.value })} 
                />
              </div>

              <div className="relative">
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all
                            hover:border-green-500 dark:hover:border-green-500 file:mr-4 file:py-2 file:px-4
                            file:rounded-xl file:border-0 file:text-sm file:font-medium
                            file:bg-green-50 file:text-green-700
                            dark:file:bg-green-900/30 dark:file:text-green-400"
                />
              </div>

              <div>
                <button 
                  className="w-full text-sm px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 
                           hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-sm 
                           focus:ring-2 focus:ring-green-300 transition-all font-medium flex items-center justify-center gap-2" 
                  disabled={loading} 
                  type="submit"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                      </svg>
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Document Library</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 pl-10 pr-4 py-2 
                              bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 
                              focus:border-transparent transition-all hover:border-green-500 dark:hover:border-green-500"
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                </div>
                
                <button 
                  onClick={() => fetchList()} 
                  className="p-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 
                           hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 
                           dark:hover:text-green-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Professor</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      const title = String(r.title ?? r['title'] ?? '').toLowerCase();
                      const prof = String(r.professor ?? r['professor'] ?? r.professor ?? '').toLowerCase();
                      const cname = String(r['course name'] ?? r.course_name ?? '').toLowerCase();
                      const ccode = String(r['course code'] ?? r.course_code ?? '').toLowerCase();
                      const cnum = String(r['course number'] ?? r.course_number ?? '').toLowerCase();
                      const path = String(r.path ?? '').toLowerCase();
                      return title.includes(q) || prof.includes(q) || cname.includes(q) || ccode.includes(q) || cnum.includes(q) || path.includes(q);
                    })
                    .map((r) => (
                      <tr key={r.id ?? r.path} className="border-t border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{r.title ?? r['title'] ?? 'Untitled'}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{r.path}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{r['course code']} {r['course number']}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{r['course name'] ?? r.course_name}</div>
                        </td>
                        <td className="py-3 px-4">{r.professor}</td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{termForDate(r.date)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
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
                              className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 
                                       focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                              title="Download"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => remove(r.id ?? r.path)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 
                                       focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 mb-3 text-slate-400">
                            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm">No documents found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
