"use client";

import dynamic from "next/dynamic";

// three.js needs the DOM, so the scene is loaded client-side only.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading 3D viewer…
    </div>
  ),
});

export function PergolaViewer() {
  return (
    <div className="relative h-full w-full">
      <Scene />
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs text-zinc-600 shadow-sm backdrop-blur">
        Drag to orbit · scroll / pinch to zoom
      </div>
    </div>
  );
}
