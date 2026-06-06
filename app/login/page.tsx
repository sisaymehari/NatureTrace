'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';
  const fromReport = redirect.startsWith('/report');
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicMode, setMagicMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (magicMode) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        toast.success('Magic link sent! Check your email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {fromReport && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Please sign in to submit a report.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {!magicMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? 'Please wait…' : magicMode ? 'Send Magic Link' : 'Sign In'}
      </button>

      <button
        type="button"
        onClick={() => setMagicMode(!magicMode)}
        className="w-full text-sm text-emerald-600 hover:text-emerald-800 transition-colors"
      >
        {magicMode ? 'Use password instead' : 'Sign in with magic link'}
      </button>

      <div className="text-center pt-1">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Continue as Guest →
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mb-4">
            <Shield className="w-7 h-7 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to continue reporting</p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-400 text-sm py-4">Loading…</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account?{' '}
          <Link href="/signup" className="text-emerald-600 font-medium hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
