/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", ".prisma/client", "@discord-forms/db"],
    outputFileTracingIncludes: {
      "/**": ["../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**/*"],
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
