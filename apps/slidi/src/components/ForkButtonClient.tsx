"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitFork, X } from "lucide-react";

interface ForkButtonClientProps {
  shareId: string;
}

export default function ForkButtonClient({ shareId }: ForkButtonClientProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleConfirm = () => {
    router.push(`/?fork=${shareId}`);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
      >
        <GitFork className="w-3 h-3" />
        Fork
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-600 flex items-center justify-center">
                  <GitFork className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Fork Presentation
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Fork this presentation into a new session? This will open the
                editor with a copy of this presentation.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Fork
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
