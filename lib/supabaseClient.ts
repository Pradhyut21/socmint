import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Development mode: bypass auth if no credentials or using placeholder values
// Check both at build time (server) and runtime (client)
const isPlaceholderUrl = !supabaseUrl || 
  supabaseUrl.includes("placeholder") || 
  supabaseUrl.includes("your-project");
const isPlaceholderKey = !supabaseAnonKey || 
  supabaseAnonKey.includes("your-anon-key") ||
  supabaseAnonKey.includes("placeholder");

const DEV_MODE = process.env.NODE_ENV === "development" && (isPlaceholderUrl || isPlaceholderKey);

if (DEV_MODE) {
  console.warn("⚠️ DEVELOPMENT MODE: Authentication bypassed. Set up Supabase for production!");
  console.log("URL check:", isPlaceholderUrl, supabaseUrl);
  console.log("Key check:", isPlaceholderKey, supabaseAnonKey?.substring(0, 20));
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured in environment variables.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? localStorage : undefined,
    },
  }
);

// Export dev mode flag for components to use
export const isDevMode = DEV_MODE;
