# Mega-Detailed System Index: Graphical Diagram Editor and Renderer (GDER)

This is the ultimate mapping of the GDER project, indexing every critical sector and component with extreme technical granularity.

## Mega-Tree Structure

```text
/
├── .github/                      # [Safety] Automation protocols for global system validation.
│   └── workflows/                # CI/CD pipelines for automated testing and delivery.
├── .vscode/                      # Development environment sensory configurations.
├── bin/                          # Executable binary logic for CLI-level engine interaction.
├── cms-oauth-worker/             # [Auth] External gateway for satellite authentication services.
│   ├── src/index.js              # The primary entry node for the OAuth worker.
│   └── wrangler.toml             # Configuration for the Edge-based authentication worker.
├── DesktopApp/                   # [Auxiliary] Local workstation integration layer.
│   ├── preload.js                # Secure bridge for IPC communication in the desktop chassis.
│   ├── tray.js                   # Logic for the background system-tray monitoring icon.
│   └── zip_releases.js           # Automated script for packaging desktop distribution cores.
├── src/                          # The core propulsion and logic assembly.
│   ├── lib/                      # [Power Generation] The analytical engine for diagram parsing.
│   │   ├── components/           # Modular units for UI-based interaction and rendering.
│   │   │   ├── AIChatSidebar.svelte   # AI-driven navigational aid for diagram generation.
│   │   │   ├── Actions.svelte         # Trigger mechanisms for system execution commands.
│   │   │   ├── CopyButton.svelte      # Utility for duplicating data packets to the clipboard.
│   │   │   ├── DesktopEditor.svelte   # Workstation-optimized control bridge.
│   │   │   ├── FileExplorer/          # [Navigation] Internal data registry navigator.
│   │   │   │   └── FileExplorer.svelte # Visual interface for the asset file explorer.
│   │   │   ├── History/               # [Telemetry] Temporal state tracking subsystem.
│   │   │   │   ├── History.svelte     # Visual log of system state transitions.
│   │   │   │   └── HistoryTimeline.svelte # Linear visualization of the temporal timeline.
│   │   │   ├── InteractiveView.svelte # High-fidelity visual sensor output array.
│   │   │   ├── Navbar.svelte          # Primary navigational steering head.
│   │   │   ├── PanZoomToolbar.svelte  # Viewport transformation control interface.
│   │   │   ├── ThemeStore.svelte      # Visual field modulation logic.
│   │   │   └── ui/                    # [Containment] Lowest-level structural atoms.
│   │   │       ├── button/            # Interactive trigger modules.
│   │   │       ├── dialog/            # Floating input containment containers.
│   │   │       ├── input/             # Data injection ports.
│   │   │       └── resizable/         # Dynamic structural panel modulators.
│   │   ├── stores/               # [Telemetry] Central state intelligence registry.
│   │   │   └── auth.ts                # Identification and access protocol management.
│   │   ├── util/                 # [Power] Low-level logic synthesis units.
│   │   │   ├── aiService.ts           # External AI engine interface logic.
│   │   │   ├── aiSyntax.ts            # Logic for syntax-cleansing AI-generated code.
│   │   │   ├── animatedExport.ts      # Multi-frame rendering logic for animated outputs.
│   │   │   ├── errorHandling.ts       # [Safety] Fault interception and recovery.
│   │   │   ├── exportPlugins.ts       # Modular format converters (PNG, SVG, PDF).
│   │   │   ├── fileSystem.ts          # Abstraction layer for data registry interaction.
│   │   │   ├── historyStore.ts        # Telemetry recording engine.
│   │   │   ├── idb.ts                 # Local state buffer using IndexedDB.
│   │   │   ├── mermaid.ts             # Direct engine core interface.
│   │   │   ├── monacoExtra.ts         # High-level editor core extensions.
│   │   │   ├── panZoom.ts             # Viewport transformation mathematics.
│   │   │   ├── persist.ts             # Long-term state preservation manager.
│   │   │   ├── state.ts               # Master telemetric record of the system state.
│   │   │   └── stats.ts               # Performance metric and usage tracking.
│   │   ├── constants.ts          # System-wide hard-coded calibration limits.
│   │   └── types.d.ts            # Type definitions for internal data-transfer protocols.
│   ├── routes/                   # [Navigation] Geodesic pathfinding and view routing.
│   │   ├── edit/                 # Reconfiguration sector for diagram design.
│   │   ├── view/                 # High-quality observation sector for final results.
│   │   ├── docs/                 # Portal to technical training and documentation.
│   │   ├── +layout.svelte        # The global structural scaffold for all routing.
│   │   ├── +page.svelte          # The main docking port (Landing page).
│   │   └── hooks.server.ts       # Server-side request interception and routing logic.
│   ├── app.css                   # [Containment] Binding styling field for the UI chassis.
│   └── app.html                  # The root structural frame (Primary hull).
├── static/                       # Pre-compiled high-frequency visual assets.
│   ├── icons/                    # Glyph registry for control signals.
│   └── manifest.json             # registry for PWA metadata and offline availability.
├── tests/                        # [Safety Protocols] Massive validation array.
├── package.json                  # Registry of external engine modules and build scripts.
├── svelte.config.js              # Compiler calibration for the Svelte engine.
└── vite.config.js                # [Mass Reduction] Optimization script for build cycles.
```

