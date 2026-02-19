"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <CheckCircle2 className="w-24 h-24 text-green-500 animate-bounce" />
        <div className="absolute inset-0 bg-green-500/20 blur-3xl -z-10"></div>
      </div>

      <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">
        Platba proběhla <span className="text-green-500">úspěšně!</span>
      </h1>
      
      <p className="text-slate-400 text-lg mb-8 max-w-md leading-relaxed">
        Díky za nákup. Kredity jsou na cestě do tvého profilu. Za chvíli tě tam vezmu...
      </p>

      <div className="flex flex-col items-center gap-6">
        <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full text-slate-500 text-sm font-medium">
          Přesměrování za <span className="text-white font-bold">{seconds}s</span>
        </div>

        <Link 
          href="/"
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-95"
        >
          Chci tam hned <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}