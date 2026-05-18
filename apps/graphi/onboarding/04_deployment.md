# 04 - Deployment & Publishing

This project involves several deployment targets matching its different directories.

## Static Web Deployment (GitHub Pages)

The primary SvelteKit application is configured to build as a static site using `@sveltejs/adapter-static`.

1. The `pnpm build` command compiles the Svelte pages into static HTML/JS/CSS.
2. The output (usually placed in a `build/` or `docs/` folder) is deployed to GitHub Pages.
3. Relevant workflows can be found in `.github/workflows/deploy.yml` which handles the CI/CD pipeline.

## Desktop App Release

The `DesktopApp` folder contains the tools needed to package the application as executable formats.

- Pre-built installers (e.g. `Graphi-Desktop-Win-Installer.exe`, `.dmg`, `.AppImage`) are usually generated and drafted in GitHub Releases.
- GitHub Actions workflows automate the desktop build across different operating systems upon tagging a new release.

## CMS OAuth Worker

The `cms-oauth-worker` is likely a Cloudflare Worker or simple serverless function.

- It has its own deployment lifecycle. Usually, it's deployed using the `wrangler` CLI to Cloudflare, acting as an authentication proxy so the static CMS can modify content directly in the GitHub repository.

## Pre-Commit Standards

Before pushing, ensure your code passes the linting standards.

- The repository uses `husky` and `lint-staged`.
- Every commit invokes `prettier` to format files and `eslint` to check for code quality issues.
- If a commit fails, run `pnpm lint:fix` to auto-solve most formatting problems.
