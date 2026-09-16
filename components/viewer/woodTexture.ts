import * as THREE from "three";

/**
 * Procedural plank texture. Grain runs along U (the length of a board).
 * One tile covers TILE_METRES of timber; geometry UVs are scaled so the
 * grain is the same physical size on a 30 cm slat and a 5 m beam.
 */
export const TILE_METRES = 0.6;

export type WoodMaps = { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture };

type WoodParams = {
  /** Base colour of the timber (hex). Light/dark tones are derived from it. */
  hex: string;
  /** 0..1 how pronounced the grain is. */
  contrast?: number;
  /** Ring density: higher = more growth rings per metre. */
  density?: number;
  seed?: number;
  size?: number;
};

// --- small deterministic value-noise --------------------------------------
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = new Float32Array(256);
  for (let i = 0; i < 256; i++) grad[i] = rnd();

  const fade = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = grad[perm[X + perm[Y]]];
    const b = grad[perm[X + 1 + perm[Y]]];
    const c = grad[perm[X + perm[Y + 1]]];
    const d = grad[perm[X + 1 + perm[Y + 1]]];
    const u = fade(xf), v = fade(yf);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  const fbm = (x: number, y: number, octaves = 4) => {
    let sum = 0, amp = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
      sum += amp * value(x * f, y * f);
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };
  return { value, fbm, rnd };
}

type RGB = [number, number, number];

// Colour math is done in plain sRGB (the canvas is sRGB), so no three.js
// Color here: it would convert to linear and the texture would come out dark.
function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHsl([r, g, b]: RGB): RGB {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: RGB): RGB {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

function shade(rgb: RGB, lum: number, sat: number): RGB {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([h, Math.min(1, s * sat), Math.min(1, Math.max(0, l * lum))]);
}

export function createWoodMaps({
  hex,
  contrast = 1,
  density = 1,
  seed = 7,
  size = 512,
}: WoodParams): WoodMaps {
  const { fbm, rnd } = makeNoise(seed);
  const base = hexToRgb(hex);
  const light = shade(base, 1.22, 0.85);
  const dark = shade(base, 0.68, 1.15);

  const color = document.createElement("canvas");
  color.width = size;
  color.height = size;
  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const cctx = color.getContext("2d")!;
  const bctx = bump.getContext("2d")!;
  const cimg = cctx.createImageData(size, size);
  const bimg = bctx.createImageData(size, size);

  // Frequencies are in cycles per tile so the texture wraps cleanly enough
  // when combined with RepeatWrapping (seams are hidden by the noise).
  const ringFreq = 26 * density; // growth rings across the width of a tile
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;

      // Wavy growth rings: mostly parallel to U, distorted by low-freq noise.
      const warp = fbm(u * 1.5, v * 6) * 1.6 + fbm(u * 6, v * 24) * 0.25;
      const ring = 0.5 + 0.5 * Math.sin((v * ringFreq + warp) * Math.PI * 2);
      const lines = Math.pow(ring, 2.2); // sharp dark latewood lines

      // Fine streaks along the grain and broad tonal patches.
      const streak = fbm(u * 40, v * 160, 3);
      const patch = fbm(u * 2.5, v * 3, 3);
      const speck = rnd();

      // Centre around ~0.35 so the average tone stays close to the base colour.
      let d =
        0.35 +
        contrast *
          (0.5 * (lines - 0.3) + 0.3 * (streak - 0.5) + 0.5 * (patch - 0.5) + 0.06 * (speck - 0.5));
      d = Math.min(1, Math.max(0, d));

      const i = (y * size + x) * 4;
      cimg.data[i] = Math.round((light[0] + (dark[0] - light[0]) * d) * 255);
      cimg.data[i + 1] = Math.round((light[1] + (dark[1] - light[1]) * d) * 255);
      cimg.data[i + 2] = Math.round((light[2] + (dark[2] - light[2]) * d) * 255);
      cimg.data[i + 3] = 255;

      const h = Math.round((1 - (0.7 * lines + 0.3 * streak)) * 255);
      bimg.data[i] = h;
      bimg.data[i + 1] = h;
      bimg.data[i + 2] = h;
      bimg.data[i + 3] = 255;
    }
  }
  cctx.putImageData(cimg, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(color);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 8;

  return { map, bumpMap };
}

/** Small cache so switching colours back and forth doesn't regenerate. */
const cache = new Map<string, WoodMaps>();
export function getWoodMaps(params: WoodParams): WoodMaps {
  const key = JSON.stringify(params);
  let maps = cache.get(key);
  if (!maps) {
    maps = createWoodMaps(params);
    cache.set(key, maps);
  }
  return maps;
}
