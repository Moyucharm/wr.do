import path from "node:path";
import { fileURLToPath } from "node:url";

import { withContentlayer } from "next-contentlayer2";
import createNextIntlPlugin from "next-intl/plugin";
import nextPWA from "next-pwa";

const withNextIntl = createNextIntlPlugin();

// 项目根目录：显式声明，避免 Next 因仓库外的 lockfile 误判 workspace root
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "email-attachment.wr.do",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "wr.do",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  rewrites() {
    return [
      {
        source: "/logo.png",
        destination: "/_static/logo-192.png",
      },
    ];
  },
  redirects() {
    return [
      {
        source: "/s",
        destination: "/",
        permanent: true,
      },
      {
        source: "/docs/developer",
        destination: "/docs/developer/installation",
        permanent: true,
      },
      {
        source: "/x",
        destination: "https://wr.do/s/x",
        permanent: true,
      },
    ];
  },
};

const withPWA = nextPWA({
  dest: "public",
  // 开发模式关闭：避免 pnpm dev 反复改写 public/ 下受版本控制的 sw.js 与 workbox 产物
  disable: process.env.NODE_ENV === "development",
});

export default withContentlayer(withPWA(withNextIntl(nextConfig)));
