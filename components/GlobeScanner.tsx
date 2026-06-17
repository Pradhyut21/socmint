"use client";

import React, { useRef, useEffect } from "react";

export default function GlobeScanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let rotationX = 0;
    let rotationY = 0;
    let sweepY = 0;
    let sweepDir = 1;

    // Generate 3D grid points for the sphere
    const points: { x: number; y: number; z: number }[] = [];
    const latitudeBands = 12;
    const longitudeBands = 18;
    const radius = 90;

    for (let lat = 0; lat <= latitudeBands; lat++) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta * radius;
        const y = cosTheta * radius;
        const z = sinPhi * sinTheta * radius;
        points.push({ x, y, z });
      }
    }

    // Floating scanning data dots
    const scanDots: { x: number; y: number; z: number; size: number; speed: number; opacity: number }[] = Array.from({ length: 25 }, () => {
      const theta = Math.random() * Math.PI;
      const phi = Math.random() * 2 * Math.PI;
      return {
        x: Math.cos(phi) * Math.sin(theta) * radius,
        y: Math.cos(theta) * radius,
        z: Math.sin(phi) * Math.sin(theta) * radius,
        size: Math.random() * 2 + 2,
        speed: Math.random() * 0.02 + 0.01,
        opacity: Math.random() * 0.7 + 0.3
      };
    });

    // Incoming data beams
    const dataBeams: { x: number; y: number; tx: number; ty: number; speed: number; progress: number; color: string }[] = [];
    const createBeam = () => {
      const angle = Math.random() * Math.PI * 2;
      const startDist = 180 + Math.random() * 50;
      const targetPoint = points[Math.floor(Math.random() * points.length)];
      dataBeams.push({
        x: Math.cos(angle) * startDist,
        y: Math.sin(angle) * startDist,
        tx: targetPoint.x,
        ty: targetPoint.y,
        speed: Math.random() * 0.03 + 0.02,
        progress: 0,
        color: Math.random() > 0.4 ? "rgba(6, 182, 212, 0.8)" : "rgba(59, 130, 246, 0.8)"
      });
    };

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Update rotations
      rotationY += 0.006;
      rotationX += 0.003;

      // Update scanner laser sweep vertical position
      sweepY += 1.5 * sweepDir;
      if (sweepY > radius || sweepY < -radius) {
        sweepDir *= -1;
      }

      // Projection setup
      const project = (x3d: number, y3d: number, z3d: number) => {
        // Rotate around Y
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        let x = x3d * cosY - z3d * sinY;
        let z = x3d * sinY + z3d * cosY;

        // Rotate around X
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);
        let y = y3d * cosX - z * sinX;
        z = y3d * sinX + z * cosX;

        // 3D to 2D perspective
        const distance = 250;
        const scale = 220 / (z + distance);
        return {
          x: cx + x * scale,
          y: cy + y * scale,
          z,
          visible: z > -50 // Backface culling threshold
        };
      };

      // Draw background ambient scan rings
      ctx.save();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.06)";
      ctx.lineWidth = 1;
      for (let r = 80; r <= 150; r += 20) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw wireframe grid lines
      ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
      ctx.lineWidth = 0.8;

      // Latitude lines (bands)
      for (let lat = 0; lat <= latitudeBands; lat++) {
        ctx.beginPath();
        let first = true;
        for (let lon = 0; lon <= longitudeBands; lon++) {
          const idx = lat * (longitudeBands + 1) + lon;
          const p = points[idx];
          if (p) {
            const proj = project(p.x, p.y, p.z);
            if (proj.visible) {
              if (first) {
                ctx.moveTo(proj.x, proj.y);
                first = false;
              } else {
                ctx.lineTo(proj.x, proj.y);
              }
            }
          }
        }
        ctx.stroke();
      }

      // Longitude lines
      for (let lon = 0; lon <= longitudeBands; lon++) {
        ctx.beginPath();
        let first = true;
        for (let lat = 0; lat <= latitudeBands; lat++) {
          const idx = lat * (longitudeBands + 1) + lon;
          const p = points[idx];
          if (p) {
            const proj = project(p.x, p.y, p.z);
            if (proj.visible) {
              if (first) {
                ctx.moveTo(proj.x, proj.y);
                first = false;
              } else {
                ctx.lineTo(proj.x, proj.y);
              }
            }
          }
        }
        ctx.stroke();
      }

      // Draw active scanner laser ring
      ctx.save();
      ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#06b6d4";

      ctx.beginPath();
      let firstLaser = true;
      const angleStep = Math.PI / 18;
      // Calculate radius of sphere slice at sweepY height
      const sliceRadius = Math.sqrt(Math.max(0, radius * radius - sweepY * sweepY));

      for (let theta = 0; theta <= Math.PI * 2 + 0.1; theta += angleStep) {
        const lx = Math.cos(theta) * sliceRadius;
        const lz = Math.sin(theta) * sliceRadius;
        const proj = project(lx, sweepY, lz);
        if (proj.visible) {
          if (firstLaser) {
            ctx.moveTo(proj.x, proj.y);
            firstLaser = false;
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        }
      }
      ctx.stroke();
      ctx.restore();

      // Draw glowing scan dots on sphere surface
      scanDots.forEach((dot) => {
        // Orbit dot slowly
        dot.opacity += (Math.random() - 0.5) * 0.1;
        dot.opacity = Math.max(0.2, Math.min(1.0, dot.opacity));

        const proj = project(dot.x, dot.y, dot.z);
        if (proj.visible) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, dot.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(6, 182, 212, ${dot.opacity})`;
          ctx.fill();

          // Pulse effect
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, dot.size * 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${dot.opacity * 0.3})`;
          ctx.stroke();
        }
      });

      // Update and Draw Data Beams
      if (Math.random() < 0.15 && dataBeams.length < 8) {
        createBeam();
      }

      dataBeams.forEach((beam, idx) => {
        beam.progress += beam.speed;
        if (beam.progress >= 1.0) {
          // Trigger a tiny impact splash on the globe
          const projTarget = project(beam.tx, beam.ty, 0);
          ctx.beginPath();
          ctx.arc(projTarget.x, projTarget.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
          
          dataBeams.splice(idx, 1);
          return;
        }

        // Draw beam line
        const currentX = beam.x + (beam.tx - beam.x) * beam.progress;
        const currentY = beam.y + (beam.ty - beam.y) * beam.progress;

        const projStart = { x: cx + currentX, y: cy + currentY };
        const projEnd = { x: cx + (currentX - (beam.tx - beam.x) * 0.1), y: cy + (currentY - (beam.ty - beam.y) * 0.1) };

        ctx.beginPath();
        ctx.moveTo(projStart.x, projStart.y);
        ctx.lineTo(projEnd.x, projEnd.y);
        ctx.strokeStyle = beam.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Lead particle
        ctx.beginPath();
        ctx.arc(projStart.x, projStart.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });

      // Draw sweeping HUD HUD Ring telemetry text
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("GRID STATUS: ACQUIRING", 15, 25);
      ctx.fillText(`GEO PROBE ROT: ${(rotationY * (180 / Math.PI)).toFixed(0)}°`, 15, 38);
      ctx.fillText(`LAT RESOLUTION: ${latitudeBands * longitudeBands} NODES`, 15, 51);

      ctx.textAlign = "right";
      ctx.fillText("LOCK: PUBLIC_OSINT_SWEEP", width - 15, 25);
      ctx.fillText(`SWEEP LAYER: ${(sweepY + radius).toFixed(1)}`, width - 15, 38);
      ctx.fillText("SYSTEM: ACTIVE v4.0", width - 15, 51);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center min-h-[200px]">
      <canvas ref={canvasRef} className="max-w-full block" />
    </div>
  );
}
