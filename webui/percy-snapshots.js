/**
 * Percy Visual Testing Script
 * Takes snapshots of key PAVI pages for visual regression testing
 *
 * Usage:
 *   PERCY_TOKEN=<token> BASE_URL=https://your-vercel-app.vercel.app node percy-snapshots.js
 */

const { execSync } = require('child_process');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PERCY_TOKEN = process.env.PERCY_TOKEN;

if (!PERCY_TOKEN) {
    console.error('Error: PERCY_TOKEN environment variable is required');
    console.error('Get your token from: https://percy.io/settings');
    process.exit(1);
}

// Pages to snapshot with their configurations
const snapshots = [
    {
        name: 'Home Page',
        url: '/',
        widths: [375, 768, 1280, 1920],
    },
    {
        name: 'Submit Job - Empty Form',
        url: '/submit',
        widths: [375, 768, 1280, 1920],
    },
    {
        name: 'Submit Job - With Mock Data',
        url: '/submit?loadExample=brca1',
        widths: [768, 1280, 1920], // Skip mobile for complex form
    },
    {
        name: 'Job Progress - Pending',
        url: '/progress?uuid=12345678-1234-1234-1234-123456789abc&mockStatus=pending',
        widths: [768, 1280],
    },
    {
        name: 'Job Progress - Running',
        url: '/progress?uuid=12345678-1234-1234-1234-123456789abc&mockStatus=running',
        widths: [768, 1280],
    },
    {
        name: 'Job Progress - Completed',
        url: '/progress?uuid=12345678-1234-1234-1234-123456789abc&mockStatus=completed',
        widths: [768, 1280],
    },
    {
        name: 'Results View',
        url: '/result?uuid=12345678-1234-1234-1234-123456789abc',
        widths: [1280, 1920], // Results page needs wider viewport
        minHeight: 2000,
    },
    {
        name: 'Jobs List',
        url: '/jobs',
        widths: [768, 1280],
    },
    {
        name: 'Help Page',
        url: '/help',
        widths: [768, 1280],
    },
];

console.log(`🎨 Percy Visual Testing`);
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`📸 Snapshots: ${snapshots.length} pages`);
console.log('');

// Build Percy snapshot command
let snapshotUrls = snapshots.map(s => `${BASE_URL}${s.url}`).join(' ');

try {
    console.log('Starting Percy snapshots...');

    // Use Percy CLI to snapshot URLs
    const command = `npx percy snapshot ${snapshotUrls} --config .percy.yml`;

    console.log(`Running: ${command}`);
    execSync(command, {
        stdio: 'inherit',
        env: { ...process.env, PERCY_TOKEN }
    });

    console.log('');
    console.log('✅ Percy snapshots completed!');
    console.log('View results at: https://percy.io');

} catch (error) {
    console.error('❌ Percy snapshots failed:', error.message);
    process.exit(1);
}
