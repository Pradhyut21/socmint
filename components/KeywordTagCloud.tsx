"use client";

import React, { useMemo } from "react";
import type { PlatformAccount } from "@/lib/types";

interface KeywordTagCloudProps {
  accounts: PlatformAccount[];
  realName?: string;
}

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are",
  "was","were","be","been","being","have","has","had","do","does","did","will","would","could",
  "should","may","might","not","no","nor","so","yet","both","either","neither","i","you","he","she",
  "it","we","they","me","him","her","us","them","my","your","his","its","our","their","this","that",
  "these","those","here","there","when","where","who","which","what","how","all","each","every",
  "both","few","more","most","other","some","such","into","through","during","before","after","above",
  "below","between","out","off","over","under","again","then","once","am","about","profile","public",
  "found","account","just","also","new","now","very","only","well","than","even","too","via","per",
  "work","works","working","follow","official","contact",
]);

export function KeywordTagCloud({ accounts, realName }: KeywordTagCloudProps) {
  const tags = useMemo(() => {
    const freq: Record<string, number> = {};

    const addText = (text: string | null | undefined, boost = 1) => {
      if (!text) return;
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9#@\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
      for (const w of words) {
        freq[w] = (freq[w] || 0) + boost;
      }
    };

    // Higher weight for headlines/job titles
    for (const acc of accounts) {
      addText(acc.bio, 1);
      addText((acc as any).headline, 2);
      addText((acc as any).jobTitle, 2);
      addText(acc.company, 2);
      addText(acc.education, 1.5);
      addText(acc.displayName, 1);
    }

    addText(realName, 1);

    return Object.entries(freq)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));
  }, [accounts, realName]);

  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map(t => t.count));
  const minCount = Math.min(...tags.map(t => t.count));

  const fontSize = (count: number) => {
    const t = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
    return Math.round(10 + t * 14); // 10px–24px
  };

  const palette = [
    "#38bdf8","#818cf8","#34d399","#fb923c","#f472b6",
    "#a78bfa","#4ade80","#fbbf24","#60a5fa","#f87171",
  ];

  return (
    <div
      className="flex flex-wrap gap-2 items-center justify-center p-4 rounded-lg border border-border bg-card/50"
      aria-label="Keyword fingerprint tag cloud"
    >
      {tags.map(({ word, count }, i) => (
        <span
          key={word}
          title={`Frequency: ${count.toFixed(1)}`}
          style={{
            fontSize: fontSize(count),
            color: palette[i % palette.length],
            fontWeight: count > maxCount * 0.7 ? 700 : count > maxCount * 0.4 ? 600 : 400,
            opacity: 0.7 + 0.3 * ((count - minCount) / Math.max(1, maxCount - minCount)),
            transition: "transform 0.15s ease",
            cursor: "default",
          }}
          className="hover:scale-110 inline-block"
        >
          {word}
        </span>
      ))}
    </div>
  );
}
