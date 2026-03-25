import {
  BookOpen,
  CheckSquare,
  ChevronLeft,
  Clock,
  Code,
  FileCode2,
  Folder,
  FolderPlus,
  LayoutTemplate,
  Maximize,
  Moon,
  Palette,
  Save,
  Settings,
  Share,
  ShieldCheck,
  Sliders,
  Square,
  Sun,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useState } from 'react';

// --- Globale Styles (CSS Variablen & Custom Classes) ---
const GlobalStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
    @import url('https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap');

    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
      --primary: 226 58% 65%;
      --primary-foreground: 0 0% 100%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 228 24% 96%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 226 58% 65%;
      --accent-foreground: 0 0% 100%;
      --destructive: 0 72% 51%;
      --destructive-foreground: 210 40% 98%;
      --border: 214 32% 91%;
      --input: 214 32% 91%;
      --ring: 222 84% 5%;
      --radius: 0.75rem;
    }

    .dark {
      --background: 223 9% 17%;
      --foreground: 210 2% 87%;
      --card: 223 9% 17%;
      --card-foreground: 210 2% 87%;
      --popover: 223 6% 20%;
      --popover-foreground: 210 2% 87%;
      --primary: 226 58% 65%;
      --primary-foreground: 0 0% 100%;
      --secondary: 223 6% 20%;
      --secondary-foreground: 210 2% 87%;
      --muted: 223 6% 20%;
      --muted-foreground: 220 5% 47%;
      --accent: 226 58% 65%;
      --accent-foreground: 0 0% 100%;
      --destructive: 226 58% 65%;
      --destructive-foreground: 0 0% 100%;
      --border: 220 7% 14%;
      --input: 220 7% 14%;
      --ring: 226 58% 65%;
    }

    .theme-transition {
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }

    body {
      font-family: 'Recursive', sans-serif;
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }

    .border-border { border-color: hsl(var(--border)); }
    .bg-background { background-color: hsl(var(--background)); }
    .bg-muted { background-color: hsl(var(--muted)); }
    .bg-card { background-color: hsl(var(--card)); }
    .bg-primary { background-color: hsl(var(--primary)); }
    .text-primary { color: hsl(var(--primary)); }
    .text-muted-foreground { color: hsl(var(--muted-foreground)); }
    
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .glow {
      box-shadow: 0 0 20px rgba(114, 137, 218, 0.15), 0 0 60px rgba(114, 137, 218, 0.05);
    }

    /* Custom Scrollbar for Code Editor */
    .scrollbar-thin::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: hsl(var(--muted-foreground) / 0.3);
      border-radius: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: hsl(var(--muted-foreground) / 0.5);
    }
  `
    }}
  />
);

// --- Komponenten ---

const Header = () => (
  <header className="theme-transition z-50 flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-white shadow-sm">
          G
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Graphi{' '}
          <span className="ml-1 text-xs font-normal italic opacity-50">/ Untitled Diagram</span>
        </span>
      </div>
      <div className="mx-2 h-4 w-[1px] bg-border"></div>
      <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <button className="rounded px-2 py-1 transition-colors hover:bg-muted">File</button>
        <button className="rounded px-2 py-1 transition-colors hover:bg-muted">Edit</button>
        <button className="rounded px-2 py-1 transition-colors hover:bg-muted">Help</button>
      </nav>
    </div>

    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5">
        <button className="flex items-center gap-2 rounded-sm bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90">
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button className="flex items-center gap-2 rounded-sm px-3 py-1 text-xs font-medium transition-all hover:bg-muted">
          <Share className="h-3.5 w-3.5 text-muted-foreground" />
          Share
        </button>
      </div>
      <button
        className="rounded-full p-1.5 text-primary transition-all hover:bg-muted"
        title="AI Assistant">
        <Zap className="h-5 w-5 fill-primary/20" />
      </button>
    </div>
  </header>
);

const ActivityBar = ({ activeTab, setActiveTab }) => {
  const topIcons = [
    { id: 'explorer', icon: Folder, label: 'Explorer' },
    { id: 'history', icon: Clock, label: 'History' },
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'themes', icon: Palette, label: 'Themes' }
  ];

  return (
    <aside className="theme-transition z-40 flex w-12 shrink-0 flex-col items-center gap-4 border-r border-border bg-background py-4">
      {topIcons.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`rounded-lg p-2 transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary'}`}
            title={item.label}>
            <Icon className="h-5 w-5" />
          </button>
        );
      })}

      <div className="mt-auto flex flex-col gap-4">
        <button
          className="p-2 text-muted-foreground transition-all hover:text-primary"
          title="Settings">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
};

