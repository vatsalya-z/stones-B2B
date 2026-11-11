const isDev = process.env.NODE_ENV !== "production";

// Baseline CSP
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://rgmasamasslqintssyrh.supabase.co https://images.unsplash.com",
  "font-src 'self' data: blob: https://fonts.gstatic.com https://fonts.googleapis.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@stone/auth",
    "@stone/database",
    "@stone/types",
    "@stone/ui",
    "@stone/utils",
    "@stone/validation",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "rgmasamasslqintssyrh.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/dashboard", destination: "/buyer/dashboard" },
      { source: "/enquiries/:path*", destination: "/buyer/enquiries/:path*" },
      { source: "/rfqs/:path*", destination: "/buyer/rfqs/:path*" },
      { source: "/quotes/:path*", destination: "/buyer/quotes/:path*" },
      { source: "/orders/:path*", destination: "/buyer/orders/:path*" },
      { source: "/messages/:path*", destination: "/buyer/messages/:path*" },
      { source: "/favourites/:path*", destination: "/buyer/favourites/:path*" },
      { source: "/addresses/:path*", destination: "/buyer/addresses/:path*" },
      { source: "/profile/:path*", destination: "/buyer/profile/:path*" },
      { source: "/notifications/:path*", destination: "/buyer/notifications/:path*" },
      { source: "/settings/:path*", destination: "/buyer/settings/:path*" },
    ];
  },
};

export default nextConfig;

