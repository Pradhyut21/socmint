"use client";

/**
 * OSINTFrameworkGraph.tsx
 *
 * An interactive radial-tree network graph inspired by osintframework.com.
 * Rendered on a <canvas> — no external graph library required.
 *
 * Features:
 *  - Dark theme matching the OSINT Framework aesthetic
 *  - Radial layout with the subject at the centre
 *  - Branches: category → sub-category → tool/platform
 *  - Click to expand/collapse nodes
 *  - Hover tooltip with description and link
 *  - Pan (drag) + Zoom (wheel/pinch)
 *  - Search / highlight
 *  - "FOUND" nodes pulse green; "NOT_FOUND" nodes dim; ERROR nodes amber
 *  - Platform scan results wired in from SuspectProfile.platformStatuses
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  ZoomIn, ZoomOut, RotateCcw, Search, X, ExternalLink,
  ChevronDown, Circle,
} from "lucide-react";
import type { SuspectProfile } from "@/lib/types";

// ── Tree data ─────────────────────────────────────────────────────────────────

export interface OsintNode {
  id: string;
  label: string;
  description?: string;
  url?: string;
  type: "root" | "category" | "subcategory" | "tool";
  children?: OsintNode[];
  /** Injected at runtime from scan results */
  scanStatus?: "FOUND" | "NOT_FOUND" | "ERROR" | "RATE LIMITED" | "PRIVATE" | "UNAVAILABLE";
}

