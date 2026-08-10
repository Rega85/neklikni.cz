"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { trackEvent } from "../lib/analytics";

type FormState = {
  company: string;
  name: string;
  email: string;
  phone: string;
  employees: string;
  note: string;
  website: string;
};

const INITIAL_FORM: FormState = {
  company: "",
  name: "",
  email: "",
  phone: "",
  employees: "",
  note: "",
  website: "",
};

export default function FirmyLeadForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const message = [
      "ZÁJEM O NEKLIKNI PRO FIRMY",
      `Firma: ${form.company}`,
      `Počet zaměstnanců: ${form.employees || "neuvedeno"}`,
      `Telefon: ${form.phone || "neuvedeno"}`,
      "",
      "Poznámka:",
      form.note || "Mám zájem o pilotní workshop / firemní program.",
    ].join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.name} | ${form.company}`,
          email: form.email,
          message,
          website: form.website,
        }),
      });

      if (!res.ok) {
        setError("Odeslání se nepovedlo. Napište prosím na info@neklikni.cz.");
        return;
      }

      trackEvent("b2b_lead_submitted", {
        employees: form.employees || "unknown",
        source: "firmy_landing",
      });
      setDone(true);
      setForm(INITIAL_FORM);
    } catch {
      setError("Odeslání se nepovedlo. Napište prosím na info@neklikni.cz.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
        <h3 className="text-2xl font-black text-white">Máme to.</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Ozveme se vám s návrhem pilotu. Žádná automatická obchodní smršť, nejdřív zjistíme, co dává smysl právě pro vaši firmu.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 text-sm font-bold text-emerald-200 hover:text-white"
        >
          Odeslat další poptávku
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Firma</span>
          <input
            required
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="ABC Manufacturing s.r.o."
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Jméno</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jana Nováková"
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Firemní e-mail</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jana@firma.cz"
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Telefon</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+420 777 000 000"
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Velikost firmy</span>
        <select
          required
          value={form.employees}
          onChange={(e) => setForm({ ...form, employees: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
        >
          <option value="">Vyberte počet zaměstnanců</option>
          <option value="1-49">1–49</option>
          <option value="50-99">50–99</option>
          <option value="100-249">100–249</option>
          <option value="250-499">250–499</option>
          <option value="500+">500+</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Co chcete řešit?</span>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={4}
          placeholder="Např. výroba 180 lidí, phishing, podvodné SMS, onboarding nových zaměstnanců..."
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
        />
      </label>

      {error && <p className="text-sm font-semibold text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} /> {loading ? "Odesílám…" : "Chci firemní pilot"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        Odesláním pouze žádáte o nezávazný kontakt. Nevzniká objednávka ani předplatné.
      </p>
    </form>
  );
}
