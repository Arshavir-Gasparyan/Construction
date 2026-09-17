"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildLayout } from "@/lib/pergola/layout";
import {
  BRACKET_COLOR,
  FRAME_FINISHES,
  MATERIALS,
  getDeckingLook,
  getFrameLook,
} from "@/lib/pergola/catalog";
import { useConfigurator } from "@/lib/pergola/store";
import type { Part, PartGroup } from "@/lib/pergola/types";
import { preloadWood, useWoodMaterial } from "./woodMaterial";

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

/** Deterministic 0..1 hash so each board gets the same variation on every rebuild. */
function hash01(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Builds one merged geometry for a group of parts. UVs are in metres, with V
 * running along the board length (the grain direction of the texture photos),
 * so the wood grain has a constant physical scale on every part. A per-board
 * UV offset and a slight per-board tint (vertex colour) stop neighbouring
 * boards from looking like copies of each other.
 * A few hundred boxes merge in well under a millisecond, so this is rebuilt
 * whenever the dimensions change and still yields one draw call per group.
 */
function buildGroupGeometry(parts: Part[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const boxes = parts.map((p, index) => {
    const box = new THREE.BoxGeometry(p.length, p.height, p.width);
    // Per-part offset (metres) into the texture so boards don't repeat the same grain.
    const offU = hash01(index) * 2;
    const offV = hash01(index + 1000) * 5;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z; 4 vertices per face.
    // Box UV (x, y) spans: ±x -> (width, height), ±y -> (length, width), ±z -> (length, height).
    // We swap them so the board length lands on V.
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
      const [along, across] = spans[face];
      for (let k = 0; k < 4; k++) {
        const i = face * 4 + k;
        uv.setXY(i, offU + uv.getY(i) * across, offV + uv.getX(i) * along);
      }
    }
    // ±8% brightness variation between boards.
    const shade = 0.92 + hash01(index + 2000) * 0.16;
    const colors = new Float32Array(box.attributes.position.count * 3).fill(shade);
    box.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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

  const deckLook = useMemo(() => getDeckingLook(materialId, colorId), [materialId, colorId]);
  const frameLook = useMemo(() => getFrameLook(frameFinishId), [frameFinishId]);
  const deckMaterial = useWoodMaterial(deckLook);
  const frameMaterial = useWoodMaterial(frameLook);
  const steelMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BRACKET_COLOR, roughness: 0.45, metalness: 0.4 }),
    [],
  );

  // Warm the texture cache for every other option once the first ones are up.
  useEffect(() => {
    const id = window.setTimeout(() => {
      preloadWood([
        ...MATERIALS.flatMap((m) => m.colors.map((c) => getDeckingLook(m.id, c.id))),
        ...FRAME_FINISHES.map((f) => getFrameLook(f.id)),
      ]);
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

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
