#!/usr/bin/env node
// Regenerate src/data/mane-select.json from NCBI's MANE summary file.
//
//   node scripts/build-mane-select.mjs            # current MANE release
//   node scripts/build-mane-select.mjs v1.5       # a specific release
//
// MANE Select defines one representative transcript per human protein-coding
// gene. The Alliance human GFF marks no canonical transcript, so the submit form
// uses this list to preselect it. Accessions are stored without their version
// suffix so a newer transcript version in the GFF still matches.
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'mane-select.json');

async function resolveRelease(requested) {
    if (requested) return { dir: `${BASE}/release_${requested.replace(/^v/, '')}`, version: requested.replace(/^v?/, 'v') };
    const listing = await (await fetch(`${BASE}/current/`)).text();
    const m = listing.match(/MANE\.GRCh38\.(v[0-9.]+)\.summary\.txt\.gz/);
    if (!m) throw new Error('Could not find the MANE summary file in the current release listing.');
    return { dir: `${BASE}/current`, version: m[1] };
}

const { dir, version } = await resolveRelease(process.argv[2]);
const url = `${dir}/MANE.GRCh38.${version}.summary.txt.gz`;
const res = await fetch(url);
if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
const rows = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8').split('\n');

const header = rows[0].replace(/^#/, '').split('\t');
const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Column ${name} missing from ${url}`);
    return i;
};
const [status, ensembl, refseq] = [col('MANE_status'), col('Ensembl_nuc'), col('RefSeq_nuc')];
const unversioned = (acc) => acc.replace(/\.\d+$/, '');

const accessions = new Set();
let genes = 0;
for (const line of rows.slice(1)) {
    if (!line) continue;
    const f = line.split('\t');
    if (f[status] !== 'MANE Select') continue;
    genes += 1;
    if (f[ensembl]) accessions.add(unversioned(f[ensembl]));
    if (f[refseq]) accessions.add(unversioned(f[refseq]));
}

writeFileSync(OUT, JSON.stringify({
    source: `NCBI MANE GRCh38 ${version}, MANE Select`,
    url,
    genes,
    transcripts: [...accessions].sort(),
}) + '\n');
console.log(`Wrote ${accessions.size} accessions for ${genes} genes (${version}) to ${OUT}`);
