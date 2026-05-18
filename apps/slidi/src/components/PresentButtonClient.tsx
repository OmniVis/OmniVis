"use client";

import React from "react";

interface PresentButtonClientProps {
  id: string;
  basePath: string;
}

export default function PresentButtonClient({ id, basePath }: PresentButtonClientProps) {
  const url = `${basePath}/presenter?id=${id}&channel=${id}`;
  
  const handlePresent = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(url, "_blank", "width=800,height=600");
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1 border border-slate-700 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider transition-colors rounded-sm"
      onClick={handlePresent}
    >
      Present
    </a>
  );
}
