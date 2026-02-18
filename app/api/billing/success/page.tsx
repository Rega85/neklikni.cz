import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-24 h-24 text-green-500 mb-8 animate-bounce" />
      <h1 className="text-5xl font-black text-white mb-4">Platba OK!</h1>
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Díky za nákup. Webhook teď zpracovává tvé kredity. Dej tomu pár vteřin.
      </p>
      <Link 
        href="/profile"
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20"
      >
        Kouknout na profil na kredity
      </Link>
    </div>
  );
}