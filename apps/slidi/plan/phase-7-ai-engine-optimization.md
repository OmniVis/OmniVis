# Phase 7: AI Engine Optimization & Slidi-Specific Intelligence

**Difficulty:** Hard  
**Focus:** Adesso AI Hub optimization, token efficiency for visual editing, and multi-modal interaction (Voice).
**Status:** Done and tested

---

## Task 1 — High-Performance Model Routing & Token Efficiency

**Problem:** Generating large slide decks is token-intensive. In "Visual Edit" mode, sending the entire presentation code for every small change wastes user credits and increases latency. Additionally, routing between Adesso Hub and public providers needs a more intelligent selection logic.

**Files:**
- `src/lib/ai/contextManager.ts` — **[NEW]** Intelligent context windowing (only send relevant slides for edits)
- `src/lib/ai/adessoOptimizer.ts` — **[NEW]** Specific optimizations for Adesso AI Hub (GPT-4o vs GPT-4o-mini routing)
- `src/lib/ai/semanticCache.ts` — **[NEW]** Local cache for common slide components and structural layouts
- `src/hooks/useVoiceToText.ts` — **[NEW]** React hook for the Web Speech API integration

**Implementation Steps:**
1. **Intelligent Context Windowing (Visual Edit):**
   - Implement "Selective Context": When a user edits a specific slide via Visual Edit, only send that slide's HTML and the global theme variables to the AI, rather than the full 10-slide deck.
   - Drastically reduces input tokens and speeds up the "thinking" time for localized changes.
2. **Adesso AI Hub Performance Tiering:**
   - Implement logic to automatically use "Light" models (mini) for simple formatting or spelling tasks, and "Heavy" models for structural generation or brand-new deck creation.
   - Add specialized error handling for Adesso Hub rate limits with automatic fallback to the next available tier.
3. **Semantic Component Caching:**
   - Hash user prompts for specific slide types (e.g., "Team Slide with 4 people"). If a similar request is made within the same session, serve the cached structural layout but inject new content to bypass generation wait times.
4. **Voice-to-Text Integration:**
   - Implement the microphone interaction flow using the Web Speech API as outlined in the [Voice Walkthrough](file:///C:/Users/berol/.gemini/antigravity/brain/3007de4a-804e-4430-be6c-34222ba76bed/voice_implementation_walkthrough.md).
   - Add "Speak to Edit" capability, allowing users to select an element and say "Make this text blue" or "Add a 3D shadow here."

**Verification:**
- Visual Editing response time is under 2 seconds for localized changes.
- Token consumption per "Edit" request is reduced by >60% compared to full-deck re-generation.
- Voice commands successfully populate the chat input and trigger generation.
- Adesso Hub routing correctly switches between model tiers based on task complexity.
