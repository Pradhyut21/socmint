"use client";

import React, { useState } from "react";
import { SuspectProfile, AliasResult, PlatformAccount } from "../lib/types";
import { ShieldAlert, Info, Clock, AlertTriangle } from "lucide-react";

interface EvasionTimelineProps {
  suspect: SuspectProfile;
}

export default function EvasionTimeline({ suspect }: EvasionTimelineProps) {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Group accounts and alias results by creation date or estimated date
  const timelineNodes: any[] = [];
  
  // 1. Add Original account (assuming the oldest one or the primary query)
  const sortedAccounts = [...suspect.accounts].sort((a, b) => {
    const dateA = a.creationDate ? new Date(a.creationDate).getTime() : 0;
    const dateB = b.creationDate ? new Date(b.creationDate).getTime() : 0;
    return dateA - dateB;
  });
  
  const originalAccount = sortedAccounts[0];
  if (originalAccount) {
    timelineNodes.push({
      id: "orig",
      type: "original",
      title: `@${originalAccount.username} created`,
      subtitle: originalAccount.platform,
      date: originalAccount.creationDate
        ? new Date(originalAccount.creationDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : "Unknown Date",
      status: "active — potential fraud activity",
      account: originalAccount,
      color: "blue"
    });
  }

  // 2. Add complaints (from legal records)
  const complaints = suspect.legalRecords.filter(r => 
    (r.recordType === "Court Case" || r.recordType === "Court Judgment") &&
    r.status !== "LIVE SEARCH LINK" &&
    r.status !== "PUBLIC PORTAL VERIFICATION REQUIRED"
  );
  complaints.forEach((comp, idx) => {
    timelineNodes.push({
      id: `comp_${idx}`,
      type: "complaint",
      title: "Complaint filed",
      subtitle: comp.title,
      date: new Date(comp.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      record: comp,
      color: "red"
    });
  });

  // 3. Add Alias accounts
  suspect.aliasResults?.forEach((alias, idx) => {
    if (alias.evasionPattern) {
      timelineNodes.push({
        id: `alias_${idx}`,
        type: "alias",
        title: `@${alias.handle} CREATED`,
        subtitle: `${alias.confidenceLevel} ALIAS — ${alias.confidence}%`,
        date: alias.createdAt
          ? new Date(alias.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
          : "Estimated",
        reason: alias.evasionReason || "(same fraud, new account)",
        alias: alias,
        color: "orange"
      });
    }
  });

  // Sort nodes by date chronologically
  timelineNodes.sort((a, b) => {
    const getTimestamp = (node: any) => {
      let dateStr = "";
      if (node.type === "original" && node.account?.creationDate) {
        dateStr = node.account.creationDate;
      } else if (node.type === "complaint" && node.record?.date) {
        dateStr = node.record.date;
      } else if (node.type === "alias" && node.alias?.createdAt) {
        dateStr = node.alias.createdAt;
      }
      return dateStr ? new Date(dateStr).getTime() : 0;
    };
    return getTimestamp(a) - getTimestamp(b);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
                Account Evasion Pattern Detected
              </h4>
              <span className="text-xs text-slate-600 font-semibold font-mono">
                Temporal correlation between legal reports and new account creation
              </span>
            </div>
          </div>

          <div className="relative pl-6 border-l-2 border-dashed border-rose-300 space-y-8 font-mono pb-8">
            {/* Hardcoded demo flow based on instructions if nodes are empty, else render dynamic */}
            {timelineNodes.length === 0 ? (
              <div className="text-xs text-slate-600 font-medium">No evasion timeline data available.</div>
            ) : (
              timelineNodes.map((node, index) => (
                <div key={node.id} className="relative cursor-pointer group" onClick={() => setSelectedNode(node)}>
                  {/* Node Dot */}
                  <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    node.color === "blue" ? "bg-blue-500" :
                    node.color === "red" ? "bg-rose-500" : "bg-orange-500"
                  } group-hover:scale-125 transition-transform`} />
                  
                  <div className={`p-4 rounded-xl border transition-all shadow-sm ${
                    node.color === "blue" ? "bg-blue-50/50 border-blue-200 hover:border-blue-300 hover:bg-white" :
                    node.color === "red" ? "bg-rose-50/50 border-rose-200 hover:border-rose-300 hover:bg-white" : 
                    "bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:bg-white"
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <h5 className={`text-xs font-bold uppercase ${
                        node.color === "blue" ? "text-blue-750" :
                        node.color === "red" ? "text-rose-700" : "text-amber-800"
                      }`}>
                        {node.title}
                      </h5>
                      <span className="text-[10px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{node.date}</span>
                    </div>
                    
                    {node.subtitle && <p className="text-[11px] text-ink font-bold mb-2">{node.subtitle}</p>}
                    
                    {node.color === "blue" && (
                      <p className="text-[10px] text-slate-700 font-medium">({node.status})</p>
                    )}
                    {node.color === "orange" && (
                      <p className="text-[10px] text-slate-700 font-medium">{node.reason}</p>
                    )}
                  </div>

                  {/* Gap connection text */}
                  {index < timelineNodes.length - 1 && node.color === "red" && timelineNodes[index+1].color === "orange" && (
                    <div className="absolute -bottom-6 -left-5 text-[9px] text-rose-700 font-bold bg-white border border-rose-250 px-1.5 py-0.5 rounded shadow-sm">
                      ← gap detected
                    </div>
                  )}
                </div>
              ))
            )}
            
            {timelineNodes.length > 0 && (
              <div className="absolute -bottom-2 -left-[30px] flex items-center gap-2">
                <div className="w-3 h-3 border-b-2 border-r-2 border-slate-450 transform rotate-45" />
                <span className="text-[10px] text-slate-600 uppercase font-bold">CURRENTLY ACTIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              Node Details
            </h4>
          </div>

          {selectedNode ? (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block mb-1">Event Type</span>
                <span className="text-ink font-bold text-sm block mb-4 capitalize">{selectedNode.type}</span>

                <span className="text-slate-500 text-[10px] uppercase block mb-1">Details</span>
                <span className="text-blue-750 uppercase font-bold block mb-4">{selectedNode.title}</span>

                <span className="text-slate-500 text-[10px] uppercase block mb-1">Timestamp</span>
                <span className="text-ink font-semibold block mb-4">{selectedNode.date}</span>
                
                {selectedNode.type === "alias" && (
                  <>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">Evasion Context</span>
                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed mb-4">
                      {selectedNode.reason}
                    </p>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">Alias Signals</span>
                    <ul className="text-[10px] text-slate-700 font-medium leading-relaxed list-disc pl-4 space-y-1">
                      {selectedNode.alias?.aliasSignals?.map((sig: string, i: number) => <li key={i}>{sig}</li>)}
                    </ul>
                  </>
                )}

                {selectedNode.type === "complaint" && (
                  <>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">Record Type</span>
                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                      {selectedNode.record?.recordType}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs">
              <Clock className="w-8 h-8 text-slate-500 mb-3 animate-pulse" />
              <p className="text-slate-650 leading-relaxed font-medium">
                Click any node in the evasion timeline to inspect temporal context and signal details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
