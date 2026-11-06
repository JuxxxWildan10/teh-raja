/**
 * ============================================================================
 * FILE: next.config.ts
 * ============================================================================
 * FUNGSI UTAMA:
 * Konfigurasi utama framework Next.js 16, mencakup:
 * 1. Integrasi plugin PWA (`@ducanh2912/next-pwa`) untuk menghasilkan Service Worker di folder `public`.
 * 2. Whitelist domain gambar eksternal (`i.pinimg.com`) untuk komponen `<Image />` Next.js.
 * ============================================================================
 */
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},
};

export default withPWA(nextConfig);
