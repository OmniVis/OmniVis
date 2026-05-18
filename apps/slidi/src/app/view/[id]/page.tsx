import { notFound } from "next/navigation";
import { d1First, d1Run } from "@/lib/d1";
import ForkButtonClient from "@/components/ForkButtonClient";
import PresentButtonClient from "@/components/PresentButtonClient";
import ViewerSandpackLoader from "@/components/ViewerSandpackLoader";
import ViewerSlideBox from "@/components/ViewerSlideBox";
import Link from "next/link";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ViewerPageProps {
  params: Promise<{ id: string }>;
}

interface PresentationRow {
  code_content: string;
  view_count: number;
}

async function getPresentation(id: string): Promise<PresentationRow | null> {
  try {
    // Increment first, then read
    await d1Run(
      "UPDATE presentations SET view_count = view_count + 1 WHERE id = ?",
      [id]
    );
    const result = await d1First<PresentationRow>(
      "SELECT code_content, view_count FROM presentations WHERE id = ?",
      [id]
    );
    return result ?? null;
  } catch {
    // If view_count column doesn't exist yet (pre-migration), fall back to code_content only
    try {
      const result = await d1First<{ code_content: string }>(
        "SELECT code_content FROM presentations WHERE id = ?",
        [id]
      );
      return result ? { code_content: result.code_content, view_count: 0 } : null;
    } catch {
      return null;
    }
  }
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { id } = await params;

  if (!UUID_RE.test(id)) notFound();

  const presentation = await getPresentation(id);

  if (!presentation) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Slim top bar */}
      <header className="h-11 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/" replace className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* Plain img — next/image + unoptimized + basePath is unreliable in Next 16 */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Combination_Mark.svg`}
              alt="Slidi logo"
              className="h-5 w-auto object-contain"
            />
          </Link>
          <span className="text-xs font-mono text-slate-500">/ {id}</span>
          {presentation.view_count > 0 && (
            <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {presentation.view_count.toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PresentButtonClient
            id={id}
            basePath={process.env.NEXT_PUBLIC_BASE_PATH ?? ""}
          />
          <ForkButtonClient shareId={id} />
        </div>
      </header>

      {/* Grid background + 16:9 letterbox */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Slide box — uses ResizeObserver-based scale identical to the editor */}
        <ViewerSlideBox>
          <ViewerSandpackLoader code={presentation.code_content} id={id} />
        </ViewerSlideBox>
      </div>
    </div>
  );
}
