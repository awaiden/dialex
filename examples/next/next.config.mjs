import { withI18n } from "dialex/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withI18n(nextConfig);
