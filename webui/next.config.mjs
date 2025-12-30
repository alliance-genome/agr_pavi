import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        dirs: ['src', 'cypress/e2e', 'cypress/support'],
    },
    output: 'standalone',
    skipTrailingSlashRedirect: true,
    experimental: {
        urlImports: [
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/'
        ]
    },
    // Transpile alignment-viewer-2 to handle its CSS modules
    transpilePackages: ['alignment-viewer-2'],
    webpack: (config) => {
        // Find the CSS/SCSS rules and modify them to be less strict for node_modules
        config.module.rules.forEach((rule) => {
            if (rule.oneOf) {
                rule.oneOf.forEach((oneOfRule) => {
                    if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
                        oneOfRule.use.forEach((loader) => {
                            if (
                                loader.loader &&
                                loader.loader.includes('css-loader') &&
                                loader.options &&
                                loader.options.modules
                            ) {
                                // Set mode to 'pure' only for app code, 'local' for node_modules
                                if (typeof loader.options.modules === 'object') {
                                    loader.options.modules.mode = (resourcePath) => {
                                        if (/node_modules/.test(resourcePath)) {
                                            return 'local';
                                        }
                                        return 'pure';
                                    };
                                }
                            }
                        });
                    }
                });
            }
        });
        return config;
    },
};

export default withBundleAnalyzer(nextConfig);
