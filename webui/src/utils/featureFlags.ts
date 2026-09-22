// Ortholog Alignment and Bulk Upload are not part of the production release
// yet. With this off, their pages return 404, the header hides their links,
// and the user guide omits their sections.
// Set NEXT_PUBLIC_SHOW_EXPERIMENTAL=true at build time (e.g. on dev) to turn
// them on. NEXT_PUBLIC_* values are inlined by `next build`, so changing it
// requires a rebuild.
export const showExperimental = process.env.NEXT_PUBLIC_SHOW_EXPERIMENTAL === 'true';
