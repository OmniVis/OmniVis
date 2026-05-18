const ADESSO_BASE_URL = "https://adesso-ai-hub.3asabc.de/v1";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: { message: "Missing Authorization header" } }, { status: 401 });
  }

  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${ADESSO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: { message: `adesso AI Hub unreachable: ${msg}` } }, { status: 502 });
  }

  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
