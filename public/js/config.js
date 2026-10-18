// Supabase connection settings.
//
// Local development uses the stack started by `npx supabase start`; its anon key is the
// public demo key shipped with every local Supabase install.
// For a deployed site, paste your project's URL and anon (public) key into PRODUCTION.
// Leaving PRODUCTION empty keeps the typing test working in guest-only mode.

const LOCAL = {
  url: "http://127.0.0.1:54321",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
};

const PRODUCTION = {
  url: "https://ddwyditiohdbslvvjqli.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkd3lkaXRpb2hkYnNsdnZqcWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyOTczMTUsImV4cCI6MjEwNzg3MzMxNX0.hfQfbsGvFBXswH9vehBGkPcXG1-0654sQlWwP2B1Yj4",
};

const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

export const SUPABASE = isLocalHost ? LOCAL : PRODUCTION;
