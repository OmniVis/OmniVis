"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

// Every name here has been verified to exist in Material Symbols Rounded.
// No duplicates — duplicate keys break React rendering.
const ICON_LIST = [
  // Common UI
  "star","home","settings","search","close","menu","arrow_forward","arrow_back",
  "check","add","remove","edit","delete","more_vert","more_horiz","drag_handle",
  "filter_list","sort","tune","view_list","view_module","grid_view","table_rows",
  // People & Org
  "person","group","groups","business","work","corporate_fare","diversity_3",
  "handshake","account_circle","badge","manage_accounts","supervisor_account",
  "person_add","people","family_restroom","child_care","elderly","accessibility",
  // Communication
  "phone","email","chat","forum","send","inbox","drafts","mark_email_read",
  "campaign","speaker","notifications","notification_add","contact_page",
  "video_call","call","message","sms","comment","rate_review","feedback",
  // Tech & Cloud
  "cloud","cloud_sync","cloud_upload","cloud_download","cloud_done","cloud_off",
  "storage","database","data_object","schema","api","code","developer_board",
  "memory","dns","hub","integration_instructions","webhook","token","terminal",
  "laptop","smartphone","tablet","desktop_windows","devices","router","wifi",
  "security","lock","key","vpn_key","fingerprint","verified","shield",
  "build","engineering","settings_suggest","manage_search","data_usage",
  // Data & Analytics
  "analytics","dashboard","trending_up","trending_down","bar_chart","pie_chart",
  "insights","show_chart","leaderboard","query_stats","assessment",
  "calculate","functions","table_chart","grid_on","format_list_numbered",
  // Navigation & Maps
  "map","public","explore","location_on","near_me","directions","navigation",
  "traffic","place","flag","signpost","travel_explore","language","translate",
  // Transport
  "directions_car","electric_car","local_taxi","local_shipping","airport_shuttle",
  "flight","train","directions_bus","directions_bike","motorcycle","two_wheeler",
  "ev_station","local_gas_station","garage","commute","hail",
  // Finance & Business
  "payments","credit_card","attach_money","savings","price_check","account_balance",
  "currency_exchange","swap_horiz","receipt","contract","sell",
  "store","shopping_cart","inventory","warehouse","local_offer",
  // Science & Nature
  "science","biotech","psychology","medical_services","health_and_safety","healing",
  "monitor_heart","water_drop","wb_sunny","dark_mode","eco","nature","forest",
  "local_florist","grass","thermostat","air","energy_savings_leaf","bolt",
  // Education
  "school","book","article","description","library_books","class","quiz",
  "assignment","grade","emoji_events","trophy","workspace_premium",
  // Media & Creative
  "image","photo_library","videocam","ondemand_video","play_circle","pause_circle",
  "music_note","volume_up","mic","record_voice_over","cast","live_tv",
  "palette","format_paint","brush","design_services","auto_awesome","color_lens",
  // Productivity
  "calendar_today","schedule","alarm","timer","event","task","checklist",
  "folder","attach_file","link","open_in_new","download","upload",
  "sync","refresh","history","restore","backup","save","print","share",
  // Status & Alerts
  "info","help","warning","error","check_circle","cancel","done_all","pending",
  "hourglass_empty","autorenew","loop","cached","priority_high","new_releases",
  // Misc
  "rocket_launch","lightbulb","diamond","favorite","thumb_up","celebration",
  "emoji_objects","extension","category","label","tag","local_activity","apps",
];

interface IconPanelProps {
  currentValue: string;
  onApply: (newIcon: string) => void;
}

export default function IconPanel({ currentValue, onApply }: IconPanelProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(currentValue);
  const [customUrl, setCustomUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();

  const filtered = query.trim()
    ? ICON_LIST.filter((n) => n.includes(query.trim().toLowerCase()))
    : ICON_LIST;

  function handleApplyIcon() {
    if (selected) onApply(selected);
  }

  function handleApplyUrl() {
    const result = sanitizeUrl(customUrl, "image");
    if (!result.valid) { setUrlError(result.warning); return; }
    setUrlError(undefined);
    onApply(result.url);
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <Search size={13} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-[260px] pr-1">
        {filtered.map((name) => (
          <button
            key={name}
            title={name}
            onClick={() => setSelected(name)}
            className={`aspect-square flex items-center justify-center rounded-lg transition-colors cursor-pointer overflow-hidden ${
              selected === name
                ? "bg-violet-100 ring-2 ring-violet-500"
                : "bg-slate-100 hover:bg-slate-200"
            }`}
          >
            <span
              style={{
                fontFamily: "'Material Symbols Rounded'",
                fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                fontSize: "20px",
                lineHeight: 1,
                letterSpacing: "normal",
                textTransform: "none",
                whiteSpace: "nowrap",
                wordWrap: "normal",
                direction: "ltr",
                fontFeatureSettings: "'liga' 1",
                WebkitFontFeatureSettings: "'liga' 1",
                fontStyle: "normal",
                fontWeight: "normal",
                display: "inline-block",
                userSelect: "none",
              }}
              className="text-slate-600"
            >
              {name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-5 text-xs text-slate-400 text-center py-4">No icons found</p>
        )}
      </div>

      {selected && (
        <button
          onClick={handleApplyIcon}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          Apply icon
        </button>
      )}

      <div className="border-t border-slate-200 pt-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Or paste image URL</p>
        <input
          type="url"
          placeholder="https://..."
          value={customUrl}
          onChange={(e) => { setCustomUrl(e.target.value); setUrlError(undefined); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-400"
        />
        {urlError && <p className="text-[10px] text-red-500 mt-1">{urlError}</p>}
        {customUrl && (
          <button
            onClick={handleApplyUrl}
            className="mt-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Apply URL
          </button>
        )}
      </div>
    </div>
  );
}
