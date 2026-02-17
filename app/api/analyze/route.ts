import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Kontrola API klíče
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ 
      error: "API klíč není nastaven" 
    }, { status: 500 });
  }

  // Inicializace uvnitř funkce - bezpečné
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
      // Odstraň markdown code blocky
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