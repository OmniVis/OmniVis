# Mega-Detaillierter System-Index: Graphical Diagram Editor and Renderer (GDER)

Dies ist die ultimative Kartierung des GDER-Projekts, die jeden kritischen Sektor und jede Komponente mit extremer technischer Granularität indiziert.

## Mega-Baumstruktur

```text
/
├── .github/                      # [Sicherheit] Automatisierungsprotokolle zur globalen Systemvalidierung.
│   └── workflows/                # CI/CD-Pipelines für automatisierte Tests und Auslieferung.
├── .vscode/                      # Konfigurationen der Entwicklungsumgebung.
├── bin/                          # Ausführbare Binärlogik für die Interaktion mit der Engine auf CLI-Ebene.
├── cms-oauth-worker/             # [Auth] Externes Gateway für Satelliten-Authentifizierungsdienste.
│   ├── src/index.js              # Der primäre Einstiegsknoten für den OAuth-Worker.
│   └── wrangler.toml             # Konfiguration für den Edge-basierten Authentifizierungs-Worker.
├── DesktopApp/                   # [Zusatz] Integrationsschicht für lokale Workstations.
│   ├── preload.js                # Sichere Brücke für die IPC-Kommunikation im Desktop-Chassis.
│   ├── tray.js                   # Logik für das Hintergrund-System-Tray-Überwachungssymbol.
│   └── zip_releases.js           # Automatisiertes Skript zum Paketieren von Desktop-Distributionskernen.
├── src/                          # Die Kernbaugruppe für Antrieb und Logik.
│   ├── lib/                      # [Energieerzeugung] Die Analyse-Engine für das Diagramm-Parsing.
│   │   ├── components/           # Modulare Einheiten für UI-basierte Interaktion und Rendering.
│   │   │   ├── AIChatSidebar.svelte   # KI-gestützte Navigationshilfe für die Diagrammerstellung.
│   │   │   ├── Actions.svelte         # Auslösemechanismen für Systemausführungsbefehle.
│   │   │   ├── CopyButton.svelte      # Dienstprogramm zum Duplizieren von Datenpaketen in die Zwischenablage.
│   │   │   ├── DesktopEditor.svelte   # Workstation-optimierte Kontrollbrücke.
│   │   │   ├── FileExplorer/          # [Navigation] Navigator für das interne Datenregister.
│   │   │   │   └── FileExplorer.svelte # Visuelle Schnittstelle für den Asset-File-Explorer.
│   │   │   ├── History/               # [Telemetrie] Subsystem zur zeitlichen Zustandsverfolgung.
│   │   │   │   ├── History.svelte     # Visuelles Protokoll der Systemzustandsübergänge.
│   │   │   │   └── HistoryTimeline.svelte # Lineare Visualisierung der zeitlichen Timeline.
│   │   │   ├── InteractiveView.svelte # High-Fidelity-Array für visuelle Sensorausgaben.
│   │   │   ├── Navbar.svelte          # Primärer Navigations-Steuerkopf.
│   │   │   ├── PanZoomToolbar.svelte  # Steuerungsschnittstelle für Viewport-Transformationen.
│   │   │   ├── ThemeStore.svelte      # Logik zur Modulation des visuellen Feldes.
│   │   │   └── ui/                    # [Eindämmung] Strukturelle Atome auf niedrigster Ebene.
│   │   │       ├── button/            # Interaktive Auslösemodule.
│   │   │       ├── dialog/            # Schwebende Behälter für Eingaben.
│   │   │       ├── input/             # Dateninjektions-Ports.
│   │   │       └── resizable/         # Dynamische strukturelle Panel-Modulatoren.
│   │   ├── stores/               # [Telemetrie] Zentrales staatliches Intelligenzregister.
│   │   │   └── auth.ts                # Verwaltung von Identifikations- und Zugriffsprotokollen.
│   │   ├── util/                 # [Energie] Einheiten zur Synthese von Low-Level-Logik.
│   │   │   ├── aiService.ts           # Schnittstellenlogik zur externen KI-Engine.
│   │   │   ├── aiSyntax.ts            # Logik zur Syntaxbereinigung von KI-generiertem Code.
│   │   │   ├── animatedExport.ts      # Multi-Frame-Rendering-Logik für animierte Ausgaben.
│   │   │   ├── errorHandling.ts       # [Sicherheit] Fehlerabfangung und Wiederherstellung.
│   │   │   ├── exportPlugins.ts       # Modulare Formatkonverter (PNG, SVG, PDF).
│   │   │   ├── fileSystem.ts          # Abstraktionsschicht für die Interaktion mit dem Datenregister.
│   │   │   ├── historyStore.ts        # Telemetrie-Aufzeichnungs-Engine.
│   │   │   ├── idb.ts                 # Lokaler Zustandsbuffer mittels IndexedDB.
│   │   │   ├── mermaid.ts             # Direkte Schnittstelle zum Engine-Kern.
│   │   │   ├── monacoExtra.ts         # High-Level-Erweiterungen für den Editor-Kern.
│   │   │   ├── panZoom.ts             # Mathematik der Viewport-Transformationen.
│   │   │   ├── persist.ts             # Manager für die langfristige Zustandsbewahrung.
│   │   │   ├── state.ts               # Master-Telemetrie-Datensatz des Systemzustands.
│   │   │   └── stats.ts               # Verfolgung von Leistungsmetriken und Nutzung.
│   │   ├── constants.ts          # Systemweite, fest codierte Kalibrierungsgrenzen.
│   │   └── types.d.ts            # Typdefinitionen für interne Datentransferprotokolle.
│   ├── routes/                   # [Navigation] Geodätische Pfadfindung und View-Routing.
│   │   ├── edit/                 # Rekonfigurationssektor für das Diagrammdesign.
│   │   ├── view/                 # Hochwertiger Beobachtungssektor für Endergebnisse.
│   │   ├── docs/                 # Portal für technische Schulungen und Dokumentation.
│   │   ├── +layout.svelte        # Globales strukturelles Gerüst für das gesamte Routing.
│   │   ├── +page.svelte          # Haupt-Dockingport (Landingpage).
│   │   └── hooks.server.ts       # Serverseitige Abfang- und Routing-Logik für Anfragen.
│   ├── app.css                   # [Eindämmung] Bindendes Style-Feld für das UI-Chassis.
│   └── app.html                  # Der strukturelle Rahmen (Primärer Rumpf).
├── static/                       # Vorkompilierte, hochfrequente visuelle Assets.
│   ├── icons/                    # Glyphen-Register für Steuersignale.
│   └── manifest.json             # Register für PWA-Metadaten und Offline-Verfügbarkeit.
├── tests/                        # [Sicherheitsprotokolle] Massives Validierungs-Array.
├── package.json                  # Register externer Engine-Module und Build-Skripte.
├── svelte.config.js              # Compiler-Kalibrierung für die Svelte-Engine.
└── vite.config.js                # [Massenreduzierung] Optimierungsskript für Build-Zyklen.
```

