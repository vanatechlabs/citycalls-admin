import type { NextConfig } from "next";

// Local-provider file URLs resolve against citycalls-api's own origin (see
// resolveFileUrl in src/lib/hooks/useFiles.ts) — next/image needs that host
// explicitly allowed, same as Cloudinary's, or it refuses to render it.
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Picsum is the placeholder image host used by
      // scripts/backfillServiceDetails.ts / seedSampleOperationalData.ts's
      // seeded catalog thumbnails (stored with provider: 'CLOUDINARY' since
      // that's the closer-to-real shape, even though the URL isn't actually
      // a Cloudinary one) — without this, next/image silently refuses to
      // render them here even though the mobile app's Image.network has no
      // such allowlist and displays them fine.
      { protocol: "https", hostname: "picsum.photos" },
      {
        protocol: apiOrigin.protocol.replace(":", "") as "http" | "https",
        hostname: apiOrigin.hostname,
        port: apiOrigin.port || undefined,
      },
    ],
  },
};

export default nextConfig;
