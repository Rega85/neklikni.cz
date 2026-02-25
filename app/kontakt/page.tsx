"use client";
import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export default function KontaktPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setDone(true);
    } else {
      setError('Něco se pokazilo. Zkus to znovu nebo napiš přímo na info@neklikni.cz');
    }
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-20 h-20 text-green-400 mb-6 animate-bounce" />
      <h1 className="text-3xl font-bold text-white mb-4">Zpráva odeslána!</h1>
      <p className="text-slate-400">Ozveme se ti co nejdříve na <span className="text-white font-bold">{form.email}</span>.</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white py-32 px-6">
      <div className="max-w-xl mx-auto">

        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tighter mb-3">Kontakt</h1>
          <p className="text-slate-400">Máš otázku nebo problém? Napiš nám.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — hidden from real users, bots fill it */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                Jméno
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Karel Novák"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 px-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="karel@novak.cz"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 px-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                Zpráva
              </label>
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Napiš nám cokoliv..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 px-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !form.name || !form.email || !form.message}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? "Odesílám..." : <><Send size={18} /> Odeslat zprávu</>}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-sm mt-8">
          PK Virgine, s.r.o. · IČO: 21448507 · Datová schránka: bty8mey
        </p>

      </div>
    </main>
  );
}