export async function GET() {
  const base = process.env.API_BASE!;
  const r = await fetch(`${base}/lucky`, {
    headers: { "X-Api-Key": process.env.API_KEY! },
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
  });
}
