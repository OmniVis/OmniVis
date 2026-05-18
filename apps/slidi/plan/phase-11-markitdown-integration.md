# Phase 11: File Ingestion & MarkItDown Integration

**Difficulty:** Hard  
**Focus:** Converting external files (PDF, PowerPoint, Word, Excel, Images, Audio, HTML, etc.) to Markdown using Microsoft's MarkItDown to serve as rich context for AI slide generation.
**Status:** Pending

---

## Task 1 — Python Bridge / Microservice for MarkItDown

**Problem:** `markitdown` is a Python library by Microsoft, but Slidi is a Next.js (TypeScript) application. We need a robust bridge to run the Python library and return the converted Markdown to our Node.js environment.

**Files:**
- `src/server/converter/convert.py` — **[NEW]** Python script that imports `markitdown` and processes a file path or buffer.
- `src/app/api/convert/route.ts` — **[NEW]** Next.js API route handling multipart/form-data file uploads and spawning the Python process.
- `package.json` — add a script to check/install Python dependencies if running locally.

**Implementation Steps:**
1. **Python Script (`convert.py`):**
   - A standalone script that takes a file path as a command-line argument.
   - Uses `from markitdown import MarkItDown`.
   - Returns the generated Markdown to `stdout`.
   - Handles exceptions gracefully and returns error messages to `stderr`.

2. **API Route (`/api/convert`):**
   - Receives the file via standard file upload.
   - Saves it to a temporary directory in the workspace (or passes it via stdin if small).
   - Uses Node's `child_process.spawn` or `exec` to call `python src/server/converter/convert.py <path_to_file>`.
   - Reads `stdout` to get the Markdown content.
   - Cleans up the temporary file immediately.
   - Returns `{ markdown: string, filename: string }` to the frontend.

3. **Fallback/Containerization:**
   - If Python is not installed on the host system, return a clear error to the UI asking the user to install Python and `pip install markitdown`.
   - For production (if deployed via Docker), ensure the Dockerfile installs Python 3 and the `markitdown` package.

**Verification:**
- Uploading a `.pptx` or `.pdf` file to the endpoint returns a valid Markdown representation of its content.
- Uploading unsupported files or corrupt files returns a proper JSON error without crashing the server.

---

## Task 2 — File Upload UI & Context Management

**Problem:** Users need an intuitive way to upload files in the Chat area and see that the AI is using them as context.

**Files:**
- `src/components/FileUploadZone.tsx` — **[NEW]** Drag-and-drop or file picker component inside the ChatPane.
- `src/store/slidiStore.ts` — add `attachedFiles` (array of { name, markdown, size }) state.

**Implementation Steps:**
1. **`FileUploadZone` Component:**
   - A subtle dashed area or a clip icon in the chat input.
   - Supports standard file picker and drag-and-drop.
   - Shows a loading spinner while the file is uploading and converting.
   - Displays attached files as "pills" or small cards above the input box with a delete button.

2. **Store Updates:**
   - Add `attachedFiles` array to the store state.
   - Add `addAttachedFile` and `removeAttachedFile` actions.
   - Automatically clear attached files after a successful slide generation (or keep them if pinned).

**Verification:**
- Dragging a PowerPoint file into the chat triggers the upload and shows a loading state.
- Once completed, a pill with the filename appears.
- Clicking the 'X' on the pill removes it from the store.

---

## Task 3 — Injecting Converted Context into the AI Prompt

**Problem:** The AI needs to be aware of the uploaded content and use it to construct the slides instead of just replying generally.

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** Update the prompt builder to include file context.
- `src/components/ChatPane.tsx` — **[MODIFIED]** Pass attached files when sending the message.

**Implementation Steps:**
1. **Prompt Modification (`prompt.ts`):**
   - In `buildSystemPrompt` or wherever the user prompt is constructed, check if `attachedFiles` has items.
   - Append a section:
     ```markdown
     # ATTACHED CONTEXT DOCUMENTS
     The user has uploaded documents to serve as context for this presentation. Prioritize the information found in these documents when generating slide content.
     
     --- File: [filename] ---
     [Extracted Markdown Content]
     ------------------------
     ```
   - This ensures the AI grounds its generation in the uploaded materials.

2. **UI Integration:**
   - When the user sends a chat message, the frontend bundles the message text along with the Markdown content of all currently attached files.

**Verification:**
- Upload a file containing specific facts about turtles (or animes).
- Ask the AI to "create a presentation based on the attached file".
- Verify that the generated slides contain the specific facts from the uploaded file rather than generic knowledge.
