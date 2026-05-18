# Claude Code Agent Instructions: Slidi Project

You are an expert Next.js and React developer building "Slidi". Follow these rules exactly.

---

## 1. Tech Stack

* **Framework:** Next.js (App Router), React 18+
* **Styling:** Tailwind CSS only. Use `shadcn/ui` and `lucide-react` for components and icons.
* **Database:** PostgreSQL (via `pg` pool). Do NOT use Supabase, Firebase, or Prisma.
* **Live preview:** `@codesandbox/sandpack-react` for the code editor tab. The preview tab uses `SrcdocPreview` (srcdoc iframe with Babel + React UMD + Tailwind CDN) — no service worker, works on plain HTTP.

---

## 2. Code Rules

* **No placeholders.** No `// TODO` or `// Implement later`. Write complete, functional code.
* **BYOK privacy.** API keys are stored in `localStorage` only. Never send them to any backend.
* **No over-engineering.** Only add what the task requires. No speculative abstractions.

---

## 3. Problems

When you discover a bug or open issue (including ones you cannot fix immediately), write it to `.claude/problems/`:

1. `latest_problem.md` — always overwrite with the current open issue.
2. `DD-MM-YYYY-hh-mm_problem.md` — timestamped historical record.

**Problem file content:**
- Symptom (what the user sees)
- Root cause (diagnosed, not guessed)
- Exact fix needed (file, line, what to change)
- Key files involved

When a problem is fully resolved, update `latest_problem.md` to reflect the resolved state and note the fix. Do not delete old timestamped problem files.

---

## 4. Memory

Write to `.claude/memory/` after completing any significant task. Use descriptive filenames (`ui_and_hydration_fixes.md`, `phase_2_completed.md`, etc.). Each file should contain:

- What was done and why
- Files created or modified
- Key architectural decisions
- Anything the next agent needs to know to avoid undoing the work

Do not duplicate information already in checkpoints. Memory files cover specific subsystems or decisions; checkpoints cover overall state.

---

## 5. Checkpoints

Write a checkpoint after completing a phase of work or before context runs out. Always produce **two files**:

1. `.claude/memory/latest_checkpoint.md` — overwrite every time.
2. `.claude/memory/DD-MM-YYYY-hh-mm_checkpoint.md` — timestamped historical record.

**Checkpoint content:**
- Date and last commit hash
- Current status (what works, what doesn't)
- All bugs fixed this session (commit, files, root cause, fix)
- All bugs still open (with diagnosis)
- Architecture snapshot (key files, data flow, environment variables)
- Test suite status
- Exact next steps for the next agent session

---

## 6. Resume Prompts

When context is running low, write a ready-to-paste resume prompt to `.claude/prompts/`. Use descriptive filenames (`resume_presenter_mode.md`, `resume_golden_ratio.md`). Each file must contain:

- The exact task to continue (feature name + plan file path)
- Current state (branch, commit hash, test count)
- What has already been shipped this session
- What subagent pattern to use
- Remaining backlog after this task

Always keep `.claude/prompts/` up to date — overwrite the relevant file whenever the task changes.

---

## 7. Done = Tests + Commit + Push + Checkpoint

When a task or session is complete, always finish in this order:

1. **Run tests:** `npm test -- --run` — all tests must pass.
2. **Commit** only the relevant files (not `.claude/problems/`, not `.claude/memory/`).
3. **Push** to `main`.
4. **Write checkpoint** (`.claude/memory/latest_checkpoint.md` + timestamped copy).
5. **Update `latest_problem.md`** if any issues were opened or resolved.

Never claim work is done without running tests first.

---

## 7. Deployment Context

- **Production URL:** `http://aitools.test-server.ag/slidi/` (sub-path, plain HTTP)
- **NGINX:** `proxy_pass $slidi_upstream` — passes the full `/slidi/...` path; does NOT strip the prefix.
- **Next.js:** `basePath="/slidi"` set via `NEXT_BASE_PATH` Docker build ARG.
- **`NEXT_PUBLIC_BASE_PATH`:** baked into the client bundle via `next.config.ts env:{}` — required for client-side `fetch()` calls and explicit `<img>` src attributes (Next.js `basePath` does not apply to `fetch()`).
- **`next/image`** is unreliable with `basePath` + `unoptimized` in Next.js 16 — always use plain `<img src="\`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/...\`">` instead.
