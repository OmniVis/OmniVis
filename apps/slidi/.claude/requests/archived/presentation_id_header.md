---
title: Show Presentation ID in Header Breadcrumb
difficulty: Easy
importance: Medium
category: Frontend, UI/UX
status: Implemented
---

# Feature Request: Presentation ID in Header

## Description
Display the ID of the currently open/active presentation in the header bar next to the "Slidi /" breadcrumb. This helps users identify which presentation they are currently working on, especially when sharing or referencing a version.

## Requirements
- Show the presentation version/share ID directly in the header breadcrumb area.
- Should be short (truncated) but hoverable to reveal the full ID.
- Show a neutral dash placeholder when no presentation is loaded.

## Implementation Notes
- [x] Header now reads `currentVersionId` from the Zustand store.
- [x] Renders a truncated (8-char) ID pill in monospace font after "Slidi /".
- [x] Full ID visible on hover via `title` attribute.
- [x] Falls back to `—` when no presentation is loaded.
