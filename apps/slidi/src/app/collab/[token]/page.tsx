"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSlidiStore } from "@/store/slidiStore";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Collab invite landing page — /collab/[token]
 *
 * Validates the invite token, loads the shared presentation into the editor,
 * and redirects to the main editor with collab mode active.
 */
export default function CollabInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { loadCloudPresentation, setCollabSessionId } = useSlidiStore();
  const [status, setStatus] = useState<"loading" | "error" | "joining">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function join() {
      const token = params.token;
      if (!token) { setStatus("error"); setErrorMessage("Invalid invite link."); return; }

      // 1. Validate the invite token
      let presentationId: string;
      try {
        const res = await fetch(`${BASE}/api/collab/invite/${token}`);
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setErrorMessage(data.error ?? "Invite not found or expired.");
          setStatus("error");
          return;
        }
        const data = (await res.json()) as { presentationId: string };
        presentationId = data.presentationId;
      } catch {
        setErrorMessage("Network error — please try again.");
        setStatus("error");
        return;
      }

      // 2. Load the presentation code
      try {
        const res = await fetch(`${BASE}/api/share/${presentationId}`);
        if (!res.ok) { setErrorMessage("Presentation not found."); setStatus("error"); return; }
        const data = (await res.json()) as { code?: string };
        if (!data.code) { setErrorMessage("Presentation has no content."); setStatus("error"); return; }

        setStatus("joining");
        loadCloudPresentation(data.code, "Shared presentation", presentationId);
        setCollabSessionId(presentationId);
        // Redirect to editor — useCollabSession in SlidiEditor will pick up collabSessionId
        router.replace(`${BASE}/`);
      } catch {
        setErrorMessage("Failed to load presentation.");
        setStatus("error");
      }
    }
    join();
  // params.token is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "joining") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-semibold">Joining collaborative session…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900">Invite invalid</h1>
          <p className="text-sm text-slate-600">{errorMessage}</p>
          <Link
            href={`${BASE}/`}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Go to Slidi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
