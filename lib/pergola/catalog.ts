import type { FrameFinish, MaterialId, MaterialOption, WoodLook, WoodTexture } from "./types";

/** Slider limits, in centimetres. */
export const LIMITS = {
  width: { min: 200, max: 700, step: 10 },
  length: { min: 200, max: 800, step: 10 },
  height: { min: 220, max: 320, step: 5 },
} as const;

export const DEFAULT_DIMENSIONS = { width: 400, length: 500, height: 260 };

/** Section sizes and spacings in metres. Shared by the 3D layout and the calculator. */
export const PROFILE = {
  board: { width: 0.145, thickness: 0.025, gap: 0.006, stockLength: 4 },
  joist: { width: 0.05, height: 0.15, spacing: 0.4 },
  /** Shade slats (2x6 on edge) set inside the frame, top just below the beams. */
  rafter: { width: 0.04, height: 0.14, spacing: 0.3, drop: 0.01 },
  /** Perimeter beams, same visual section as the posts, flush with the post tops. */
  beam: { width: 0.14, height: 0.15 },
  /** 6x6 posts standing on the deck, set in from the edge. */
  post: { size: 0.15, inset: 0.1 },
  /** Black steel hardware (Toja-style corner brackets and base plates). */
  bracket: { clearance: 0.012, sleeveLength: 0.35, capDrop: 0.24, baseHeight: 0.12 },
} as const;

/**
 * Wood surfaces. The two below are CC0 placeholders from polyhaven.com
 * (oak_veneer_01, ash_veneer) until the client supplies product photos.
 * See README "Product textures" for how to add real ones.
 */
export const TEXTURES = {
  /** Clear-grained sawn timber: larch decking and the frame. */
  oak: {
    color: "/textures/oak-veneer/color.jpg",
    normal: "/textures/oak-veneer/normal.jpg",
    size: [1.83, 1.83],
    normalScale: 0.8,
    contrast: 2,
  },
  /** Fine, even grain: stands in for embossed WPC boards. */
  ash: {
    color: "/textures/ash-veneer/color.jpg",
    normal: "/textures/ash-veneer/normal.jpg",
    size: [1, 1],
    normalScale: 0.6,
    contrast: 1.6,
  },
} satisfies Record<string, WoodTexture>;

export const MATERIALS: MaterialOption[] = [
  {
    id: "wpc",
    name: "WPC",
    description: "Wood-plastic composite. Low maintenance, colour-fast, no splinters.",
    roughness: 0.55,
    texture: TEXTURES.ash,
    colors: [
      { id: "anthracite", name: "Anthracite", hex: "#3d4043" },
      { id: "stone-grey", name: "Stone grey", hex: "#7c7a74" },
      { id: "teak", name: "Teak", hex: "#a5673f" },
      { id: "chocolate", name: "Chocolate", hex: "#5a3a28" },
    ],
  },
  {
    id: "larch",
    name: "Larch",
    description: "Siberian larch. Natural wood grain, weathers to silver-grey if left untreated.",
    roughness: 0.8,
    texture: TEXTURES.oak,
    colors: [
      { id: "natural", name: "Natural", hex: "#c9a066" },
      { id: "honey", name: "Honey oil", hex: "#b47a3a" },
      { id: "grey-oil", name: "Grey oil", hex: "#8a8378" },
      { id: "walnut", name: "Walnut oil", hex: "#6b4a30" },
    ],
  },
];

export const FRAME_TEXTURE: WoodTexture = TEXTURES.oak;
export const FRAME_ROUGHNESS = 0.75;

export const FRAME_FINISHES: FrameFinish[] = [
  { id: "cedar", name: "Cedar", hex: "#b8763f" },
  { id: "larch-natural", name: "Larch natural", hex: "#c9a066" },
  { id: "walnut", name: "Walnut", hex: "#6b4a30" },
  { id: "grey-wash", name: "Grey wash", hex: "#8a8378" },
  { id: "black", name: "Black", hex: "#2b2b2b" },
];

export const BRACKET_COLOR = "#1c1c1e";

/** Unit prices in EUR (materials only, excl. VAT and installation). */
export const PRICES: Record<
  MaterialId,
  {
    deckingPerMeter: number;
    joistPerMeter: number;
    clipEach: number;
  }
> & {
  frame: {
    postPerMeter: number;
    beamPerMeter: number;
    rafterPerMeter: number;
    screwEach: number;
    cornerBracketEach: number;
    basePlateEach: number;
  };
} = {
  wpc: { deckingPerMeter: 9.5, joistPerMeter: 11, clipEach: 0.35 },
  larch: { deckingPerMeter: 6.2, joistPerMeter: 6.5, clipEach: 0.3 },
  frame: {
    postPerMeter: 32,
    beamPerMeter: 30,
    rafterPerMeter: 8,
    screwEach: 0.12,
    cornerBracketEach: 48,
    basePlateEach: 26,
  },
};

export function getMaterial(id: MaterialId): MaterialOption {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}

export function getColor(materialId: MaterialId, colorId: string) {
  const material = getMaterial(materialId);
  return material.colors.find((c) => c.id === colorId) ?? material.colors[0];
}

export function getFrameFinish(id: string): FrameFinish {
  return FRAME_FINISHES.find((f) => f.id === id) ?? FRAME_FINISHES[0];
}

/** Resolves the decking material + colour to the texture the viewer should show. */
export function getDeckingLook(materialId: MaterialId, colorId: string): WoodLook {
  const material = getMaterial(materialId);
  const color = getColor(materialId, colorId);
  return color.texture
    ? { texture: color.texture, hex: color.hex, tint: false, roughness: material.roughness }
    : { texture: material.texture, hex: color.hex, tint: true, roughness: material.roughness };
}

export function getFrameLook(frameFinishId: string): WoodLook {
  const finish = getFrameFinish(frameFinishId);
  return finish.texture
    ? { texture: finish.texture, hex: finish.hex, tint: false, roughness: FRAME_ROUGHNESS }
    : { texture: FRAME_TEXTURE, hex: finish.hex, tint: true, roughness: FRAME_ROUGHNESS };
}
