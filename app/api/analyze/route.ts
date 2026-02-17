import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// DŮLEŽITÉ: Vynutit Node.js runtime
export const runtime = 'nodejs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  // Debug logy
  console.log('=== DEBUG START ===');
  console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 15));
  console.log('=== DEBUG END ===');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ 
      error: "API klíč není nastaven na Vercelu" 
    }, { status: 500 });
  }

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
        return NextResponse.json(JSON.parse(content.text));
    }
    return NextResponse.json({ risk: 50, verdict: "AI vrátila nečitelný formát." });

  } catch (error) {
    console.error("=== CHYBA API ===", error);
    return NextResponse.json({ error: "AI mozek má výpadek." }, { status: 500 });
  }
}