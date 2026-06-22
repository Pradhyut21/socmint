"use client";

import React, { useRef, useEffect, useState } from "react";
import { SuspectProfile, NetworkNode, NetworkLink } from "../lib/types";
import { Info, ZoomIn, ZoomOut, RotateCcw, Share2 } from "lucide-react";

interface NetworkGraphProps {
  suspect: SuspectProfile;
}

export default function NetworkGraph({ suspect }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<(NetworkNode & { x: number; y: number; vx: number; vy: number; fx?: number; fy?: number })[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<any>(null);

  const hasNetworkData = suspect.network && suspect.network.nodes && suspect.network.nodes.length > 0;

  // Initialize network nodes and layout coordinates
  useEffect(() => {
    if (!hasNetworkData) return;
    const width = containerRef.current?.clientWidth || 600;
    const height = 450;
    
    // Position suspect at center, distribute other nodes in a circle initially
    const suspectNode = suspect.network.nodes.find(n => n.group === 'suspect');
    
    const initializedNodes = suspect.network.nodes.map((node, index) => {
      const isSuspect = node.group === 'suspect';
      let x = width / 2;
      let y = height / 2;
      
      if (!isSuspect) {
        const angle = (index / (suspect.network.nodes.length - 1)) * 2 * Math.PI;
        const radius = 120 + Math.random() * 30;
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
    setLinks(suspect.network.links);
    setSelectedNode(null);
  }, [suspect]);

  // Main Canvas Rendering & Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const width = canvas.width;
    const height = canvas.height;

    const runPhysicsAndDraw = () => {
      // --- Simple Force-Directed Layout Physics Engine ---
      const repelForce = 350;
      const linkForce = 0.05;
      const centerForce = 0.015;
      const friction = 0.85;

      // 1. Node Repulsion (nodes push each other away)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 220) {
            const force = (repelForce) / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (!n1.fx) { n1.vx -= fx; n1.vy -= fy; }
            if (!n2.fx) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      // 2. Link Attraction (connected nodes pull each other close)
      links.forEach((link) => {
        const n1 = nodes.find(n => n.id === link.source);
        const n2 = nodes.find(n => n.id === link.target);
        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Target length for links is 110px
          const desiredDist = 110;
          const diff = dist - desiredDist;
          const force = diff * linkForce;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!n1.fx) { n1.vx += fx; n1.vy += fy; }
          if (!n2.fx) { n2.vx -= fx; n2.vy -= fy; }
        }
      });

      // 3. Center Gravity & Update positions
      nodes.forEach((node) => {
        if (node.fx !== undefined && node.fy !== undefined) {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
          return;
        }

        // Pull to center
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * centerForce;
        node.vy += dy * centerForce;

        // Apply velocities with friction damping
        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;

        // Bound check to keep inside canvas
        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(height - 20, node.y));
      });

      // --- Draw Canvas Elements ---
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      links.forEach((link) => {
        const n1 = nodes.find(n => n.id === link.source);
        const n2 = nodes.find(n => n.id === link.target);
        if (n1 && n2) {
          // Highlight connection if hovered
          const isRelatedToHover = hoveredNode && (n1.id === hoveredNode.id || n2.id === hoveredNode.id);
          const hasHoverActive = hoveredNode !== null;

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          
          if (hasHoverActive) {
            ctx.strokeStyle = isRelatedToHover ? "rgba(59, 130, 246, 0.7)" : "rgba(30, 41, 59, 0.15)";
            ctx.lineWidth = isRelatedToHover ? 2.5 : 1.0;
          } else {
            ctx.strokeStyle = link.type === "CO_ACCUSED" ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.25)";
            const weight = link.weight || (link.strength ? link.strength * 5 : 1);
            ctx.lineWidth = Math.min(4, weight * 1.2);
          }
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode && node.id === hoveredNode.id;
        const isSelected = selectedNode && node.id === selectedNode.id;
        const hasHoverActive = hoveredNode !== null;
        
        // Dim unselected nodes on hover
        const isDimmed = hasHoverActive && !isHovered && !links.some(l => 
          (l.source === node.id && l.target === hoveredNode.id) ||
          (l.target === node.id && l.source === hoveredNode.id)
        );

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.25 : 1.0;

        // Visual properties based on node types
        let size = (node.val || node.size || 16) * 0.75;
        let color = "#3b82f6"; // default blue
        let ringColor = "rgba(59, 130, 246, 0.2)";
        let isBridgeNode = node.label.includes("Bridge");

        if (node.group === "suspect") {
          size = 22;
          color = "#ef4444"; // red suspect
          ringColor = "rgba(239, 68, 68, 0.25)";
          
          // Draw pulsing outer circle for suspect
          const pulse = 1 + Math.sin(Date.now() / 200) * 0.08;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size * pulse * 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = ringColor;
          ctx.fill();
        } else if (node.group === "mule") {
          color = "#f59e0b"; // yellow mule
          ringColor = "rgba(245, 158, 11, 0.2)";
        } else if (node.group === "group") {
          color = "#10b981"; // green group
          ringColor = "rgba(16, 185, 129, 0.2)";
        }

        // Draw shadow glow for active selection
        if (isHovered || isSelected) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
        }

        // Draw node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Node border
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.strokeStyle = isBridgeNode ? "#06b6d4" : "#0f172a";
        ctx.lineWidth = isBridgeNode ? 3 : 2;
        ctx.stroke();

        // Label details text
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHovered || isSelected ? "#0f172a" : "#334155";
        ctx.font = isHovered || isSelected ? "bold 10px 'JetBrains Mono', monospace" : "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        
        // Split multi-line labels
        const lines = node.label.split("\n");
        lines.forEach((line, idx) => {
          ctx.fillText(line, node.x, node.y + size + 12 + (idx * 10));
        });

        ctx.restore();
      });

      animationId = requestAnimationFrame(runPhysicsAndDraw);
    };

    runPhysicsAndDraw();

    return () => cancelAnimationFrame(animationId);
  }, [nodes, links, hoveredNode, selectedNode]);

  // Handle Canvas Interaction: Mouse down / start drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Detect if clicking on a node
    const clicked = nodes.find((node) => {
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      const size = (node.val || node.size || 16) * 0.75;
      return dist <= size + 10;
    });

    if (clicked) {
      setDraggedNode(clicked);
      setSelectedNode(clicked);
      clicked.fx = x;
      clicked.fy = y;
    }
  };

  // Mouse Move: update drag location
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedNode) {
      draggedNode.fx = x;
      draggedNode.fy = y;
    } else {
      // Hover detection
      const hovered = nodes.find((node) => {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        const size = (node.val || node.size || 16) * 0.75;
        return dist <= size + 10;
      });
      setHoveredNode(hovered || null);
    }
  };

  // Mouse Up: release drag lock
  const handleMouseUp = () => {
    if (draggedNode) {
      draggedNode.fx = undefined;
      draggedNode.fy = undefined;
      setDraggedNode(null);
    }
  };

  // Reset coordinates layout
  const handleReset = () => {
    const width = containerRef.current?.clientWidth || 600;
    const height = 450;
    const initializedNodes = nodes.map((node, index) => {
      const isSuspect = node.group === 'suspect';
      let x = width / 2;
      let y = height / 2;
      
      if (!isSuspect) {
        const angle = (index / (nodes.length - 1)) * 2 * Math.PI;
        x += Math.cos(angle) * (110 + Math.random() * 20);
        y += Math.sin(angle) * (110 + Math.random() * 20);
      }
      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
        fx: undefined,
        fy: undefined
      };
    });
    setNodes(initializedNodes);
  };

  if (!hasNetworkData) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 bg-white font-mono max-w-2xl mx-auto my-6 flex flex-col items-center justify-center min-h-[300px] shadow-sm">
        <Share2 className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
        <p className="text-sm text-slate-650 font-medium">No network link or relational graph data found for this suspect.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Interactive Visual Graph Canvas */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        {/* Controls header */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-650" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Suspect Network Graph Mapping
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 hover:text-ink hover:border-slate-350 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Layout
            </button>
          </div>
        </div>

        {/* Canvas Render Container */}
        <div 
          ref={containerRef}
          className="relative w-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden h-[450px] cursor-grab active:cursor-grabbing shadow-inner"
        >
          <canvas
            ref={canvasRef}
            width={750}
            height={450}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block"
          />

          {/* Map legend bottom left */}
          <div className="absolute bottom-4 left-4 p-3 bg-white/95 border border-slate-200 rounded-xl flex flex-col gap-2 font-mono text-[9px] shadow-md pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-750 font-semibold">Suspect Target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-750 font-semibold">Owned Platform Profile</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-750 font-semibold">Mule Account Holder</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-750 font-semibold">Moderated Chat Group</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-205"></span>
              <span className="text-slate-750 font-semibold">Bridge Associate (Central Node)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Network analysis detail sidebar */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-650" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Network Intelligence
            </h4>
          </div>

          {selectedNode ? (
            <div className="space-y-4 font-mono text-xs flex-1 flex flex-col justify-between">
              <div>
                <span className="text-slate-600 font-bold text-[10px] uppercase block mb-1">Entity Name</span>
                <span className="text-ink font-bold text-sm block mb-4">{selectedNode.label.split("\n")[0]}</span>

                <span className="text-slate-600 font-bold text-[10px] uppercase block mb-1">Network Classification</span>
                <span className="text-blue-750 uppercase font-bold block mb-4">{selectedNode.group}</span>

                <span className="text-slate-600 font-bold text-[10px] uppercase block mb-1">Influence Weight</span>
                <span className="text-ink font-semibold block mb-4">{((selectedNode.val || selectedNode.size || 16) / 3).toFixed(1)} Centrality Coefficient</span>

                <span className="text-slate-600 font-bold text-[10px] uppercase block mb-1">Role Detail</span>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                  {selectedNode.group === "suspect" && "Primary profile target under investigation."}
                  {selectedNode.group === "mule" && "Identity linked to receiving and withdrawing illicit funds generated via investment schemes."}
                  {selectedNode.group === "group" && "Shared chat platform used for coordination, OTC rates posting, or Hawala drops."}
                  {selectedNode.group === "person" && selectedNode.id === "sol_dev_99" && "CRITICAL BRIDGE NODE: Links target profiles directly to financial mule assets. Flagged for targeted monitoring."}
                  {selectedNode.group === "account" && "Public account handle verified to belong to suspect via shared device credentials."}
                </p>
              </div>

              {selectedNode.group === "person" && selectedNode.id === "sol_dev_99" && (
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-[10px] text-cyan-900 font-bold shadow-sm mt-4">
                  <span className="font-bold block uppercase mb-1">Bridge Node Warning:</span>
                  This node acts as a gateway linking multiple financial mule identities. Investigating this target may unmask the direct laundering chain.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs">
              <Share2 className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
              <p className="text-slate-650 font-medium leading-relaxed">
                Click any coordinate node in the map graph to inspect relational intelligence details and centrality calculations.
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
