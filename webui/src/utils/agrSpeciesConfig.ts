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
 *  - Owning the config lets PAVI keep a *coherent* (transcript-track + FASTA
 *    assembly) pair per species, which the pipeline requires: transcript exon
 *    coordinates come from the GFF and are spliced against `jBrowsefastaurl`,
 *    so the two MUST be the same genome assembly.
 *
 * Keep this in sync deliberately (not automatically) with agr_ui's SPECIES.
 * Transcript models are fetched from `jBrowseGffurltemplate` (tabix GFF, the
 * current AGR format); the `jBrowsenclist*` fields are the deprecated NCList
 * source, retained only for the legacy "View transcripts" viewer.
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
    /** NCList base URL, with a `{release}` placeholder. (Legacy; visualization only.) */
    jBrowsenclistbaseurltemplate: string;
    /** Per-refseq track path appended to the NCList base URL. */
    jBrowseurltemplate: string;
    /**
     * Tabix-indexed GFF URL for transcript models, with a `{release}`
     * placeholder (e.g. `.../{release}/zfin/zebrafish/GFF_ZFIN.sorted.gff.gz`).
     * This is the CURRENT transcript source; the NCList fields above are the
     * deprecated one AGR migrated away from. MUST be the same genome assembly
     * as `jBrowsefastaurl` (exon coords are spliced against that FASTA).
     */
    jBrowseGffurltemplate: string;
    /** Reference genome FASTA. MUST match the assembly of the GFF above. */
    jBrowsefastaurl: string;
    /**
     * When set, this species uses this JBrowse data release instead of the
     * global Alliance release. Use it to pin a species to a release whose
     * tracks still exist / match `jBrowsefastaurl`.
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/human/GFF_HUMAN.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/MGI/mouse/GFF_MGI.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/RGD/rat/GFF_RGD.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/XenBase/x_laevis/GFF_XBXL.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/XenBase/x_tropicalis/GFF_XBXT.sorted.gff.gz`,
        jBrowsefastaurl: `${S3}/fasta/GCF_000004195.4_UCB_Xtro_10.0_genomic.fna.gz`,
    },
    {
        // Danio rerio — current assembly (GRCz12tu), via the tabix GFF.
        //
        // Zebrafish transcripts come from the current-assembly GFF
        // (zfin/zebrafish/GFF_ZFIN.sorted.gff.gz, GRCz12tu), matching the
        // GRCz12tu coordinates the Alliance gene API returns and the GRCz12tu
        // FASTA below. The old NCList `zfin/zebrafish-11/` (GRCz11) tracks that
        // this used to be pinned to are deprecated; the nclist fields remain
        // only for the legacy "View transcripts" viewer and are not used for
        // alignment. (The prior 9.0.0/GRCz11 pin + release override are gone.)
        taxonId: 'NCBITaxon:7955',
        fullName: 'Danio rerio',
        shortName: 'Dre',
        jBrowseName: 'Danio rerio',
        apolloName: 'zebrafish',
        jBrowsenclistbaseurltemplate: `${S3}/docker/{release}/zfin/zebrafish/`,
        jBrowseurltemplate: ALL_GENES,
        jBrowseGffurltemplate: `${S3}/docker/{release}/zfin/zebrafish/GFF_ZFIN.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/FlyBase/fruitfly/GFF_FB.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/WormBase/c_elegans_PRJNA13758/GFF_WB.sorted.gff.gz`,
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
        jBrowseGffurltemplate: `${S3}/docker/{release}/SGD/yeast/GFF_SGD.sorted.gff.gz`,
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
        // No AGR tabix GFF published for SARS-CoV-2; it is not an alignment
        // target here, so leave the GFF template empty (a fetch would surface a
        // load failure, same as any species with no transcript data).
        jBrowseGffurltemplate: '',
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

/**
 * Resolve a species' tabix-GFF transcript-track URL for a release: substitutes
 * `{release}` (honouring any per-species override) into `jBrowseGffurltemplate`.
 * Returns an empty string when the species has no GFF configured.
 */
export function gffFileUrl(
    speciesConfig: Partial<SpeciesConfig>,
    globalRelease: string,
): string {
    const template = speciesConfig.jBrowseGffurltemplate;
    if (!template) return '';
    return template.replace('{release}', resolveJBrowseRelease(speciesConfig, globalRelease));
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
