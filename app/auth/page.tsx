"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const ShieldOrb = dynamic(
  () => import("@/components/visual/ShieldOrb").then((mod) => mod.ShieldOrb),
  { ssr: false }
);

function randomHex(len = 12) {
  const bytes = new Uint8Array(len / 2);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const BULLETS = [
  "→ OSINT AGGREGATION",
  "→ RISK SCORING",
  "→ EVIDENCE CHAIN",
  "→ OPERATOR ATTRIBUTION",
];

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign in state
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");
  // Sign up state
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  const [suName, setSuName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("----------------");
  const [isoNow, setIsoNow] = useState("------------------------");
  
  useEffect(() => {
    setSessionId(randomHex(16).toUpperCase());
    setIsoNow(new Date().toISOString());
  }, []);

  // If already authenticated, bounce to /
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
      router.push("/");
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) router.push("/");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push("/");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: siEmail.trim(),
      password: siPwd,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPwd,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: suName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/");
    } else {
      setNotice(
        "// CLEARANCE PENDING — check your email to confirm operator identity.",
      );
    }
  }

  return (
    <main className="min-h-screen w-full bg-background paper-grain text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[45fr_55fr]">
        {/* LEFT — classified panel */}
        <aside className="relative hidden flex-col bg-sidebar text-sidebar-foreground lg:flex">
          <div className="classified-banner h-4 w-full" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(oklch(1 0 0) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
            aria-hidden
          />
          <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
            <div>
              <div className="font-mono text-[11px] tracking-[0.32em] text-stamp">
                SOCMINT SHIELD // FILE 0xA7
              </div>
              <h1
                className="mt-10 font-display text-5xl font-black leading-[0.95] tracking-tight text-sidebar-foreground xl:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Authorized
                <br />
                Personnel
                <br />
                <span className="text-stamp">Only.</span>
              </h1>
              <div className="mt-6 font-mono text-xs tracking-[0.25em] text-sidebar-foreground/70">
                // CLEARANCE REQUIRED
              </div>

              <ul className="mt-12 space-y-3 font-mono text-sm">
                {BULLETS.map((b, i) => (
                  <li
                    key={b}
                    className="anim-rise-3d tracking-[0.18em] text-sidebar-foreground/85"
                    style={{ ["--i" as string]: String(i + 2) }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex items-end justify-between">
              <div className="font-mono text-[10px] leading-relaxed tracking-widest text-sidebar-foreground/50">
                <div>DESK: NORTHERN ANALYSIS</div>
                <div>HANDLER: //AUTOMATED</div>
                <div>LAST AUDIT: {isoNow.slice(0, 10)}</div>
              </div>
              <ShieldOrb className="anim-float-3d -mr-4 -mb-2 w-44 h-44" theme="evidence" />
            </div>
          </div>
          <div className="classified-banner h-4 w-full" />
        </aside>

        {/* RIGHT — paper card */}
        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <Card className="card-3d sheen-sweep holo-edge anim-flip-in relative border-border/80 bg-card">
              {/* TOP SECRET badge */}
              <div className="pointer-events-none absolute -top-3 -right-3 z-10">
                <div
                  className="stamp-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-stamp"
                  style={{ transform: "rotate(-8deg)" }}
                >
                  TOP SECRET
                </div>
              </div>

              <CardHeader className="space-y-2 pb-2">
                <div className="font-mono text-[10px] tracking-[0.28em] text-evidence">
                  CASE FILE // ACCESS
                </div>
                <h2
                  className="font-display text-3xl font-bold leading-tight text-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {tab === "signin"
                    ? "Sign in to your dossier"
                    : "Request access"}
                </h2>
                <p className="font-mono text-[11px] tracking-wider text-evidence">
                  {tab === "signin"
                    ? "// resume active investigation"
                    : "// new operator intake form"}
                </p>
              </CardHeader>

              <CardContent className="space-y-5 pt-4">
                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    setTab(v as "signin" | "signup");
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-none border border-border bg-muted/60 p-1 font-mono text-[11px] tracking-[0.2em]">
                    <TabsTrigger value="signin" className="rounded-none uppercase">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-none uppercase">
                      Create Access
                    </TabsTrigger>
                  </TabsList>

                  {error && (
                    <div className="mt-4">
                      <div className="classified-banner h-1 w-full" />
                      <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-[11px] tracking-wider text-destructive">
                        // ACCESS DENIED — {error}
                      </div>
                    </div>
                  )}
                  {notice && !error && (
                    <div className="mt-4 border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] tracking-wider text-evidence">
                      {notice}
                    </div>
                  )}

                  {/* SIGN IN */}
                  <TabsContent value="signin" className="mt-5">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <Field
                        id="si-email"
                        label="OPERATOR EMAIL"
                        type="email"
                        autoComplete="email"
                        value={siEmail}
                        onChange={setSiEmail}
                        required
                      />
                      <Field
                        id="si-pwd"
                        label="ACCESS KEY"
                        type="password"
                        autoComplete="current-password"
                        value={siPwd}
                        onChange={setSiPwd}
                        required
                      />
                      <SubmitButton
                        loading={loading}
                        idleLabel="AUTHENTICATE →"
                      />
                      <div className="flex justify-between font-mono text-[10px] tracking-widest text-evidence">
                        <span>SECURE CHANNEL // TLS</span>
                        <button
                          type="button"
                          className="underline-offset-4 hover:underline"
                          onClick={() =>
                            setNotice(
                              "// Contact handler to rotate access key.",
                            )
                          }
                        >
                          Forgot key?
                        </button>
                      </div>
                    </form>
                  </TabsContent>

                  {/* SIGN UP */}
                  <TabsContent value="signup" className="mt-5">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <Field
                        id="su-name"
                        label="DISPLAY NAME"
                        type="text"
                        autoComplete="name"
                        value={suName}
                        onChange={setSuName}
                        required
                      />
                      <Field
                        id="su-email"
                        label="OPERATOR EMAIL"
                        type="email"
                        autoComplete="email"
                        value={suEmail}
                        onChange={setSuEmail}
                        required
                      />
                      <Field
                        id="su-pwd"
                        label="ACCESS KEY"
                        type="password"
                        autoComplete="new-password"
                        value={suPwd}
                        onChange={setSuPwd}
                        required
                        minLength={6}
                      />
                      <SubmitButton
                        loading={loading}
                        idleLabel="REQUEST CLEARANCE →"
                      />
                      <div className="font-mono text-[10px] tracking-widest text-evidence">
                        BY REQUESTING ACCESS YOU ACCEPT EVIDENCE-CHAIN LOGGING.
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>

              {/* Footer */}
              <div className="border-t border-dashed border-border px-6 py-3 font-mono text-[10px] tracking-widest text-evidence">
                SESSION ID: {sessionId} // {isoNow}
              </div>
            </Card>

            <div className="mt-6 text-center font-mono text-[10px] tracking-[0.22em] text-evidence">
              <Link href="/" className="hover:text-ink">
                ← RETURN TO COVER PAGE
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="font-mono text-[10px] font-semibold tracking-[0.24em] text-evidence"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-none border-ink/30 bg-background/60 font-mono text-sm text-ink focus-visible:border-stamp focus-visible:ring-stamp/30"
      />
    </div>
  );
}

function SubmitButton({
  loading,
  idleLabel,
}: {
  loading: boolean;
  idleLabel: string;
}) {
  return (
    <div className={loading ? "scan-bar" : ""}>
      <Button
        type="submit"
        disabled={loading}
        className="anim-stamp h-11 w-full rounded-none font-mono text-xs font-bold tracking-[0.22em] uppercase"
      >
        {loading ? "VERIFYING..." : idleLabel}
      </Button>
    </div>
  );
}
