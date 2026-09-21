export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Prefix an app-absolute path (e.g. "/api/...", "/foo") with the configured basePath.
 * Next auto-prefixes <Link>, next/image, redirect(), and router.push — use this ONLY for
 * raw strings Next does not touch: fetch() URLs, window.location assignments, and raw
 * <a href>/<link href> attributes.
 */
export function withBasePath(path: string): string {
    return `${BASE_PATH}${path}`;
}
