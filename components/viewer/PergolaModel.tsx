"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildLayout } from "@/lib/pergola/layout";
import { BRACKET_COLOR, getColor, getFrameFinish, getMaterial } from "@/lib/pergola/catalog";
import { useConfigurator } from "@/lib/pergola/store";
import type { Part, PartGroup } from "@/lib/pergola/types";
import { TILE_METRES, getWoodMaps } from "./woodTexture";

const GROUPS: PartGroup[] = ["post", "beam", "rafter", "joist", "decking", "bracket"];
const FRAME_GROUPS = new Set<PartGroup>(["post", "beam", "rafter", "joist"]);

const ROTATIONS: Record<Part["axis"], THREE.Quaternion> = {
  x: new THREE.Quaternion(),
  y: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
  z: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
};

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const unitScale = new THREE.Vector3(1, 1, 1);

/**
 * Builds one merged geometry for a group of parts. Each box gets UVs scaled to
 * its real-world size so the wood grain has a constant physical scale.
 * A few hundred boxes merge in well under a millisecond, so this is rebuilt
 * whenever the dimensions change and still yields one draw call per group.
 */
function buildGroupGeometry(parts: Part[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const boxes = parts.map((p, index) => {
    const box = new THREE.BoxGeometry(p.length, p.height, p.width);
    // Per-part offset into the tile so neighbouring boards don't repeat the same grain.
    const offU = (index * 0.618) % 1;
    const offV = (index * 0.382) % 1;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z; 4 vertices per face.
    // (u, v) spans: ±x -> (width, height), ±y -> (length, width), ±z -> (length, height)
    const spans: [number, number][] = [
      [p.width, p.height],
      [p.width, p.height],
      [p.length, p.width],
      [p.length, p.width],
      [p.length, p.height],
      [p.length, p.height],
    ];
    const uv = box.attributes.uv as THREE.BufferAttribute;
    for (let face = 0; face < 6; face++) {
      const [su, sv] = spans[face];
      for (let k = 0; k < 4; k++) {
        const i = face * 4 + k;
        uv.setXY(i, offU + (uv.getX(i) * su) / TILE_METRES, offV + (uv.getY(i) * sv) / TILE_METRES);
      }
    }
    tmpPos.set(...p.center);
    tmpMatrix.compose(tmpPos, ROTATIONS[p.axis], unitScale);
    box.applyMatrix4(tmpMatrix);
    return box;
  });
  const merged = mergeGeometries(boxes, false);
  boxes.forEach((b) => b.dispose());
  return merged;
}

function GroupMesh({
  geometry,
  material,
}: {
  geometry: THREE.BufferGeometry | null;
  material: THREE.Material;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    return () => geometry?.dispose();
  }, [geometry, invalidate]);
  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

function useWoodMaterial(hex: string, opts: { roughness: number; contrast: number; density: number; seed: number }) {
  const maps = useMemo(
    () => getWoodMaps({ hex, contrast: opts.contrast, density: opts.density, seed: opts.seed }),
    [hex, opts.contrast, opts.density, opts.seed],
  );
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: maps.map,
        bumpMap: maps.bumpMap,
        bumpScale: 0.025,
        roughness: opts.roughness,
        metalness: 0,
      }),
    [maps, opts.roughness],
  );
}

/**
 * The pergola itself, independent of camera/lights/controls so the same
 * component can later be dropped into a WebXR / AR session.
 */
export function PergolaModel() {
  const width = useConfigurator((s) => s.width);
  const length = useConfigurator((s) => s.length);
  const height = useConfigurator((s) => s.height);
  const materialId = useConfigurator((s) => s.material);
  const colorId = useConfigurator((s) => s.colorId);
  const frameFinishId = useConfigurator((s) => s.frameFinishId);

  const layout = useMemo(() => buildLayout({ width, length, height }), [width, length, height]);

  const geometries = useMemo(() => {
    const byGroup = {} as Record<PartGroup, Part[]>;
    for (const g of GROUPS) byGroup[g] = [];
    for (const p of layout.parts) byGroup[p.group].push(p);
    const out = {} as Record<PartGroup, THREE.BufferGeometry | null>;
    for (const g of GROUPS) out[g] = buildGroupGeometry(byGroup[g]);
    return out;
  }, [layout]);

  const decking = getMaterial(materialId);
  const deckMaterial = useWoodMaterial(getColor(materialId, colorId).hex, {
    roughness: decking.roughness,
    // WPC has a subtle embossed grain; larch shows real growth rings.
    contrast: materialId === "wpc" ? 0.35 : 0.9,
    density: materialId === "wpc" ? 1.6 : 1,
    seed: 11,
  });
  const frameMaterial = useWoodMaterial(getFrameFinish(frameFinishId).hex, {
    roughness: 0.75,
    contrast: 1,
    density: 0.8,
    seed: 7,
  });
  const steelMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BRACKET_COLOR, roughness: 0.45, metalness: 0.4 }),
    [],
  );

  useEffect(() => () => deckMaterial.dispose(), [deckMaterial]);
  useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);

  const materialFor = (g: PartGroup) =>
    g === "bracket" ? steelMaterial : FRAME_GROUPS.has(g) ? frameMaterial : deckMaterial;

  return (
    <group>
      {GROUPS.map((g) => (
        <GroupMesh key={g} geometry={geometries[g]} material={materialFor(g)} />
      ))}
    </group>
  );
}
