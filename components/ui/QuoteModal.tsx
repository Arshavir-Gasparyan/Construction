"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getColor, getFrameFinish, getMaterial } from "@/lib/pergola/catalog";
import { selectConfig, useConfigurator } from "@/lib/pergola/store";
import { useShallow } from "zustand/react/shallow";
import { useEstimate } from "./EstimatePanel";

export function QuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Remount on every open so the form state resets.
  if (!open) return null;
  return <QuoteDialog onClose={onClose} />;
}

function QuoteDialog({ onClose }: { onClose: () => void }) {
  const config = useConfigurator(useShallow(selectConfig));
  const estimate = useEstimate();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const material = getMaterial(config.material);
  const color = getColor(config.material, config.colorId);
  const frame = getFrameFinish(config.frameFinishId);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // MVP: no backend yet. Wire this to an API route / CRM later.
    console.info("Quote request", {
      contact: Object.fromEntries(form.entries()),
      config,
      estimate,
    });
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-title"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="quote-title" className="text-lg font-semibold text-zinc-900">
              Request a quote
            </h2>
            <p className="text-sm text-zinc-500">We&apos;ll get back to you within one working day.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-sm">
          <dt className="text-zinc-500">Size</dt>
          <dd className="text-zinc-900">
            {config.width} × {config.length} × {config.height} cm
          </dd>
          <dt className="text-zinc-500">Decking</dt>
          <dd className="text-zinc-900">
            {material.name}, {color.name}
          </dd>
          <dt className="text-zinc-500">Frame</dt>
          <dd className="text-zinc-900">{frame.name}</dd>
          <dt className="text-zinc-500">Estimate</dt>
          <dd className="font-semibold text-zinc-900">€{estimate.total.toLocaleString("en-IE")}</dd>
        </dl>

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Thanks! Your configuration has been sent. We&apos;ll be in touch shortly.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-800">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                placeholder="Site access, ground conditions, preferred dates…"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Send request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-800">{label}</span>
      <input
        {...props}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
      />
    </label>
  );
}
