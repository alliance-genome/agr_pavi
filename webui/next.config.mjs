/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    skipTrailingSlashRedirect: true,
    experimental: {
        urlImports: [
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/',
            'https://raw.githubusercontent.com/alliance-genome/agr_ui/KANBAN-584_pavi-integration/'
        ]
    }
};

export default nextConfig;
