# 01 - Getting Started

This document covers everything you need to get the GraphiTeam Mermaid Editor running on your local machine.

## Prerequisites

- **Node.js**: The project requires Node `>=20.19.0` (as defined in `package.json`).
- **Package Manager**: Make sure you have `pnpm` installed. (The project specifies `pnpm@10.10.0+`).
- **Git**: For version control.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/GraphiTeam/GraphiTeam.git
   cd GraphiTeam
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
   _(During installation, the `postinstall` hook runs `svelte-kit sync` and sets up `husky` for git hooks.)_

## Running the Development Server

To start the Vite development server with Hot Module Replacement (HMR):

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Useful Scripts

Here is a quick overview of the most common scripts in `package.json`:

- **`pnpm dev`**: Starts the local dev server.
- **`pnpm build`**: Builds the SvelteKit app for production.
- **`pnpm preview`**: Previews the production build locally.
- **`pnpm lint`** & **`pnpm lint:fix`**: Runs Prettier and ESLint.
- **`pnpm test`**: Runs both unit tests (`vitest`) and end-to-end tests (`playwright`).

## Next Steps

Now that the project is running, learn about the repository layout in the [Project Structure](./02_project_structure.md) guide.
