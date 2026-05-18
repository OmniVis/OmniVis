import { d1Query } from "@/lib/d1";

export async function GET() {
  try {
    const brandings = await d1Query(
      "SELECT id, name, logo_url, display, is_published, author_name FROM brandings WHERE is_published = 1 ORDER BY name ASC"
    );
    
    // Map D1 rows back to the store Branding interface format
    const results = brandings.map((b: any) => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logo_url,
      display: b.display || "both", // Fallback for old records or missing column
      isPublished: !!b.is_published,
      authorName: b.author_name
    }));

    return Response.json(results);
  } catch (err) {
    console.error("D1 Branding Fetch failed:", err);
    // Return empty list if table doesn't exist yet, instead of 500
    return Response.json([]);
  }
}
