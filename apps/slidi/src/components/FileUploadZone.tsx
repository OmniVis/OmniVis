"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";

const ACCEPT = [
  ".pdf", ".pptx", ".ppt", ".docx", ".doc",
  ".xlsx", ".xls", ".csv", ".html", ".htm",
  ".txt", ".md", ".json", ".xml",
].join(",");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Paperclip button placed in the ChatPane tool row. */
export function AttachButton({ disabled }: { disabled?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addAttachedFile = useSlidiStore((s) => s.addAttachedFile);
  const attachedFiles = useSlidiStore((s) => s.attachedFiles);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Avoid duplicates
      if (attachedFiles.some((f) => f.name === file.name)) continue;

      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const res = await fetch(`${basePath}/api/convert`, {
          method: "POST",
          body: form,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          alert(`Could not convert "${file.name}":\n${data.error ?? "Unknown error"}`);
          continue;
        }

        addAttachedFile({ name: data.filename, markdown: data.markdown, size: file.size });
      } catch {
        alert(`Upload failed for "${file.name}". Check your connection and try again.`);
      } finally {
        setIsUploading(false);
      }
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Attach a file (PDF, PPTX, DOCX, XLSX, HTML…)"
        className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider border ${
          isUploading
            ? "bg-blue-50 border-blue-300 text-blue-600 cursor-wait"
            : "hover:bg-slate-100 bg-slate-50 border-slate-100 text-slate-700 disabled:opacity-40"
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Paperclip className="w-3 h-3" strokeWidth={2.5} />
        )}
        <span>{isUploading ? "Converting…" : "Attach"}</span>
      </button>
    </>
  );
}

/** File pills rendered above the chat textarea when files are attached. */
export function AttachedFilePills() {
  const attachedFiles = useSlidiStore((s) => s.attachedFiles);
  const removeAttachedFile = useSlidiStore((s) => s.removeAttachedFile);

  if (attachedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2 animate-in slide-in-from-bottom-2 duration-300">
      {attachedFiles.map((f) => (
        <div
          key={f.name}
          className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-2.5 py-1 group"
        >
          <FileText className="w-3 h-3 text-violet-500 flex-shrink-0" strokeWidth={2.5} />
          <span className="text-[11px] font-bold text-violet-700 truncate max-w-[140px]" title={f.name}>
            {f.name}
          </span>
          <span className="text-[10px] text-violet-400 font-medium">{formatBytes(f.size)}</span>
          <button
            type="button"
            onClick={() => removeAttachedFile(f.name)}
            className="ml-0.5 text-violet-400 hover:text-red-500 transition-colors leading-none"
            title={`Remove ${f.name}`}
          >
            <X className="w-3 h-3" strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Wraps a child element with drag-and-drop file handling.
 * Drop a supported file onto the wrapped area to trigger conversion.
 */
export function FileDropZone({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const addAttachedFile = useSlidiStore((s) => s.addAttachedFile);
  const attachedFiles = useSlidiStore((s) => s.attachedFiles);
  const [isUploading, setIsUploading] = useState(false);

  async function processFile(file: File) {
    if (attachedFiles.some((f) => f.name === file.name)) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${basePath}/api/convert`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`Could not convert "${file.name}":\n${data.error ?? "Unknown error"}`);
        return;
      }
      addAttachedFile({ name: data.filename, markdown: data.markdown, size: file.size });
    } catch {
      alert(`Upload failed for "${file.name}". Check your connection and try again.`);
    } finally {
      setIsUploading(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    if (disabled) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    // Only clear if leaving the zone entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }

  return (
    <div
      className="relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 rounded-[28px] border-2 border-dashed border-violet-400 bg-violet-50/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          ) : (
            <Paperclip className="w-6 h-6 text-violet-500" strokeWidth={2} />
          )}
          <p className="text-[11px] font-black text-violet-700 uppercase tracking-widest">
            {isUploading ? "Converting…" : "Drop to attach"}
          </p>
        </div>
      )}
    </div>
  );
}
