import React from "react";

interface SkeletonLoaderProps {
  variant?: "card" | "text" | "chart" | "list";
  lines?: number;
  className?: string;
}

export default function SkeletonLoader({ variant = "text", lines = 3, className = "" }: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <div className={`p-4 bg-slate-950/40 border border-slate-900 rounded-xl animate-pulse ${className}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="h-4 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-16"></div>
        </div>
        <div className="h-3 bg-slate-800 rounded w-1/4 mb-3"></div>
        <div className="space-y-2 mb-4">
          <div className="h-2 bg-slate-800 rounded w-full"></div>
          <div className="h-2 bg-slate-800 rounded w-5/6"></div>
        </div>
        <div className="pt-2 border-t border-slate-900 flex justify-between">
          <div className="h-3 bg-slate-800 rounded w-1/4"></div>
          <div className="h-3 bg-slate-800 rounded w-1/5"></div>
        </div>
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`p-6 bg-slate-950/40 border border-slate-900 rounded-2xl animate-pulse ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        </div>
        <div className="flex justify-center items-center py-6">
          <div className="w-32 h-32 rounded-full border-8 border-slate-900 border-t-slate-800 flex items-center justify-center">
            <div className="h-4 bg-slate-800 rounded w-12"></div>
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="h-2.5 bg-slate-800 rounded w-full"></div>
          <div className="h-2 bg-slate-800 rounded w-2/3 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`space-y-4 animate-pulse ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 w-2/3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0"></div>
              <div className="space-y-2 w-full">
                <div className="h-3 bg-slate-800 rounded w-1/3"></div>
                <div className="h-2 bg-slate-800 rounded w-2/3"></div>
              </div>
            </div>
            <div className="h-4 bg-slate-800 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  // default variant = text
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-slate-800 rounded"
          style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }}
        ></div>
      ))}
    </div>
  );
}
