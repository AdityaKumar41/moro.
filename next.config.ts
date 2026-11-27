import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [
    "sharp",
    "fontkit",
    "@hyzyla/pdfium",
    "@resvg/resvg-js",
    "@xmldom/xmldom",
  ],
  outputFileTracingIncludes: {
    "/api/**": ["./assets/print-fonts/**/*"],
    "/api/uploads/prepare": [
      "./lib/source-render.worker.mjs",
      "./node_modules/@hyzyla/pdfium/dist/**/*",
      "./node_modules/@resvg/**/*",
      "./node_modules/@xmldom/**/*",
      "./node_modules/pdf-lib/**/*",
      "./node_modules/@pdf-lib/**/*",
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
