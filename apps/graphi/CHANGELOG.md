# Changelog - Graphi

All notable changes to Graphi will be documented in this file.

## [Recent] - 2026-06-22

### Fixed

- **Icon Picker — Architecture-Beta Drag-Drop**: `markDropTargets()` used `g.node`/`g.icon-shape` selectors which are flowchart-only. Mermaid renders architecture-beta services and groups as `g.node-service`/`g.node-group`, so drag-over highlight never fired and drops were silently ignored. Added both classes to the selector.

## [Previous] - 2026-06-08

### Fixed

- **Thumbnail Preview Error SVGs**: Mermaid v11 returns an error SVG (instead of throwing) for syntax errors, causing "Syntax error in text / mermaid version 11.12.0" to render visibly inside explorer cards. Preview now detects the error marker and shows a clean "Preview unavailable" placeholder instead.
- **Orphaned Mermaid DOM Elements**: Mermaid's `render()` creates a temporary `#d{id}` element in `document.body` that was not always removed. It is now explicitly cleaned up after every render call to prevent stray elements appearing outside the app.
- **Chunk Loading Failures**: Added a client-side `unhandledrejection` handler (`src/hooks.client.ts`) that automatically reloads the page when a dynamically imported module fails to fetch — fixing stale browser-cache errors (`Failed to fetch dynamically imported module`) that occurred after new deployments.

## [Previous] - 2026-05-12

### Added

- **Visual Overhaul**: High-impact design update to match Slidi's blocky aesthetic.
- **UI Tabs**: Polished views for History, Templates, Themes, and AI Assistant.
- **AI Repair**: Custom error container with automatic AI-assisted repair for diagrams.
- **Status Page**: Added a diagnostics page to check engine and environment health.

### Fixed

- **Routing**: Fixed 404 errors related to base path and asset loading.
- **Svelte Warnings**: Fixed component placement rules in Svelte templates.
