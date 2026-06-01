"use client";

/**
 * HTTP-safe live preview renderer.
 *
 * Sandpack's bundler uses a service worker which browsers refuse to register
 * over plain HTTP (only allowed on HTTPS or localhost). Since the production
 * server runs HTTP, Sandpack always times out in preview mode.
 *
 * This component replaces SandpackLivePreview with a self-contained srcdoc
 * iframe: Babel standalone compiles the JSX locally inside the iframe, and
 * React + ReactDOM run as UMD globals — no service worker, no external
 * runtime connection required.
 *
 * Theme CSS variables (--sl-bg, --sl-text, --sl-accent, --sl-sub) are injected
 * per theme so generated code using var(--sl-*) updates when theme switches.
 * Tailwind CDN is configured to expose bg-sl-bg / text-sl-text / etc. as
 * real utility classes that resolve to those same CSS vars.
 */

import { useRef, useEffect, useCallback, useState, useMemo, useLayoutEffect } from "react";
import { Maximize2 } from "lucide-react";
import type { ThemeId, Branding, SelectedElement } from "@/store/slidiStore";
import { useSlidiStore } from "@/store/slidiStore";
import { THEME_STYLES } from "@/lib/themes";
import { useLogoUrl } from "@/hooks/useLogoUrl";
import { RENDERER_CODE_V0, RENDERER_CODE_V1, RENDERER_CODE_V2, RENDERER_CODE_V3, RENDERER_CODE_V4 } from "@/lib/presentationRenderer";

/** Per-theme CSS variable values injected into the srcdoc :root. */
const THEME_VARS: Record<ThemeId, string> = {
  minimal:   "--sl-bg:#ffffff;--sl-text:#0f172a;--sl-accent:#2563eb;--sl-sub:#64748b;",
  dark:      "--sl-bg:#0f172a;--sl-text:#f1f5f9;--sl-accent:#6366f1;--sl-sub:#94a3b8;",
  corporate: "--sl-bg:#f0f4ff;--sl-text:#1d4ed8;--sl-accent:#1d4ed8;--sl-sub:#374151;",
  cyberpunk: "--sl-bg:#0a0a14;--sl-text:#ffffff;--sl-accent:#e879f9;--sl-sub:#22d3ee;",
  modern:    "--sl-bg:#ffffff;--sl-text:#18181b;--sl-accent:#000000;--sl-sub:#71717a;",
  sunset:    "--sl-bg:#fffcf0;--sl-text:#431407;--sl-accent:#f97316;--sl-sub:#9a3412;",
  forest:    "--sl-bg:#f0fdf4;--sl-text:#064e3b;--sl-accent:#10b981;--sl-sub:#065f46;",
  blueprint: "--sl-bg:#0f172a;--sl-text:#93c5fd;--sl-accent:#3b82f6;--sl-sub:#60a5fa;",
  brutalist: "--sl-bg:#ffffff;--sl-text:#000000;--sl-accent:#000000;--sl-sub:#000000;",
  custom:    "--sl-bg:#1e1e2e;--sl-text:#cdd6f4;--sl-accent:#89b4fa;--sl-sub:#a6adc8;",
};

function getThemeVars(theme: ThemeId): string {
  if (theme === "custom") {
    // Read live custom palette from THEME_STYLES (may have been updated by applyCustomTheme)
    const s = THEME_STYLES["custom"];
    return `--sl-bg:${s.bg};--sl-text:${s.text};--sl-accent:${s.accent};--sl-sub:${s.subtext};`;
  }
  return THEME_VARS[theme];
}

