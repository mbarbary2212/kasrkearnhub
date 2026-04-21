/**
 * Canonical Supabase URL with hardcoded fallback.
 * Used when calling edge functions / REST endpoints directly via fetch().
 * The fallback prevents `undefined/functions/v1/...` URLs when
 * VITE_SUPABASE_URL is missing from a deployed bundle.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dwmxnokprfiwmvzksyjg.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bXhub2twcmZpd212emtzeWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjM3NjQsImV4cCI6MjA4MTQ5OTc2NH0.wGf_n_j8hOIXCRzd2fV_-Zy0suHEY1vI4ggFaU-f6oo';