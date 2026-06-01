# Changelog - Slidi

All notable changes to Slidi will be documented in this file.

## [Recent] - 2026-06-01

### Added
- **V4 Executive Engine**: Introduced the hyper-modern V4 engine featuring `BENTO-GRID` and `NARRATIVE-CHART` layouts. Integrated top-tier consulting principles (McKinsey/BCG) directly into the AI prompt to enforce "Action Titles" and the "60-Second Rule" (one message per slide).
- **Settings UI Redesign**: Overhauled the Settings Engine tab with a beautiful, categorized CSS Grid layout, grouping options into "Current Standard", "Alternative Modes", and "Legacy Support" with subtle hover micro-animations.

### Fixed
- **Engine Version Typings**: Fixed a strict typing issue causing the Turbopack build to fail when parsing the new V4 engine exports in `slidiStore.ts`.

## [Previous] - 2026-05-18

### Added
- **Interactive Onboarding Walkthrough**: Implemented a premium, layout-aware interactive step-by-step tour for new users. Features a glassmorphic welcome card, a hardware-accelerated SVG spotlight masking layer with ResizeObserver-based boundary tracking, action-gated progress (requires toggling the Paintbrush visual editor to advance from Step 3), and automated sandbox template seeding for blank states.
- **File Ingestion (MarkItDown Integration)**: Attach documents (PDFs, DOCX, XLSX, PPTX, etc.) to your chat. The system automatically converts them to clean Markdown and injects them into the AI's generation context to create structured decks from your raw files.
- **Persistent Collaboration Sharing**: Added a persistent "Invite" button to the header for active collaboration sessions, ensuring you can copy and share the session link at any point.
- **Improved Collaboration Presence**: Added a "Waiting for guests..." status indicator to the Presence Bar to confirm the session is active and ready even when no other users have connected yet.
- **Slide Edit Mode**: Toggle "Slide N Mode" to target edits directly to your current active slide rather than regenerating the entire deck.

### Fixed & Optimizations
- **Gallery Loading Freeze**: Unified IndexedDB version management across the offline queue and local database handlers, successfully fixing the issue where gallery previews were stuck in a "Loading preview..." state.
- **Instantly Rendered Thumbnails**: Resolved race conditions and standardized default session history parameters so gallery card preview thumbnails load instantly.
- **Double BasePath Invite URLs**: Fixed an issue causing collaborative invite links to sometimes contain a duplicate basePath segment.
- **Status API Diagnostics**: Expanded system diagnostics to monitor disk space usage in the System Status API.
- **Store Selector Optimization**: Refactored Zustand store selectors in the file uploading area to eliminate redundant component rendering cycles and improve browser responsiveness.

### Removed
- **Live Audience Mode**: Completely deprecated and removed the live audience presentation broadcasting and viewer Q&A queues, simplifying the codebase and doubling down on WebSocket-based real-time collaborative editing as the primary team collaboration experience.

## [1.0.0] - 2026-05-12

### Added
- **Real-time Collaboration**: Work together with others in real-time.
- **Live Audience Mode**: Share your presentation live with followers. (Deprecated in v1.1.0)
- **Offline Support**: Better resilience when network is unstable.
- **Manual Save Button**: Save your presentations to local library or cloud on demand.
- **Guest Profiles**: Added profile dropdown and direct 'Login with Key' option for guests.

### Fixed
- **Sync Reliability**: Fixed issues where presentation code could be wiped during sync.
- **UI Polishing**: Fixed header overflow and modal layering issues.
- **Chat Persistence**: Fixed issues with chat messages disappearing on reload.