const OSINT_TREE: OsintNode = {
  id: "root",
  label: "SOCMINT",
  type: "root",
  description: "OSINT Framework — click a node to expand / collapse",
  children: [
    {
      id: "username", label: "Username", type: "category",
      description: "Tools for enumerating username across platforms",
      children: [
        { id: "sherlock", label: "Sherlock", type: "tool", url: "https://github.com/sherlock-project/sherlock", description: "Hunt down social media accounts by username across 400+ sites" },
        { id: "whatsmyname", label: "WhatsMyName", type: "tool", url: "https://whatsmyname.app", description: "Username enumeration tool" },
        { id: "github-p", label: "GitHub", type: "tool", url: "https://github.com", description: "Check GitHub username", scanStatus: undefined },
        { id: "gitlab-p", label: "GitLab", type: "tool", url: "https://gitlab.com", description: "Check GitLab username", scanStatus: undefined },
        { id: "twitter-p", label: "X / Twitter", type: "tool", url: "https://x.com", description: "Check X/Twitter handle", scanStatus: undefined },
        { id: "instagram-p", label: "Instagram", type: "tool", url: "https://instagram.com", description: "Check Instagram username", scanStatus: undefined },
        { id: "reddit-p", label: "Reddit", type: "tool", url: "https://reddit.com", description: "Check Reddit username", scanStatus: undefined },
        { id: "tiktok-p", label: "TikTok", type: "tool", url: "https://tiktok.com", description: "Check TikTok username", scanStatus: undefined },
        { id: "linkedin-p", label: "LinkedIn", type: "tool", url: "https://linkedin.com", description: "Check LinkedIn username", scanStatus: undefined },
      ],
    },
    {
      id: "email", label: "Email Address", type: "category",
      description: "Email OSINT and verification",
      children: [
        { id: "hunter", label: "Hunter.io", type: "tool", url: "https://hunter.io", description: "Find email addresses linked to a domain" },
        { id: "hibp", label: "HaveIBeenPwned", type: "tool", url: "https://haveibeenpwned.com", description: "Check if email was in a data breach" },
        { id: "emailrep", label: "EmailRep.io", type: "tool", url: "https://emailrep.io", description: "Email reputation and intelligence" },
        { id: "gravatar", label: "Gravatar", type: "tool", url: "https://gravatar.com", description: "Email → profile picture & identity" },
        { id: "epieos", label: "Epieos", type: "tool", url: "https://epieos.com", description: "OSINT on email addresses" },
      ],
    },
    {
      id: "social", label: "Social Networks", type: "category",
      description: "Social media investigation",
      children: [
        {
          id: "social-twitter", label: "Twitter / X", type: "subcategory",
          children: [
            { id: "tweetdeck", label: "TweetDeck", type: "tool", url: "https://tweetdeck.twitter.com", description: "Advanced Twitter monitoring" },
            { id: "socialbearing", label: "SocialBearing", type: "tool", url: "https://socialbearing.com", description: "Twitter analytics & search" },
            { id: "botsentinel", label: "BotSentinel", type: "tool", url: "https://botsentinel.com", description: "Detect Twitter bots" },
          ],
        },
        {
          id: "social-instagram", label: "Instagram", type: "subcategory",
          children: [
            { id: "instaloader", label: "Instaloader", type: "tool", url: "https://instaloader.github.io", description: "Download Instagram data" },
            { id: "osintgram", label: "Osintgram", type: "tool", url: "https://github.com/Datalux/Osintgram", description: "Instagram OSINT tool" },
          ],
        },
        {
          id: "social-linkedin", label: "LinkedIn", type: "subcategory",
          children: [
            { id: "linkedint", label: "LinkedInt", type: "tool", url: "https://github.com/mdsecactivebreach/LinkedInt", description: "LinkedIn intelligence gathering" },
          ],
        },
        { id: "facebook-p", label: "Facebook", type: "tool", url: "https://facebook.com", description: "Check Facebook profile", scanStatus: undefined },
        { id: "threads-p", label: "Threads", type: "tool", url: "https://threads.net", description: "Check Threads profile", scanStatus: undefined },
        { id: "youtube-p", label: "YouTube", type: "tool", url: "https://youtube.com", description: "Check YouTube channel", scanStatus: undefined },
      ],
    },
    {
      id: "darkweb", label: "Dark Web", type: "category",
      description: "Dark web monitoring and search",
      children: [
        { id: "ahmia", label: "Ahmia", type: "tool", url: "https://ahmia.fi", description: "Tor hidden service search engine" },
        { id: "onionsearch", label: "OnionSearch", type: "tool", url: "https://github.com/megadose/OnionSearch", description: "Multi-engine .onion search" },
        { id: "darktracer", label: "DarkTracer", type: "tool", url: "https://darktracer.com", description: "Dark web threat intelligence" },
      ],
    },
    {
      id: "phone", label: "Phone Numbers", type: "category",
      description: "Phone number OSINT",
      children: [
        { id: "truecaller", label: "Truecaller", type: "tool", url: "https://truecaller.com", description: "Phone number identification" },
        { id: "numverify", label: "Numverify", type: "tool", url: "https://numverify.com", description: "Global phone number validation" },
        { id: "sync-me", label: "Sync.me", type: "tool", url: "https://sync.me", description: "Reverse phone lookup" },
        { id: "callerid", label: "CallerID Test", type: "tool", url: "https://www.calleridtest.com", description: "Caller ID lookup" },
      ],
    },
    {
      id: "geolocation", label: "Geolocation", type: "category",
      description: "Location intelligence and mapping",
      children: [
        { id: "wigle", label: "WiGLE", type: "tool", url: "https://wigle.net", description: "Wireless network mapping" },
        { id: "creepy", label: "Creepy", type: "tool", url: "https://www.geocreepy.com", description: "Geolocation OSINT tool" },
        { id: "geospy", label: "GeoSpy", type: "tool", url: "https://geospy.ai", description: "AI-powered image geolocation" },
        { id: "nominatim", label: "Nominatim", type: "tool", url: "https://nominatim.openstreetmap.org", description: "OpenStreetMap geocoding" },
        { id: "google-earth", label: "Google Earth", type: "tool", url: "https://earth.google.com", description: "Satellite imagery OSINT" },
      ],
    },
    {
      id: "domain", label: "Domain Name", type: "category",
      description: "Domain and DNS intelligence",
      children: [
        { id: "whois", label: "WHOIS", type: "tool", url: "https://who.is", description: "Domain registration data" },
        { id: "shodan", label: "Shodan", type: "tool", url: "https://shodan.io", description: "Internet-connected device search" },
        { id: "censys", label: "Censys", type: "tool", url: "https://censys.io", description: "Internet asset discovery" },
        { id: "virustotal", label: "VirusTotal", type: "tool", url: "https://virustotal.com", description: "Domain / IP reputation" },
        { id: "sectrails", label: "SecurityTrails", type: "tool", url: "https://securitytrails.com", description: "DNS and domain history" },
      ],
    },
    {
      id: "devplatforms", label: "Developer", type: "category",
      description: "Developer platform intelligence",
      children: [
        { id: "github-dev", label: "GitHub", type: "tool", url: "https://github.com", description: "Source code & commit history OSINT", scanStatus: undefined },
        { id: "gitlab-dev", label: "GitLab", type: "tool", url: "https://gitlab.com", description: "GitLab profile OSINT", scanStatus: undefined },
        { id: "stackoverflow-p", label: "Stack Overflow", type: "tool", url: "https://stackoverflow.com", description: "Developer Q&A profile" },
        { id: "leetcode-p", label: "LeetCode", type: "tool", url: "https://leetcode.com", description: "Competitive programming profile", scanStatus: undefined },
        { id: "kaggle-p", label: "Kaggle", type: "tool", url: "https://kaggle.com", description: "Data science profile", scanStatus: undefined },
      ],
    },
    {
      id: "search", label: "Search Engines", type: "category",
      description: "OSINT via search engines",
      children: [
        { id: "google-dork", label: "Google Dorks", type: "tool", url: "https://www.google.com", description: "Advanced Google search operators" },
        { id: "bing-search", label: "Bing", type: "tool", url: "https://bing.com", description: "Bing OSINT search" },
        { id: "yandex", label: "Yandex", type: "tool", url: "https://yandex.com", description: "Russian search + reverse image" },
        { id: "ddg", label: "DuckDuckGo", type: "tool", url: "https://duckduckgo.com", description: "Privacy-focused search" },
      ],
    },
    {
      id: "images", label: "Images / Videos", type: "category",
      description: "Visual media OSINT",
      children: [
        { id: "tineye", label: "TinEye", type: "tool", url: "https://tineye.com", description: "Reverse image search" },
        { id: "facecheck", label: "FaceCheck.ID", type: "tool", url: "https://facecheck.id", description: "Face search by photo" },
        { id: "pimeys", label: "PimEyes", type: "tool", url: "https://pimeyes.com", description: "Facial recognition search engine" },
        { id: "exiftool", label: "ExifTool", type: "tool", url: "https://exiftool.org", description: "EXIF metadata extraction" },
        { id: "invid", label: "InVID", type: "tool", url: "https://www.invid-project.eu", description: "Video verification tool" },
      ],
    },
    {
      id: "forums", label: "Forums / Paste", type: "category",
      description: "Forums and paste site OSINT",
      children: [
        { id: "pastebin-p", label: "Pastebin", type: "tool", url: "https://pastebin.com", description: "Check Pastebin for leaked data", scanStatus: undefined },
        { id: "reddit-forum", label: "Reddit", type: "tool", url: "https://reddit.com", description: "Reddit post history OSINT", scanStatus: undefined },
        { id: "medium-p", label: "Medium", type: "tool", url: "https://medium.com", description: "Check Medium blog presence", scanStatus: undefined },
        { id: "hackernews-p", label: "HackerNews", type: "tool", url: "https://news.ycombinator.com", description: "Check HN user profile", scanStatus: undefined },
      ],
    },
    {
      id: "crypto-cat", label: "Blockchain", type: "category",
      description: "Crypto and blockchain OSINT",
      children: [
        { id: "etherscan", label: "Etherscan", type: "tool", url: "https://etherscan.io", description: "Ethereum blockchain explorer" },
        { id: "chainalysis", label: "Chainalysis", type: "tool", url: "https://chainalysis.com", description: "Blockchain analytics" },
        { id: "blockchair", label: "Blockchair", type: "tool", url: "https://blockchair.com", description: "Multi-chain explorer" },
        { id: "btc-explorer", label: "Bitcoin Explorer", type: "tool", url: "https://blockstream.info", description: "Bitcoin transaction lookup" },
      ],
    },
  ],
};

