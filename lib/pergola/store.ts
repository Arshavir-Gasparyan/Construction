import { create } from "zustand";
import { DEFAULT_DIMENSIONS, FRAME_FINISHES, LIMITS, MATERIALS, getMaterial } from "./catalog";
import type { Dimensions, MaterialId, PergolaConfig } from "./types";

type ConfiguratorState = PergolaConfig & {
  setDimension: (key: keyof Dimensions, value: number) => void;
  setMaterial: (material: MaterialId) => void;
  setColor: (colorId: string) => void;
  setFrameFinish: (frameFinishId: string) => void;
  reset: () => void;
};

const clamp = (key: keyof Dimensions, value: number) => {
  const { min, max } = LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(value)));
};

const initial: PergolaConfig = {
  ...DEFAULT_DIMENSIONS,
  material: MATERIALS[0].id,
  colorId: MATERIALS[0].colors[0].id,
  frameFinishId: FRAME_FINISHES[0].id,
};

export const useConfigurator = create<ConfiguratorState>((set) => ({
  ...initial,
  setDimension: (key, value) =>
    set((s) => (Number.isFinite(value) ? { ...s, [key]: clamp(key, value) } : s)),
  setMaterial: (material) =>
    set(() => {
      const m = getMaterial(material);
      // Colours are material-specific, so fall back to the first one.
      return { material, colorId: m.colors[0].id };
    }),
  setColor: (colorId) => set({ colorId }),
  setFrameFinish: (frameFinishId) => set({ frameFinishId }),
  reset: () => set(initial),
}));

/** Selector that returns only the serialisable config (handy for quotes / AR). */
export const selectConfig = (s: ConfiguratorState): PergolaConfig => ({
  width: s.width,
  length: s.length,
  height: s.height,
  material: s.material,
  colorId: s.colorId,
  frameFinishId: s.frameFinishId,
});
