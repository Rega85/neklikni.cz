import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_total_analyses');
    
    if (error) throw error;
    
    // Tady přičítáme ten základ 1000, ať to na startu nevypadá jako město duchů
    return NextResponse.json({ total: (data || 0) + 1000 });
  } catch (err) {
    console.error("Chyba při načítání statistik:", err);
    // Pokud se něco pokazí, ať aspoň ukážeme to magické číslo
    return NextResponse.json({ total: 1000 }); 
  }
}