/** Strip ES module import/export declarations — React and hooks are globals. */
function processCode(code: string): string {
  return code
    // Normalize non-breaking spaces (U+00A0) → regular spaces so Babel doesn't choke
    .replace(/\u00A0/g, " ")
    // Strip ES module imports — React, hooks, etc. are all pre-loaded globals
    .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "")
    // Strip `const { useState, useEffect, ... } = React;` — hooks are already globals
    .replace(/^const\s*\{[^}]+\}\s*=\s*React\s*;?\s*$/gm, "")
    .replace(/^export\s+(default\s+)?/gm, "")
    // Fix common AI mishap: using standard double quotes instead of closing German quotes
    .replace(/„([^"„]*)"/g, '„$1“')
    // Prevent the string "</script>" from prematurely closing the script tag
    .replace(/<\/script>/gi, "<\\/script>")
    .trim();
}

export function buildSrcdoc(code: string, theme: ThemeId, branding: Branding | null, forExport = false, engineVersion: "v0" | "v1" | "v2" | "v3" | "v4" = "v4"): string {
  const isJson = code.trim().startsWith('{');
  const safe = isJson ? code.replace(/<\/script>/gi, "<\\/script>").trim() : processCode(code);
  const vars = getThemeVars(theme);
  
  // Decide which renderer to inject based on the engine version
  const rendererScript = engineVersion === "v0" ? RENDERER_CODE_V0 : engineVersion === "v1" ? RENDERER_CODE_V1 : engineVersion === "v2" ? RENDERER_CODE_V2 : engineVersion === "v3" ? RENDERER_CODE_V3 : RENDERER_CODE_V4;

  const showLogo = branding && branding.logoUrl && (branding.display === "both" || branding.display === "logo");
  const showName = branding && branding.name && (branding.display === "both" || branding.display === "name");

  const pos = branding?.position || "top-right";
  const padding = branding?.padding !== undefined ? branding.padding : 24;
  let posCss = `top:${padding}px;right:${padding}px;`;
  if (pos === "top-left") posCss = `top:${padding}px;left:${padding}px;`;
  else if (pos === "bottom-left") posCss = `bottom:${padding}px;left:${padding}px;`;
  else if (pos === "bottom-right") posCss = `bottom:${padding}px;right:${padding}px;`;

  const type = branding?.type || "pill";
  const size = branding?.size || "medium";
  let sizePercentage = branding?.sizePercentage;
  if (sizePercentage === undefined) {
    if (size === "small") sizePercentage = 50;
    else if (size === "large") sizePercentage = 150;
    else sizePercentage = 100;
  }
  const scale = sizePercentage / 100;

  // Size calculations
  let logoHeight = "20px";
  let pillStyles = "";
  let badgeGap = "10px";
  let badgeFontSize = "10px";

  if (type === "image") {
    // 100% corresponds to 120px (the old "medium" default)
    logoHeight = `${scale * 120}px`;
    pillStyles = "background:transparent;padding:0;border:none;box-shadow:none;";
  } else {
    // Pill mode
    // Base values are doubled per user request (100% now looks like 200% used to)
    logoHeight = `${scale * 40}px`;
    badgeGap = `${scale * 20}px`;
    badgeFontSize = `${scale * 20}px`;
    const pV = 16 * scale;
    const pH = 32 * scale;
    const radius = 32 * scale;
    pillStyles = `background:rgba(255,255,255,0.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:${pV}px ${pH}px;border-radius:${radius}px;border:1px solid rgba(0,0,0,0.08);box-shadow:0 12px 32px -8px rgba(0,0,0,0.12);`;
  }

  const brandingBadge = (showLogo || showName) ? `
    <div style="position:${forExport ? "absolute" : "fixed"};${posCss}display:flex;align-items:center;gap:${badgeGap};z-index:9998;pointer-events:none;${pillStyles}animation:sl-fade-in 0.8s ease both">
      ${showLogo ? `<img src="${branding!.logoUrl}" style="height:${logoHeight};width:auto;object-fit:contain" />` : ""}
      ${showName && type === "pill" ? `<span style="font:900 ${badgeFontSize} system-ui,-apple-system,sans-serif;letter-spacing:0.04em;color:#0F172A">${branding!.name}</span>` : ""}
    </div>
  ` : "";

  const exportControls = forExport ? `
    <div id="__sl_export_prev" onclick="window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))" style="position:absolute;left:0;top:0;bottom:0;width:15%;z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);background:linear-gradient(to right, rgba(0,0,0,0.15), transparent);" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">&#8249;</div>
    </div>
    <div id="__sl_export_next" onclick="window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))" style="position:absolute;right:0;top:0;bottom:0;width:15%;z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);background:linear-gradient(to left, rgba(0,0,0,0.15), transparent);" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">&#8250;</div>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Content Security Policy — must come before any scripts.
       connect-src 'none' blocks all fetch/XHR/WebSocket so generated code
       cannot exfiltrate slide data to external servers.
       unsafe-inline + unsafe-eval are required for Babel JSX compilation. -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src * data: blob:; connect-src 'none'; frame-src 'none'; worker-src 'none';" />
  <script>
    /* Silence noisy CDN / Babel / browser-privacy warnings that are expected
       in this sandboxed preview environment and have no actionable meaning. */
    (function () {
      var _warn = console.warn.bind(console);
      console.warn = function () {
        var msg = arguments[0];
        if (typeof msg === "string" && (
          msg.indexOf("cdn.tailwindcss.com") !== -1 ||
          msg.indexOf("in-browser Babel transformer") !== -1 ||
          msg.indexOf("precompile your scripts") !== -1 ||
          msg.indexOf("Tracking Prevention") !== -1 ||
          msg.indexOf("blocked access to storage") !== -1
        )) return;
        _warn.apply(console, arguments);
      };
      var _log = console.log.bind(console);
      console.log = function () {
        var msg = arguments[0];
        if (typeof msg === "string" && (
          msg.indexOf("cdn.tailwindcss.com") !== -1 ||
          msg.indexOf("in-browser Babel transformer") !== -1 ||
          msg.indexOf("Tracking Prevention") !== -1 ||
          msg.indexOf("blocked access to storage") !== -1
        )) return;
        _log.apply(console, arguments);
      };
    })();
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    /* Extend Tailwind with sl-* color utilities mapped to the theme CSS vars.
       bg-sl-bg, text-sl-text, bg-sl-accent, text-sl-sub etc. are now valid
       Tailwind classes whose values update automatically when the theme changes. */
    tailwind.config = { theme: { extend: { colors: {
      "sl-bg":     "var(--sl-bg)",
      "sl-text":   "var(--sl-text)",
      "sl-accent": "var(--sl-accent)",
      "sl-sub":    "var(--sl-sub)",
    } } } };
  </script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Anime.js v3 — presentation-sandbox global; use as anime({ ... }) in generated components -->
  <script src="https://unpkg.com/animejs@3/lib/anime.min.js"></script>
  <script>
    /* Expose React hooks as bare globals so generated code can call useState() etc. */
    var useState      = React.useState;
    var useEffect     = React.useEffect;
    var useRef        = React.useRef;
    var useMemo       = React.useMemo;
    var useCallback   = React.useCallback;
    var useReducer    = React.useReducer;
    var useContext    = React.useContext;
    var createContext = React.createContext;
    var Fragment      = React.Fragment;
  </script>
  <script>
    /* Custom keyframe injection — AI can call window.__css('...') in useEffect */
    window.__css = function(css) {
      var s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    };
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root { ${vars} }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body { 
      background: ${forExport ? "#f1f5f9" : "var(--sl-bg)"};
      /* Clean, sharp text rendering */
      font-smooth: always;
      -webkit-font-smoothing: subpixel-antialiased;
      image-rendering: -webkit-optimize-contrast;
    }
    ${forExport ? `
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }
    .sl-stage {
      width: 100vw; height: 100vh;
      overflow: hidden; position: relative; z-index: 1;
    }
    .sl-box {
      position: absolute;
      top: 50%; left: 50%;
      width: 1920px; height: 1080px;
      transform-origin: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    #root { width: 100%; height: 100%; min-height: 0; }
    ` : `
    #root { height: 100vh; width: 100vw; overflow: hidden; }
    `}

    /* Force h-screen/w-screen to stay within our 16:9 canvas instead of the browser viewport */
    #root .h-screen { height: 100% !important; }
    #root .w-screen { width: 100% !important; }
    #root .min-h-screen { min-height: 100% !important; }

    /* Force outermost rendered element to honour the theme. */
    #root > * {
      background: var(--sl-bg) !important;
      color: var(--sl-text) !important;
    }

    /* ── Theme-aware text overrides ─────────────────────────────────────────
       Remap hardcoded neutral text classes on ANY descendant so theme text
       wins. Chromatic classes (text-blue-*, text-indigo-*, etc.) and inline
       style={{ color:... }} declarations are intentionally left alone.      */
    #root :is([class~="text-white"],[class~="text-black"],
      [class~="text-slate-50"],[class~="text-slate-100"],[class~="text-slate-200"],
      [class~="text-slate-700"],[class~="text-slate-800"],[class~="text-slate-900"],[class~="text-slate-950"],
      [class~="text-gray-50"],[class~="text-gray-100"],[class~="text-gray-200"],
      [class~="text-gray-700"],[class~="text-gray-800"],[class~="text-gray-900"],[class~="text-gray-950"],
      [class~="text-zinc-50"],[class~="text-zinc-100"],[class~="text-zinc-200"],
      [class~="text-zinc-700"],[class~="text-zinc-800"],[class~="text-zinc-900"],[class~="text-zinc-950"]
    ) { color: var(--sl-text) !important; }

    /* Mid-range neutrals → secondary/muted text */
    #root :is(
      [class~="text-slate-300"],[class~="text-slate-400"],[class~="text-slate-500"],[class~="text-slate-600"],
      [class~="text-gray-300"],[class~="text-gray-400"],[class~="text-gray-500"],[class~="text-gray-600"],
      [class~="text-zinc-300"],[class~="text-zinc-400"],[class~="text-zinc-500"],[class~="text-zinc-600"]
    ) { color: var(--sl-sub) !important; }

    /* ── Theme-aware background overrides ───────────────────────────────────
       Override full-bleed neutral bg classes. Mid-range shades (card/chip
       surfaces) are left alone to preserve intentional layering.            */
    #root :is([class~="bg-white"],[class~="bg-black"],
      [class~="bg-slate-50"],[class~="bg-slate-900"],[class~="bg-slate-950"],
      [class~="bg-gray-50"],[class~="bg-gray-900"],[class~="bg-gray-950"],
      [class~="bg-zinc-50"],[class~="bg-zinc-900"],[class~="bg-zinc-950"]
    ) { background-color: var(--sl-bg) !important; }

    /* ── Slidi animation palette ───────────────────────────────────────── */
    @keyframes sl-fade-in    { from { opacity:0 }                              to { opacity:1 } }
    @keyframes sl-slide-up   { from { opacity:0; transform:translateY(32px) }  to { opacity:1; transform:translateY(0) } }
    @keyframes sl-slide-left { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
    @keyframes sl-scale-in   { from { opacity:0; transform:scale(.92) }        to { opacity:1; transform:scale(1) } }
    @keyframes sl-float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
    @keyframes sl-pulse-ring { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(1.6); opacity:0 } }
    @keyframes sl-bar-grow   { from { transform:scaleY(0) } to { transform:scaleY(1) } }

    .sl-fade-in    { animation: sl-fade-in    .5s ease both }
    .sl-slide-up   { animation: sl-slide-up   .5s ease both }
    .sl-slide-left { animation: sl-slide-left .5s ease both }
    .sl-scale-in   { animation: sl-scale-in   .4s ease both }
    .sl-float      { animation: sl-float      4s ease-in-out infinite }
    .sl-pulse-ring { animation: sl-pulse-ring 1.5s ease-out infinite }
    /* transform-origin must be on the class, not inside @keyframes */
    .sl-bar-grow   { animation: sl-bar-grow   .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom }

    /* Stagger delay helpers — chain with any entrance class */
    .sl-delay-1 { animation-delay: .1s }
    .sl-delay-2 { animation-delay: .2s }
    .sl-delay-3 { animation-delay: .3s }
    .sl-delay-4 { animation-delay: .4s }
    .sl-delay-5 { animation-delay: .5s }

    /* Nav buttons: hidden until the user hovers over the slide */
    /* Inspect mode — element hover / selection */
    .__sl_hover { outline: 2px dashed var(--sl-accent) !important; outline-offset: 2px; cursor: crosshair !important; }
    .__sl_selected { outline: 2px solid #6c63ff !important; outline-offset: 3px; }

    #sl-fs-exit { display: none; }
    :fullscreen #sl-fs-exit { display: flex; }
    :-webkit-full-screen #sl-fs-exit { display: flex; }

    #err {
      display: none;
      padding: 1rem;
      color: #ef4444;
      font: 12px/1.6 monospace;
      white-space: pre-wrap;
      background: #0f172a;
    }

    /* Fullscreen specific styles */
    :fullscreen {
      background-color: #020617 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
    }
    :fullscreen #root {
      width: 1920px !important;
      height: 1080px !important;
      min-height: 1080px !important;
      background-color: var(--sl-bg) !important;
      position: relative !important;
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);
      flex-shrink: 0;
    }
    :fullscreen #__slidi_toolbar {
      display: none;
    }
    
    /* Cross-browser fullscreen aliases */
    :-webkit-full-screen { background-color: #020617 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    :-webkit-full-screen #root { width: 1920px !important; height: 1080px !important; }
    :-moz-full-screen { background-color: #020617 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    :-moz-full-screen #root { width: 1920px !important; height: 1080px !important; }
  </style>
</head>
<body class="${forExport ? "sl-export-mode" : ""}">
  ${forExport ? '<div class="sl-stage"><div class="sl-box">' : ""}
  <div id="root">
    <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;font-family:system-ui,-apple-system,sans-serif;font-size:clamp(11px,1.4vw,16px);font-weight:700;text-transform:uppercase;letter-spacing:0.18em;gap:clamp(16px,2.5vh,28px);">
      <img
        src="${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Brand_Icon.svg"
        style="width:clamp(40px,6vw,72px);height:clamp(40px,6vw,72px);opacity:0.25;animation:sl-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"
      />
      Loading presentation…
    </div>
    <style>
      @keyframes sl-pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.08; } }
    </style>
  </div>
  <div id="err"></div>
  <script>
    /* Catch Babel/React compile errors so the iframe never stays stuck on
       "Loading presentation...". Only surface errors AFTER the initial
       CDN scripts (React, Babel, Tailwind) have finished loading so we
       don't mistake transient cross-origin load noise for real errors.
       Also silences the generic "Script error." cross-origin message which
       has no actionable meaning for the user. */
    var __slReady = false;
    window.addEventListener('load', function() { __slReady = true; });
    window.onerror = function(msg, src, line, col, err) {
      // "Script error." is a cross-origin opaque error from a CDN script — not actionable.
      if (!msg || String(msg) === 'Script error.' || String(msg) === 'Script error') return true;
      // Suppress errors that fire before DOMContentLoaded / script bootstrapping.
      if (!__slReady) return true;
      var root = document.getElementById("root");
      if (root) root.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#ef4444;font-family:monospace;font-size:12px;padding:1.5rem;text-align:center;white-space:pre-wrap">' + String(msg) + '</div>';
      return true;
    };
  </script>
  ${brandingBadge}
  ${exportControls}
  ${forExport ? "</div></div>" : ""}





  <script>
  /* Wheel + touch navigation: dispatch arrow key events so every presentation
     responds regardless of whether it was generated with these handlers. */
  (function() {
    var t;
    window.addEventListener('wheel', function(e) {
      clearTimeout(t);
      t = setTimeout(function() {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: e.deltaY > 0 ? 'ArrowRight' : 'ArrowLeft',
          bubbles: true, cancelable: true
        }));
      }, 80);
    }, { passive: true });
    var tx = 0;
    window.addEventListener('touchstart', function(e) {
      tx = e.touches[0].clientX;
    }, { passive: true });
    window.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: dx < 0 ? 'ArrowRight' : 'ArrowLeft',
          bubbles: true, cancelable: true
        }));
      }
    }, { passive: true });
  })();
  </script>

  <script>
     window.addEventListener("unhandledrejection", function(e) {
      window.onerror(String(e.reason), null, null, null, e.reason instanceof Error ? e.reason : null);
    });
  </script>
  <script>
    /* Remote navigation listener — handles postMessage from parent to avoid SecurityError */
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'SLIDI_NAV') {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: e.data.direction === 'next' ? 'ArrowRight' : 'ArrowLeft',
          bubbles: true,
          cancelable: true
        }));
      } else if (e.data && e.data.type === 'sl-theme-update') {
        var styleEl = document.getElementById('sl-dynamic-theme');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'sl-dynamic-theme';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = ':root { ' + e.data.vars + ' }';
      }
    });
  </script>
  <script>
    /* Slide state polyfill and title extraction */
    window.addEventListener('load', function() {
      // Fullscreen toggle logic
      var fsBtn = document.getElementById('sl-fs-toggle');
      if (fsBtn) {
        fsBtn.addEventListener('click', function() {
          if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){});
          } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(function(){});
          }
        });
      }

      // Title extraction (runs once on load for the first slide)
      var root = document.getElementById("root");
      if (root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        var maxPx = 0;
        var bestText = "";
        var SKIP_TAGS = new Set(['STYLE', 'SCRIPT', 'NOSCRIPT', 'HEAD', 'META', 'LINK']);
        while (node = walker.nextNode()) {
          var txt = node.nodeValue.trim();
          if (txt.length < 3) continue;
          var parent = node.parentElement;
          if (!parent) continue;
          // Skip invisible/non-content elements (style/script tags contain CSS/JS text)
          if (SKIP_TAGS.has(parent.tagName)) continue;
          var style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          var size = parseFloat(style.fontSize) || 0;
          if (size > maxPx) {
             maxPx = size;
             bestText = txt;
          }
        }
        if (bestText) {
          window.parent.postMessage({ type: 'sl_extracted_title', title: bestText }, '*');
        }
      }
    });
  </script>
  <script>
    /* Slide state detection and navigation synchronization */
    (function() {
      var root = document.getElementById("root");
      var lastCurrent = -1;
      var lastTotal = -1;

      function checkState() {
        if (!root) return;
        
        var text = root.textContent || "";
        var matches = [];
        var regex = /(\\d+)\\s*(?:\\/|of|von)\\s*(\\d+)|Slide\\s*(\\d+)/gi;
        var m;
        while (m = regex.exec(text)) {
          if (m[3]) {
            var c = parseInt(m[3], 10);
            if (c > 0) {
              matches.push({ c: c, t: lastTotal > 0 ? lastTotal : 1 });
            }
          } else {
            var c = parseInt(m[1], 10);
            var t = parseInt(m[2], 10);
            if (c > 0 && c <= t && t > 0 && t < 100) {
              matches.push({ c: c, t: t });
            }
          }
        }

        if (matches.length > 0) {
          var best = matches[matches.length - 1];
          var current = best.c - 1;
          var total = best.t;
          
          if (current !== lastCurrent || total !== lastTotal) {
            lastCurrent = current;
            lastTotal = total;
            ${!forExport ? "window.parent.postMessage({ type: 'sl_slide_change', current: current, total: total }, '*');" : ""}
          }
        }
      }

      var observer = new MutationObserver(checkState);
      
      function init() {
        root = document.getElementById("root");
        if (root) {
          observer.observe(root, { childList: true, subtree: true, characterData: true });
          checkState();
          // Periodically check as a fallback (Babel/Tailwind can be slow)
          setInterval(checkState, 500);
        } else {
          setTimeout(init, 100);
        }
      }

      if (document.readyState === 'complete') init();
      else window.addEventListener('load', init);
    })();
  </script>
  ${!forExport ? `<script>
  /* Visual Editor Inspector — element targeting, selection ring, sl-element-select postMessage */
  (function() {
    var active = false;
    var selectedEl = null;
    var badge = null;

    function getXPath(el) {
      var parts = [];
      var cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.body) {
        var idx = 1;
        var sib = cur.previousElementSibling;
        while (sib) { if (sib.tagName === cur.tagName) idx++; sib = sib.previousElementSibling; }
        parts.unshift(cur.tagName.toLowerCase() + '[' + idx + ']');
        cur = cur.parentElement;
      }
      return '//' + parts.join('/');
    }

    function findTarget(startEl) {
      var cur = startEl;
      while (cur && cur !== document.body) {
        if (cur.classList && cur.classList.contains('material-symbols-rounded')) {
          return { el: cur, type: 'icon', value: (cur.textContent || '').trim() };
        }
        if (cur.tagName === 'IMG') {
          return { el: cur, type: 'image', value: cur.getAttribute('src') || '' };
        }
        if (cur.tagName === 'A') {
          return { el: cur, type: 'link', value: cur.getAttribute('href') || '' };
        }
        if (/^H[1-6]$/.test(cur.tagName)) {
          return { el: cur, type: 'text', value: (cur.textContent || '').trim() };
        }
        if (cur.tagName === 'P') {
          return { el: cur, type: 'text', value: (cur.textContent || '').trim() };
        }
        if (cur.tagName === 'SPAN' && cur.classList && !cur.classList.contains('material-symbols-rounded')) {
          var sv = (cur.textContent || '').trim();
          if (sv) return { el: cur, type: 'text', value: sv };
        }
        if (cur.tagName === 'LI') {
          var lv = (cur.textContent || '').trim();
          if (lv) return { el: cur, type: 'text', value: lv };
        }
        if (cur.tagName === 'BUTTON') {
          var bv = (cur.textContent || '').trim();
          if (bv) return { el: cur, type: 'text', value: bv };
        }
        if (cur.tagName === 'DIV') {
          // Only treat a DIV as a text target if it has no child element nodes
          // (i.e. it's a leaf text container like <div className="stat">42%</div>)
          var hasEl = false;
          for (var ci = 0; ci < cur.childNodes.length; ci++) {
            if (cur.childNodes[ci].nodeType === 1) { hasEl = true; break; }
          }
          if (!hasEl) {
            var dv = (cur.textContent || '').trim();
            if (dv) return { el: cur, type: 'text', value: dv };
          }
        }
        if (cur.dataset && cur.dataset.editable) {
          return { el: cur, type: cur.dataset.editable || 'generic', value: (cur.textContent || '').trim() };
        }
        cur = cur.parentElement;
      }
      return null;
    }

    function clearHover() {
      document.querySelectorAll('.__sl_hover').forEach(function(n) { n.classList.remove('__sl_hover'); });
    }

    function removeBadge() {
      if (badge && badge.parentNode) { badge.parentNode.removeChild(badge); badge = null; }
    }

    function clearSelection() {
      if (selectedEl) { selectedEl.classList.remove('__sl_selected'); selectedEl = null; }
      removeBadge();
    }

    function showBadge(el, type) {
      removeBadge();
      var labels = { icon: 'Icon', image: 'Image', link: 'Link', text: 'Text', generic: 'Element' };
      var rect = el.getBoundingClientRect();
      badge = document.createElement('div');
      badge.textContent = labels[type] || type;
      badge.setAttribute('style', 'position:fixed;background:#6c63ff;color:#fff;font:600 10px/1 system-ui,sans-serif;padding:2px 6px;border-radius:3px;z-index:100001;pointer-events:none;letter-spacing:0.04em;text-transform:uppercase;top:' + (rect.bottom + 4) + 'px;left:' + rect.left + 'px');
      document.body.appendChild(badge);
    }

    window.addEventListener('message', function(e) {
      if (!e.data) return;
      if (e.data.type === 'sl-inspect-mode') {
        active = !!e.data.value;
        document.body.style.cursor = active ? 'crosshair' : '';
        if (!active) { clearHover(); clearSelection(); }
      }
    });

    document.addEventListener('mouseover', function(e) {
      if (!active) return;
      clearHover();
      var target = findTarget(e.target);
      if (target) target.el.classList.add('__sl_hover');
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && active) {
        clearSelection();
        clearHover();
        window.parent.postMessage({ type: 'sl-element-deselect' }, '*');
      }
    });

    document.addEventListener('click', function(e) {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var target = findTarget(e.target);
      clearSelection();
      if (!target) {
        window.parent.postMessage({ type: 'sl-element-deselect' }, '*');
        return;
      }
      selectedEl = target.el;
      selectedEl.classList.add('__sl_selected');
      showBadge(selectedEl, target.type);
      var rect = selectedEl.getBoundingClientRect();
      window.parent.postMessage({
        type: 'sl-element-select',
        elementType: target.type,
        currentValue: target.value,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        tagName: selectedEl.tagName.toLowerCase(),
        xpath: getXPath(selectedEl)
      }, '*');
    }, true);
  })();
  </script>` : ""}
  <script type="text/babel" data-type="module" data-presets="react,typescript">
// AI GENERATED CODE START
${isJson ? `const slideData = ${safe};\n${rendererScript}` : safe}
// AI GENERATED CODE END

;(function() {
  var __Component = typeof Presentation !== "undefined" ? Presentation
                  : typeof App !== "undefined" ? App
                  : null;
  if (__Component) {
    try {
      ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(__Component));
    } catch (e) {
      window.onerror(e.message, null, null, null, e);
    }
  } else {
    document.getElementById("root").style.display = "none";
    var el = document.getElementById("err");
    el.style.display = "block";
    el.textContent = "No component found. Expected: export default function Presentation() { ... }";
  }
})();
  </script>
  <script>
    (function() {
      function scaleContent() {
        var isFS = !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.mozFullScreenElement;
        // In editor mode, we scale #root. In export mode, we scale .sl-box.
        var box = document.querySelector(isFS ? '#root' : '.sl-box') || document.getElementById('root');
        if (!box) return;
        
        var targetW = 1920;
        var targetH = 1080;
        var windowW = window.innerWidth;
        var windowH = window.innerHeight;
        
        var scale = Math.min(windowW / targetW, windowH / targetH);
        
        if (isFS || document.body.classList.contains('sl-export-mode')) {
          box.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
          box.style.transformOrigin = 'center';
          box.style.position = 'absolute';
          box.style.top = '50%';
          box.style.left = '50%';
        } else {
          // In editor mode (not FS), SlideBox handles scaling via parent transform,
          // so we reset internal transforms to avoid double scaling.
          box.style.transform = '';
          box.style.position = '';
          box.style.top = '';
          box.style.left = '';
        }
      }
      window.addEventListener('resize', scaleContent);
      ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange'].forEach(function(e) {
        document.addEventListener(e, scaleContent);
      });
      scaleContent();
      setTimeout(scaleContent, 100);
      setTimeout(scaleContent, 1000); // Guard for slow-loading layouts
    })();
  </script>
</body>
</html>`;
}

