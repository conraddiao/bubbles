// This is a client component because it wraps next/script.
"use client";

import Script from "next/script";

const VERCEL_ANALYTICS_SRC = "https://va.vercel-scripts.com/v1/script.js";
const VERCEL_ANALYTICS_DEBUG_SRC =
  "https://va.vercel-scripts.com/v1/script.debug.js";

type VercelAnalyticsProps = {
  /**
   * Forces the use of the debug script instead of the production one.
   * When undefined, the script choice follows the current NODE_ENV.
   */
  debug?: boolean;
};

export function VercelAnalytics({ debug }: VercelAnalyticsProps) {
  const token = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;

  if (!token) {
    return null;
  }

  const isDebug = debug ?? process.env.NODE_ENV !== "production";
  const src = isDebug ? VERCEL_ANALYTICS_DEBUG_SRC : VERCEL_ANALYTICS_SRC;

  return (
    <Script
      id="vercel-analytics"
      src={src}
      strategy="afterInteractive"
      data-token={token}
      data-sdkn="nextjs"
      data-sdkv="manual"
    />
  );
}