// ── Colour palette (OSINT Framework original theme) ───────────────────────────

const COLORS = {
  bg: "#1a1a1a",
  gridLine: "#242424",
  root: { fill: "#3a3a3a", stroke: "steelblue", text: "#ffffff" },
  category: { fill: "#3a3a3a", stroke: "steelblue", text: "#e0e0e0" },
  subcategory: { fill: "#3a3a3a", stroke: "steelblue", text: "#e0e0e0" },
  tool: { fill: "#1a1a1a", stroke: "steelblue", text: "#999999" },
  link: "#555555",
  hover: "#4a9eda",
  found: "#22c55e",
  notFound: "#555555",
  error: "#e8944a",
  rateLimit: "#9a7eda",
  private: "#ec4899",
  pulse: "#4ade80",
  searchHighlight: "#fbbf24",
};

const TYPE_COLORS: Record<OsintNode["type"], { fill: string; stroke: string; text: string; radius: number }> = {
  root:        { fill: "#3a3a3a", stroke: "steelblue", text: "#ffffff",  radius: 12 },
  category:    { fill: "#3a3a3a", stroke: "steelblue", text: "#e0e0e0",  radius: 8 },
  subcategory: { fill: "#3a3a3a", stroke: "steelblue", text: "#e0e0e0",  radius: 7 },
  tool:        { fill: "#1a1a1a", stroke: "steelblue", text: "#999999",  radius: 5.5 },
};


