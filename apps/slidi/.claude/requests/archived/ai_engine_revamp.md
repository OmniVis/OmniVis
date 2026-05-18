---
title: AI Engine Revamp
difficulty: High
importance: High
category: AI, Generation, Reliability
status: Backlog
---

# Feature Request: AI Engine Revamp

## Description
Improve the presentation generation engine so outputs are consistently complete, higher quality, and less likely to stop mid-deck (for example after slide 5).  
The current single-pass generation should be upgraded with better prompt structure, stronger validation, and optional chained generation passes.

## Requirements
- Introduce a multi-step generation flow (plan -> generate -> validate/fix) to reduce truncated responses.
- Strengthen prompt instructions so slide count, component structure, and completion criteria are explicit and testable.
- Add completion checks before accepting output (minimum slide count, required `Presentation` export, balanced structure).
- Implement retry/fallback behavior when output is incomplete instead of silently accepting partial code.
- Keep provider compatibility across existing engines (`openai`, `anthropic`, `gemini`, `adesso`).
- Improve user-facing generation feedback in the chat status (e.g., planning, generating, finalizing).