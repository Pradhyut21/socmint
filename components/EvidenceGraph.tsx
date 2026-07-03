"use client";

import React, { useRef, useEffect, useState } from "react";
import { SuspectProfile, EvidenceNode, EvidenceEdge } from "../lib/types";
import { GitCommit, Info, RotateCcw, Share2 } from "lucide-react";

interface EvidenceGraphProps {
  suspect: SuspectProfile;
}

export default function EvidenceGraph({ suspect }: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<(EvidenceNode & { x: number; y: number; vx: number; vy: number })[]>([]);
  const [edges, setEdges] = useState<EvidenceEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EvidenceEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<EvidenceNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<EvidenceEdge | null>(null);

  const hasGraphData = suspect.evidenceGraph && suspect.evidenceGraph.nodes && suspect.evidenceGraph.nodes.length > 0;

  const handleReset = () => {
    if (!hasGraphData) return;
    const width = containerRef.current?.clientWidth || 600;
    const height = 450;

    const initializedNodes = suspect.evidenceGraph!.nodes.map((node, index) => {
      const isInitial = index === 0;
      let x = width / 2;
      let y = height / 2;

      if (!isInitial) {
        const angle = (index / (suspect.evidenceGraph!.nodes.length - 1)) * 2 * Math.PI;
        const radius = 130 + Math.random() * 40;
        x += Math.cos(angle) * radius;
        y += Math.sin(angle) * radius;
      }

      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0
      };
    });

    setNodes(initializedNodes);
    setEdges(suspect.evidenceGraph!.edges);
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  useEffect(() => {
    handleReset();
  }, [suspect]);

  // Dynamic Force-Directed Simulation loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animId: number;
    const width = containerRef.current?.clientWidth || 600;
    const height = 450;

    const tick = () => {
      const repelForce = 500;
      const linkForce = 0.08;
      const centerForce = 0.02;
      const friction = 0.85;

      const updated = nodes.map(n => ({ ...n }));

      // 1. Repulsion force between all nodes
      for (let i = 0; i < updated.length; i++) {
        const n1 = updated[i];
        for (let j = i + 1; j < updated.length; j++) {
          const n2 = updated[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 180) {
            const force = repelForce / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Link Attraction force along edges
      edges.forEach(edge => {
        const n1 = updated.find(n => n.id === edge.source.toLowerCase().trim());
        const n2 = updated.find(n => n.id === edge.target.toLowerCase().trim());
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 110;
          const k = (dist - desiredDist) * linkForce;
          const fx = (dx / dist) * k;
          const fy = (dy / dist) * k;

          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }
      });

      // 3. Gravity center force & update coordinates
      updated.forEach((n, idx) => {
        const cx = width / 2;
        const cy = height / 2;
        const dx = cx - n.x;
        const dy = cy - n.y;

        n.vx += dx * centerForce;
        n.vy += dy * centerForce;

        n.vx *= friction;
        n.vy *= friction;

        n.x += n.vx;
        n.y += n.vy;

        // Keep inside boundaries
        n.x = Math.max(25, Math.min(width - 25, n.x));
        n.y = Math.max(25, Math.min(height - 25, n.y));
      });

      setNodes(updated);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [edges]);

  if (!hasGraphData) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 bg-white font-mono max-w-2xl mx-auto my-6 flex flex-col items-center justify-center min-h-[300px] shadow-sm">
        <Share2 className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
        <p className="text-sm text-slate-650 font-medium font-mono">No evidence connections or reconstruction audit logs found for this case.</p>
      </div>
    );
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case "phone": return "#ec4899"; // Pink
      case "email": return "#3b82f6"; // Blue
      case "username": return "#8b5cf6"; // Purple
      case "github": return "#0f172a"; // Slate
      case "linkedin": return "#0284c7"; // Light Blue
      case "reddit": return "#f97316"; // Orange
      case "upi": return "#10b981"; // Green
      case "company": return "#64748b"; // Steel grey
      case "education": return "#a855f7"; // Magenta
      case "geo": return "#06b6d4"; // Cyan
      case "website": return "#14b8a6"; // Teal
      case "engine": return "#4f46e5"; // Indigo
      case "school": return "#84cc16"; // Lime
      default: return "#f59e0b"; // Amber
    }
  };

  const getEdgeStroke = (edge: EvidenceEdge) => {
    const isSelected = selectedEdge && selectedEdge.source === edge.source && selectedEdge.target === edge.target;
    const isHovered = hoveredEdge && hoveredEdge.source === edge.source && hoveredEdge.target === edge.target;
    if (isSelected) return "#4f46e5"; // Indigo
    if (isHovered) return "#6366f1"; // Lavender
    return "#cbd5e1"; // Slate 300
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Evidence SVG Visualizer */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        {/* Graph Header */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-indigo-650" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Explainable Evidence Graph
            </h4>
          </div>

          <button 
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 hover:text-ink hover:border-slate-350 shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset Layout
          </button>
        </div>

        {/* SVG Container */}
        <div 
          ref={containerRef}
          className="relative w-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden h-[450px] shadow-inner select-none"
        >
          <svg className="w-full h-full block">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
              <marker id="arrow-selected" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
              </marker>
            </defs>

            {/* Link lines */}
            {edges.map((edge, idx) => {
              const srcNode = nodes.find(n => n.id === edge.source.toLowerCase().trim());
              const tgtNode = nodes.find(n => n.id === edge.target.toLowerCase().trim());
              if (!srcNode || !tgtNode) return null;

              const isSelected = selectedEdge && selectedEdge.source === edge.source && selectedEdge.target === edge.target;
              const isHovered = hoveredEdge && hoveredEdge.source === edge.source && hoveredEdge.target === edge.target;

              return (
                <g key={idx} className="cursor-pointer">
                  {/* Invisible thick line for easy clicking */}
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke="transparent"
                    strokeWidth="10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(edge);
                      setSelectedNode(null);
                    }}
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {/* Visual line */}
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={getEdgeStroke(edge)}
                    strokeWidth={isSelected || isHovered ? "2.5" : "1.25"}
                    strokeDasharray={edge.confidenceContribution < 15 ? "5,5" : "0"}
                    markerEnd={`url(#${isSelected ? "arrow-selected" : "arrow"})`}
                  />
                  {/* Label background text overlay */}
                  {isHovered && (
                    <text
                      x={(srcNode.x + tgtNode.x) / 2}
                      y={(srcNode.y + tgtNode.y) / 2 - 4}
                      fill="#4f46e5"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-white px-1 font-mono"
                    >
                      {edge.evidenceType} (+{edge.confidenceContribution}%)
                    </text>
                  )}
                </g>
              );
            })}

            {/* Node dots */}
            {nodes.map((node) => {
              const isSelected = selectedNode && selectedNode.id === node.id;
              const isHovered = hoveredNode && hoveredNode.id === node.id;

              return (
                <g 
                  key={node.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    setSelectedEdge(null);
                  }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected || isHovered ? 12 : 9}
                    fill={getNodeColor(node.type)}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-150 shadow-md"
                  />
                  <text
                    x={node.x}
                    y={node.y - 15}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isSelected ? "bold" : "600"}
                    className="select-none pointer-events-none drop-shadow-sm font-mono"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Graph Legend */}
          <div className="absolute bottom-4 left-4 p-3 bg-white/95 border border-slate-200 rounded-xl flex flex-col gap-1.5 font-mono text-[8px] shadow-md pointer-events-none max-h-[160px] overflow-y-auto z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]"></span>
              <span className="text-slate-750 font-bold">Phone Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
              <span className="text-slate-750 font-bold">Email Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span>
              <span className="text-slate-750 font-bold">Username Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]"></span>
              <span className="text-slate-750 font-bold">GitHub Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]"></span>
              <span className="text-slate-750 font-bold">LinkedIn Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
              <span className="text-slate-750 font-bold">UPI / Financial VPA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]"></span>
              <span className="text-slate-750 font-bold">Engine Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]"></span>
              <span className="text-slate-750 font-bold">School Node</span>
            </div>
          </div>

          {/* Hover edge provenance tooltip */}
          {hoveredEdge && (
            <div 
              className="absolute bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-xl shadow-xl font-mono text-[9px] leading-relaxed w-64 pointer-events-none z-25 top-4 right-4"
            >
              <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 mb-1.5 uppercase flex items-center gap-1">
                🔎 Edge Provenance
              </div>
              <div><span className="text-slate-400">Connection:</span> <span className="text-white font-bold">{hoveredEdge.evidenceType}</span></div>
              <div><span className="text-slate-400">Source:</span> <span className="text-white font-semibold">{hoveredEdge.sourceModule}</span></div>
              <div><span className="text-slate-400">Extraction Method:</span> <span className="text-white font-semibold">Public Search Engine Index</span></div>
              <div><span className="text-slate-400">Timestamp:</span> <span className="text-white font-semibold">{new Date().toLocaleString()}</span></div>
              <div><span className="text-slate-400">Confidence:</span> <span className="text-emerald-400 font-bold">+{hoveredEdge.confidenceContribution}% Delta</span></div>
              {hoveredEdge.rawEvidence && (
                <div className="mt-1.5 border-t border-slate-800 pt-1.5 text-slate-350 italic break-words">
                  "{hoveredEdge.rawEvidence}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edge & Node Inspector Sidebar */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-indigo-650" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Attribution Audit
            </h4>
          </div>

          {selectedNode && (
            <div className="space-y-4 font-mono text-xs flex-1">
              <div>
                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Evidence Node</span>
                <span className="text-ink font-bold text-sm block mb-4 break-words">{selectedNode.label}</span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Node Type</span>
                <span className="text-indigo-850 uppercase font-bold block mb-4">{selectedNode.type}</span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Discovered Details</span>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed break-words">
                  {selectedNode.details || "Discovered via identity reconstruction mutations check."}
                </p>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-4 font-mono text-xs flex-1">
              <div>
                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Correlation Edge</span>
                <span className="text-ink font-bold text-xs block mb-4 uppercase">
                  {selectedEdge.source.split(":")[0]} ──► {selectedEdge.target.split(":")[0]}
                </span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Connection Type</span>
                <span className="text-indigo-800 font-bold block mb-4">{selectedEdge.evidenceType}</span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Confidence Contribution</span>
                <span className="text-emerald-700 font-bold block mb-4">+{selectedEdge.confidenceContribution}% Delta</span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Discovered By</span>
                <span className="text-slate-700 font-semibold block mb-4">{selectedEdge.sourceModule}</span>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1">Raw Evidence Log</span>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-150 break-words">
                  {selectedEdge.rawEvidence}
                </p>

                <span className="text-slate-650 font-bold text-[9px] uppercase block mb-1 mt-4">Correlation Reason</span>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                  {selectedEdge.reason}
                </p>
              </div>
            </div>
          )}

          {!selectedNode && !selectedEdge && (
            <div className="flex-1 flex flex-col items-center justify-center text-center font-mono py-8 text-slate-400">
              <GitCommit className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
              <p className="text-[10px] font-medium leading-relaxed">
                Click any Node point or Link arrow line to view attribution audits.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
