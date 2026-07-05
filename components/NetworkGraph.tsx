"use client";

import React, { useRef, useMemo, useState } from "react";
import { SuspectProfile, NetworkNode, NetworkLink } from "../lib/types";
import { Info, RotateCcw, Share2 } from "lucide-react";

interface NetworkGraphProps {
  suspect: SuspectProfile;
}

// ─── Layout constants (SVG viewBox coordinate space) ────────────────────────
const VB_WIDTH = 780;
const LEFT_PAD = 168;   // room for the root label on the far left
const RIGHT_PAD = 32;
const ROW_HEIGHT = 30;  // vertical spacing between leaves
const TOP_PAD = 28;
const BOTTOM_PAD = 28;

type PositionedNode = NetworkNode & {
  x: number;
  y: number;
  depth: number;
  parent?: string;
  isLeaf: boolean;
};

// ─── Node visual theme by group ─────────────────────────────────────────────
function nodeStyle(node: NetworkNode) {
  const isBridge = node.label?.includes("Bridge") || node.id === "sol_dev_99";
  switch (node.group) {
    case "suspect":
      return { fill: "#ef4444", stroke: "#b91c1c", r: 8, halo: "rgba(239,68,68,0.18)" };
    case "mule":
      return { fill: "#f59e0b", stroke: "#b45309", r: 6, halo: "rgba(245,158,11,0.16)" };
    case "group":
      return { fill: "#10b981", stroke: "#047857", r: 6, halo: "rgba(16,185,129,0.16)" };
    default:
      return isBridge
        ? { fill: "#06b6d4", stroke: "#0e7490", r: 7, halo: "rgba(6,182,212,0.18)" }
        : { fill: "#3b82f6", stroke: "#1d4ed8", r: 6, halo: "rgba(59,130,246,0.16)" };
  }
}

