"use client";

import React, { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '../../lib/supabaseClient';

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
    const res = await fetch('/api/admin/list', {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = await res.json();
    if (json?.data) setRows(json.data);
    else alert(json?.error ?? 'Failed to load');
  }

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
    const res = await fetch(`/api/admin/${id}`, {
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
      <main className="p-8">
        <h1 className="text-2xl mb-4">Admin sign in</h1>
        <form onSubmit={signIn} className="flex flex-col gap-2 max-w-md">
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl mb-4">Admin Panel</h1>

      <section className="mb-6">
        <h2 className="text-xl">Upload PDF</h2>
        <form onSubmit={upload} className="flex flex-col gap-2 max-w-lg">
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
          <input placeholder="course_code" value={meta.course_code} onChange={(e) => setMeta({ ...meta, course_code: e.target.value })} />
          <input placeholder="course_number" value={meta.course_number} onChange={(e) => setMeta({ ...meta, course_number: e.target.value })} />
          <input placeholder="course_name" value={meta.course_name} onChange={(e) => setMeta({ ...meta, course_name: e.target.value })} />
          <input placeholder="professor" value={meta.professor} onChange={(e) => setMeta({ ...meta, professor: e.target.value })} />
          <input placeholder="title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <input placeholder="date (YYYY-MM-DD)" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
          <button disabled={loading} type="submit">Upload</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl">Existing PDFs</h2>
        <button onClick={() => fetchList()}>Refresh</button>
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="mb-2">
              <div>{r.title ?? r['title'] ?? 'Untitled'}</div>
              <div className="text-sm text-muted">{r['course code']} {r['course number']} — {r.professor}</div>
              <button onClick={() => remove(r.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
