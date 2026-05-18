# 🛠️ OmniVis Developer & Workflow Guide

Welcome to the **OmniVis** monorepo developer command guide. This document outlines how to maintain, synchronize, test, and deploy the entire OmniVis visual ecosystem for future development sessions.

---

## 📁 Repository Structure

```
omnivis_repo/
├── .github/workflows/deploy.yml   # Automated CI/CD (GitHub Pages + CF Worker)
├── apps/
│   ├── launchpad/                 # Premium high-contrast HTML landing hub
│   ├── graphi/                    # SvelteKit flow and diagram builder
│   ├── slidi/                     # Next.js canvas presentation editor
│   └── worker/                    # Hono API + Cloudflare D1 Backend Gateway
└── package.json                   # Root monorepo setup
```

---

## 🔄 1. Synchronizing Local Standalone Applications
If you or an AI agent make development changes inside the standalone project folders (e.g. `c:\Users\berol\Projekte\AiTools\slidi` or `c:\Users\berol\Projekte\AiTools\graphi`), you must sync them back to this monorepo using PowerShell:

### Sync Slidi:
```powershell
robocopy "c:\Users\berol\Projekte\AiTools\slidi" "c:\Users\berol\Projekte\AiTools\omnivis_repo\apps\slidi" /MIR /XD .git .next node_modules .claude
```

### Sync Graphi:
```powershell
robocopy "c:\Users\berol\Projekte\AiTools\graphi" "c:\Users\berol\Projekte\AiTools\omnivis_repo\apps\graphi" /MIR /XD .git .svelte-kit node_modules .claude
```

> [!WARNING]
> Because these synchronization commands mirror `/MIR` the directories, they will overwrite the custom configuration files required for **GitHub Pages Static Compilation**.
> You must re-apply or verify the static constraints below immediately after syncing.

---

## 🧱 2. GitHub Pages Static Build Constraints
GitHub Pages only hosts **flat static assets** (HTML/CSS/JS). There is no active Node.js server. Therefore, both applications must compile as static exports.

### Next.js (`apps/slidi`) Constraints:
1. **Static Output Target**:
   `next.config.ts` must have:
   ```typescript
   const nextConfig: NextConfig = {
     output: "export",
     basePath: process.env.NEXT_BASE_PATH ?? "",
     // ...
   }
   ```
2. **Dynamic Route Bypass**:
   Server-side API files, database hooks, and WebSocket dynamic routes will choke Next.js compile during a static export.
   The CI pipeline (`deploy.yml`) automatically strips these directories before running the build:
   ```bash
   rm -rf src/app/api src/app/collab src/app/view
   ```
3. **Presenter Static Shell**:
   `apps/slidi/src/app/presenter/page.tsx` must be a static shell so Next.js doesn't fail on request-time URL parameters:
   ```typescript
   export const dynamic = "force-static";
   import PresenterClient from "@/components/PresenterClient";
   export default function PresenterPage() {
     return <PresenterClient channelId="slidi-editor" />;
   }
   ```

### SvelteKit (`apps/graphi`) Constraints:
1. **Static Adapter**:
   `svelte.config.js` must be configured with `@sveltejs/adapter-static`:
   ```javascript
   import adapter from '@sveltejs/adapter-static';
   const config = {
     kit: {
       adapter: adapter({
         fallback: '404.html'
       }),
       paths: {
         base: process.env.BASE_PATH ?? ''
       }
     }
   };
   ```

---

## 💻 3. Local Workspace Development
Because of the nested Git structure and Husky hooks, running raw installs inside directories can cause `.git can't be found` errors.

### To Install Dependencies Safely:
Use `--ignore-scripts` to bypass Husky, followed by manual type syncs:

* **For Graphi (`apps/graphi`)**:
  ```powershell
  pnpm install --ignore-scripts
  pnpm exec svelte-kit sync
  ```
* **For Slidi (`apps/slidi`)**:
  ```powershell
  npm install --ignore-scripts
  ```
* **For Worker (`apps/worker`)**:
  ```powershell
  npm install
  ```

---

## ⚡ 4. Cloudflare D1 Database Migrations
If you make changes to the backend SQL database schema (`apps/worker/migrations/`), execute the migration against the remote production database using Wrangler:

```powershell
cd apps/worker
npx wrangler d1 execute omnivis-db --remote --file=./migrations/0001_initial.sql
```

---

## 🚀 5. Deploying Updates to GitHub Pages
Any commit pushed to the `main` branch of this repository automatically triggers the GitHub Actions pipeline.

The runner will:
1. Pull the codebase.
2. Compile **Launchpad** under `/`.
3. Compile **Graphi** under `/OmniVis/graphi` using Svelte adapter-static.
4. Compile **Slidi** under `/OmniVis/slidi` using Next export.
5. Deploy the **Hono Cloudflare Worker** automatically using your GitHub secrets (`CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID`).
6. Deploy the static assets to your GitHub Pages branch.
