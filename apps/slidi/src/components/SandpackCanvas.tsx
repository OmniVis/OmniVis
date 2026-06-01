"use client";

import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useSlidiStore } from "@/store/slidiStore";
import { THEMES } from "@/lib/themes";
import { useEffect } from "react";
import SrcdocPreview from "./SrcdocPreview";

interface SandpackCanvasProps {
  activeView: "preview" | "code";
}

const ENTRY_FILE = "/App.js";

/**
 * Tracks the last code pushed from the store into Sandpack so CodeSyncBack
 * can ignore those echoes and only push genuine user edits.
 */
let _lastAIPushedCode = "";

/**
 * Patterns that could be used to exfiltrate data or escape the sandbox.
 * The iframe already has sandbox="allow-scripts" (no allow-same-origin) so
 * postMessage + parent.location are the main cross-origin vectors worth blocking.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /window\s*\.\s*(parent|top|opener)\s*\.\s*location/,
  /document\s*\.\s*location/,
  /\bfetch\s*\(/,
  /new\s+XMLHttpRequest/,
  /new\s+WebSocket\s*\(/,
  /navigator\s*\.\s*sendBeacon/,
  /import\s*\(/,           // dynamic import
  /\brequire\s*\(/,        // CommonJS
  /<script[\s>]/i,         // raw <script> tags (JSX safety)
  /javascript\s*:/i,       // javascript: URIs
  /data\s*:\s*text\/html/i, // data URIs that embed HTML
];

function containsDangerousCode(code: string): boolean {
  return DANGEROUS_PATTERNS.some((re) => re.test(code));
}

/**
 * Syncs user edits in the Sandpack code editor back into the Zustand store.
 * Skips pushing when the content matches the last AI-generated code.
 * Blocks pushes that contain patterns capable of data exfiltration.
 */
function CodeSyncBack() {
  const { sandpack } = useSandpack();
  const pushVersion = useSlidiStore((s) => s.pushVersion);

  useEffect(() => {
    const code = sandpack.files[ENTRY_FILE]?.code ?? "";
    if (code && code !== _lastAIPushedCode && !containsDangerousCode(code)) {
      const timer = setTimeout(() => pushVersion(code), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files]);

  return null;
}

export default function SandpackCanvas({ activeView }: SandpackCanvasProps) {
  const generatedCode = useSlidiStore((s) => s.generatedCode);
  const theme = useSlidiStore((s) => s.theme);
  const inspectMode = useSlidiStore((s) => s.inspectMode);
  const branding = useSlidiStore((s) => s.branding);
  const currentVersionId = useSlidiStore((s) => s.currentVersionId);
  const sandpackTheme = THEMES[theme].sandpackTheme;

  // ── Preview tab ──────────────────────────────────────────────────────────
  if (activeView === "preview") {
    return (
      <SrcdocPreview
        code={generatedCode}
        theme={theme}
        inspectMode={inspectMode}
        branding={branding}
        syncChannel={currentVersionId || "slidi-editor"}
        onElementSelect={(payload) => {
          useSlidiStore.getState().setSelectedElement(payload);
        }}
        onElementDeselect={() => {
          useSlidiStore.getState().setSelectedElement(null);
        }}
      />
    );
  }

  // ── Code editor tab ──────────────────────────────────────────────────────
  // Only mount SandpackProvider here (not for preview) so the sandpack client
  // never tries to register a service worker in preview mode.
  // autorun: false prevents the bundler from starting at all — the editor is
  // purely CodeMirror and doesn't need the sandpack runtime.
  // key={theme} forces SandpackProvider to remount when the theme changes so
  // the CodeMirror syntax-highlighting theme updates immediately.
  _lastAIPushedCode = generatedCode;
  const files = {
    [ENTRY_FILE]: { code: generatedCode, active: true },
  };

  return (
    <div key={theme} className="w-full h-full flex flex-col">
      <SandpackProvider
        template="react"
        files={files}
        options={{
          autorun: false,
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
        customSetup={{ dependencies: {} }}
        theme={sandpackTheme}
      >
        <CodeSyncBack />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-sm border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="h-10 bg-slate-900 flex items-center px-4 justify-between border-b border-slate-800 shrink-0">
            <span className="text-xs font-mono text-slate-300">App.js</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Generated
            </span>
          </div>
          {/* relative wrapper gives CodeMirror a definite pixel height
              independent of the sp-wrapper flex cascade */}
          <div className="flex-1 min-h-0 relative">
            <SandpackCodeEditor
              style={{ position: "absolute", inset: "0", height: "100%" }}
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          </div>
        </div>
      </SandpackProvider>
    </div>
  );
}
