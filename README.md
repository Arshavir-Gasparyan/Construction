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
  woodMaterial    loads the wood photos, tints them to catalogue colours, builds materials
public/textures/  wood surface photos (colour + normal maps), one folder per surface
components/ui/    control panel, estimate panel, quote modal
components/Configurator.tsx   page layout (viewer + panel)
```

## Product textures

Boards are rendered with photographed wood surfaces, not a generated pattern. Every surface is a `WoodTexture` entry in `lib/pergola/catalog.ts` (see `TEXTURES`), pointing at files in `public/textures/<name>/`. The two shipped surfaces are CC0 placeholders from [polyhaven.com](https://polyhaven.com) (`oak_veneer_01`, `ash_veneer`); replace them with the client's product photos.

### Two ways to use a client photo

1. **One photo per colour** (typical for WPC ranges photographed by the manufacturer): put a `texture` on the colour option. It is rendered exactly as photographed.
   ```ts
   { id: "teak", name: "Teak", hex: "#a5673f",
     texture: { color: "/textures/wpc-teak/color.jpg", normal: "/textures/wpc-teak/normal.jpg", size: [0.145, 1.2] } }
   ```
2. **One grain photo, many stains** (typical for timber oils and frame finishes): set `texture` on the material (or `FRAME_TEXTURE`) and give each colour only a `hex`. The photo's grain is recoloured to that hex at runtime, so one image covers the whole colour range. `contrast` on the texture controls how strong the grain shows after tinting.

`hex` is always required: it is the swatch in the panel and the fallback while the photo loads.

### What to ask the client for

- A straight-on photo of one board (or a swatch), evenly lit, no shadows, no perspective. Marketing photos of an installed product cannot be used.
- The physical size the photo covers, e.g. a 14.5 cm wide board over 120 cm of its length. This goes in `size: [across, along]` in metres so the grain renders at true scale.
- The real board width and thickness per product, so `PROFILE` in the catalog matches the product too.

### Preparing the files

- Grain must run **top to bottom** in the image (portrait plank photo). Rotate first if needed; do it before generating the normal map.
- Make it seamless along the grain. Photoshop (Filter > Other > Offset + heal) or [Materialize](https://boundingboxsoftware.com/materialize/) both work; Materialize also generates the normal and roughness maps from the photo.
- Export JPG or WebP at 1024 or 2048 px on the long side. Colour and normal maps at 1K are around 0.5 MB each; keep total texture weight in mind for mobile.
- Optional maps: `normal` (OpenGL convention, green = up) adds surface relief; `roughness` varies the sheen and is multiplied by the material's `roughness` value.

## Performance notes

Each part group (posts, beams, rafters, joists, decking, brackets) is merged into one geometry, so the whole structure is six draw calls regardless of size. UVs are in metres with the board length along V, and every board gets its own UV offset and a slight brightness variation so no two boards look identical. The canvas uses `frameloop="demand"` and only re-renders on interaction or configuration changes.

## Adding AR later

`buildLayout()` describes the structure as plain data and `PergolaModel` is independent of camera, lights and controls. For AR either:

- drop `<PergolaModel />` into a WebXR session (`@react-three/xr`), or
- export the same scene to GLB/USDZ with three's `GLTFExporter` / `USDZExporter` for Quick Look / Scene Viewer.

Prices in `catalog.ts` are placeholders; replace them with real rates.
