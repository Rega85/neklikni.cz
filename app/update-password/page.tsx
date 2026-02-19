"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      alert("Chyba při změně hesla: " + error.message);
      setLoading(false);
    } else {
      alert("Heslo úspěšně změněno!");
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white">Nové heslo</h2>
          <p className="text-slate-400 text-sm">Zadej heslo, které si už snad zapamatuješ.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative flex items-center">
            <Lock className="absolute left-4 text-slate-500" size={20} />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nové bezpečné heslo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-purple-500 transition-colors text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
          >
            {loading ? "Ukládám..." : "Uložit nové heslo"}
          </button>
        </form>
      </div>
    </main>
  );
}