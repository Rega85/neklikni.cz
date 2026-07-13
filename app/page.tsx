import { getRecentPublishedIncidents } from "./databaze/_lib/recentIncidents";
import HomeClient from "./components/HomeClient";

export default async function Home() {
  // Server-side fetch — stejný zdroj jako /overit, jen jiná spotřeba
  // (klidový stav pravého panelu OveritClient na desktopu).
  const recentIncidents = await getRecentPublishedIncidents(4);

  return <HomeClient recentIncidents={recentIncidents} />;
}
