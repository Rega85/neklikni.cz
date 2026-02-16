import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
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
    console.error("Chyba API:", error);
    return NextResponse.json({ error: "AI mozek má výpadek." }, { status: 500 });
  }
}