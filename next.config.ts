import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/brand.ts checks public/brand at request time, so the Vercel function needs those files traced in.
  outputFileTracingIncludes: { "/": ["./public/brand/**"] },
};

export default nextConfig;
