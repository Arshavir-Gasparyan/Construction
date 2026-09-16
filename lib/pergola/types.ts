export type MaterialId = "wpc" | "larch";

export type ColorOption = {
  id: string;
  name: string;
  /** Hex color used for the 3D render and the swatch. */
  hex: string;
};

export type MaterialOption = {
  id: MaterialId;
  name: string;
  description: string;
  colors: ColorOption[];
  /** Roughness for the PBR material (0 = glossy, 1 = matte). */
  roughness: number;
};

export type FrameFinish = ColorOption;

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