export default function SrcdocPreview({
  code,
  theme,
  inspectMode = false,
  branding,
  syncChannel,
  onElementSelect,
  onElementDeselect,
  onCommitEdit,
  controlledSlide,
}: {
  code: string;
  theme: ThemeId;
  inspectMode?: boolean;
  branding: Branding | null;
  syncChannel?: string;
  controlledSlide?: number;
  onElementSelect?: (payload: SelectedElement) => void;
  onElementDeselect?: () => void;
  onCommitEdit?: (tagName: string, oldText: string, newText: string) => void;
}) {
  const engineVersion = useSlidiStore((s) => s.engineVersion);

  // ── Double-buffer crossfade ────────────────────────────────────────────────
  // Two iframes (A and B) alternate as the visible one. When srcdoc changes,
  // the inactive iframe loads the new content in the background. Once it fires
  // onLoad we swap which buffer is "active", producing a smooth crossfade with
  // no blank-flash between versions.
  const iframeARef = useRef<HTMLIFrameElement>(null);
  const iframeBRef = useRef<HTMLIFrameElement>(null);
  // Mutable ref so effects/callbacks always read the latest active buffer
  // without needing to be in the dependency array.
  const activeBufferRef = useRef<"a" | "b">("a");
  const [activeBuffer, setActiveBuffer] = useState<"a" | "b">("a");
  const pendingRef = useRef<"a" | "b" | null>(null);
  const isInitialized = useRef(false);
  // Snapshot of currentSlide captured when srcdoc changes — before the new
  // iframe fires sl_slide_change:0 and resets the store.
  const pendingSlideRef = useRef(0);

  // Keep the mutable ref in sync with state so callbacks stay fresh.
  useLayoutEffect(() => { activeBufferRef.current = activeBuffer; }, [activeBuffer]);

  // Helper: send a postMessage to whichever iframe is currently active.
  const postToActive = useCallback((msg: object) => {
    const ref = activeBufferRef.current === "a" ? iframeARef : iframeBRef;
    ref.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Forward inspect mode toggles into the active iframe.
  useEffect(() => {
    postToActive({ type: "sl-inspect-mode", value: inspectMode });
  }, [inspectMode, postToActive]);

  // Re-send on load for each buffer (covers first paint after swap).
  const handleLoadA = useCallback(() => {
    iframeARef.current?.contentWindow?.postMessage({ type: "sl-inspect-mode", value: inspectMode }, "*");
    if (pendingRef.current === "a") {
      pendingRef.current = null;
      // Restore slide position using the snapshot taken when srcdoc changed.
      // We cannot read from the store here because the new iframe has already
      // fired sl_slide_change:0 and reset store.currentSlide to 0.
      const slide = pendingSlideRef.current;
      for (let i = 0; i < slide; i++) {
        iframeARef.current?.contentWindow?.postMessage({ type: "SLIDI_NAV", direction: "next" }, "*");
      }
      setActiveBuffer("a");
    }
  }, [inspectMode]);

  const handleLoadB = useCallback(() => {
    iframeBRef.current?.contentWindow?.postMessage({ type: "sl-inspect-mode", value: inspectMode }, "*");
    if (pendingRef.current === "b") {
      pendingRef.current = null;
      // Restore slide position using the snapshot taken when srcdoc changed.
      const slide = pendingSlideRef.current;
      for (let i = 0; i < slide; i++) {
        iframeBRef.current?.contentWindow?.postMessage({ type: "SLIDI_NAV", direction: "next" }, "*");
      }
      setActiveBuffer("b");
    }
  }, [inspectMode]);

  // Handle BroadcastChannel and postMessage from iframe
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (syncChannel) {
      bc = new BroadcastChannel(syncChannel);
      bc.onmessage = (e) => {
        if (e.data.type === "SLIDI_REMOTE_NAV") {
          // Presenter clicked next/prev, postMessage into the iframe to avoid SecurityError
          postToActive({
            type: "SLIDI_NAV",
            direction: e.data.direction
          });
        }
        if (e.data.type === "SLIDI_REQUEST_STATE") {
          // Respond with current tracked state
          const { currentSlide, totalSlides } = useSlidiStore.getState();
          bc!.postMessage({ type: "SLIDI_STATE_SYNC", current: currentSlide, total: totalSlides });
        }
        if (e.data.type === "SLIDI_GOTO_SLIDE") {
          const { currentSlide } = useSlidiStore.getState();
          const target = e.data.target as number;
          const delta = target - currentSlide;
          if (delta === 0) return;
          const direction = delta > 0 ? "next" : "prev";
          const count = Math.abs(delta);
          for (let i = 0; i < count; i++) {
            postToActive({ type: "SLIDI_NAV", direction });
          }
        }
      };
    }

    const handler = (e: MessageEvent) => {
      // Visual editor messages
      if (e.data?.type === "sl-element-select" && onElementSelect) {
        onElementSelect({
          elementType: e.data.elementType,
          currentValue: e.data.currentValue,
          rect: e.data.rect,
          tagName: e.data.tagName,
          xpath: e.data.xpath,
        });
      }
      if (e.data?.type === "sl-element-deselect" && onElementDeselect) {
        onElementDeselect();
      }
      if (e.data?.type === "sl-commit-visual-edit" && onCommitEdit) {
        onCommitEdit(e.data.tagName as string, e.data.oldText as string, e.data.newText as string);
      }

      // Slide Change Sync Logic — update store so presenter can request state on mount
      if (e.data?.type === "sl_slide_change") {
        useSlidiStore.getState().setCurrentSlide(e.data.current);
        useSlidiStore.getState().setTotalSlides(e.data.total);
        if (bc) {
          bc.postMessage({
            type: "SLIDI_STATE_SYNC",
            current: e.data.current,
            total: e.data.total,
          });
        }
      }

      // Handle Extracted Title
      if (e.data?.type === "sl_extracted_title" && e.data.title) {
        const store = useSlidiStore.getState();
        if (!store.presentationName || store.presentationName.startsWith("Presentation ")) {
          store.setPresentationName(e.data.title);
        }
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      bc?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncChannel, onElementSelect, onElementDeselect, onCommitEdit, postToActive]);

  // Handle controlled slide updates
  useEffect(() => {
    if (controlledSlide !== undefined) {
      const { currentSlide } = useSlidiStore.getState();
      const delta = controlledSlide - currentSlide;
      if (delta === 0) return;
      const direction = delta > 0 ? "next" : "prev";
      const count = Math.abs(delta);
      for (let i = 0; i < count; i++) {
        postToActive({ type: "SLIDI_NAV", direction });
      }
      useSlidiStore.getState().setCurrentSlide(controlledSlide);
    }
  }, [controlledSlide, postToActive]);

  const resolvedLogoUrl = useLogoUrl(branding?.logoUrl);

  // Memoized srcdoc — 5-regex pass only reruns when inputs actually change.
  // Note: 'theme' is intentionally omitted from the dependency array so that
  // theme changes do not trigger a full iframe reload. Instead, the theme is
  // dynamically updated via postMessage below.
  const srcdoc = useMemo(
    () => {
      const resolvedBranding = branding
        ? { ...branding, logoUrl: resolvedLogoUrl }
        : null;
      return buildSrcdoc(code, theme, resolvedBranding, false, engineVersion);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, resolvedLogoUrl, branding?.id, branding?.name, branding?.display,
     branding?.position, branding?.type, branding?.size, branding?.sizePercentage, branding?.padding, engineVersion]
  );

  // Dynamically update theme without reloading the iframe
  useEffect(() => {
    postToActive({ type: "sl-theme-update", vars: getThemeVars(theme) });
  }, [theme, postToActive]);

  // Double-buffer: when srcdoc changes after initial mount, load the new content
  // into the INACTIVE iframe (invisible) and crossfade once it's ready.
  const [srcdocA, setSrcdocA] = useState<string>(() => srcdoc);
  const [srcdocB, setSrcdocB] = useState<string | null>(null);

  useEffect(() => {
    // Skip the very first run — srcdocA is already initialised with the correct value.
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    // Snapshot current slide NOW — before the new iframe loads, resets to 0,
    // and fires sl_slide_change:0 which would overwrite the store.
    pendingSlideRef.current = useSlidiStore.getState().currentSlide;
    const inactive = activeBufferRef.current === "a" ? "b" : "a";
    pendingRef.current = inactive;
    if (inactive === "b") setSrcdocB(srcdoc);
    else setSrcdocA(srcdoc);
  // activeBufferRef is a mutable ref — intentionally excluded from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcdoc]);

  if (!code) return null;

  const iframeStyle = (buf: "a" | "b"): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: "none",
    opacity: activeBuffer === buf ? 1 : 0,
    transition: "opacity 250ms ease",
    pointerEvents: activeBuffer === buf ? "auto" : "none",
    zIndex: activeBuffer === buf ? 1 : 0,
  });

  // allow-same-origin is intentionally absent: adding it alongside allow-scripts
  // lets sandboxed code escape to window.parent (read localStorage API keys,
  // modify parent DOM, hit backend API routes). allow-scripts alone gives the
  // iframe a null/opaque origin so none of that is possible. postMessage still
  // works cross-origin for slide sync, visual editing, and title extraction.
  const sandboxAttr = "allow-scripts";

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeARef}
        srcDoc={srcdocA}
        sandbox={sandboxAttr}
        allow="fullscreen"
        onLoad={handleLoadA}
        style={iframeStyle("a")}
        title="Presentation preview"
      />
      {srcdocB !== null && (
        <iframe
          ref={iframeBRef}
          srcDoc={srcdocB}
          sandbox={sandboxAttr}
          allow="fullscreen"
          onLoad={handleLoadB}
          style={iframeStyle("b")}
          title="Presentation preview (B)"
        />
      )}
    </div>
  );
}
