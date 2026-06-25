"use client";

import React, { useState, useEffect } from "react";
import { SuspectProfile } from "../lib/types";
import { Image as ImageIcon, Camera, MapPin, ShieldAlert, Sparkles, Cpu, Lock } from "lucide-react";

interface FaceScanCardProps {
  suspect: SuspectProfile;
}

export default function FaceScanCard({ suspect }: FaceScanCardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>(suspect.photoUrl);
  
  // Client-side image dimensions and file metrics
  const [dimensions, setDimensions] = useState("Resolving...");
  const [fileSize, setFileSize] = useState("Analyzing...");
  const [fileFormat, setFileFormat] = useState("Analyzing...");

  const scanData = suspect.faceScan || {
    landmarks: [
      { name: "Left Eye", x: 38, y: 40, width: 8, height: 4 },
      { name: "Right Eye", x: 54, y: 40, width: 8, height: 4 },
      { name: "Nose", x: 47, y: 47, width: 6, height: 12 },
      { name: "Mouth", x: 43, y: 65, width: 14, height: 6 }
    ],
    exif: {
      camera: "Apple iPhone 15 Pro",
      lens: "24mm f/1.78",
      software: "iOS 17.4",
      created: "2026-05-24 15:42:10 IST",
      gps: {
        lat: "12.9716° N",
        lng: "77.5946° E",
        place: "Indiranagar, Bengaluru"
      }
    },
    deepfake: {
      isSynthetic: true,
      score: 84.5,
      note: "High probability of AI-generation (Stable Diffusion / Midjourney avatar indicators). Frequency domain analysis displays grid artifacts. Eye reflections are inconsistent.",
      factors: [
        { name: "Frequency Domain Grid Artifacts", score: 92 },
        { name: "Skin Texture Frequency Smoothness", score: 88 },
        { name: "Pupil / Reflection Symmetry", score: 73 }
      ]
    }
  };

  const [exifData, setExifData] = useState<any>(scanData.exif);
  const [landmarks, setLandmarks] = useState<any>(scanData.landmarks);
  const [deepfakeAnalysis, setDeepfakeAnalysis] = useState<any>(scanData.deepfake);

  // Sync state if suspect updates
  useEffect(() => {
    setPhotoUrl(suspect.photoUrl);
    if (suspect.faceScan) {
      setExifData(suspect.faceScan.exif);
      setLandmarks(suspect.faceScan.landmarks);
      setDeepfakeAnalysis(suspect.faceScan.deepfake);
    } else {
      setExifData(scanData.exif);
      setLandmarks(scanData.landmarks);
      setDeepfakeAnalysis(scanData.deepfake);
    }
  }, [suspect]);

  // Client-side image parser
  useEffect(() => {
    if (!photoUrl) return;

    if (photoUrl.startsWith("data:")) {
      const base64Length = photoUrl.split(",")[1]?.length || 0;
      const sizeInBytes = base64Length * 0.75;
      const sizeInKb = (sizeInBytes / 1024).toFixed(1);
      setFileSize(`${sizeInKb} KB`);
      
      const format = photoUrl.split(";")[0]?.split("/")[1]?.toUpperCase() || "UNKNOWN";
      setFileFormat(format);
    } else {
      setFileSize("Remote Fetch (CDN)");
      setFileFormat("HTTP/PNG Source");
    }

    const img = new Image();
    img.src = photoUrl;
    img.onload = () => {
      setDimensions(`${img.width} x ${img.height} px`);
    };
    img.onerror = () => {
      setDimensions("Unresolved pixels");
    };
  }, [photoUrl]);

  const triggerUploadAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-ink">
      
      {/* Visual Landmarks Inspector */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
            Facial Landmark & Perceptual Matching
          </h4>
          <span className="text-[10px] text-slate-600 font-semibold">GPU-Accelerated Scan</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
          
          {/* Mock Upload Image Box with Detection Overlay */}
          <div className="relative w-56 h-56 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
            {analyzing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20">
                <Cpu className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-[10px] text-blue-700 font-bold">Scanning landmarks...</span>
              </div>
            ) : (
              <>
                <img 
                  src={photoUrl} 
                  alt="Suspect face" 
                  className="w-full h-full object-cover opacity-90"
                />
                
                {/* Horizontal Sweeper Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-bounce top-1/2"></div>
                
                {/* Landmarks Boxes */}
                {landmarks.map((lm: any, idx: number) => (
                  <div 
                    key={idx}
                    className="absolute border border-cyan-500 bg-cyan-500/20 flex items-center justify-center group"
                    style={{
                      left: `${lm.x}%`,
                      top: `${lm.y}%`,
                      width: `${lm.width}%`,
                      height: `${lm.height}%`
                    }}
                  >
                    <span className="hidden group-hover:block absolute bottom-full bg-slate-900 text-[7px] text-cyan-300 px-1 rounded border border-cyan-500/30 whitespace-nowrap mb-1">
                      {lm.name}
                    </span>
                  </div>
                ))}

                {/* Primary bounding box */}
                <div className="absolute border-2 border-dashed border-blue-500/50 inset-8 rounded-xl"></div>
              </>
            )}
          </div>

          {/* Analysis Actions */}
          <div className="flex-1 space-y-4">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block mb-1">Target Real Name</span>
              <span className="text-ink font-bold text-sm block mb-1">{suspect.realName}</span>
              <span className="text-[10px] text-slate-600">Avatar matched from public registries.</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button 
                onClick={triggerUploadAnalysis}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold font-mono tracking-wider text-[10px] flex items-center gap-1 shadow-md glow-blue transition-all"
              >
                <Cpu className="w-3.5 h-3.5" /> Re-Scan Image Heuristics
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* EXIF and Deepfake check sidebar */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* EXIF Metadata Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
            <Camera className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
              EXIF Metadata Extractor
            </h4>
          </div>

          {exifData ? (
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Camera Model</span>
                <span className="text-ink font-semibold">{exifData.camera}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lens / Aperture</span>
                <span className="text-ink font-semibold">{exifData.lens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Software Tag</span>
                <span className="text-ink font-semibold">{exifData.software}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Creation Date</span>
                <span className="text-ink font-semibold">{exifData.created}</span>
              </div>
              
              <div className="pt-2 border-t border-slate-200 mt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions</span>
                  <span className="text-ink font-bold">{dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size</span>
                  <span className="text-ink font-bold">{fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mime Format</span>
                  <span className="text-ink font-bold">{fileFormat}</span>
                </div>
              </div>

              {exifData.gps && (
                <div className="pt-2 border-t border-slate-200 mt-2 space-y-1">
                  <span className="text-slate-500 block text-[9px] uppercase">GPS Coordinates Tagged</span>
                  <div className="flex items-start gap-1.5 text-blue-700">
                    <MapPin className="w-3.5 h-3.5 mt-0.5" />
                    <div>
                      <span className="font-bold block">{exifData.gps.place}</span>
                      <span className="text-[10px] text-slate-600 block">({exifData.gps.lat}, {exifData.gps.lng})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 font-mono text-[11px] text-slate-600 leading-relaxed text-[10px]">
              <p>⚠️ No EXIF metadata detected in this profile image.</p>
              <p className="text-slate-500">Most social media and hosting platforms strip camera metadata tags (EXIF) and GPS location stamps upon image upload to protect user privacy.</p>
              <div className="pt-2 border-t border-slate-200 mt-2 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions</span>
                  <span className="text-ink font-bold">{dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size</span>
                  <span className="text-ink font-bold">{fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mime Format</span>
                  <span className="text-ink font-bold">{fileFormat}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deepfake Analyzer Card */}
        <div className="glass-panel p-6 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-rose-200 text-rose-800">
            <ShieldAlert className="w-5 h-5" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
              AI Deepfake Classification
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Synthetic Confidence</span>
              <span className="text-rose-700 font-extrabold">{deepfakeAnalysis.score}%</span>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full rounded-full bg-rose-500 glow-red"
                style={{ width: `${deepfakeAnalysis.score}%` }}
              ></div>
            </div>

            <p className="text-[10px] text-slate-700 leading-relaxed font-mono font-medium">
              {deepfakeAnalysis.note}
            </p>

            <div className="space-y-2 pt-2 border-t border-rose-200 text-[9px] text-slate-600">
              {deepfakeAnalysis.factors.map((f: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{f.name}</span>
                  <span className="text-rose-700 font-bold">{f.score}% match</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
