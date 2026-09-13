/**
 * PAVI-owned species → JBrowse data configuration.
 *
 * This is a *vendored* copy of the fields PAVI needs from the Alliance
 * `agr_ui` `SPECIES` constant. It replaces the previous runtime dependency
 * on `getSpecies` / `getSingleGenomeLocation` imported (via Next.js
 * `urlImports`) from
 * `https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js`.
 *
 * Why vendor it:
 *  - The urlImport was *locked* to a stale snapshot of `agr_ui@main`, so the
 *    per-species JBrowse paths silently drifted from what is actually on S3
 *    (e.g. the stale copy still used the old `zfin/zebrafish-11/` path).
 *  - Owning the config lets PAVI pin a *coherent* (NCList release + FASTA
 *    assembly) pair per species, which the pipeline requires: transcript
 *    exon coordinates come from the NCList and are spliced against
 *    `jBrowsefastaurl`, so the two MUST be the same genome assembly.
 *
 * Keep this in sync deliberately (not automatically) with agr_ui's SPECIES.
 * Only the fields PAVI reads are carried here:
 *   jBrowsenclistbaseurltemplate, jBrowseurltemplate, jBrowsefastaurl,
 *   apolloName (used by the "View transcripts" viewer), plus identity fields.
 *
 * Per-species overrides (`jBrowseDataReleaseOverride`) let one species use a
 * different JBrowse data release than the global Alliance release, without
 * downgrading everything.
 */

export interface SpeciesConfig {
    taxonId: string;
    fullName: string;
    shortName: string;
    jBrowseName: string;
    apolloName: string;
    /** NCList base URL, with a `{release}` placeholder. */
    jBrowsenclistbaseurltemplate: string;
    /** Per-refseq track path appended to the NCList base URL. */
    jBrowseurltemplate: string;
    /** Reference genome FASTA. MUST match the assembly of the NCList above. */
    jBrowsefastaurl: string;
    /**
     * When set, this species uses this JBrowse data release instead of the
     * global Alliance release. Use it to pin a species to a release whose
     * NCList tracks still exist / match `jBrowsefastaurl`.
     */
    jBrowseDataReleaseOverride?: string;
}

const S3 = 'https://s3.amazonaws.com/agrjbrowse';
const ALL_GENES = 'tracks/All_Genes/{refseq}/trackData.jsonz';

