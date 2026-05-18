---
title: Session Auto-Naming from Presentation Title
difficulty: Easy
importance: Low
category: Frontend, UX
status: Backlog
---

# Feature Request: Session Auto-Naming

## Description
When a session is saved (via "New" button or explicitly), automatically detect the presentation's title from the generated code and use it as the session name instead of "Presentation N".

## Requirements
- Parse the first string literal that looks like a title from the generated code
  - Look for: `const title = "..."`, `<h1>...</h1>`, or the first `totalSlides` comment block header
  - Regex: extract first quoted string after `title =` or `title:`, or first `<h1>` content
- Fallback to "Presentation N" if no title found
- Max 50 characters, truncated with ellipsis
- Only auto-names on first save — user renames override this and are never auto-changed
