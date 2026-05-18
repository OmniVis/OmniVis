# 02 - Project Structure

The project is structured around a SvelteKit core, but includes additional applications and extensions in its root.

## Root Directories

- **`src/` - The Core Web Application**
  This is the primary SvelteKit application.
  - `src/routes/`: Contains SvelteKit pages and layouts (`+page.svelte`, `+layout.svelte`). This defines the routing of the application.
  - `src/lib/`: Reusable code.
    - `src/lib/components/`: Reusable Svelte UI components (e.g., `Navbar.svelte`, buttons, editors).
    - `src/lib/util/`: Helper functions, state management, and IndexedDB wrappers (`idb.ts`, `fileMetadata.svelte.ts`).
    - `src/lib/github/`: GitHub API integrations for cloud saving/loading.
  - `src/content/`: Contains content configurations, like `cms-config.json` for static CMS purposes.

- **`static/` - Public Assets**
  Files placed here are served at the root path `/` during development and after building. This includes:
  - Application icons, favicons, logos (`graphi-logo.png`).
  - Required files for PWA (Progressive Web App) functionality, like `manifest.json` and `service-worker.js`.

- **`DesktopApp/` - Desktop Wrapper**
  Contains configurations (like its own `package.json`) to wrap the Mermaid Live Editor into a standalone desktop application (likely using Electron or Tauri, depending on the builder scripts).

- **`cms-oauth-worker/` - CMS Authentication**
  A serverless worker directory (e.g., Cloudflare Workers) that acts as an OAuth bridge for a static CMS integration, allowing users to authenticate via GitHub.

- **`tests/`**
  End-to-End tests built with Playwright.

- **`docs/`**
  Often used for GitHub Pages or static site generation output.

## Configuration Files

- **`svelte.config.js`** / **`vite.config.js`**: Core configurations for building the application.
- **`tailwind.config.ts`** _(or equivalent)_: The styling framework used across the app.
