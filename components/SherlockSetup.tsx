"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, Download, CheckCircle2, XCircle, Loader2, Terminal, Globe } from "lucide-react";
import { toast } from "sonner";

interface ToolStatus {
  sherlock: boolean;
  maigret: boolean;
}

export function SherlockSetup() {
  const [status, setStatus] = useState<ToolStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [testUsername, setTestUsername] = useState("kishansaaai");
  const [testResults, setTestResults] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sherlock");
      const data = await response.json();
      setStatus(data.tools_available);
    } catch (error) {
      console.error("Failed to check tools:", error);
      toast.error("Failed to check tool status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const installTools = async () => {
    setInstalling(true);
    try {
      const response = await fetch("/api/sherlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install" })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const sherlockOk = data.installation.sherlock.installed;
        const maigretOk = data.installation.maigret.installed;
        
        if (sherlockOk && maigretOk) {
          toast.success("Both tools installed successfully!");
        } else if (sherlockOk || maigretOk) {
          toast.success(
            `${sherlockOk ? 'Sherlock' : 'Maigret'} installed. ${!sherlockOk ? 'Sherlock' : 'Maigret'} failed - check console.`
          );
        } else {
          toast.error("Installation failed for both tools. Ensure Python and pip are available.");
        }
        
        await checkStatus();
      } else {
        toast.error("Installation failed");
      }
    } catch (error) {
      console.error("Installation error:", error);
      toast.error("Installation failed");
    } finally {
      setInstalling(false);
    }
  };

  const testSearch = async () => {
    if (!testUsername.trim()) return;
    
    setTestLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch("/api/sherlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "search",
          username: testUsername,
          mode: "quick"
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResults(data);
        toast.success(`Found ${data.accounts_found} accounts!`);
      } else {
        toast.error(data.error || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Sherlock/Maigret OSINT Integration
            </CardTitle>
            <CardDescription className="mt-2">
              Extend username search across 400-3000+ social networks
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Tool Status</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg border">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Sherlock</span>
              </div>
              {status === null ? (
                <Badge variant="outline">Checking...</Badge>
              ) : status.sherlock ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Installed
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Found
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg border">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Maigret</span>
              </div>
              {status === null ? (
                <Badge variant="outline">Checking...</Badge>
              ) : status.maigret ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Installed
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Found
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Installation Section */}
        {status && (!status.sherlock || !status.maigret) && (
          <Alert>
            <Download className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Install missing tools to enable extended OSINT search
              </span>
              <Button
                size="sm"
                onClick={installTools}
                disabled={installing}
              >
                {installing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Install Tools
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Test Search Section */}
        {status && (status.sherlock || status.maigret) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Test Search</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder="Enter username to test"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-surface"
                onKeyDown={(e) => e.key === "Enter" && testSearch()}
              />
              <Button
                onClick={testSearch}
                disabled={testLoading || !testUsername.trim()}
              >
                {testLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {testResults && (
              <div className="p-4 bg-surface rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">
                    Found {testResults.accounts_found} accounts
                  </h4>
                  <Badge>{testResults.mode} mode</Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResults.accounts.map((acc: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-background rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {acc.platform}
                        </Badge>
                        <span className="text-ink-muted">@{acc.username}</span>
                      </div>
                      <a
                        href={acc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="text-xs text-ink-muted space-y-2 pt-4 border-t">
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Sherlock:</strong> Searches 400+ social networks (30s scan)</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Maigret:</strong> Advanced fork with 3000+ sites (60s deep scan)</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Auto-Integration:</strong> Results automatically included in Deep Scan mode</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span className="text-yellow-600"><strong>Requirements:</strong> Python 3.x and pip must be installed</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
