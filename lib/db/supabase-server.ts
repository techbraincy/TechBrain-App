/**
 * Server-only Supabase client.
 * NEVER import this in Client Components or any file with 'use client'.
 *
 * Uses the SERVICE ROLE key — bypasses all Row Level Security.
 * Uses the POOLED connection string (PgBouncer, port 6543) to avoid
 * connection exhaustion across Vercel's parallel serverless instances.
 */
import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Returns a fresh Supabase client per call.
 * Do NOT create a module-level singleton — Vercel's serverless
 * environment can share module state across requests, which can
 * leak context. Create per-request instead.
 */
export function getSupabaseServer() {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        // Disable client-side session persistence — this is a server client
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        // Use the pooled connection string for Vercel (PgBouncer, port 6543)
        // Set SUPABASE_URL to the pooled URL in your Vercel env vars:
        // e.g. postgresql://postgres.xxxx:password@aws-0-xx.pooler.supabase.com:6543/postgres
      },
    }
  );
}