const Sidebar = () => (
  <aside className="theme-transition flex w-64 shrink-0 flex-col border-r border-border bg-card">
    <div className="flex h-10 items-center justify-between border-b border-border px-4">
      <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
        Explorer
      </span>
      <button className="text-muted-foreground transition-all hover:text-primary">
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
    <div className="flex-1 overflow-auto p-2">
      <div className="space-y-4">
        {/* Cloud Workspace Section */}
        <section>
          <h4 className="mb-2 px-2 text-[10px] font-bold tracking-tighter text-muted-foreground uppercase">
            Cloud Workspace
          </h4>
          <div className="space-y-1">
            <button className="group flex w-full items-center gap-2 rounded bg-primary/5 px-2 py-1.5 text-left text-sm text-primary transition-colors">
              <FileCode2 className="h-3.5 w-3.5" />
              <span className="truncate">Untitled Diagram</span>
            </button>
          </div>
        </section>

        {/* Local Storage Section */}
        <section>
          <h4 className="mb-2 px-2 text-[10px] font-bold tracking-tighter text-muted-foreground uppercase">
            Local Storage
          </h4>
          <button className="group flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5">
            <FolderPlus className="mb-2 h-6 w-6 transition-colors group-hover:text-primary" />
            <span className="text-xs font-medium">Link Folder</span>
          </button>
        </section>
      </div>
    </div>
  </aside>
);

const CodeEditorPane = () => (
  <div className="theme-transition flex w-1/2 flex-col border-r border-border bg-background">
    {/* Editor Tabs */}
    <div className="flex h-9 items-center border-b border-border bg-muted/20 px-1">
      <button className="flex h-full items-center gap-2 border-b-2 border-primary px-4 text-xs font-bold text-primary">
        <Code className="h-3.5 w-3.5" />
        Code
      </button>
      <button className="flex h-full items-center gap-2 px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40">
        <Sliders className="h-3.5 w-3.5" />
        Config
      </button>
      <button className="flex h-full items-center gap-2 px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40">
        <BookOpen className="h-3.5 w-3.5" />
        Learning
      </button>
      <div className="ml-auto flex items-center pr-2">
        <button className="rounded border border-accent/20 bg-accent/10 p-1 px-2 text-[10px] font-bold text-accent transition-all hover:bg-accent/20">
          Doc
        </button>
      </div>
    </div>

    {/* Monaco Editor Mock */}
    <div className="scrollbar-thin relative flex-1 overflow-auto p-4 font-mono text-sm">
      <div className="flex gap-4 leading-relaxed">
        {/* Line Numbers */}
        <div className="pr-2 text-right font-mono text-muted-foreground/30 select-none">
          1<br />2<br />3<br />4<br />5<br />6<br />7
        </div>
        {/* Code Content */}
        <div className="flex-1 font-mono tracking-wide">
          <span className="text-blue-400">flowchart</span>{' '}
          <span className="text-foreground">TD</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">Start</span> --&gt;{' '}
          <span className="text-green-400">NodeA</span>
          <span className="text-foreground/80">[Process A]</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">NodeA</span> --&gt;{' '}
          <span className="text-green-400">NodeB</span>
          <span className="text-foreground/80">{'{Decision}'}</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">NodeB</span>{' '}
          <span className="text-blue-300">--|Yes|--&gt;</span>{' '}
          <span className="text-green-400">End</span>
          <span className="text-foreground/80">([Done/Finished])</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">NodeB</span>{' '}
          <span className="text-blue-300">--|No|--&gt;</span>{' '}
          <span className="text-green-400">Retry</span>
          <span className="text-foreground/80">[Repeat]</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">Retry</span> --&gt;{' '}
          <span className="text-green-400">NodeA</span>
        </div>
      </div>
      {/* Cursor Mock */}
      <div className="absolute top-[20px] left-[56px] h-5 w-[2px] animate-pulse bg-primary"></div>
    </div>
  </div>
);

