import React, { useState } from 'react';
import {
  Share2,
  MousePointer2,
  Zap,
  LayoutTemplate,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';

// --- Komponenten ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex flex-shrink-0 cursor-pointer items-center gap-2">
            <div className="flex h-8 w-8 rotate-3 transform items-center justify-center rounded-lg bg-indigo-600 transition-transform hover:rotate-6">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Graphi</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            <a
              href="#features"
              className="font-medium text-gray-600 transition-colors hover:text-indigo-600">
              Funktionen
            </a>
            <a
              href="#templates"
              className="font-medium text-gray-600 transition-colors hover:text-indigo-600">
              Vorlagen
            </a>
            <a
              href="#pricing"
              className="font-medium text-gray-600 transition-colors hover:text-indigo-600">
              Preise
            </a>
            <div className="h-6 w-px bg-gray-200"></div>
            <button className="font-medium text-gray-900 transition-colors hover:text-indigo-600">
              Anmelden
            </button>
            <button className="rounded-full bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 hover:shadow-md">
              Kostenlos starten
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute w-full border-b border-gray-100 bg-white shadow-lg md:hidden">
          <div className="space-y-1 px-4 pt-2 pb-4">
            <a
              href="#features"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
              Funktionen
            </a>
            <a
              href="#templates"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
              Vorlagen
            </a>
            <a
              href="#pricing"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
              Preise
            </a>
            <div className="my-2 border-t border-gray-100 pt-2">
              <button className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                Anmelden
              </button>
              <button className="mt-2 block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-base font-medium text-white hover:bg-indigo-700">
                Kostenlos starten
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-32">
      {/* Hintergrund-Dekoration */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[800px] w-full -translate-x-1/2 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 left-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          <Zap className="h-4 w-4" />
          <span>Graphi 2.0 ist live! Entdecke KI-gestützte Diagramme</span>
        </div>

        <h1 className="mb-6 text-5xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-7xl">
          Diagramme für{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            alle.
          </span>
          <br />
          Einfach, schnell, kollaborativ.
        </h1>

        <p className="mx-auto mt-4 mb-10 max-w-2xl text-xl text-gray-600">
          Das intuitive Diagramm-Tool für Teams. Erstellen Sie Flowcharts, Mindmaps,
          Architekturdiagramme und Wireframes in Sekunden – direkt im Browser.
        </p>

        <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <button className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl">
            Jetzt kostenlos starten
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50">
            Live-Demo ansehen
          </button>
        </div>

        {/* Mockup Canvas */}
        <div className="relative mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/50 shadow-2xl backdrop-blur-sm">
            {/* Mockup Header */}
            <div className="flex h-12 items-center gap-4 border-b border-gray-200 bg-gray-50/80 px-4">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex flex-1 justify-center">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
                  <span>Projekt-Architektur.graphi</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-bold text-indigo-600">
                  JS
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-xs font-bold text-emerald-600">
                  MR
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-bold text-gray-600">
                  +3
                </div>
              </div>
            </div>

            {/* Mockup Body (Diagramm Nachbau) */}
            <div className="relative h-[400px] overflow-hidden bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] md:h-[500px]">
              {/* Element 1 */}
              <div className="absolute top-1/4 left-1/4 z-10 w-48 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-indigo-400 bg-white p-4 shadow-sm">
                <div className="mb-1 text-sm font-bold text-gray-800">Benutzer-Login</div>
                <div className="text-xs text-gray-500">Authentifizierung via OAuth2</div>
              </div>

              {/* Element 2 */}
              <div className="absolute top-1/2 left-1/2 z-10 w-56 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-indigo-700 bg-indigo-600 p-4 text-white shadow-md">
                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <Zap className="h-4 w-4 text-amber-300" />
                  API Gateway
                </div>
                <div className="text-xs text-indigo-100">Rate Limiting & Routing</div>
              </div>

              {/* Element 3 */}
              <div className="absolute top-3/4 left-3/4 z-10 w-48 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-emerald-400 bg-white p-4 shadow-sm">
                <div className="mb-1 text-sm font-bold text-gray-800">Datenbank</div>
                <div className="text-xs text-gray-500">PostgreSQL Cluster</div>
              </div>

              {/* SVG Verbindungen (Stark vereinfacht für die Optik) */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{ zIndex: 0 }}>
                {/* Linie von Login zu API */}
                <path
                  d="M 25% 25% C 35% 25%, 35% 50%, 50% 50%"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-[dash_2s_linear_infinite]"
                />
                <circle cx="50%" cy="50%" r="4" fill="#4f46e5" />

                {/* Linie von API zu DB */}
                <path
                  d="M 50% 50% C 65% 50%, 65% 75%, 75% 75%"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                />
                <polygon
                  points="75%,75% 73%,71% 77%,71%"
                  fill="#9ca3af"
                  transform="translate(-10, 0) rotate(45, 75%, 75%)"
                />
              </svg>

              {/* Fake Cursor (Multiplayer) */}
              <div className="absolute top-1/3 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 transform animate-bounce items-start gap-1">
                <MousePointer2 className="h-5 w-5 fill-rose-500 text-rose-500" />
                <div className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  Maria
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{ __html: ` @keyframes dash { to { stroke-dashoffset: -8; } } ` }}
      />
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: <MousePointer2 className="h-6 w-6 text-indigo-600" />,
      title: 'Echtzeit-Zusammenarbeit',
      description:
        'Arbeiten Sie zeitgleich mit Ihrem Team am selben Diagramm. Sehen Sie Mauszeiger und Änderungen in Echtzeit.'
    },
    {
      icon: <LayoutTemplate className="h-6 w-6 text-indigo-600" />,
      title: 'Hunderte Vorlagen',
      description:
        'Starten Sie nicht bei Null. Wählen Sie aus einer riesigen Bibliothek von Vorlagen für AWS, Azure, Mindmaps und mehr.'
    },
    {
      icon: <Zap className="h-6 w-6 text-indigo-600" />,
      title: 'Blitzschnell & Leicht',
      description:
        'Graphi läuft direkt im Browser und ist auf Performance optimiert. Keine Installation, keine Wartezeiten.'
    }
  ];

  return (
    <section id="features" className="border-t border-gray-100 bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-indigo-600 uppercase">
            Warum Graphi?
          </h2>
          <h3 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Alles, was Sie für perfekte Diagramme brauchen
          </h3>
          <p className="text-lg text-gray-600">
            Verabschieden Sie sich von klobigen Desktop-Apps. Graphi bringt modernes Diagramming
            direkt in Ihren Browser.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                {feature.icon}
              </div>
              <h4 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h4>
              <p className="leading-relaxed text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonial = () => {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-10 text-center text-white shadow-2xl md:p-16">
          {/* Deko-Elemente */}
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white opacity-5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 transform rounded-full bg-black opacity-10 blur-2xl"></div>

          <div className="relative z-10">
            <div className="mb-6 flex justify-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="mx-1 h-6 w-6 fill-amber-400 text-amber-400"
                  viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mb-8 text-2xl leading-tight font-medium md:text-4xl">
              "Seit wir Graphi im Team nutzen, hat sich unsere Dokumentationszeit halbiert. Es ist
              unglaublich intuitiv und die Echtzeit-Funktion ist ein Gamechanger."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-indigo-400 bg-indigo-300">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=c0aede"
                  alt="Benutzer Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold">Felix Hoffmann</div>
                <div className="text-sm text-indigo-200">Lead Architect bei TechFlow</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-6 text-3xl font-bold text-gray-900 md:text-5xl">
          Bereit, Ihre Ideen zu visualisieren?
        </h2>
        <p className="mb-10 text-xl text-gray-600">
          Keine Kreditkarte erforderlich. Starten Sie in weniger als 30 Sekunden.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="w-full rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 sm:w-auto">
            Kostenlosen Account erstellen
          </button>
          <span className="text-sm text-gray-500">oder</span>
          <button className="w-full rounded-lg px-4 py-2 font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 sm:w-auto">
            Mit Google anmelden
          </button>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 14 Tage Pro-Version gratis
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Jederzeit kündbar
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 rotate-3 transform items-center justify-center rounded bg-indigo-600">
                <Share2 className="h-3 w-3 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Graphi</span>
            </div>
            <p className="mb-6 max-w-sm text-gray-500">
              Machen Sie Schluss mit unübersichtlichen Konzepten. Visualisieren, planen und
              kollaborieren Sie auf einer grenzenlosen Arbeitsfläche.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-indigo-600">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-indigo-600">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-indigo-600">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 font-bold text-gray-900">Produkt</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Funktionen
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Integrationen
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Preise
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-gray-900">Ressourcen</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Vorlagen-Galerie
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Hilfe-Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-gray-900">Unternehmen</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Über uns
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Karriere
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Datenschutz
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 transition-colors hover:text-indigo-600">
                  Impressum
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Graphi Inc. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-gray-400 hover:text-gray-900">
              Nutzungsbedingungen
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-900">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Haupt-App ---

export default function App() {
  return (
    <div className="min-h-screen font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
