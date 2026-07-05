"use client";

import React, { useState, useEffect } from "react";
import { SuspectProfile, NexusAnalysis } from "../lib/types";
import { Bot, Send, Sparkles, Activity, AlertTriangle } from "lucide-react";

interface AiChatProps {
  suspect: SuspectProfile;
}

const QUESTION_CHIPS = [
  "Who are the confirmed alias accounts?",
  "Any shadow profiles found?",
  "Any dark web leaks or logs?",
  "What is the evasion pattern?",
  "Any legal cases found?",
  "Where was the suspect recently active?",
  "Prepare senior officer briefing",
];

export default function AiChat({ suspect }: AiChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    setMessages([]);
    setAnswer("");
    setQuestion("");
  }, [suspect.caseReference]);

  const nexusAnalysis = suspect.nexusAnalysis;
  const nexusLoading = !nexusAnalysis;

  const ask = async (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    setQuestion("");
    setLoading(true);
    setAnswer(""); 

    const updatedMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, profile: suspect, messages: updatedMessages }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const ansText = data.answer || data.error || "No response content.";
        setAnswer(ansText);
        setMessages(prev => [...prev, { role: "assistant", content: ansText }]);
        setLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let text = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });

        const lines = chunkValue.split("\n").filter(line => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || "";
              text += content;
              setAnswer(text);
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch (e) {
      setAnswer("AI route is unreachable. Check that the Next.js server is running and NVIDIA API key is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* NEXUS Auto-Analysis Card */}
      <div className="glass-panel p-6 rounded-2xl border border-blue-200 bg-blue-50/50 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-600 glow-blue"></div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
            NEXUS Analysis
          </h4>
        </div>
        
        {nexusLoading ? (
          <div className="flex items-center gap-2 text-blue-750 text-xs font-mono">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Connecting dots automatically...
          </div>
        ) : nexusAnalysis ? (
          <div className="space-y-4 font-mono text-xs text-slate-800">
            <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm">
              <span className="text-blue-800 font-bold block mb-1">Key Finding:</span>
              <p className="leading-relaxed font-semibold">{nexusAnalysis.key_finding}</p>
            </div>

            {nexusAnalysis.connected_signals?.length > 0 && (
              <div>
                <span className="text-slate-650 font-bold uppercase block mb-2 text-[10px]">Connected Signals</span>
                <ul className="list-disc pl-4 space-y-2">
                  {nexusAnalysis.connected_signals.map((sig, idx) => (
                    <li key={idx}>
                      <span className="text-slate-900 font-bold">{sig.signal1}</span> ↔ <span className="text-slate-900 font-bold">{sig.signal2}</span>
                      <p className="text-[10px] text-blue-800 font-semibold mt-0.5">{sig.connection}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {nexusAnalysis.anomalies?.length > 0 && (
              <div>
                <span className="text-slate-650 font-bold uppercase block mb-2 text-[10px]">Anomalies</span>
                <ul className="space-y-2">
                  {nexusAnalysis.anomalies.map((ano, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${ano.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`} />
                      <span className="font-semibold">{ano.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200">
              <span className="text-amber-800 font-bold block mb-1 text-[10px] uppercase">Investigator Priority:</span>
              <p className="font-semibold">{nexusAnalysis.investigator_priority}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-mono">Analysis data unavailable.</div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              NVIDIA AI Evidence Chat
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setAnswer("");
                }}
                className="text-[9px] text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer"
              >
                Clear Chat
              </button>
            )}
            <span className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
              CONVERSATIONAL RAG MEMORY
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => ask(chip)}
              className="text-[10px] px-2.5 py-1 bg-white border border-slate-200 rounded-md text-blue-600 hover:text-blue-700 hover:border-blue-300 font-bold font-mono shadow-sm transition-all hover:bg-slate-50"
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
            placeholder="Ask follow-ups about aliases, shadow profiles, leaks..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-250 focus:border-blue-300 outline-none text-ink text-xs font-mono placeholder:text-slate-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1.5 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
          {messages.length === 0 && !loading && (
            <p className="text-xs text-slate-500 font-medium font-mono">
              Ask a question after the sweep. The model receives the full conversation history alongside the suspect dossier.
            </p>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                {msg.role === 'user' ? 'Investigating Officer' : 'NEXUS Analyst'}
              </span>
              <div className={`text-xs font-mono leading-relaxed p-3 rounded-xl max-w-[85%] whitespace-pre-wrap font-medium shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col space-y-1 items-start">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                NEXUS Analyst
              </span>
              <div className="text-xs font-mono leading-relaxed p-3 rounded-xl bg-white border border-slate-200 text-slate-800 max-w-[85%] shadow-sm">
                {!answer ? (
                  <div className="flex items-center gap-2 text-blue-800 font-bold">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                    Refining evidence details...
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">
                    {answer}
                    <span className="inline-block w-1.5 h-3 ml-1 bg-blue-600 animate-pulse" />
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
