import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Výsledek analýzy - NeKlikni.cz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // Přímé volání Supabase API (nejbezpečnější metoda pro generování obrázků na Vercelu)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/shared_results?id=eq.${resolvedParams.id}&select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    const json = await res.json();
    const report = json[0];

    if (!report) throw new Error("Report nenalezen");

    const isHigh = report.risk > 50;
    const bgColor = isHigh ? '#450a0a' : '#052e16'; // Tmavě červená vs Tmavě zelená
    const borderColor = isHigh ? '#ef4444' : '#22c55e';
    const textColor = isHigh ? '#f87171' : '#4ade80';

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(to bottom, #020617, #0f172a)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            padding: '40px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: bgColor,
              border: `4px solid ${borderColor}`,
              borderRadius: '32px',
              padding: '60px 40px',
              width: '80%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ fontSize: '140px', fontWeight: '900', color: textColor, lineHeight: 1, display: 'flex' }}>
              {report.risk}%
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: textColor, textTransform: 'uppercase', marginTop: '20px', letterSpacing: '2px', display: 'flex' }}>
              {isHigh ? 'POZOR: Vysoké riziko' : 'OK: Nízké riziko'}
            </div>
            <div style={{ fontSize: '32px', color: '#f1f5f9', textAlign: 'center', marginTop: '40px', fontStyle: 'italic', padding: '0 20px', display: 'flex' }}>
              "{report.verdict}"
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 40, fontSize: '28px', color: '#94a3b8', display: 'flex', fontWeight: 'bold', letterSpacing: '1px' }}>
            Prověřeno pomocí AI na NeKlikni.cz
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e) {
    // Nouzový obrázek, kdyby náhodou spadla databáze
    return new ImageResponse(
      (
        <div style={{ background: '#020617', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'white', fontSize: '60px', display: 'flex' }}>Výsledek analýzy - NeKlikni.cz</div>
        </div>
      ),
      { ...size }
    );
  }
}