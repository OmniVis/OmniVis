---
title: Keyboard Shortcuts
difficulty: Easy
importance: Medium
category: Frontend, UX
status: Backlog
---

# Feature Request: Keyboard Shortcuts

## Description
Add keyboard shortcuts for common actions to speed up the presentation editing workflow.

## Requirements
- `Ctrl+Z` → Undo (call existing `undo()` store action)
- `Ctrl+Shift+Z` / `Ctrl+Y` → Redo (call existing `redo()` store action)
- `Escape` → Close Gallery drawer or Theme sidebar (whichever is open)
- Shortcuts should NOT fire when focus is inside a textarea or input field
- No new UI needed — these are invisible quality-of-life improvements
