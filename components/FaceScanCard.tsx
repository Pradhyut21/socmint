"use client";

import React, { useState, useEffect, useRef } from "react";
import { SuspectProfile } from "../lib/types";
import {
  Search, ExternalLink, Upload, Image as ImageIcon,
  Link2, ImageOff, Info,
} from "lucide-react";

interface FaceScanCardProps {
  suspect: SuspectProfile;
}

/** Proxy CDN images through the server to bypass CORS restrictions
 *  (Instagram scontent-*, Facebook CDN, etc. block browser-direct fetches) */
function proxyUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  // Don't proxy GitHub/YouTube avatars — they allow CORS and don't expire
  if (/avatars\.githubusercontent\.com|yt3\.googleusercontent\.com/i.test(url)) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/** For Instagram/Threads CDN (scontent-*), fetch a fresh URL via Instagram oembed */
async function refreshInstagramUrl(username: string): Promise<string | null> {
  try {
    // Instagram's public oembed returns the current profile pic URL
    const r = await fetch(`/api/image-proxy?url=${encodeURIComponent(`https://www.instagram.com/${username}/?__a=1&__d=1`)}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const text = await r.text();
    const m = text.match(/"profile_pic_url_hd":"([^"]+)"/);
    if (!m) return null;
    return m[1].replace(/\\u0026/g, "&");
  } catch { return null; }
}

/** Build reverse-image-search URLs for each engine */
function reverseSearchUrls(url: string) {
  const enc = encodeURIComponent(url);
  return [
    { label: "Google Lens", icon: "🔍", url: `https://lens.google.com/uploadbyurl?url=${enc}` },
    { label: "Bing Visual", icon: "🅱", url: `https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIIDP&sbisrc=ImgDropper&q=imgurl:${enc}` },
    { label: "Yandex", icon: "🔶", url: `https://yandex.com/images/search?source=collections&rpt=imageview&url=${enc}` },
    { label: "TinEye", icon: "👁", url: `https://tineye.com/search?url=${enc}` },
  ];
}

/** Collect all unique, non-generated profile photos from accounts */
function collectProfilePhotos(suspect: SuspectProfile) {
  const seen = new Set<string>();
  const photos: { platform: string; username: string; url: string }[] = [];
  for (const acc of suspect.accounts || []) {
    const url = acc.profilePicUrl;
    if (!url || /ui-avatars\.com/i.test(url) || seen.has(url)) continue;
    seen.add(url);
    photos.push({ platform: acc.platform, username: acc.username, url });
  }
  // Also include the primary photo if not already present
  if (suspect.photoUrl && !seen.has(suspect.photoUrl) && !/ui-avatars\.com/i.test(suspect.photoUrl)) {
    photos.unshift({ platform: "primary", username: suspect.username, url: suspect.photoUrl });
  }
  return photos;
}

/** Parse real EXIF from an uploaded local image file using exifr */
async function parseExif(file: File): Promise<Record<string, any> | null> {
  try {
    const { default: exifr } = await import("exifr");
    const data = await exifr.parse(file, {
      pick: ["Make", "Model", "Software", "DateTimeOriginal", "GPSLatitude", "GPSLongitude", "GPSAltitude", "ImageWidth", "ImageHeight", "Orientation", "LensModel", "FNumber", "ExposureTime", "ISO"],
    });
    return data || null;
  } catch {
    return null;
  }
}

