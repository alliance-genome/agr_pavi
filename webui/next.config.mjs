import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        dirs: ['src', 'cypress/e2e', 'cypress/support'],
    },
    // Static export for GitHub Pages deployment
    output: process.env.GITHUB_PAGES === 'true' ? 'export' : undefined,
    // Disable image optimization for static export
    images: {
        unoptimized: process.env.GITHUB_PAGES === 'true',
    },
    // Use standalone for Docker builds
    skipTrailingSlashRedirect: true,
    experimental: {
        urlImports: [
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/'
        ]
    },
};

export default withBundleAnalyzer(nextConfig);
