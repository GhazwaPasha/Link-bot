/** @type {import('next').NextConfig} */
const nextConfig = {
  // No serverComponentsExternalPackages/outputFileTracingIncludes needed anymore — that config
  // existed only to get Prisma's native query-engine binary traced into the Vercel output.
  // Drizzle's postgres-js client is pure JS, so there's no binary to trace/externalize.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
