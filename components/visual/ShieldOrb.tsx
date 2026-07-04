import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, Ring, Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Intensity = { value: number };

export type OrbTheme =
  | "default"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "social"
  | "financial"
  | "crypto"
  | "legal"
  | "face"
  | "leaks"
  | "geo"
  | "network"
  | "evidence";

export interface OrbPalette {
  core: string;
  coreHover: string;
  emissive: string;
  wire: string;
  ringA: string;
  ringB: string;
  particles: [string, string, string];
  sparks: [string, string, string];
  rim: string;
}

const PALETTES: Record<OrbTheme, OrbPalette> = {
  default:  { core: "#b91c1c", coreHover: "#dc2626", emissive: "#7f1d1d", wire: "#1f2937", ringA: "#0f766e", ringB: "#b91c1c", particles: ["#0f766e", "#ef4444", "#f59e0b"], sparks:    ["#f59e0b", "#ef4444", "#5eead4"], rim: "#0f766e" },
  low:      { core: "#15803d", coreHover: "#22c55e", emissive: "#14532d", wire: "#1f2937", ringA: "#10b981", ringB: "#0ea5e9", particles: ["#10b981", "#34d399", "#a7f3d0"], sparks:    ["#bbf7d0", "#34d399", "#10b981"], rim: "#10b981" },
  medium:   { core: "#b45309", coreHover: "#d97706", emissive: "#78350f", wire: "#1f2937", ringA: "#f59e0b", ringB: "#fbbf24", particles: ["#fbbf24", "#f59e0b", "#fde68a"], sparks:    ["#fde68a", "#fbbf24", "#f59e0b"], rim: "#f59e0b" },
  high:     { core: "#c2410c", coreHover: "#ea580c", emissive: "#7c2d12", wire: "#1f2937", ringA: "#fb923c", ringB: "#ef4444", particles: ["#fb923c", "#ef4444", "#fdba74"], sparks:    ["#fdba74", "#fb923c", "#ef4444"], rim: "#fb923c" },
  critical: { core: "#991b1b", coreHover: "#ef4444", emissive: "#450a0a", wire: "#1c1917", ringA: "#ef4444", ringB: "#f97316", particles: ["#ef4444", "#dc2626", "#fb923c"], sparks:    ["#fca5a5", "#ef4444", "#fbbf24"], rim: "#ef4444" },
  social:   { core: "#1d4ed8", coreHover: "#3b82f6", emissive: "#1e3a8a", wire: "#1f2937", ringA: "#3b82f6", ringB: "#8b5cf6", particles: ["#60a5fa", "#a78bfa", "#22d3ee"], sparks:    ["#a78bfa", "#60a5fa", "#22d3ee"], rim: "#3b82f6" },
  financial:{ core: "#047857", coreHover: "#059669", emissive: "#064e3b", wire: "#1f2937", ringA: "#10b981", ringB: "#facc15", particles: ["#10b981", "#facc15", "#34d399"], sparks:    ["#facc15", "#10b981", "#fde68a"], rim: "#10b981" },
  crypto:   { core: "#a16207", coreHover: "#eab308", emissive: "#713f12", wire: "#1f2937", ringA: "#f59e0b", ringB: "#eab308", particles: ["#facc15", "#f59e0b", "#fde047"], sparks:    ["#fde047", "#facc15", "#f59e0b"], rim: "#eab308" },
  legal:    { core: "#3730a3", coreHover: "#4f46e5", emissive: "#1e1b4b", wire: "#1f2937", ringA: "#6366f1", ringB: "#a78bfa", particles: ["#818cf8", "#a78bfa", "#c7d2fe"], sparks:    ["#c7d2fe", "#a78bfa", "#818cf8"], rim: "#6366f1" },
  face:     { core: "#0e7490", coreHover: "#06b6d4", emissive: "#164e63", wire: "#1f2937", ringA: "#22d3ee", ringB: "#0ea5e9", particles: ["#22d3ee", "#67e8f9", "#0ea5e9"], sparks:    ["#67e8f9", "#22d3ee", "#0ea5e9"], rim: "#22d3ee" },
  leaks:    { core: "#7c2d12", coreHover: "#9a3412", emissive: "#431407", wire: "#1f2937", ringA: "#f97316", ringB: "#ef4444", particles: ["#f97316", "#ef4444", "#facc15"], sparks:    ["#facc15", "#f97316", "#ef4444"], rim: "#f97316" },
  geo:      { core: "#0f766e", coreHover: "#14b8a6", emissive: "#134e4a", wire: "#1f2937", ringA: "#14b8a6", ringB: "#84cc16", particles: ["#5eead4", "#84cc16", "#14b8a6"], sparks:    ["#bef264", "#5eead4", "#14b8a6"], rim: "#14b8a6" },
  network:  { core: "#6d28d9", coreHover: "#8b5cf6", emissive: "#2e1065", wire: "#1f2937", ringA: "#a78bfa", ringB: "#22d3ee", particles: ["#a78bfa", "#22d3ee", "#f0abfc"], sparks:    ["#f0abfc", "#a78bfa", "#22d3ee"], rim: "#a78bfa" },
  evidence: { core: "#1f2937", coreHover: "#374151", emissive: "#0b1220", wire: "#0b1220", ringA: "#9ca3af", ringB: "#f59e0b", particles: ["#9ca3af", "#f59e0b", "#e5e7eb"], sparks:    ["#f59e0b", "#e5e7eb", "#9ca3af"], rim: "#9ca3af" },
};

