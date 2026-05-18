# 03 - Core Concepts & Architecture

To contribute effectively, you should be familiar with the main libraries and paradigms used in this application.

## 1. UI Framework: SvelteKit & Svelte 5

The app is built using **SvelteKit**. It utilizes Svelte 5's cutting-edge reactivity features (like `$state`, `$derived`, and `$effect`). When reading state files (e.g., in `src/lib/util/fileMetadata.svelte.ts`), you will see these runes used for reactive stores instead of the older Svelte 4 `writable` paradigm.

## 2. Editor Integration: CodeMirror

The text editing experience is powered by **CodeMirror 6**. Look for dependencies like `@codemirror/state` and `@codemirror/view`. CodeMirror provides the syntax highlighting, line numbering, and editing mechanics for writing Mermaid code.

## 3. Diagram Rendering: Mermaid JS

The app uses the official `mermaid` NPM package. When a user types in the editor, the Svelte application takes the raw string, passes it to the `mermaid.render()` API, and injects the resulting SVG into the preview pane. It also utilizes layout extensions like `@mermaid-js/layout-elk`.

## 4. Local Persistence: IndexedDB

Since this is a privacy-first, client-side application, diagrams are heavily relying on local storage.

- The `idb` package is used to interface with the browser's IndexedDB.
- You can find the logic for handling file handles, virtual files, and user storage in `src/lib/util/idb.ts`.

## 5. Collaboration & Sync (Yjs)

The `package.json` includes `yjs` and `y-webrtc`. These are Real-time Collaboration frameworks using CRDTs (Conflict-free Replicated Data Types). It implies the editor supports or is built to support collaborative editing, allowing multiple users to edit the same diagram in real-time over WebRTC.

## 6. Styling: TailwindCSS

All styling uses **TailwindCSS** (v4.x). Components use utility classes directly in the markup. UI components are often built using `bits-ui` and potentially an abstraction like `shadcn-svelte` (indicated by custom `Button`, `Dialog` components).
