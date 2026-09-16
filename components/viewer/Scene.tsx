"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useConfigurator } from "@/lib/pergola/store";
import { buildLayout } from "@/lib/pergola/layout";
import { PergolaModel } from "./PergolaModel";

/** Keeps the orbit target on the model centre as the dimensions change. */
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const invalidate = useThree((s) => s.invalidate);
  const width = useConfigurator((s) => s.width);
  const length = useConfigurator((s) => s.length);
  const height = useConfigurator((s) => s.height);

  const { center, radius } = useMemo(() => {
    const { bounds } = buildLayout({ width, length, height });
    const size = new THREE.Vector3().fromArray(bounds.max).sub(new THREE.Vector3().fromArray(bounds.min));
    return {
      center: new THREE.Vector3(0, size.y * 0.5, 0),
      radius: size.length() / 2,
    };
  }, [width, length, height]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.target.copy(center);
    c.minDistance = radius * 0.8;
    c.maxDistance = radius * 4;
    c.update();
    invalidate();
  }, [center, radius, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minPolarAngle={0.15}
    />
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ position: [6.5, 3.2, 8], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="touch-none"
    >
      <color attach="background" args={["#eef1f4"]} />
      <fog attach="fog" args={["#eef1f4", 25, 60]} />

      <hemisphereLight args={["#dfe9f5", "#8a7a66", 0.85]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
      />

      <PergolaModel />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={0.25} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[80, 80]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#b9c0c8"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#8f98a3"
        fadeDistance={30}
        fadeStrength={1.5}
        infiniteGrid
      />

      <CameraRig />
    </Canvas>
  );
}