// ── Layout: radial tree ───────────────────────────────────────────────────────

interface LayoutNode {
  node: OsintNode;
  x: number;
  y: number;
  angle: number;
  depth: number;
  parent?: LayoutNode;
  children: LayoutNode[];
  collapsed: boolean;
}

const RADII = [0, 160, 280, 380, 460];

function buildLayout(
  tree: OsintNode,
  collapsedIds: Set<string>,
  cx: number,
  cy: number
): LayoutNode[] {
  const allNodes: LayoutNode[] = [];

  function place(
    node: OsintNode,
    depth: number,
    angleStart: number,
    angleEnd: number,
    parent?: LayoutNode
  ): LayoutNode {
    const angle = (angleStart + angleEnd) / 2;
    const r = RADII[Math.min(depth, RADII.length - 1)];
    const x = depth === 0 ? cx : cx + Math.cos(angle) * r;
    const y = depth === 0 ? cy : cy + Math.sin(angle) * r;
    const collapsed = collapsedIds.has(node.id);

    const layoutNode: LayoutNode = {
      node,
      x, y, angle, depth,
      parent,
      children: [],
      collapsed,
    };
    allNodes.push(layoutNode);

    const kids = node.children;
    if (kids && kids.length > 0 && !collapsed) {
      const span = angleEnd - angleStart;
      kids.forEach((child, i) => {
        const childStart = angleStart + (i / kids.length) * span;
        const childEnd   = angleStart + ((i + 1) / kids.length) * span;
        const childLayout = place(child, depth + 1, childStart, childEnd, layoutNode);
        layoutNode.children.push(childLayout);
      });
    }

    return layoutNode;
  }

  place(tree, 0, -Math.PI, Math.PI);
  return allNodes;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  suspect?: SuspectProfile;
  standalone?: boolean; // render without suspect context
}

// Helper to collect all category/subcategory IDs for initial collapsed state
const INITIAL_COLLAPSED_IDS = (() => {
  const ids = new Set<string>();
  function traverse(n: OsintNode) {
    if (n.type === "category" || n.type === "subcategory") {
      ids.add(n.id);
    }
    n.children?.forEach(traverse);
  }
  traverse(OSINT_TREE);
  return ids;
})();

