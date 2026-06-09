"use client";

import React, { useState, useEffect } from "react";
import { SuspectProfile, NexusAnalysis } from "../lib/types";
import { Bot, Send, Sparkles, Activity, AlertTriangle } from "lucide-react";

interface AiChatProps {
  suspect: SuspectProfile;
}

const QUESTION_CHIPS = [
  "Who are the confirmed alias accounts?",
  "What is the evasion pattern?",
  "Any legal cases found?",
  "Where was the suspect recently active?",
  "Who are the key associates?",
  "Prepare senior officer briefing",
];

export default function AiChat({ suspect }: AiChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const nexusAnalysis = suspect.nexusAnalysis;
  const nexusLoading = !nexusAnalysis;

  const ask = async (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    setQuestion(trimmed);
    setLoading(true);
    setAnswer(""); // Reset answer for typewriter effect

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, profile: suspect }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      // Stream the response with typewriter effect
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let text = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });

        // The chunkValue from NVIDIA's stream is in server-sent events format
        // E.g., data: {"id":"...","choices":[{"delta":{"content":"..."}}]}
        const lines = chunkValue.split("\n").filter(line => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || "";
              text += content;
              setAnswer(text); // Typewriter update
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch (e) {
      setAnswer("AI route is unreachable. Check that the Next.js server is running and NVIDIA API key is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* NEXUS Auto-Analysis Card */}
      <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500 glow-blue"></div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
            NEXUS Analysis
          </h4>
        </div>
        
        {nexusLoading ? (
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Connecting dots automatically...
          </div>
        ) : nexusAnalysis ? (
          <div className="space-y-4 font-mono text-xs text-slate-300">
            <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl">
              <span className="text-blue-400 font-bold block mb-1">Key Finding:</span>
              <p className="leading-relaxed">{nexusAnalysis.key_finding}</p>
            </div>

            {nexusAnalysis.connected_signals?.length > 0 && (
              <div>
                <span className="text-slate-500 uppercase block mb-2 text-[10px]">Connected Signals</span>
                <ul className="list-disc pl-4 space-y-2">
                  {nexusAnalysis.connected_signals.map((sig, idx) => (
                    <li key={idx}>
                      <span className="text-white">{sig.signal1}</span> ↔ <span className="text-white">{sig.signal2}</span>
                      <p className="text-[10px] text-blue-300 mt-0.5">{sig.connection}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {nexusAnalysis.anomalies?.length > 0 && (
              <div>
                <span className="text-slate-500 uppercase block mb-2 text-[10px]">Anomalies</span>
                <ul className="space-y-2">
                  {nexusAnalysis.anomalies.map((ano, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${ano.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}`} />
                      <span>{ano.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800">
              <span className="text-amber-400 font-bold block mb-1 text-[10px] uppercase">Investigator Priority:</span>
              <p>{nexusAnalysis.investigator_priority}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono">Analysis data unavailable.</div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
              NVIDIA AI Evidence Chat
            </h4>
          </div>
          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            LIVE CONTEXT ONLY
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => ask(chip)}
              className="text-[10px] px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 hover:border-blue-500/40 font-mono"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
          className="relative"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about aliases, timeline, risk, or legal links..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-blue-500/50 outline-none text-white text-xs font-mono placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 min-h-[96px] bg-slate-950/40 border border-slate-900 rounded-xl p-4">
          {loading && !answer ? (
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Contacting NVIDIA NIM with the live evidence context...
            </div>
          ) : (
            <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {answer || "Ask a question after the sweep. The model receives only the current dossier, not stored suspect data."}
              {loading && answer && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-400 animate-pulse" />}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
