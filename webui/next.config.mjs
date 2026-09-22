import bundleAnalyzer from '@next/bundle-analyzer';
import { readFileSync } from 'fs';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

// Expose the WebUI version (from package.json) to the client for display.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Serve the app under a URL prefix (e.g. '/pavi') when NEXT_PUBLIC_BASE_PATH is set.
// Unset/empty (default) keeps the app at root, matching current behavior exactly.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        dirs: ['src', 'cypress/e2e', 'cypress/support'],
    },
    // Standalone output is opt-in: the Dockerfile sets NEXT_OUTPUT=standalone
    // (its runner copies .next/standalone). Vercel and `next start` on EC2 need
    // the default output.
    ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
    skipTrailingSlashRedirect: true,
    experimental: {
        urlImports: [
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/'
        ],
        // Served behind the Alliance edge (alliancegenome.org/pavi rewrites to
        // the pavi.alliancegenome.org origin), so the browser Origin
        // (www.alliancegenome.org) differs from x-forwarded-host. Whitelist the
        // public hosts or Server Actions abort with "Invalid Server Actions request".
        serverActions: {
            allowedOrigins: [
                'alliancegenome.org',
                'www.alliancegenome.org',
                'pavi.alliancegenome.org',
                'dev-pavi.alliancegenome.org',
            ],
        },
    },
    ...(basePath ? { basePath } : {}),
    env: {
        // Prefer a build-injected version (e.g. `make print-webui-version` ->
        // webui-vX.Y.Z-N-g<sha>); fall back to package.json when unset.
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || pkg.version,
    },
};

export default withBundleAnalyzer(nextConfig);
