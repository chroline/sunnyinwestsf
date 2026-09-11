// Display name stays "West San Francisco"; the NWS grid below points at the
// Richmond District, Geary corridor (37.781, -122.479).
export const LOCATION = "West San Francisco" as const;
export const TIMEZONE = "America/Los_Angeles" as const;
export const LAT = 37.781;
export const LON = -122.479;
export const NWS_GRID = { office: "MTR", x: 83, y: 106 } as const;
export const CACHE_SECONDS = 3600;

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
