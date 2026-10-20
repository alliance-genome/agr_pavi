// Custom 404 page.
//
// Why this exists: Next.js's built-in 404 injects an inline <style> that
// sets `body { background: #fff; color: #000; }` with a
// @media (prefers-color-scheme: dark) counterpart. On explicit Dark (user
// cycled to Dark in Auto-light OS, or Light in Auto-dark OS) that inline
// style wins against our theme tokens and the page reads light/wrong.
// This page replaces the default, so Next doesn't inject that <style>
// and the normal theme tokens apply.
import Link from 'next/link';

export default function NotFound() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '4rem 1rem',
                minHeight: 'calc(100vh - 200px)',
                color: 'var(--agr-text-primary)',
                background: 'transparent',
            }}
        >
            <h1 style={{
                fontSize: '4rem',
                margin: '0 0 0.5rem 0',
                color: 'var(--agr-primary-700)',
                fontWeight: 700,
            }}>
                404
            </h1>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Page not found</h2>
            <p style={{
                color: 'var(--agr-text-secondary)',
                maxWidth: '32rem',
                marginBottom: '1.5rem',
            }}>
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
                Experimental routes (ortholog, bulk upload) only appear when the deploy
                enables them via <code>NEXT_PUBLIC_SHOW_EXPERIMENTAL=true</code>.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link
                    href="/"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--agr-primary-500)',
                        color: 'white',
                        borderRadius: '0.25rem',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}
                >
                    Home
                </Link>
                <Link
                    href="/submit"
                    style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid var(--agr-primary-500)',
                        color: 'var(--agr-primary-500)',
                        borderRadius: '0.25rem',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}
                >
                    Submit a job
                </Link>
            </div>
        </div>
    );
}