export default function NetworkGraph({ suspect }: NetworkGraphProps) {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  // Build a network from suspect.network if present; otherwise derive one from
  // the discovered accounts / locations so the graph always renders when we have data.
  const derivedNetwork = useMemo(() => {
    if (suspect.network && suspect.network.nodes && suspect.network.nodes.length > 0) {
      return suspect.network;
    }

    const accounts = suspect.accounts || [];
    if (accounts.length === 0) return null;

    const rootName = suspect.realName && !suspect.realName.startsWith("@")
      ? suspect.realName
      : (suspect.username || "Subject").replace(/^@/, "");

    const nodes: NetworkNode[] = [
      { id: rootName, label: `${rootName}\n(Query Subject)`, group: "suspect", val: 30 },
    ];
    const links: NetworkLink[] = [];
    const seen = new Set<string>([rootName]);

    accounts.forEach((acc) => {
      const id = `${acc.platform}:${acc.username}`;
      if (seen.has(id)) return;
      seen.add(id);
      nodes.push({
        id,
        label: `${acc.platform.toUpperCase()}\n@${acc.username}`,
        group: "account",
        val: acc.confidence === "CONFIRMED" ? 20 : acc.tier === 1 ? 18 : 14,
      });
      links.push({
        source: rootName,
        target: id,
        type: "OWNS",
        weight: acc.confidence === "CONFIRMED" ? 5 : 2,
      });
    });

    (suspect.locations || []).forEach((loc: any) => {
      const id = `location:${loc.locationName}`;
      if (seen.has(id)) return;
      seen.add(id);
      nodes.push({ id, label: `LOCATION\n${loc.locationName}`, group: "group", val: 12 });
      links.push({ source: rootName, target: id, type: "INTERACTS_WITH", weight: 2 });
    });

    return { nodes, links };
  }, [suspect]);

  const hasNetworkData = !!(derivedNetwork && derivedNetwork.nodes.length > 0);

  // ─── Compute tidy horizontal tree layout ──────────────────────────────────
  const { positioned, linkPaths, vbHeight } = useMemo(() => {
    if (!derivedNetwork || derivedNetwork.nodes.length === 0) return { positioned: [] as PositionedNode[], linkPaths: [] as { d: string; source: string; target: string; type?: string }[], vbHeight: 300 };

    const rawNodes = derivedNetwork.nodes;
    const rawLinks = derivedNetwork.links;

    // Build undirected adjacency
    const adj = new Map<string, string[]>();
    rawNodes.forEach(n => adj.set(n.id, []));
    rawLinks.forEach(l => {
      if (adj.has(l.source) && adj.has(l.target)) {
        adj.get(l.source)!.push(l.target);
        adj.get(l.target)!.push(l.source);
      }
    });

    // Root = suspect node, or the most-connected node, or first node
    const root =
      rawNodes.find(n => n.group === "suspect") ||
      [...rawNodes].sort((a, b) => (adj.get(b.id)?.length || 0) - (adj.get(a.id)?.length || 0))[0] ||
      rawNodes[0];

    // BFS to assign parent + depth (spanning tree)
    const depth = new Map<string, number>();
    const parent = new Map<string, string | undefined>();
    const children = new Map<string, string[]>();
    rawNodes.forEach(n => children.set(n.id, []));

    const visited = new Set<string>([root.id]);
    depth.set(root.id, 0);
    parent.set(root.id, undefined);
    const queue: string[] = [root.id];
    while (queue.length) {
      const cur = queue.shift()!;
      const neighbors = (adj.get(cur) || []).sort();
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          depth.set(nb, (depth.get(cur) || 0) + 1);
          parent.set(nb, cur);
          children.get(cur)!.push(nb);
          queue.push(nb);
        }
      }
    }

    // Any disconnected nodes → attach directly under root
    rawNodes.forEach(n => {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        depth.set(n.id, 1);
        parent.set(n.id, root.id);
        children.get(root.id)!.push(n.id);
      }
    });

    const maxDepth = Math.max(1, ...Array.from(depth.values()));

    // Assign a y-slot to each leaf via DFS ordering; internal nodes = avg(children)
    const yMap = new Map<string, number>();
    let leafCursor = 0;
    const assignY = (id: string): number => {
      const kids = children.get(id) || [];
      if (kids.length === 0) {
        const y = leafCursor;
        leafCursor += 1;
        yMap.set(id, y);
        return y;
      }
      const childYs = kids.map(assignY);
      const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
      yMap.set(id, y);
      return y;
    };
    assignY(root.id);

    const leafCount = Math.max(1, leafCursor);
    const height = TOP_PAD + BOTTOM_PAD + Math.max(1, leafCount - 1) * ROW_HEIGHT;
    const colW = maxDepth > 0 ? (VB_WIDTH - LEFT_PAD - RIGHT_PAD) / maxDepth : 0;

    const positioned: PositionedNode[] = rawNodes.map(n => {
      const d = depth.get(n.id) || 0;
      const yslot = yMap.get(n.id) || 0;
      return {
        ...n,
        depth: d,
        parent: parent.get(n.id),
        isLeaf: (children.get(n.id) || []).length === 0,
        x: LEFT_PAD + d * colW,
        y: TOP_PAD + yslot * ROW_HEIGHT,
      };
    });

    const posById = new Map(positioned.map(p => [p.id, p]));

    // Build smooth cubic-bezier link paths (parent → child)
    const linkPaths = positioned
      .filter(n => n.parent)
      .map(n => {
        const pnode = posById.get(n.parent!)!;
        const x1 = pnode.x, y1 = pnode.y, x2 = n.x, y2 = n.y;
        const mx = (x1 + x2) / 2;
        const d = `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        // Find original link for type/weight
        const orig = rawLinks.find(
          l => (l.source === n.parent && l.target === n.id) || (l.target === n.parent && l.source === n.id)
        );
        return { d, source: n.parent!, target: n.id, type: orig?.type };
      });

    return { positioned, linkPaths, vbHeight: Math.max(300, height) };
  }, [derivedNetwork]);

  // Neighbor lookup for hover highlighting
  const neighborsOf = useMemo(() => {
    const map = new Map<string, Set<string>>();
    positioned.forEach(n => map.set(n.id, new Set()));
    linkPaths.forEach(l => {
      map.get(l.source)?.add(l.target);
      map.get(l.target)?.add(l.source);
    });
    return map;
  }, [positioned, linkPaths]);

  if (!hasNetworkData) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 bg-white font-mono max-w-2xl mx-auto my-6 flex flex-col items-center justify-center min-h-[300px] shadow-sm">
        <Share2 className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
        <p className="text-sm text-slate-650 font-medium">No network link or relational graph data found for this suspect.</p>
      </div>
    );
  }

  const isEdgeActive = (l: { source: string; target: string }) =>
    hoveredId != null && (l.source === hoveredId || l.target === hoveredId);
  const isNodeActive = (id: string) =>
    hoveredId == null || id === hoveredId || neighborsOf.get(hoveredId)?.has(id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Visual Graph */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Controls header */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-650" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Suspect Relationship Tree
            </h4>
          </div>
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 hover:text-ink hover:border-slate-350 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Selection
            </button>
          )}
        </div>

        {/* SVG Tree Container */}
        <div
          ref={svgWrapRef}
          className="relative w-full rounded-2xl bg-white border border-slate-200 overflow-auto shadow-inner"
          style={{ maxHeight: 560 }}
        >
          <svg
            viewBox={`0 0 ${VB_WIDTH} ${vbHeight}`}
            width="100%"
            style={{ display: "block", minHeight: 340 }}
            preserveAspectRatio="xMidYMin meet"
          >
            {/* Subtle dot grid background */}
            <defs>
              <pattern id="ng-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#e2e8f0" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={VB_WIDTH} height={vbHeight} fill="url(#ng-dots)" opacity="0.5" />

            {/* Links */}
            <g fill="none">
              {linkPaths.map((l, i) => {
                const active = isEdgeActive(l);
                const dimmed = hoveredId != null && !active;
                const isCoAccused = l.type === "CO_ACCUSED";
                return (
                  <path
                    key={i}
                    d={l.d}
                    stroke={active ? "#2563eb" : isCoAccused ? "rgba(239,68,68,0.45)" : "rgba(100,116,139,0.35)"}
                    strokeWidth={active ? 2.2 : 1.3}
                    opacity={dimmed ? 0.15 : 1}
                    style={{ transition: "opacity 150ms, stroke 150ms" }}
                  />
                );
              })}
            </g>

            {/* Nodes + labels */}
            <g>
              {positioned.map((n) => {
                const style = nodeStyle(n);
                const active = isNodeActive(n.id);
                const isSel = selectedNode?.id === n.id;
                const isHov = hoveredId === n.id;
                const labelText = n.label.split("\n")[0];

                // Label placement: root & leaves → left of circle; internal middle nodes → above
                const isRoot = n.depth === 0;
                const labelLeft = isRoot || n.isLeaf;
                const labelX = labelLeft ? n.x - style.r - 8 : n.x;
                const labelY = labelLeft ? n.y + 3.5 : n.y - style.r - 6;
                const anchor: "start" | "middle" | "end" = labelLeft ? "end" : "middle";

                return (
                  <g
                    key={n.id}
                    style={{ cursor: "pointer", transition: "opacity 150ms" }}
                    opacity={active ? 1 : 0.28}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedNode(n)}
                  >
                    {/* halo for suspect / selected / hovered */}
                    {(n.group === "suspect" || isSel || isHov) && (
                      <circle cx={n.x} cy={n.y} r={style.r + 6} fill={style.halo} />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={isSel || isHov ? style.r + 1.5 : style.r}
                      fill={style.fill}
                      stroke={isSel ? "#0f172a" : style.stroke}
                      strokeWidth={isSel ? 2.5 : 1.5}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor={anchor}
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize={isRoot ? 12 : 10.5}
                      fontWeight={isRoot || isSel || isHov ? 700 : 500}
                      fill={isSel || isHov ? "#0f172a" : "#475569"}
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 p-2.5 bg-white/95 border border-slate-200 rounded-xl flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[9px] shadow-md pointer-events-none max-w-[92%]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span className="text-slate-700 font-semibold">Suspect</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-slate-700 font-semibold">Owned Profile</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-slate-700 font-semibold">Mule Account</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-slate-700 font-semibold">Chat Group</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-300" /><span className="text-slate-700 font-semibold">Bridge Node</span></div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
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
                Click any node in the relationship tree to inspect relational intelligence details and centrality calculations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
