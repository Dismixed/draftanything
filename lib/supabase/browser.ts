import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Creates a Supabase client for use in Client Components.
 * Uses only the publishable (anon) key — safe to expose in the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
