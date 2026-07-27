import type { NextConfig } from "next";

/**
 * Where the FastAPI backend lives, for the same-origin proxy below.
 *
 * Defaults to the local API, so `npm run dev` needs no environment at all. A
 * deployment that wants the proxy sets API_ORIGIN to the deployed API's origin
 * — read when this config is evaluated, which is build time, so changing it
 * means a redeploy.
 */
const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  /**
   * Lets the browser call the API same-origin at /api/v1/*, which sidesteps CORS
   * entirely. Only used when NEXT_PUBLIC_API_URL is relative (or unset in an
   * environment where the default localhost API is the right target) — with an
   * absolute NEXT_PUBLIC_API_URL the browser goes straight to the API instead
   * and never touches this route.
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
