export type MaterialId = "wpc" | "larch";

/**
 * A photographed, seamless wood surface. Files live under `public/` and are
 * referenced by URL. The grain must run top-to-bottom in the image (portrait
 * plank photo); the viewer maps the image height along the board length.
 */
export type WoodTexture = {
  /** Colour (albedo) image: jpg/png/webp, seamless, evenly lit. */
  color: string;
  /** Optional tangent-space normal map (OpenGL convention, green = up). */
  normal?: string;
  /** Optional roughness map. The material's `roughness` multiplies it. */
  roughness?: string;
  /** Physical size the image covers, in metres: [across grain, along grain]. */
  size: [number, number];
  /** Strength of the normal map relief (default 1). */
  normalScale?: number;
  /**
   * Only used when the texture is tinted to a catalogue colour: how much of
   * the photo's light/dark grain variation to keep (1 = as photographed).
   */
  contrast?: number;
};

export type ColorOption = {
  id: string;
  name: string;
  /** Hex colour used for the swatch, and for the 3D render when no photo is given. */
  hex: string;
  /**
   * Photo of this exact colour. When set it is rendered as-is; when omitted the
   * material's shared texture is tinted to `hex`.
   */
  texture?: WoodTexture;
};

export type MaterialOption = {
  id: MaterialId;
  name: string;
  description: string;
  colors: ColorOption[];
  /** Roughness for the PBR material (0 = glossy, 1 = matte). */
  roughness: number;
  /** Shared grain for colours without their own photo; tinted to each colour's hex. */
  texture: WoodTexture;
};

export type FrameFinish = ColorOption;

/** Everything the viewer needs to build one wood material. */
export type WoodLook = {
  texture: WoodTexture;
  hex: string;
  /** true = tint `texture.color` to `hex`; false = use the photo unchanged. */
  tint: boolean;
  roughness: number;
};

/** Dimensions in centimetres (what the UI works with). */
export type Dimensions = {
  width: number;
  length: number;
  height: number;
};

export type PergolaConfig = Dimensions & {
  material: MaterialId;
  colorId: string;
  frameFinishId: string;
};

export type PartGroup =
  | "post"
  | "beam"
  | "rafter"
  | "joist"
  | "decking"
  /** Black steel hardware: corner brackets, beam sleeves, post base plates. */
  | "bracket";

/**
 * A single rectangular part of the structure, in metres.
 * `axis` is the world axis its long side runs along; `length` is measured
 * along that axis, `height` is vertical (or the first cross-section side for
 * vertical parts) and `width` is the remaining side.
 */
export type Part = {
  group: PartGroup;
  center: [number, number, number];
  length: number;
  height: number;
  width: number;
  axis: "x" | "y" | "z";
};

export type Layout = {
  parts: Part[];
  /** Bounding box in metres, useful for framing the camera or AR placement. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  counts: {
    posts: number;
    beams: number;
    rafters: number;
    joists: number;
    deckingRows: number;
    cornerBrackets: number;
    basePlates: number;
  };
  lengths: {
    post: number;
    beam: number;
    rafter: number;
    joist: number;
    deckingRow: number;
  };
};
