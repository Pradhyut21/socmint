"use client";

import React, { useMemo } from "react";
import type { ReasoningStep } from "@/lib/types";

interface ConfidenceTrendProps {
  steps: ReasoningStep[];
  initialConfidence?: number;
}

export function ConfidenceTrend({ steps, initialConfidence = 20 }: ConfidenceTrendProps) {
  const points = useMemo(() => {
    const pts: { label: string; confidence: number }[] = [
      { label: "Start", confidence: initialConfidence },
    ];
    let running = initialConfidence;
    for (const step of steps) {
      running = Math.min(100, Math.max(0, running + (step.confidenceDelta || 0)));
      pts.push({
        label: step.module.replace(/\(\)/g, "").replace("investigateSingleUsername", "Sweep").replace("fetchGravatarData", "Gravatar"),
        confidence: running,
      });
    }
    return pts;
  }, [steps, initialConfidence]);

  if (points.length < 2) return null;

  const W = 520, H = 140, PAD = { top: 12, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xStep = chartW / Math.max(points.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.confidence)}`).join(" ");

  // Gradient area
  const areaPath = [
    `M${toX(0)},${toY(points[0].confidence)}`,
    ...points.map((p, i) => `L${toX(i)},${toY(p.confidence)}`),
    `L${toX(points.length - 1)},${H - PAD.bottom}`,
    `L${toX(0)},${H - PAD.bottom}`,
    "Z",
  ].join(" ");

  const finalConf = points[points.length - 1].confidence;
  const color = finalConf >= 70 ? "#22c55e" : finalConf >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground mb-2 font-mono">
        Confidence built from {initialConfidence}% → <span style={{ color }} className="font-bold">{finalConf}%</span> across {steps.length} reasoning steps
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 140 }}
        aria-label="Confidence trend chart"
      >
        <defs>
          <linearGradient id="conf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line
              x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3"
            />
            <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end"
              fontSize="9" fill="#475569">{v}%</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#conf-grad)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.confidence)} r="3.5"
              fill={color} stroke="#0f172a" strokeWidth="1.5" />
            {i > 0 && i < points.length - 1 && (
              <text
                x={toX(i)} y={toY(p.confidence) - 8}
                textAnchor="middle" fontSize="8" fill="#94a3b8"
              >
                +{steps[i - 1]?.confidenceDelta || 0}%
              </text>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          (i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 4)) === 0) && (
            <text
              key={i}
              x={toX(i)} y={H - PAD.bottom + 14}
              textAnchor="middle" fontSize="8" fill="#475569"
            >
              {p.label.slice(0, 8)}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}
