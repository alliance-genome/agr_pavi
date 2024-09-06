/** @type {import('next').NextConfig} */

const API_BASE = process.env.PAVI_API_BASE_URL || 'http://localhost:8000'

const nextConfig = {
    output: 'standalone',
    skipTrailingSlashRedirect: true,
    experimental: {
        urlImports: [
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/'
        ]
    },
    rewrites: async () => { return [
        {
            source: '/api',
            destination: `${API_BASE}/docs`,
        },
        {
            source: '/api/docs',
            destination: `${API_BASE}/docs`,
        }, {
            source: '/api/:path',
            destination: `${API_BASE}/api/:path`,
        }, {
            source: '/openapi.json',
            destination: `${API_BASE}/openapi.json`,
        }
    ]}
};

export default nextConfig;