## Mega-Granular Component Catalog

### [Power Generation] The Analytical Engine

- **`src/lib/util/aiService.ts`**: Manages the persistent link to high-level AI generation clusters.
- **`src/lib/util/aiSyntax.ts`**: Performs real-time syntax correction on AI-generated data streams.
- **`src/lib/util/mermaid.ts`**: The main power conduit to the Mermaid rendering core.
- **`src/lib/util/exportPlugins.ts`**: Converts internal diagram energy into exportable visual formats.
- **`src/lib/util/animatedExport.ts`**: Specialized logic for capturing temporal rendering sequences.

### [Telemetry] System Intelligence & Monitoring

- **`src/lib/util/state.ts`**: The master cerebral record that tracks every variable in the GDER system.
- **`src/lib/util/historyStore.ts`**: A high-resolution temporal log of all system state changes.
- **`src/lib/util/stats.ts`**: Collects real-time telemetry on system performance and resource usage.
- **`src/lib/stores/auth.ts`**: Manages the secure identification of system operators (users).

### [Navigation] Data Steering & View Ports

- **`src/lib/components/FileExplorer/`**: The primary subsystem for browsing the internal diagram registry.
- **`src/routes/edit/`**: The specialized diagnostic environment for modifying diagram structures.
- **`src/routes/view/`**: The isolated observation deck for high-fidelity diagram inspection.
- **`src/lib/util/panZoom.ts`**: Handles the complex mathematics of moving and scaling the visual output.

### [Containment] Structural Primitives

- **`src/lib/components/ui/`**: A library of atomic structural units used to build the interface.
- **`src/app.css`**: Defines the global electromagnetic styling fields that shape the UI.
- **`src/app.html`**: The physical starting point for the software's execution in the browser environment.
- **`src/lib/components/ThemeStore.svelte`**: Dynamically adjusts the visual spectrum (light/dark modes) of the containment field.

### [Safety Protocols] Failure Prevention

- **`tests/actions.spec.ts`**: Validates that all system trigger mechanisms function as intended.
- **`src/lib/util/errorHandling.ts`**: The central brain for catching, logging, and mitigating unexpected system errors.
- **`tests/history.spec.ts`**: Ensures that the temporal telemetry (Undo/Redo) remains perfectly accurate.

### [Mass Reduction] Deployment Optimization

- **`vite.config.js`**: Strategically prunes the application code to achieve the lowest possible deployment "mass".
- **`package.json`**: The master inventory of all external modules required for system operation.
- **`pnpm-lock.yaml`**: Ensures a perfectly consistent environment across all development satellite workstations.

---

_Ultra-Mega Index generated for the GDER flagship project._
