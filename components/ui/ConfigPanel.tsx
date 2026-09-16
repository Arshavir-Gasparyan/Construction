"use client";

import { useState } from "react";
import { FRAME_FINISHES, LIMITS, MATERIALS, getMaterial } from "@/lib/pergola/catalog";
import { useConfigurator } from "@/lib/pergola/store";
import type { Dimensions } from "@/lib/pergola/types";

const DIMENSION_FIELDS: { key: keyof Dimensions; label: string; hint: string }[] = [
  { key: "width", label: "Width", hint: "Deck width, side to side" },
  { key: "length", label: "Length", hint: "Deck length, front to back" },
  { key: "height", label: "Height", hint: "Deck surface to top of rafters" },
];

function DimensionControl({ field }: { field: (typeof DIMENSION_FIELDS)[number] }) {
  const value = useConfigurator((s) => s[field.key]);
  const setDimension = useConfigurator((s) => s.setDimension);
  const { min, max, step } = LIMITS[field.key];
  // Free-form text while typing; the value is clamped and committed on blur / Enter.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) setDimension(field.key, Number(draft));
    setDraft(null);
  };

  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-800">{field.label}</span>
        <span className="flex items-center gap-1 text-sm text-zinc-600">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft ?? value}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
            aria-label={`${field.label} in centimetres`}
          />
          cm
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setDimension(field.key, Number(e.target.value))}
        className="w-full accent-zinc-900"
      />
      <div className="mt-0.5 flex justify-between text-[11px] text-zinc-400">
        <span>{min} cm</span>
        <span>{field.hint}</span>
        <span>{max} cm</span>
      </div>
    </label>
  );
}

function Swatches({
  options,
  value,
  onChange,
  name,
}: {
  options: { id: string; name: string; hex: string }[];
  value: string;
  onChange: (id: string) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={c.name}
            onClick={() => onChange(c.id)}
            className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span
              className="h-5 w-5 rounded-full border border-black/10"
              style={{ backgroundColor: c.hex }}
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export function ConfigPanel() {
  const material = useConfigurator((s) => s.material);
  const colorId = useConfigurator((s) => s.colorId);
  const frameFinishId = useConfigurator((s) => s.frameFinishId);
  const setMaterial = useConfigurator((s) => s.setMaterial);
  const setColor = useConfigurator((s) => s.setColor);
  const setFrameFinish = useConfigurator((s) => s.setFrameFinish);
  const reset = useConfigurator((s) => s.reset);

  const current = getMaterial(material);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dimensions</h2>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Reset
          </button>
        </div>
        <div className="space-y-4">
          {DIMENSION_FIELDS.map((f) => (
            <DimensionControl key={f.key} field={f} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Decking material
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {MATERIALS.map((m) => {
            const active = m.id === material;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMaterial(m.id)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                    : "border-zinc-300 bg-white hover:border-zinc-500"
                }`}
              >
                <div className="text-sm font-semibold text-zinc-900">{m.name}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{m.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Decking colour
        </h2>
        <Swatches name="Decking colour" options={current.colors} value={colorId} onChange={setColor} />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Frame finish
        </h2>
        <Swatches
          name="Frame finish"
          options={FRAME_FINISHES}
          value={frameFinishId}
          onChange={setFrameFinish}
        />
      </section>
    </div>
  );
}
