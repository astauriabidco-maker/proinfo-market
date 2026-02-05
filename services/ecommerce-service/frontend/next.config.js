/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3006',
        NEXT_PUBLIC_ASSET_SERVICE_URL: process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || 'http://localhost:3000',
        NEXT_PUBLIC_INVENTORY_SERVICE_URL: process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3003',
        NEXT_PUBLIC_CTO_SERVICE_URL: process.env.NEXT_PUBLIC_CTO_SERVICE_URL || 'http://localhost:3005'
    }
};

module.exports = nextConfig;
