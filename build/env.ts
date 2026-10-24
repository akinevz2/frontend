import path from "node:path";
import process from "node:process";

/** Everything the build tooling reads from the environment lives here. */
export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://akinevz.com";
export const DEV_HOST = process.env.VITE_DEV_HOST ?? "0.0.0.0"; // bind all interfaces: reachable from the remote dev machine (was 127.0.0.1)
export const DEV_PORT = Number(process.env.VITE_DEV_PORT ?? "8086");

export const ROOT = process.cwd();
export const DIST = path.resolve(ROOT, "dist");
export const PUBLIC = path.resolve(ROOT, "public");
export const CONTENT = path.resolve(ROOT, "src/content");

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  // not "no-referrer": YouTube embeds fail with Error 153 when the player
  // cannot see the embedding origin (cross-origin requests only get the
  // origin under this policy, so it stays privacy-friendly).
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
