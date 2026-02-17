import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_PEPPER)
    .digest('hex');
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ 
      error: "API klíč není nastaven" 
    }, { status: 500 });
  }

  // Zkontroluj, jestli je uživatel přihlášený
  let isLoggedIn = false;
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}, // V API route nepotřebujeme zapisovat cookies
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    isLoggedIn = !!user;
  } catch (e) {
    console.error('Auth check failed:', e);
  }

  // Rate limit check - POUZE pro nepřihlášené uživatele
  if (!isLoggedIn) {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const ipHash = hashIP(ip);
    const today = new Date().toISOString().split('T')[0];
    const FREE_LIMIT = 3;
    
    try {
      const { data, error } = await supabase
        .rpc('increment_usage_daily', {
          p_ip_hash: ipHash,
          p_day: today
        });

      if (error) throw error;

      const checks = data as number;

      if (checks > FREE_LIMIT) {
        return NextResponse.json({
          error: "limit",
          limit: FREE_LIMIT,
          verdict: `Využil jsi ${FREE_LIMIT} analýzy zdarma dnes. Přejdi na PRO verzi pro neomezený přístup.`
        }, { status: 429 });
      }

    } catch (e) {
      console.error('Rate limit check failed:', e);
    }
  }

  // Inicializace Anthropic
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const { text } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: "Jsi přísný expert na kyberbezpečnost. Analyzuj text a odhal podvody (scamy, phishing, falešné výhry). Pokud jde o dar od cizích lidí nebo loterii, je to VŽDY vysoké riziko. Odpověz POUZE v JSON: { \"risk\": číslo_0_až_100, \"verdict\": \"české vysvětlení\" }",
      messages: [{ role: "user", content: text }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      let jsonText = content.text.trim();
      jsonText = jsonText.replace(/^```json\s*/i, '');
      jsonText = jsonText.replace(/\s*```$/, '');
      jsonText = jsonText.trim();
      
      const result = JSON.parse(jsonText);
      
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ risk: 50, verdict: "AI vrátila nečitelný formát." });

  } catch (error) {
    console.error("=== CHYBA API ===", error);
    return NextResponse.json({ 
      error: "AI mozek má výpadek.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}