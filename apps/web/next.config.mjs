/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@discord-forms/db", "@discord-forms/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
