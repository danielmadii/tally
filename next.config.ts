import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: lets the phone reach the dev server through an ngrok tunnel or
  // the LAN IP — Next blocks cross-origin dev assets (403) without this.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "192.168.10.63"],
};

export default nextConfig;
