import { d1Run } from "@/lib/d1";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, logoUrl, display, authorName } = body;

  if (!name || !display) {
    return Response.json({ error: "Missing required fields: name, display mode" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  try {
    await d1Run(
      "INSERT INTO brandings (id, name, logo_url, display, is_published, author_name) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        name,
        logoUrl || "",
        display,
        true,
        authorName || "Anonymous"
      ]
    );
  } catch (err) {
    console.error("D1 Branding Publish failed:", err);
    return Response.json({ error: "Database error. Ensure 'brandings' table exists." }, { status: 500 });
  }

  return Response.json({ id, success: true });
}
