"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUsageHistory,
  clearUsageHistory,
  computeCost,
  PRICING_TABLE,
  TYPICAL_INPUT_TOKENS,
  TYPICAL_OUTPUT_TOKENS,
} from "@/lib/usageTracker";
import type { UsageEntry } from "@/lib/usageTracker";
import Link from "next/link";
import { CircleDollarSign, ExternalLink, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

const PAGE_SIZE = 25;

const OPERATION_LABELS: Record<string, string> = {
  "generate":       "Generate Deck",
  "edit":           "Slide Edit",
  "plan-questions": "Plan: Questions",
  "plan-outline":   "Plan: Outline",
  "repair":         "Auto-Repair",
};

const PROVIDER_COLORS: Record<string, string> = {
  "openai":    "bg-emerald-100 text-emerald-700",
  "anthropic": "bg-orange-100 text-orange-700",
  "gemini":    "bg-blue-100 text-blue-700",
};

const PROVIDER_DISPLAY: Record<string, string> = {
  "openai":    "OpenAI",
  "anthropic": "Anthropic",
  "gemini":    "Gemini",
};

function formatCost(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function UsagePage() {
  const [history, setHistory] = useState<UsageEntry[]>([]);
  const [page, setPage] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(getUsageHistory());
    setMounted(true);
  }, []);

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearUsageHistory();
    setHistory([]);
    setConfirmClear(false);
    setPage(0);
  }, [confirmClear]);

  const totalCost = history.reduce((sum, e) => sum + e.costUsd, 0);
  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const pageEntries = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const byProvider = history.reduce<Record<string, { count: number; cost: number }>>((acc, e) => {
    if (!acc[e.provider]) acc[e.provider] = { count: 0, cost: 0 };
    acc[e.provider].count += 1;
    acc[e.provider].cost += e.costUsd;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <CircleDollarSign className="w-5 h-5 text-slate-500" />
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">Cost Tracker</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Privacy notice */}
        <p className="text-xs text-slate-400 font-medium">
          Usage data is stored locally in your browser and is never sent to any server.
        </p>

        {/* Summary cards */}
        {mounted && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
              <p className="text-2xl font-black text-slate-900">{formatCost(totalCost)}</p>
              <p className="text-[11px] text-slate-400 mt-1">last {history.length} request{history.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Requests</p>
              <p className="text-2xl font-black text-slate-900">{history.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">max 100 stored</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">By Provider</p>
              {Object.keys(byProvider).length === 0 ? (
                <p className="text-[11px] text-slate-400">No data yet</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(byProvider).map(([provider, data]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${PROVIDER_COLORS[provider] ?? "bg-slate-100 text-slate-600"}`}>
                        {PROVIDER_DISPLAY[provider] ?? provider}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {data.count} · {formatCost(data.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing reference table */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Pricing Reference</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Model</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Input / 1M</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Output / 1M</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Typical Deck</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE.map((row) => (
                  <tr key={row.provider} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 text-[13px]">{row.provider}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px] font-mono">{row.model}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-700">
                      {row.adesso ? "—" : `$${(row.inputPer1M as number).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-700">
                      {row.adesso ? "—" : `$${(row.outputPer1M as number).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-bold text-slate-800">
                      {row.adesso ? (
                        <a
                          href="https://portal.ai-hub.3asabc.de/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[12px]"
                        >
                          View dashboard
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        formatCost(computeCost(row.model, TYPICAL_INPUT_TOKENS, TYPICAL_OUTPUT_TOKENS))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
              Typical deck estimate based on ~{TYPICAL_INPUT_TOKENS.toLocaleString()} input + ~{TYPICAL_OUTPUT_TOKENS.toLocaleString()} output tokens.
              Prices are hardcoded — check provider sites for latest rates.
            </p>
          </div>
        </div>

        {/* Request history */}
        {mounted && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request History</h2>
              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                    confirmClear
                      ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                      : "text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  {confirmClear ? "Confirm clear" : "Clear history"}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <CircleDollarSign className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-[13px] text-slate-400 font-medium">No requests recorded yet.</p>
                <p className="text-[11px] text-slate-300 mt-1">Generate a presentation to start tracking.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Operation</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">In</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Out</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(entry.timestamp)}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-slate-700">
                          {OPERATION_LABELS[entry.operation] ?? entry.operation}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${PROVIDER_COLORS[entry.provider] ?? "bg-slate-100 text-slate-600"}`}>
                            {PROVIDER_DISPLAY[entry.provider] ?? entry.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-slate-500 tabular-nums">
                          {entry.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-slate-500 tabular-nums">
                          {entry.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] font-bold text-slate-800 tabular-nums">
                          {formatCost(entry.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Page {page + 1} of {totalPages} · {history.length} requests
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