const PreviewPane = () => (
  <div className="theme-transition relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-muted/5 p-8">
    {/* Mermaid Render Area */}
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="glass glow rounded-2xl bg-background/50 p-8 shadow-2xl transition-all duration-500 hover:scale-[1.02]">
        {/* Mock SVG Diagram */}
        <svg
          width="300"
          height="250"
          viewBox="0 0 300 250"
          className="text-foreground transition-colors">
          <rect
            x="110"
            y="10"
            width="80"
            height="40"
            rx="20"
            className="fill-primary/20 stroke-primary"
            strokeWidth="2"
          />
          <text
            x="150"
            y="35"
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            className="font-sans font-medium">
            Start
          </text>

          <line
            x1="150"
            y1="50"
            x2="150"
            y2="90"
            stroke="currentColor"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />

          <rect
            x="100"
            y="90"
            width="100"
            height="40"
            rx="4"
            fill="currentColor"
            fillOpacity="0.05"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="150"
            y="115"
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            className="font-sans font-medium">
            Process A
          </text>

          {/* Additional Mock Elements for aesthetics */}
          <line
            x1="150"
            y1="130"
            x2="150"
            y2="170"
            stroke="currentColor"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <polygon
            points="150,170 190,195 150,220 110,195"
            fill="currentColor"
            fillOpacity="0.05"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="150"
            y="199"
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
            className="font-sans font-medium">
            Decision
          </text>

          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>

    {/* Floating Zoom Controls */}
    <div className="absolute right-6 bottom-6 z-10 flex flex-col gap-2">
      <div className="theme-transition flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg">
        <button className="border-b border-border p-2 text-foreground transition-colors hover:bg-muted">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className="border-b border-border p-2 text-foreground transition-colors hover:bg-muted">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button className="p-2 text-foreground transition-colors hover:bg-muted">
          <Maximize className="h-4 w-4" />
        </button>
      </div>
      <button className="theme-transition rounded-lg border border-border bg-background p-2 text-foreground shadow-lg transition-colors hover:text-primary">
        <span className="block px-1 text-[10px] font-bold">100%</span>
      </button>
    </div>
  </div>
);

const StatusBar = ({ isDark, toggleTheme }) => (
  <footer className="z-50 flex h-7 shrink-0 items-center justify-between bg-primary px-3 text-[10px] font-bold tracking-wider text-white uppercase">
    <div className="flex items-center gap-4">
      <div className="flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-80">
        <Square className="h-3 w-3" />
        Hand-Drawn
      </div>
      <div className="flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-80">
        <CheckSquare className="h-3 w-3" />
        Background Grid
      </div>
    </div>

    <div className="absolute left-1/2 -translate-x-1/2 font-medium opacity-80">
      Graphi Live Editor <span className="mx-1 opacity-50">•</span> Developed by Batu Atakan Erol
    </div>

    <div className="flex items-center gap-4">
      <div className="flex cursor-pointer items-center gap-1 hover:opacity-80">
        <ShieldCheck className="h-3 w-3" />
        Privacy & Security
      </div>
      <div className="h-3 w-[1px] bg-white/30"></div>

      {/* Interactive Theme Toggle */}
      <div
        className="flex cursor-pointer items-center gap-1 transition-colors hover:text-white/80"
        onClick={toggleTheme}>
        {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </div>

      <div className="h-3 w-[1px] bg-white/30"></div>
      <div className="font-mono">v11.12.0</div>
    </div>
  </footer>
);

// --- Haupt-App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('explorer');
  // Darkmode State - standardmäßig true, da das HTML .dark gesetzt hatte
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <>
      <GlobalStyles />
      <div
        className={`flex h-screen w-full flex-col overflow-hidden font-sans ${isDark ? 'dark' : ''} bg-background text-foreground`}>
        <Header />

        <main className="flex flex-1 overflow-hidden">
          <ActivityBar activeTab={activeTab} setActiveTab={setActiveTab} />
          <Sidebar />

          <div className="flex flex-1 overflow-hidden">
            <CodeEditorPane />
            <PreviewPane />
          </div>
        </main>

        <StatusBar isDark={isDark} toggleTheme={toggleTheme} />
      </div>
    </>
  );
}
