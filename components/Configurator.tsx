"use client";

import { useState } from "react";
import { PergolaViewer } from "./viewer/PergolaViewer";
import { ConfigPanel } from "./ui/ConfigPanel";
import { EstimatePanel } from "./ui/EstimatePanel";
import { QuoteModal } from "./ui/QuoteModal";

type Tab = "design" | "estimate";

export function Configurator() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("design");

  return (
    <div className="flex h-dvh flex-col bg-zinc-100 lg:flex-row">
      {/* 3D viewer: top half on mobile, fills remaining width on desktop */}
      <div className="relative h-[46dvh] shrink-0 lg:h-full lg:flex-1">
        <PergolaViewer />
        <header className="pointer-events-none absolute left-4 top-4">
          <h1 className="text-base font-semibold text-zinc-900">Pergola &amp; Deck Configurator</h1>
          <p className="text-xs text-zinc-500">Design it, price it, get a quote.</p>
        </header>
      </div>

      {/* Control panel */}
      <aside className="flex min-h-0 flex-1 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
        <nav className="grid grid-cols-2 border-b border-zinc-200 lg:hidden" aria-label="Panel">
          {(["design", "estimate"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`py-2.5 text-sm font-medium capitalize ${
                tab === t ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-500"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
          <div className={`${tab === "design" ? "block" : "hidden"} lg:block`}>
            <ConfigPanel />
          </div>
          <div className={`${tab === "estimate" ? "block" : "hidden"} lg:mt-8 lg:block`}>
            <EstimatePanel onQuote={() => setQuoteOpen(true)} />
          </div>
        </div>

        {/* Sticky CTA on mobile design tab */}
        {tab === "design" && (
          <div className="border-t border-zinc-200 p-3 lg:hidden">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="w-full rounded-md bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-900"
            >
              Get a Quote
            </button>
          </div>
        )}
      </aside>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  );
}