## Mega-Granularer Komponenten-Katalog

### [Energieerzeugung] Die Analyse-Engine

- **`src/lib/util/aiService.ts`**: Veraltet die persistente Verbindung zu High-Level-KI-Generierungsclustern.
- **`src/lib/util/aiSyntax.ts`**: Führt Echtzeit-Syntaxkorrekturen an KI-generierten Datenströmen durch.
- **`src/lib/util/mermaid.ts`**: Die Hauptleitung zum Mermaid-Rendering-Kern.
- **`src/lib/util/exportPlugins.ts`**: Konvertiert interne Diagrammenergie in exportierbare visuelle Formate.
- **`src/lib/util/animatedExport.ts`**: Spezialisierte Logik zur Erfassung zeitlicher Rendering-Sequenzen.

### [Telemetrie] Systemintelligenz & Überwachung

- **`src/lib/util/state.ts`**: Der zerebrale Master-Datensatz, der jede Variable im GDER-System verfolgt.
- **`src/lib/util/historyStore.ts`**: Ein hochauflösendes zeitliches Protokoll aller Systemzustandsänderungen.
- **`src/lib/util/stats.ts`**: Sammelt Echtzeit-Telemetrie zur Systemleistung und Ressourcennutzung.
- **`src/lib/stores/auth.ts`**: Verwaltet die sichere Identifizierung von Systemoperatoren (Benutzern).

### [Navigation] Datensteuerung & Viewports

- **`src/lib/components/FileExplorer/`**: Das primäre Subsystem zum Durchsuchen des internen Diagrammregisters.
- **`src/routes/edit/`**: Die spezialisierte Diagnoseumgebung zum Modifizieren von Diagrammstrukturen.
- **`src/routes/view/`**: Das isolierte Beobachtungsdeck für die hochpräzise Diagramminspektion.
- **`src/lib/util/panZoom.ts`**: Behandelt die komplexe Mathematik zum Bewegen und Skalieren der visuellen Ausgabe.

### [Eindämmung] Strukturelle Primitiven

- **`src/lib/components/ui/`**: Eine Bibliothek atomarer struktureller Einheiten, die zum Aufbau der Schnittstelle verwendet werden.
- **`src/app.css`**: Definiert die globalen elektromagnetischen Styling-Felder, die die Benutzeroberfläche formen.
- **`src/app.html`**: Der physische Ausgangspunkt für die Ausführung der Software in der Browserumgebung.
- **`src/lib/components/ThemeStore.svelte`**: Passt das visuelle Spektrum (Hell/Dunkel-Modus) des Eindämmungsfelds dynamisch an.

### [Sicherheitsprotokolle] Fehlerprävention

- **`tests/actions.spec.ts`**: Validiert, dass alle Systemauslösemechanismen wie vorgesehen funktionieren.
- **`src/lib/util/errorHandling.ts`**: Das zentrale Gehirn zum Abfangen, Protokollieren und Abmildern unerwarteter Systemfehler.
- **`tests/history.spec.ts`**: Stellt sicher, dass die zeitliche Telemetrie (Undo/Redo) perfekt genau bleibt.

### [Massenreduzierung] Bereitstellungsoptimierung

- **`vite.config.js`**: Prallt den Anwendungscode strategisch ab, um die geringstmögliche Bereitstellungs- "Masse" zu erreichen.
- **`package.json`**: Das Bestandsverzeichnis aller externen Module, die für den Systembetrieb erforderlich sind.
- **`pnpm-lock.yaml`**: Gewährleistet eine perfekt konsistente Umgebung über alle Entwicklungs-Satelliten-Workstations hinweg.

---

_Ultra-Mega-Index generiert für das GDER-Flaggschiff-Projekt._