export const SPECIES: SpeciesConfig[] = [
    {
        taxonId: 'NCBITaxon:9606',
        fullName: 'Homo sapiens',
        shortName: 'Hsa',
        jBrowseName: 'Homo sapiens',
        apolloName: 'human',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/human/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_000001405.40_GRCh38.p14_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:10090',
        fullName: 'Mus musculus',
        shortName: 'Mmu',
        jBrowseName: 'Mus musculus',
        apolloName: 'mouse',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/MGI/mouse/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_000001635.27_GRCm39_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:10116',
        fullName: 'Rattus norvegicus',
        shortName: 'Rno',
        jBrowseName: 'Rattus norvegicus',
        apolloName: 'rat',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/RGD/rat/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_036323735.1_GRCr8_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:8355',
        fullName: 'Xenopus laevis',
        shortName: 'Xla',
        jBrowseName: 'Xenopus laevis',
        apolloName: 'x_laevis',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/XenBase/x_laevis/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_017654675.1_Xenopus_laevis_v10.1_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:8364',
        fullName: 'Xenopus tropicalis',
        shortName: 'Xtr',
        jBrowseName: 'Xenopus tropicalis',
        apolloName: 'x_tropicalis',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/XenBase/x_tropicalis/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_000004195.4_UCB_Xtro_10.0_genomic.fna.gz`,
    },
    {
        // Danio rerio.
        //
        // KNOWN GAP (as of Alliance release 9.1.0): zebrafish cannot currently
        // be aligned in PAVI, and the UI shows the honest "no transcript
        // models available" notice. Root cause is an AGR data-publishing gap,
        // not a PAVI bug:
        //   - The Alliance gene API reports zebrafish coordinates on the NEW
        //     assembly GRCz12tu.
        //   - But the transcript NCList tracks for GRCz12tu are NOT yet
        //     published on S3 (`9.1.0/zfin/zebrafish/...` 404s). Only the
        //     OLD GRCz11 tracks exist (last carried at 9.0.0, under the legacy
        //     `zfin/zebrafish-11/` path).
        // There is no coherent (coords + tracks + FASTA) combination to serve:
        // GRCz12 coords against GRCz11 tracks return the wrong region (empty,
        // or — worse — an unrelated locus), so we deliberately do NOT pin the
        // old assembly. This entry stays on the current GRCz12tu form so it
        // starts working automatically once AGR publishes GRCz12tu tracks.
        taxonId: 'NCBITaxon:7955',
        fullName: 'Danio rerio',
        shortName: 'Dre',
        jBrowseName: 'Danio rerio',
        apolloName: 'zebrafish',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/zfin/zebrafish/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_049306965.1_GRCz12tu_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:7227',
        fullName: 'Drosophila melanogaster',
        shortName: 'Dme',
        jBrowseName: 'Drosophila melanogaster',
        apolloName: 'fly',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/FlyBase/fruitfly/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/dmel-all-chromosome-r6.67.fasta.gz`,
    },
    {
        taxonId: 'NCBITaxon:6239',
        fullName: 'Caenorhabditis elegans',
        shortName: 'Cel',
        jBrowseName: 'Caenorhabditis elegans',
        apolloName: 'worm',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/WormBase/c_elegans_PRJNA13758/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_000002985.6_WBcel235_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:559292',
        fullName: 'Saccharomyces cerevisiae',
        shortName: 'Sce',
        jBrowseName: 'Saccharomyces cerevisiae',
        apolloName: 'yeast',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/SGD/yeast/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowsefastaurl: `${S3}/fasta/GCF_000146045.2_R64_genomic.fna.gz`,
    },
    {
        taxonId: 'NCBITaxon:2697049',
        fullName: 'Severe acute respiratory syndrome coronavirus 2',
        shortName: 'SARS-CoV-2',
        jBrowseName: 'SARS-CoV-2',
        apolloName: 'SARS-CoV-2',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/SARS-CoV-2/`,
        jBrowseurltemplate: 'tracks/All Genes/{refseq}/trackData.jsonz',
        jBrowsefastaurl: `${S3}/fasta/GCF_000001405.40_GRCh38.p14_genomic.fna.gz`,
    },
];

/**
 * Look up the JBrowse config for a species by NCBI taxon curie
 * (e.g. `NCBITaxon:7955`). Returns an empty object when unknown, matching the
 * previous agr_ui `getSpecies` contract.
 */
export function getSpecies(taxonId: string): SpeciesConfig {
    // Fall back to an empty object (cast) for unknown taxa, matching the prior
    // agr_ui `getSpecies` contract: callers guard the resulting undefined
    // fields (a transcript fetch then rejects and surfaces the load failure).
    return SPECIES.find((s) => s.taxonId === taxonId) ?? ({} as SpeciesConfig);
}

/**
 * The effective JBrowse data release for a species: its per-species override
 * when set, otherwise the global Alliance release.
 */
export function resolveJBrowseRelease(
    speciesConfig: Partial<SpeciesConfig>,
    globalRelease: string,
): string {
    return speciesConfig.jBrowseDataReleaseOverride ?? globalRelease;
}

// Loosely typed to match the prior (untyped) agr_ui import: callers index in
// with `location['chromosome']` and pass the values straight to the transcript
// fetch, which tolerates/rejects missing coordinates.
type GenomeLocation = Record<string, any>;

/**
 * Pick a single usable genome location from a gene's list of locations.
 * Ported verbatim from agr_ui's `getSingleGenomeLocation`: prefer the sole
 * location, else the last one that has both a start and an end.
 */
export function getSingleGenomeLocation(
    genomeLocations: GenomeLocation[] | undefined,
): GenomeLocation {
    let genomeLocation: GenomeLocation = {};
    if (genomeLocations) {
        if (genomeLocations.length === 1) {
            genomeLocation = genomeLocations[0];
        } else if (genomeLocations.length > 1) {
            for (const tempGenomeLocation of genomeLocations) {
                if (tempGenomeLocation.start && tempGenomeLocation.end) {
                    genomeLocation = tempGenomeLocation;
                }
            }
        }
    }
    return genomeLocation;
}
