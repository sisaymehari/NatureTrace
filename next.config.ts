import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mkkloluggtpwmfhlrocm.supabase.co",
      },
    ],
  },
};

export default nextConfig;
