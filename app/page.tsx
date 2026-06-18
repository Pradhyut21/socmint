import React, { Suspense } from "react";
import InvestigatePage from "./InvestigatePageClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-muted-foreground animate-pulse">Loading tactical portal...</div>}>
      <InvestigatePage />
    </Suspense>
  );
}