export default function OSINTFrameworkGraph({ suspect, standalone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const pulseRef = useRef(0);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(INITIAL_COLLAPSED_IDS));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [hovered, setHovered] = useState<LayoutNode | null>(null);
  const [selected, setSelected] = useState<LayoutNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [size, setSize] = useState({ w: 900, h: 680 });

  // Wire in scan results from suspect profile
  const tree = useMemo<OsintNode>(() => {
    if (!suspect?.platformStatuses) return OSINT_TREE;

    const statusMap = new Map<string, string>();
    for (const ps of suspect.platformStatuses) {
      statusMap.set(ps.name.toLowerCase(), ps.status);
    }

    const platformKeywords: Record<string, string[]> = {
      "github-p": ["github"], "github-dev": ["github"],
      "gitlab-p": ["gitlab"], "gitlab-dev": ["gitlab"],
      "twitter-p": ["twitter", "x / twitter"],
      "instagram-p": ["instagram"],
      "reddit-p": ["reddit"], "reddit-forum": ["reddit"],
      "facebook-p": ["facebook"],
      "threads-p": ["threads"],
      "youtube-p": ["youtube"],
      "leetcode-p": ["leetcode"],
      "kaggle-p": ["kaggle"],
      "pastebin-p": ["pastebin"],
      "medium-p": ["medium"],
      "hackernews-p": ["hackernews", "hacker news"],
      "linkedin-p": ["linkedin"],
      "tiktok-p": ["tiktok"],
    };

    function injectStatuses(n: OsintNode): OsintNode {
      const kws = platformKeywords[n.id];
      let scanStatus = n.scanStatus;
      if (kws) {
        for (const kw of kws) {
          if (statusMap.has(kw)) {
            scanStatus = statusMap.get(kw) as any;
            break;
          }
        }
      }
      return {
        ...n,
        scanStatus,
        children: n.children?.map(injectStatuses),
      };
    }
    return injectStatuses(OSINT_TREE);
  }, [suspect]);

  // Build layout nodes
  const layoutNodes = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    return buildLayout(tree, collapsed, cx, cy);
  }, [tree, collapsed, size]);

  const searchHighlightIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    layoutNodes.forEach(ln => {
      if (
        ln.node.label.toLowerCase().includes(q) ||
        ln.node.description?.toLowerCase().includes(q)
      ) ids.add(ln.node.id);
    });
    return ids;
  }, [searchQuery, layoutNodes]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: Math.max(e.contentRect.height, 600) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hit-test helper
  const hitTest = useCallback((mx: number, my: number, nodes: LayoutNode[]): LayoutNode | null => {
    const cx = size.w / 2 + pan.x;
    const cy = size.h / 2 + pan.y;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const ln = nodes[i];
      const nx = (ln.x - size.w / 2) * zoom + cx;
      const ny = (ln.y - size.h / 2) * zoom + cy;
      const r = TYPE_COLORS[ln.node.type].radius * zoom;
      if ((mx - nx) ** 2 + (my - ny) ** 2 <= r ** 2) return ln;
    }
    return null;
  }, [size, pan, zoom]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2);
      const pulse = (Math.sin(pulseRef.current) + 1) / 2;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2 + pan.x;
      const cy = H / 2 + pan.y;

      // Background
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 0.5;
      const step = 60 * zoom;
      for (let x = (cx % step); x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (cy % step); y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Transform helper: world → screen
      const tx = (wx: number) => (wx - W / 2) * zoom + cx;
      const ty = (wy: number) => (wy - H / 2) * zoom + cy;

      // Draw links first
      layoutNodes.forEach(ln => {
        if (!ln.parent) return;
        const x1 = tx(ln.parent.x), y1 = ty(ln.parent.y);
        const x2 = tx(ln.x),        y2 = ty(ln.y);

        const isHighlighted = searchHighlightIds.has(ln.node.id);
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        // Curved bezier link
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.quadraticCurveTo(mx, my, x2, y2);

        ctx.strokeStyle = isHighlighted ? COLORS.searchHighlight :
          ln.node.scanStatus === "FOUND" ? `rgba(34,197,94,0.5)` : COLORS.link;
        ctx.lineWidth = ln.depth === 1 ? 1.5 * zoom : 1 * zoom;
        ctx.stroke();
      });

      // Draw nodes
      layoutNodes.forEach(ln => {
        const nx = tx(ln.node.type === "root" ? size.w / 2 : ln.x);
        const ny = ty(ln.node.type === "root" ? size.h / 2 : ln.y);
        const col = TYPE_COLORS[ln.node.type];
        const r   = col.radius * zoom;
        const isHighlighted = searchHighlightIds.has(ln.node.id);
        const isHovered  = hovered?.node.id  === ln.node.id;
        const isSelected = selected?.node.id === ln.node.id;

        // Status-based stroke colour
        let strokeColor = col.stroke;
        if (ln.node.scanStatus === "FOUND")       strokeColor = COLORS.found;
        else if (ln.node.scanStatus === "ERROR")  strokeColor = COLORS.error;
        else if (ln.node.scanStatus === "RATE LIMITED") strokeColor = COLORS.rateLimit;
        else if (ln.node.scanStatus === "PRIVATE") strokeColor = COLORS.private;
        if (isHighlighted) strokeColor = COLORS.searchHighlight;
        if (isHovered || isSelected) strokeColor = COLORS.hover;

        // Pulse ring for FOUND nodes
        if (ln.node.scanStatus === "FOUND") {
          const pr = r + 4 * zoom + pulse * 6 * zoom;
          ctx.beginPath();
          ctx.arc(nx, ny, pr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34,197,94,${0.15 + pulse * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Node fill (OSINT Framework standard style: collapsed = filled, expanded/leaf = hollow)
        const hasChildren = ln.node.children && ln.node.children.length > 0;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "#2d2d2d" : (hasChildren && ln.collapsed ? "#3a3a3a" : "#1a1a1a");
        ctx.fill();


        // Border
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = (isHovered || isSelected) ? 2.5 * zoom : (ln.node.scanStatus === "FOUND" ? 2 * zoom : 1.2 * zoom);
        ctx.stroke();

        // Collapse indicator ring (for category/subcategory with children)
        if (ln.collapsed && ln.node.children && ln.node.children.length > 0) {
          ctx.beginPath();
          ctx.arc(nx, ny, r + 3 * zoom, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(99,102,241,0.5)";
          ctx.setLineDash([3 * zoom, 3 * zoom]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Status dot (bottom-right)
        if (ln.node.scanStatus) {
          const dotColor =
            ln.node.scanStatus === "FOUND"       ? COLORS.found :
            ln.node.scanStatus === "NOT_FOUND"   ? "#64748b" :
            ln.node.scanStatus === "RATE LIMITED"? COLORS.rateLimit :
            ln.node.scanStatus === "PRIVATE"     ? COLORS.private :
            COLORS.error;
          const dr = 4 * zoom;
          const dx = nx + r * 0.7;
          const dy = ny - r * 0.7;
          ctx.beginPath();
          ctx.arc(dx, dy, dr, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }

        // Label
        if (zoom > 0.4) {
          const fontSize = Math.max(8,
            ln.node.type === "root"     ? 13 * zoom :
            ln.node.type === "category" ? 10 * zoom : 8 * zoom
          );
          ctx.font = `${ln.node.type === "root" || ln.node.type === "category" ? "600" : "400"} ${fontSize}px 'Inter', system-ui, sans-serif`;
          ctx.textAlign = ln.node.type === "root" ? "center" : (ln.angle > Math.PI / 2 && ln.angle < (3 * Math.PI) / 2) ? "right" : "left";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isHighlighted ? COLORS.searchHighlight :
            isHovered ? "#e2e8f0" : col.text;

          const labelOffset = (r + 5 * zoom);
          const lx = ln.node.type === "root" ? nx :
            ctx.textAlign === "right" ? nx - labelOffset : nx + labelOffset;
          const ly = ln.node.type === "root" ? ny + r + fontSize + 2 : ny;

          // Text shadow
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 4;
          ctx.fillText(ln.node.label, lx, ly);
          ctx.shadowBlur = 0;
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [layoutNodes, hovered, selected, zoom, pan, size, searchHighlightIds]);

  // Mouse events
  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    if (dragging) {
      setPan({ x: pan.x + (x - dragStart.x), y: pan.y + (y - dragStart.y) });
      setDragStart({ x, y, px: pan.x, py: pan.y });
    } else {
      const hit = hitTest(x, y, layoutNodes);
      setHovered(hit);
      if (canvasRef.current) canvasRef.current.style.cursor = hit ? "pointer" : "grab";
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    setDragging(true);
    setDragStart({ x, y, px: pan.x, py: pan.y });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    if (!dragging) return;
    setDragging(false);
    const moved = Math.abs(x - dragStart.x) + Math.abs(y - dragStart.y);
    if (moved < 5) {
      const hit = hitTest(x, y, layoutNodes);
      if (hit) {
        setSelected(s => s?.node.id === hit.node.id ? null : hit);
        // Toggle collapse for non-leaf nodes
        if (hit.node.children && hit.node.children.length > 0) {
          setCollapsed(c => {
            const next = new Set(c);
            next.has(hit.node.id) ? next.delete(hit.node.id) : next.add(hit.node.id);
            return next;
          });
        } else if (hit.node.url) {
          window.open(hit.node.url, "_blank", "noopener");
        }
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.25, Math.min(3, z * delta)));
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const collapseAll = () => {
    const ids = new Set<string>();
    layoutNodes.forEach(ln => { if (ln.node.type === "category" || ln.node.type === "subcategory") ids.add(ln.node.id); });
    setCollapsed(ids);
  };
  const expandAll = () => setCollapsed(new Set());

  const foundCount = layoutNodes.filter(ln => ln.node.scanStatus === "FOUND").length;

  return (
    <div className="flex flex-col h-full bg-[#0a0e1a] rounded-xl overflow-hidden border border-slate-800">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-[#0d1224] shrink-0 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest font-mono">OSINT Framework Graph</span>
          {foundCount > 0 && (
            <span className="text-[9px] bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded px-1.5 py-0.5 font-bold font-mono">
              {foundCount} FOUND
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full pl-6 pr-6 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-600 font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button onClick={() => setZoom(z => Math.max(0.25, z * 0.8))} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={resetView} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Reset view"><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={collapseAll} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[9px] font-bold font-mono transition-colors">Collapse all</button>
          <button onClick={expandAll}   className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[9px] font-bold font-mono transition-colors">Expand all</button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b border-slate-800/50 bg-[#0d1224]/50 shrink-0">
        {[
          { color: "#22c55e", label: "FOUND" },
          { color: "#64748b", label: "NOT FOUND" },
          { color: "#f59e0b", label: "ERROR" },
          { color: "#6366f1", label: "RATE LIMITED" },
          { color: "#ec4899", label: "PRIVATE" },
          { color: "#7c3aed", label: "Category" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[9px] text-slate-500 font-mono">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px] text-slate-600 font-mono">Scroll to zoom · Drag to pan · Click to expand/open</span>
      </div>

      {/* ── Graph canvas ── */}
      <div ref={containerRef} className="relative flex-1 min-h-[560px]">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          style={{ width: "100%", height: "100%", cursor: dragging ? "grabbing" : "grab" }}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDragging(false); setHovered(null); }}
          onWheel={onWheel}
        />

        {/* Hover tooltip */}
        {hovered && !dragging && (
          <div
            className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 rounded-xl px-3 py-2.5 shadow-2xl max-w-[220px] backdrop-blur-sm z-10"
            style={{
              left: Math.min(
                ((hovered.x - size.w / 2) * zoom + size.w / 2 + pan.x) + 20,
                size.w - 240
              ),
              top: Math.max(8, (hovered.y - size.h / 2) * zoom + size.h / 2 + pan.y - 40),
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: hovered.node.scanStatus === "FOUND" ? "#22c55e" : hovered.node.type === "root" ? "#7c3aed" : "#6366f1" }}
              />
              <span className="text-[11px] font-bold text-slate-200 font-mono">{hovered.node.label}</span>
              {hovered.node.scanStatus && (
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                  hovered.node.scanStatus === "FOUND" ? "bg-emerald-900 text-emerald-400" :
                  hovered.node.scanStatus === "ERROR" ? "bg-amber-900 text-amber-400" :
                  "bg-slate-800 text-slate-400"
                }`}>{hovered.node.scanStatus}</span>
              )}
            </div>
            {hovered.node.description && (
              <p className="text-[9px] text-slate-400 font-sans leading-relaxed">{hovered.node.description}</p>
            )}
            {hovered.node.url && (
              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-violet-400 font-mono">
                <ExternalLink className="w-2.5 h-2.5" />
                <span className="truncate">{hovered.node.url.replace("https://", "")}</span>
              </div>
            )}
            {hovered.node.children && hovered.node.children.length > 0 && (
              <p className="text-[8px] text-slate-600 mt-1">
                {hovered.collapsed ? `▶ ${hovered.node.children.length} children hidden` : `Click to collapse`}
              </p>
            )}
          </div>
        )}

        {/* Selected node detail panel */}
        {selected && (
          <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-700 rounded-xl p-4 w-64 shadow-2xl backdrop-blur-sm z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: selected.node.type === "root" ? "#7c3aed" : "#6366f1" }} />
                <span className="text-[12px] font-bold text-slate-200 font-mono">{selected.node.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selected.node.scanStatus && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono mb-2 ${
                selected.node.scanStatus === "FOUND" ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800" :
                selected.node.scanStatus === "ERROR" ? "bg-amber-900/50 text-amber-400 border border-amber-800" :
                "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
                <Circle className="w-2 h-2 fill-current" />
                {selected.node.scanStatus}
              </div>
            )}

            {selected.node.description && (
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed mb-3">{selected.node.description}</p>
            )}

            {selected.node.url && (
              <a
                href={selected.node.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-900/40 hover:bg-violet-900/60 border border-violet-800 rounded-lg text-[10px] text-violet-300 font-bold font-mono transition-colors w-full"
              >
                <ExternalLink className="w-3 h-3" />
                Open Tool →
              </a>
            )}

            {selected.node.children && selected.node.children.length > 0 && (
              <p className="text-[9px] text-slate-600 mt-2 font-mono">
                {collapsed.has(selected.node.id)
                  ? `▶ ${selected.node.children.length} items collapsed — click node to expand`
                  : `▼ ${selected.node.children.length} items visible`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
