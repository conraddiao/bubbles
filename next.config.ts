import type { NextConfig } from "next";
import createWithVercelToolbar from '@vercel/toolbar/plugins/next';

const nextConfig: NextConfig = {
  /* config options here */
};

const withVercelToolbar = createWithVercelToolbar();
export default withVercelToolbar(nextConfig);
