"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  Database,
  Cloud,
  KeyRound,
  Server,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const AUTO_REFRESH_SECONDS = 30;

type CheckStatus = "ok" | "degraded" | "error" | "pending";

interface Check {
  name: string;
  category: "Config" | "Database" | "AI Services" | "Environment";
  description: string;
  status: CheckStatus;
  message: string;
  latencyMs: number;
  hint?: string;
}

interface StatusData {
  overall: "ok" | "degraded" | "error";
  checkedAt: string;
  cached: boolean;
  checks: Check[];
}

// ─── Status display config ────────────────────────────────────────────────────

const STATUS = {
  ok: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-400",
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: AlertCircle,
    iconColor: "text-amber-500",
  },
  error: {
    label: "Error",
    dot: "bg-red-500",
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    icon: XCircle,
    iconColor: "text-red-500",
  },
  pending: {
    label: "Checking…",
    dot: "bg-slate-300 animate-pulse",
    text: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-100",
    icon: Loader2,
    iconColor: "text-slate-400",
  },
};

const OVERALL_BANNERS = {
  ok: {
    bg: "bg-emerald-600",
    text: "All Systems Operational",
    sub: "Every service is running normally.",
  },
  degraded: {
    bg: "bg-amber-500",
    text: "Partial Service Disruption",
    sub: "Some services are degraded. Check the details below.",
  },
  error: {
    bg: "bg-red-600",
    text: "Service Outage Detected",
    sub: "One or more critical services are failing. See the details below.",
  },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Config: Shield,
  Database: Database,
  "AI Services": KeyRound,
  Environment: Server,
};

// ─── Placeholder checks shown while loading ───────────────────────────────────

const PLACEHOLDER_CHECKS: Check[] = [
  { name: "Auth Token", category: "Config", description: "", status: "pending", message: "", latencyMs: 0 },
  { name: "HMAC Secret", category: "Config", description: "", status: "pending", message: "", latencyMs: 0 },
  { name: "DB Connection", category: "Database", description: "", status: "pending", message: "", latencyMs: 0 },
  { name: "DB Schema", category: "Database", description: "", status: "pending", message: "", latencyMs: 0 },
  { name: "adesso AI Hub", category: "AI Services", description: "", status: "pending", message: "", latencyMs: 0 },
  { name: "Server Stats", category: "Environment", description: "", status: "pending", message: "", latencyMs: 0 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckCard({ check }: { check: Check }) {
  const cfg = STATUS[check.status];
  const Icon = cfg.icon;
  const isSpinning = check.status === "pending";

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-2 min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 ${cfg.iconColor} ${isSpinning ? "animate-spin" : ""}`}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-800 truncate">
            {check.name}
          </span>
        </div>
        {check.status !== "pending" && (
          <span className="text-[9px] font-bold text-slate-400 shrink-0 tabular-nums">
            {check.latencyMs < 1 ? "<1ms" : `${check.latencyMs}ms`}
          </span>
        )}
      </div>

      {check.status !== "pending" ? (
        <>
          <p className={`text-[11px] font-medium ${cfg.text} leading-tight`}>{check.message}</p>
          {check.hint && (
            <p className="text-[10px] font-mono text-slate-400 break-all leading-snug">
              {check.hint}
            </p>
          )}
          {check.description && (
            <p className="text-[10px] text-slate-400 leading-snug mt-1">{check.description}</p>
          )}
        </>
      ) : (
        <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
      )}
    </div>
  );
}

function CategorySection({
  category,
  checks,
}: {
  category: string;
  checks: Check[];
}) {
  const Icon = CATEGORY_ICONS[category] ?? Server;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {category}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((c) => (
          <CheckCard key={c.name} check={c} />
        ))}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [cooldown, setCooldown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BUTTON_COOLDOWN_SECONDS = 10;

  const runChecks = useCallback(async () => {
    setLoading(true);
    // Reset auto-refresh countdown
    setCountdown(AUTO_REFRESH_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    // Start button cooldown immediately so rapid re-clicks are blocked
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(BUTTON_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const res = await fetch(`${BASE}/api/status`);
      const json = (await res.json()) as StatusData;
      setData(json);
    } catch {
      // Leave previous data visible on transient network error
    } finally {
      setLoading(false);
      // Start auto-refresh countdown timer
      setCountdown(AUTO_REFRESH_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, []);

  // Auto-refresh when countdown hits 0
  useEffect(() => {
    if (countdown === 0 && !loading) {
      runChecks();
    }
  }, [countdown, loading, runChecks]);

  // Initial load
  useEffect(() => {
    runChecks();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [runChecks]);

  const checks = loading && !data ? PLACEHOLDER_CHECKS : data?.checks ?? PLACEHOLDER_CHECKS;
  const overall = data?.overall ?? "ok";
  const bannerCfg = OVERALL_BANNERS[loading && !data ? "ok" : overall];

  const categories = ["Config", "Database", "AI Services", "Environment"] as const;

  const checkedAtFormatted = data?.checkedAt
    ? new Date(data.checkedAt).toLocaleTimeString()
    : null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900">
      {/* Header */}
      <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src={`${BASE}/assets/branding/Brand_Icon.svg`}
            alt="Slidi"
            className="w-5 h-5 object-contain"
          />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
              System Status
            </span>
            <span className="text-slate-200 select-none">·</span>
            <a
              href={`${BASE}/`}
              className="text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors"
            >
              ← <span className="hidden sm:inline">Back to Slidi</span>
            </a>
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={loading || cooldown > 0}
          className="flex items-center gap-2 h-8 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {loading ? "Running…" : cooldown > 0 ? `Wait ${cooldown}s` : "Run Tests"}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Overall status banner */}
        <div
          className={`rounded-[28px] ${loading && !data ? "bg-slate-200" : bannerCfg.bg} p-8 text-white transition-colors duration-500`}
        >
          {loading && !data ? (
            <div className="space-y-3">
              <div className="h-6 bg-slate-300 rounded-full animate-pulse w-64" />
              <div className="h-4 bg-slate-300 rounded-full animate-pulse w-48 opacity-60" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full bg-white/80 ${overall === "ok" ? "animate-none" : "animate-pulse"}`} />
                <h1 className="text-xl font-black tracking-tight">{bannerCfg.text}</h1>
              </div>
              <p className="text-white/70 text-sm">{bannerCfg.sub}</p>
              <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50">
                {checkedAtFormatted && <span>Last checked: {checkedAtFormatted}</span>}
                <span>·</span>
                {loading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Running…
                  </span>
                ) : (
                  <span>Next check in {countdown}s</span>
                )}
                {data?.cached && (
                  <>
                    <span>·</span>
                    <span>Cached result</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Per-category sections */}
        {categories.map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat);
          if (catChecks.length === 0) return null;
          return (
            <CategorySection key={cat} category={cat} checks={catChecks} />
          );
        })}

        {/* Footer */}
        <footer className="text-center text-[10px] text-slate-300 font-medium pb-6">
          <div className="flex items-center justify-center gap-1">
            <KeyRound className="w-3 h-3" />
            <span>
              Status checks run server-side — results reflect the Next.js container's network access and environment.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
