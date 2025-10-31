export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const base = process.env.API_BASE!;
  const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}`, {
    headers: { "X-Api-Key": process.env.API_KEY! },
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" },
  });
}
