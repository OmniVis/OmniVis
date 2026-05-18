---
title: HTML Export / Download
difficulty: Easy
importance: High
category: Frontend, Functionalities
status: Backlog
---

# Feature Request: HTML Export

## Description
Allow users to download their current presentation as a self-contained HTML file that works offline in any browser — no server, no build step needed.

## Requirements
- "Download" button in the Header (next to Share)
- Clicking it generates a `.html` file and triggers browser download
- The downloaded file is fully self-contained: references React, Babel, Tailwind from CDN — identical to what SrcdocPreview renders
- File is named after the current session name (or "presentation.html" as fallback)
- Button disabled when no presentation is generated

## Implementation Notes
- The `buildSrcdoc` function in `SrcdocPreview.tsx` already produces the exact HTML needed
- Move it to `src/lib/srcdoc.ts` and export it so both `SrcdocPreview` and the download button can use it
- Download via `URL.createObjectURL(new Blob([html], { type: "text/html" }))`
- The exported HTML should NOT include the `sl_slide_change` postMessage code (it's only needed for editor sync)
- Theme and branding should be baked into the exported file
