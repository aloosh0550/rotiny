// Shared CORS headers for Routini Edge Functions.
// Tighten `Access-Control-Allow-Origin` to your deployed web origin(s) in production.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
