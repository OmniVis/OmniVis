import { d1First } from "@/lib/d1";
import PresenterClient from "@/components/PresenterClient";

interface PresenterPageProps {
  searchParams: Promise<{ channel?: string; id?: string; slide?: string }>;
}

async function getPresentationData(id: string) {
  try {
    return await d1First<{ code_content: string; notes: string }>(
      "SELECT code_content, notes FROM presentations WHERE id = ?",
      [id]
    );
  } catch {
    // notes column may not exist on older schemas — fall back to code_content only
    try {
      const row = await d1First<{ code_content: string }>(
        "SELECT code_content FROM presentations WHERE id = ?",
        [id]
      );
      return row ? { code_content: row.code_content, notes: "" } : null;
    } catch {
      return null;
    }
  }
}

export default async function PresenterPage({ searchParams }: PresenterPageProps) {
  const { channel, id, slide } = await searchParams;
  const initialSlide = slide ? parseInt(slide, 10) : 0;
  let serverNotes: Record<number, string> | null = null;
  let serverCode: string | null = null;
  
  if (id) {
    const data = await getPresentationData(id);
    if (data) {
      serverCode = data.code_content;
      if (data.notes) {
        try {
          serverNotes = JSON.parse(data.notes);
        } catch {
          // Ignore invalid JSON
        }
      }
    }
  }

  return (
    <PresenterClient
      channelId={channel || "slidi-editor"}
      initialSlide={initialSlide}
      serverNotes={serverNotes || undefined}
      serverCode={serverCode || undefined}
    />
  );
}