export default function FaceScanCard({ suspect }: FaceScanCardProps) {
  const photos = collectProfilePhotos(suspect);
  const [selected, setSelected] = useState(photos[0] || null);
  const [imgDimensions, setImgDimensions] = useState<string | null>(null);
  const [exifData, setExifData] = useState<Record<string, any> | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolved photo URLs — start with cached, auto-refresh expired Instagram/Threads CDN
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const instagramPhotos = photos.filter(ph =>
      /cdninstagram|fbcdn|scontent/i.test(ph.url) &&
      (ph.platform === "instagram" || ph.platform === "threads")
    );
    if (instagramPhotos.length === 0) return;

    instagramPhotos.forEach(async (ph) => {
      // Test if the cached URL is still valid via proxy
      try {
        const testResp = await fetch(proxyUrl(ph.url), { method: "HEAD", signal: AbortSignal.timeout(4000) });
        if (testResp.ok) return; // still valid — no refresh needed
      } catch { /* expired, try to refresh */ }

      // Try to get a fresh URL
      const freshUrl = await refreshInstagramUrl(ph.username);
      if (freshUrl) {
        setResolvedUrls(prev => ({ ...prev, [ph.url]: freshUrl }));
      }
    });
  }, [photos.map(p => p.url).join(",")]);

  // Get the display URL for a photo (use refreshed if available)
  const displayUrl = (ph: { url: string }) => proxyUrl(resolvedUrls[ph.url] || ph.url);
  useEffect(() => {
    setImgDimensions(null);
    const url = uploadUrl || selected?.url;
    if (!url) return;
    const img = new window.Image();
    img.onload = () => setImgDimensions(`${img.naturalWidth} × ${img.naturalHeight} px`);
    img.onerror = () => setImgDimensions(null);
    img.src = url;
  }, [selected, uploadUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setUploadUrl(blobUrl);
    setUploadName(file.name);
    setExifData(null);
    const parsed = await parseExif(file);
    setExifData(parsed);
  };

  const activeUrl = uploadUrl || selected?.url || "";
  // For reverse image search we need the original (non-proxied) URL
  const searchUrls = activeUrl && !uploadUrl ? reverseSearchUrls(activeUrl) : uploadUrl ? reverseSearchUrls(uploadUrl) : [];

  // Photo clusters from identity correlation
  const clusters = suspect.identityCorrelation?.photoClusters || [];
  const selectedInCluster = selected
    ? clusters.find(c => c.accounts.some(a => a.includes(selected.platform)))
    : null;

  return (
    <div className="space-y-6 font-mono text-xs text-forest">

      {/* ── Row 1: photo grid + active photo ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Left: discovered profile photos */}
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Discovered Profile Photos ({photos.length})
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-stamp/30 bg-stamp/5 px-2.5 py-1.5 text-[10px] font-bold text-stamp hover:bg-stamp/10 transition-colors"
            >
              <Upload className="h-3 w-3" /> Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <ImageOff className="h-8 w-8 opacity-40" />
              <span className="text-[11px]">No profile photos discovered yet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((ph, i) => (
                <button
                  key={i}
                  onClick={() => { setSelected(ph); setUploadUrl(null); setUploadName(null); setExifData(null); }}
                  className={`relative group border-2 transition-colors ${selected?.url === ph.url && !uploadUrl ? "border-stamp" : "border-border hover:border-stamp/40"}`}
                >
                  <img
                    src={displayUrl(ph)}
                    alt={ph.username}
                    className="w-full aspect-square object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-forest/70 text-ivory text-[8px] font-bold px-1 py-0.5 truncate uppercase">
                    {ph.platform}
                  </span>
                  {/* Photo cluster badge */}
                  {clusters.some(c => c.accounts.some(a => a.includes(ph.platform))) && (
                    <span className="absolute top-1 right-1 bg-stamp text-ivory text-[7px] font-bold px-1 py-0.5">
                      CLUSTER
                    </span>
                  )}
                </button>
              ))}
              {/* Uploaded image slot */}
              {uploadUrl && (
                <div className="relative border-2 border-ember">
                  <img src={uploadUrl} alt="Uploaded" className="w-full aspect-square object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-ember/80 text-ivory text-[8px] font-bold px-1 py-0.5 truncate">
                    UPLOADED
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Photo hash cluster result */}
          {clusters.length > 0 && (
            <div className="border border-stamp/30 bg-stamp/5 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-stamp uppercase">
                <Link2 className="h-3 w-3" /> Same-photo clusters detected
              </div>
              {clusters.map((c, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">
                  Cluster {i + 1}: {c.accounts.map(a => a.split(":")[0]).join(", ")} — same avatar
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Right: active photo + reverse search */}
        <div className="border border-border bg-card p-4 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {uploadUrl ? `Uploaded: ${uploadName}` : selected ? `${selected.platform.toUpperCase()} · @${selected.username}` : "No photo selected"}
          </div>

          {activeUrl ? (
            <img
              src={proxyUrl(activeUrl)}
              alt="Active"
              className="w-full max-h-52 object-contain border border-border bg-paper"
            />
          ) : (
            <div className="flex items-center justify-center h-48 border border-dashed border-border text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-30" />
            </div>
          )}

          {imgDimensions && (
            <p className="text-[10px] text-muted-foreground">Dimensions: <span className="font-bold text-forest">{imgDimensions}</span></p>
          )}

          {/* Reverse image search buttons */}
          {searchUrls.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Reverse Image Search
              </div>
              <div className="grid grid-cols-2 gap-2">
                {searchUrls.map(s => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 border border-border bg-paper px-3 py-2 text-[11px] font-bold text-forest hover:border-stamp/50 hover:bg-stamp/5 transition-colors"
                  >
                    <span>{s.icon}</span>
                    {s.label}
                    <ExternalLink className="h-2.5 w-2.5 ml-auto text-muted-foreground" />
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Each link opens the selected photo in the respective reverse-image engine. Results may surface where this photo has been posted online.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: expired URL warning for CDN images ───────────────────────── */}
      {photos.some(ph => /cdninstagram|fbcdn|scontent/i.test(ph.url)) && (
        <div className="border border-stamp/25 bg-stamp/5 p-3 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 text-stamp mt-0.5" />
          <span>
            Instagram and Threads photos use <strong className="text-forest">signed expiring CDN URLs</strong> — they are valid for a few hours after the sweep. If thumbnails appear blank, re-run the investigation to get fresh URLs. GitHub and YouTube photos load permanently.
          </span>
        </div>
      )}

    </div>
  );
}
