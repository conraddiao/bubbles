import type { NextConfig } from "next";
import createWithVercelToolbar from '@vercel/toolbar/plugins/next';
import withBundleAnalyzerInit from '@next/bundle-analyzer';

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
};

const withVercelToolbar = createWithVercelToolbar();
export default withBundleAnalyzer(withVercelToolbar(nextConfig));
