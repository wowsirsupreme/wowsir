import type { NextConfig } from "next";

// Firebase SDK uses eval() internally (Firestore, Auth), so unsafe-eval is
// required in both dev and production. Without it, Next.js 16's auto-CSP
// blocks all Firestore operations silently.
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' blob: data: https:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
