export async function GET() {
  const base = process.env.API_BASE!;
  const r = await fetch(`${base}/health`, { cache: "no-store" });
  const data = await r.json();
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
