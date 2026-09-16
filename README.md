# Pergola & Deck Configurator

Browser-based 3D configurator for a timber pergola on a deck. Built with Next.js (App Router), TypeScript, React Three Fiber, drei and Zustand.

## Run

```bash
npm install
npm run dev      # http://localhost:3000 (use PORT=xxxx if 3000 is taken)
npm run build
```

## Features

- Parametric width / length / height; the 3D model, material list and price update live.
- Decking material (WPC or larch) with material-specific colours, plus a frame finish.
- Orbit / zoom controls with damping, on-demand rendering (no idle GPU load).
- Material take-off: decking, joists, posts, beams, rafters, clips, screws.
- Price estimate and a "Get a Quote" form (logs to the console for now; wire to an API route or CRM).
- Responsive: side panel on desktop, viewer + tabbed panel on mobile.

## Structure

```
lib/pergola/
  types.ts        shared types (config, parts, layout)
  catalog.ts      materials, colours, finishes, profiles, prices, limits
  layout.ts       pure function: dimensions -> list of rectangular parts (metres)
  calculator.ts   pure function: config -> bill of materials + price
  store.ts        Zustand store for the current configuration
components/viewer/
  PergolaViewer   client-only loader for the scene (next/dynamic, ssr: false)
  Scene           Canvas, lights, ground, orbit controls, camera framing
  PergolaModel    renders the layout with one InstancedMesh per part group
  woodTexture     small procedural grain texture
components/ui/    control panel, estimate panel, quote modal
components/Configurator.tsx   page layout (viewer + panel)
```

## Performance notes

All parts share a single unit `BoxGeometry` and are drawn as five instanced meshes (posts, beams, rafters, joists, decking), so the whole structure is five draw calls regardless of size. The canvas uses `frameloop="demand"` and only re-renders on interaction or configuration changes.

## Adding AR later

`buildLayout()` describes the structure as plain data and `PergolaModel` is independent of camera, lights and controls. For AR either:

- drop `<PergolaModel />` into a WebXR session (`@react-three/xr`), or
- export the same scene to GLB/USDZ with three's `GLTFExporter` / `USDZExporter` for Quick Look / Scene Viewer.

Prices in `catalog.ts` are placeholders; replace them with real rates.
