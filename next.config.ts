import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
      ignoreBuildErrors: true,
    },

  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ["mongoose"],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
      protocol: "https",
      hostname: "snyrr2zv8e.ufs.sh", // Add the missing hostname here
    },
    ],
  },
};


export default nextConfig;
