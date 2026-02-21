"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Nové heslo</h1>
        <p className="text-slate-400 mb-8">Zadej heslo, které si už snad zapamatuješ.</p>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-500" size={20} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nové heslo (min. 6 znaků)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all"
          >
            {loading ? "Ukládám..." : "Uložit heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}