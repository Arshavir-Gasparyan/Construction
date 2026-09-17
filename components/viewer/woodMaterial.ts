import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WoodLook, WoodTexture } from "@/lib/pergola/types";

/**
 * Loads photographed wood textures (see `WoodTexture` in lib/pergola/types.ts)
 * and turns them into MeshStandardMaterials.
 *
 * Geometry UVs are in metres (see PergolaModel), so a texture's physical size
 * is applied here through `texture.repeat` and every board shows the grain at
 * the same real-world scale.
 *
 * Tinting: when a catalogue colour has no photo of its own, the material's
 * shared grain photo is recoloured to the colour's hex. The photo's hue is
 * thrown away and only its light/dark grain variation is kept, centred on the
 * target colour, so the rendered average matches the swatch.
 */

const MAX_ANISOTROPY = 8;
const loader = new THREE.TextureLoader();

function applyTiling(tex: THREE.Texture, texture: WoodTexture) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / texture.size[0], 1 / texture.size[1]);
  tex.anisotropy = MAX_ANISOTROPY;
  tex.needsUpdate = true;
  return tex;
}

// --- colour helpers (sRGB space; the canvas is sRGB) ------------------------
type RGB = [number, number, number];

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

function hueChannel(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

// --- loading ----------------------------------------------------------------
const textureCache = new Map<string, Promise<THREE.Texture>>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string) {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load texture ${url}`));
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

/** Plain image texture (untinted colour, normal or roughness map). */
function loadMap(url: string, texture: WoodTexture, srgb: boolean) {
  const key = `${url}|${texture.size.join("x")}|${srgb}`;
  let p = textureCache.get(key);
  if (!p) {
    p = loader.loadAsync(url).then((tex) => {
      tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      return applyTiling(tex, texture);
    });
    textureCache.set(key, p);
  }
  return p;
}

/** The shared grain photo recoloured to `hex`. */
function loadTintedColorMap(texture: WoodTexture, hex: string) {
  const key = `tint|${texture.color}|${texture.size.join("x")}|${texture.contrast ?? 1}|${hex}`;
  let p = textureCache.get(key);
  if (!p) {
    p = loadImage(texture.color).then((img) => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const image = ctx.getImageData(0, 0, w, h);
      const d = image.data;

      // Photo luminance per pixel and its mean.
      const n = w * h;
      const lum = new Float32Array(n);
      let mean = 0;
      for (let i = 0; i < n; i++) {
        const l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
        lum[i] = l;
        mean += l;
      }
      mean /= n;

      const [th, ts, tl] = rgbToHsl(hexToRgb(hex));
      // Very light or very dark targets have little headroom, so scale the
      // grain variation down instead of letting it clip.
      const headroom = Math.min(1, Math.max(0.35, Math.min(tl, 1 - tl) / 0.3));
      const contrast = (texture.contrast ?? 1) * headroom;

      for (let i = 0; i < n; i++) {
        const delta = (lum[i] - mean) * contrast;
        const l = Math.min(1, Math.max(0, tl + delta));
        // Darker grain reads as slightly more saturated, like real timber.
        const s = Math.min(1, ts * (1 - delta * 0.8));
        let r: number, g: number, b: number;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hueChannel(p, q, th + 1 / 3);
          g = hueChannel(p, q, th);
          b = hueChannel(p, q, th - 1 / 3);
        }
        d[i * 4] = Math.round(r * 255);
        d[i * 4 + 1] = Math.round(g * 255);
        d[i * 4 + 2] = Math.round(b * 255);
      }
      ctx.putImageData(image, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return applyTiling(tex, texture);
    });
    textureCache.set(key, p);
  }
  return p;
}

type WoodMaps = { map: THREE.Texture; normalMap: THREE.Texture | null; roughnessMap: THREE.Texture | null };

function loadWoodMaps(look: WoodLook): Promise<WoodMaps> {
  const { texture } = look;
  return Promise.all([
    look.tint ? loadTintedColorMap(texture, look.hex) : loadMap(texture.color, texture, true),
    texture.normal ? loadMap(texture.normal, texture, false) : null,
    texture.roughness ? loadMap(texture.roughness, texture, false) : null,
  ]).then(([map, normalMap, roughnessMap]) => ({ map, normalMap, roughnessMap }));
}

/** Warm the cache so switching to a colour later is instant. */
export function preloadWood(looks: WoodLook[]) {
  for (const look of looks) loadWoodMaps(look).catch(() => {});
}

function applyMaps(material: THREE.MeshStandardMaterial, maps: WoodMaps | null, look: WoodLook) {
  material.roughness = look.roughness;
  material.map = maps?.map ?? null;
  material.normalMap = maps?.normalMap ?? null;
  material.normalScale.setScalar(look.texture.normalScale ?? 1);
  material.roughnessMap = maps?.roughnessMap ?? null;
  // With a photo the colour comes from the map; without one show the flat swatch colour.
  material.color.set(maps ? "#ffffff" : look.hex);
  material.needsUpdate = true;
}

/**
 * One material per look. It starts as the flat catalogue colour and receives
 * the photo maps once they are loaded, so the model never renders untextured
 * for more than the first fraction of a second. The material instance is
 * updated in place so meshes keep the same material across colour changes.
 */
export function useWoodMaterial(look: WoodLook): THREE.MeshStandardMaterial {
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: look.hex, roughness: look.roughness, metalness: 0, vertexColors: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    let cancelled = false;
    loadWoodMaps(look)
      .then((maps) => {
        if (cancelled) return;
        applyMaps(material, maps, look);
        invalidate();
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(err);
        applyMaps(material, null, look);
        invalidate();
      });
    return () => {
      cancelled = true;
    };
  }, [material, look, invalidate]);

  return material;
}
