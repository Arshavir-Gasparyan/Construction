"use client";

import { useMemo } from "react";
import { calculateEstimate } from "@/lib/pergola/calculator";
import { selectConfig, useConfigurator } from "@/lib/pergola/store";
import { useShallow } from "zustand/react/shallow";

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function useEstimate() {
  const config = useConfigurator(useShallow(selectConfig));
  return useMemo(() => calculateEstimate(config), [config]);
}

export function EstimatePanel() {
  const estimate = useEstimate();

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Material list
        </h2>
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {estimate.lines.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm text-zinc-800">{l.label}</div>
                {l.detail && <div className="text-[11px] text-zinc-500">{l.detail}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm tabular-nums text-zinc-800">
                  {l.quantity} {l.unit}
                </div>
                <div className="text-[11px] tabular-nums text-zinc-500">{eur.format(l.price)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-lg bg-zinc-900 p-4 text-white">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-300">Estimated price</span>
          <span className="text-2xl font-semibold tabular-nums">{eur.format(estimate.total)}</span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">
          {estimate.areaM2} m² deck · materials only, excl. VAT and installation
        </div>
      </div>
    </div>
  );
}
