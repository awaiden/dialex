import { withDialex } from "dialexjs/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withDialex(nextConfig);