export function getOrbPalette(theme: OrbTheme): OrbPalette {
  return PALETTES[theme] ?? PALETTES.default;
}

function ParticleStreaks({ intensity, palette }: { intensity: Intensity; palette: OrbPalette }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);

  const COUNT = 220;
  const { positions, velocities, baseRadius, paletteIndex } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const baseRadius = new Float32Array(COUNT);
    const paletteIndex = new Uint8Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 1.4;
      baseRadius[i] = r;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      velocities[i * 3] = -Math.sin(theta) * (0.3 + Math.random() * 0.4);
      velocities[i * 3 + 1] = Math.cos(theta) * (0.3 + Math.random() * 0.4);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      const pick = Math.random();
      paletteIndex[i] = pick < 0.5 ? 0 : pick < 0.85 ? 1 : 2;
    }
    return { positions, velocities, baseRadius, paletteIndex };
  }, []);

  // Build color buffer fresh whenever palette changes
  const [colorArray, colorAttr] = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    const cols = palette.particles.map((c) => new THREE.Color(c));
    for (let i = 0; i < COUNT; i++) {
      const c = cols[paletteIndex[i]];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return [arr, new THREE.BufferAttribute(arr, 3)] as const;
  }, [palette, paletteIndex]);

  useEffect(() => {
    if (!points.current) return;
    const geom = points.current.geometry as THREE.BufferGeometry;
    geom.setAttribute("color", colorAttr);
  }, [colorAttr]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const intens = intensity.value;
    const speed = 0.4 + intens * 2.2;
    const geom = points.current.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      arr[ix] += velocities[ix] * delta * speed;
      arr[ix + 1] += velocities[ix + 1] * delta * speed;
      arr[ix + 2] += velocities[ix + 2] * delta * speed;

      const x = arr[ix], y = arr[ix + 1], z = arr[ix + 2];
      const dist = Math.sqrt(x * x + y * y + z * z) || 1;
      const target = baseRadius[i];
      const pull = (target - dist) * 0.04;
      arr[ix] += (x / dist) * pull;
      arr[ix + 1] += (y / dist) * pull;
      arr[ix + 2] += (z / dist) * pull;
    }
    pos.needsUpdate = true;

    if (material.current) {
      const targetOpacity = 0.25 + intens * 0.7;
      material.current.opacity += (targetOpacity - material.current.opacity) * 0.08;
      const targetSize = 0.04 + intens * 0.08;
      material.current.size += (targetSize - material.current.size) * 0.08;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={COUNT}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
          count={COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.04}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.25}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Sparks({ intensity, palette }: { intensity: Intensity; palette: OrbPalette }) {
  const group = useRef<THREE.Group>(null);
  const COUNT = 12;
  const sparks = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        life: Math.random(),
        speed: 0.6 + Math.random() * 1.2,
        dir: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize(),
      })),
    []
  );

  // Update spark colors when palette changes
  useEffect(() => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.set(palette.sparks[i % 3]);
    });
  }, [palette]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const intens = intensity.value;
    group.current.children.forEach((child, i) => {
      const s = sparks[i];
      s.life += delta * s.speed * (0.4 + intens * 1.8);
      if (s.life > 1) {
        s.life = 0;
        s.dir.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
      }
      const r = 1.6 + s.life * (0.8 + intens * 1.4);
      child.position.set(s.dir.x * r, s.dir.y * r, s.dir.z * r);
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - s.life) * (0.3 + intens * 0.9);
      child.scale.setScalar(0.04 + intens * 0.08);
    });
  });

  return (
    <group ref={group}>
      {sparks.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={palette.sparks[i % 3]}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function RotatingCore({
  onHoverChange,
  onDragChange,
  palette,
}: {
  onHoverChange: (v: boolean) => void;
  onDragChange: (v: boolean) => void;
  palette: OrbPalette;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((_, delta) => {
    if (isHovered) return;
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.35;
      mesh.current.rotation.x += delta * 0.12;
    }
    if (wire.current) {
      wire.current.rotation.y -= delta * 0.5;
      wire.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        onHoverChange(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setIsHovered(false);
        onHoverChange(false);
        document.body.style.cursor = "auto";
      }}
      onPointerDown={() => {
        onDragChange(true);
        document.body.style.cursor = "grabbing";
      }}
      onPointerUp={() => {
        onDragChange(false);
        document.body.style.cursor = "grab";
      }}
    >
      <Float speed={isHovered ? 0.4 : 1.4} rotationIntensity={0.4} floatIntensity={0.6}>
        <Icosahedron ref={mesh} args={[1.05, 1]}>
          <meshStandardMaterial
            color={isHovered ? palette.coreHover : palette.core}
            roughness={0.35}
            metalness={0.55}
            emissive={palette.emissive}
            emissiveIntensity={isHovered ? 0.55 : 0.35}
            flatShading
          />
        </Icosahedron>
        <Icosahedron ref={wire} args={[1.32, 1]}>
          <meshBasicMaterial color={palette.wire} wireframe transparent opacity={0.55} />
        </Icosahedron>
      </Float>
      <Ring args={[1.7, 1.74, 64]} rotation={[Math.PI / 2.2, 0, 0]}>
        <meshBasicMaterial color={palette.ringA} side={THREE.DoubleSide} transparent opacity={0.7} />
      </Ring>
      <Ring args={[1.95, 1.98, 64]} rotation={[Math.PI / 1.8, Math.PI / 3, 0]}>
        <meshBasicMaterial color={palette.ringB} side={THREE.DoubleSide} transparent opacity={0.5} />
      </Ring>
    </group>
  );
}

function IntensityDriver({
  hovered,
  dragging,
  intensity,
}: {
  hovered: boolean;
  dragging: boolean;
  intensity: Intensity;
}) {
  useFrame((_, delta) => {
    const target = dragging ? 1 : hovered ? 0.45 : 0;
    const rate = dragging ? 6 : 2.2;
    intensity.value += (target - intensity.value) * Math.min(1, delta * rate);
  });
  return null;
}

export function ShieldOrb({
  className,
  theme = "default",
}: {
  className?: string;
  theme?: OrbTheme;
}) {
  const controlsRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const intensity = useRef<Intensity>({ value: 0 }).current;
  const palette = getOrbPalette(theme);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !hovered && !dragging;
      controlsRef.current.autoRotateSpeed = hovered || dragging ? 0 : 0.6;
    }
  }, [hovered, dragging]);

  return (
    <div
      className={className ?? "h-64 w-full"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setDragging(false);
      }}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
    >
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <directionalLight position={[-4, -2, -3]} intensity={0.35} color={palette.rim} />
        <Suspense fallback={null}>
          <Stars radius={20} depth={30} count={400} factor={2} fade speed={0.5} />
          <IntensityDriver hovered={hovered} dragging={dragging} intensity={intensity} />
          <ParticleStreaks intensity={intensity} palette={palette} />
          <Sparks intensity={intensity} palette={palette} />
          <RotatingCore onHoverChange={setHovered} onDragChange={setDragging} palette={palette} />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
