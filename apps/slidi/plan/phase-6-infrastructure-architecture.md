# Phase 6: Infrastructure & Architecture

**Difficulty:** Hard  
**Focus:** Network requests, storage, and overall application architecture
**Status:** Completed and tested

---

## Task 1 — Global Caching

**Problem:** Load times for large presentations or high-resolution assets (like uploaded logos) can be slow. Re-generating or re-fetching same data consumes unnecessary resources.

**Files:**
- `src/lib/cache.ts` — **[NEW]** universal cache manager
- `src/store/slidiStore.ts` — integration with the cache
- `src/lib/storage.ts` — helper for IndexedDB or advanced LocalStorage management
- `public/sw.js` — **[OPTIONAL]** Service worker for asset caching

**Implementation Steps:**
1. **Asset Caching:**
   - Implement an IndexedDB-based cache for binary data (like uploaded logos) to avoid re-encoding base64 strings frequently.
   - Use a Service Worker to cache static assets (fonts, icons, base NGINX-served files).
2. **State Caching:**
   - Optimize the persistence layer to only write changed slices of the store to `localStorage`.
   - Implement "Stale-While-Revalidate" logic for fetching presentations: show cached version immediately, update if the remote version is different.
3. **Lazy Loading:**
   - Ensure components like the Gallery and complex editor panels are lazily loaded to reduce initial bundle size.

**Verification:** Re-opening a complex presentation after the first load is significantly faster. Uploaded assets load instantly without flickering. Browser "Network" tab shows most assets being served from the disk/service worker cache.
