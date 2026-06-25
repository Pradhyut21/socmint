import { Shield } from "lucide-react";

interface ShieldOrbProps {
  className?: string;
  size?: number;
}

export function ShieldOrb({ className = "", size = 180 }: ShieldOrbProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer halo */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.5 0.21 25 / 0.45), transparent 60%)",
          filter: "blur(8px)",
        }}
      />
      {/* Orb */}
      <div
        className="absolute inset-4 rounded-full border border-sidebar-border"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, oklch(0.32 0.04 60), oklch(0.18 0.025 60) 70%)",
          boxShadow:
            "inset 0 -10px 30px oklch(0 0 0 / 0.55), inset 0 8px 20px oklch(1 0 0 / 0.06), 0 20px 50px -20px oklch(0.5 0.21 25 / 0.5)",
        }}
      />
      {/* Equator ring */}
      <div
        className="absolute rounded-full border border-stamp/40"
        style={{
          inset: "30%",
          transform: "rotateX(70deg)",
        }}
      />
      {/* Shield */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Shield
          className="text-stamp"
          style={{
            width: size * 0.42,
            height: size * 0.42,
            filter: "drop-shadow(0 4px 14px oklch(0.5 0.21 25 / 0.6))",
          }}
          strokeWidth={1.4}
        />
      </div>
    </div>
  );
}
