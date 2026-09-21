// Transcript biotypes the genomefeatures ISOFORM renderer recognises.
// Copied from agr_ui src/lib/genomeFeatureTypes.js getTranscriptTypes() so
// PAVI does not need a second cross-repo runtime import for a static list.
export const TRANSCRIPT_TYPES: string[] = [
    'mRNA', 'ncRNA', 'piRNA', 'lincRNA', 'miRNA', 'pre_miRNA', 'snoRNA',
    'lnc_RNA', 'tRNA', 'snRNA', 'rRNA', 'ARS', 'antisense_RNA',
    'C_gene_segment', 'V_gene_segment', 'pseudogene_attribute',
    'pseudogenic_transcript', 'snoRNA_gene', 'mature_protein_region',
    'telomerase_RNA', 'transposable_element', 'enzymatic_RNA',
    'RNase_MRP_RNA', 'RNase_P_RNA', 'transcript',
];

export interface ViewerRegion {
    chromosome: string;
    start: number;
    end: number;
}

// The genomefeatures NCList track lives under a per-species, per-release,
// per-chromosome path. The species template carries a `{release}`
// placeholder and a trailing slash (e.g.
// ".../docker/{release}/human/"); we substitute the release and append
// the All_Genes trackData file for the chromosome.
export function buildNcListUrl(
    nclistBaseTemplate: string,
    release: string,
    chromosome: string
): string {
    return (
        nclistBaseTemplate.replace('{release}', release) +
        `tracks/All_Genes/${chromosome}/trackData.jsonz`
    );
}

export interface IsoformTrackConfig {
    region: ViewerRegion;
    genome: string;
    transcriptTypes: string[];
    htpVariant: string;
    tracks: Array<{
        type: 'ISOFORM';
        trackData: unknown;
        geneBounds: { start: number; end: number };
        geneSymbol: string;
        geneId: string;
        speciesTaxonId: string;
    }>;
}

export interface BuildIsoformConfigParams {
    region: ViewerRegion;
    apolloName: string;
    geneSymbol: string;
    geneId: string;
    speciesTaxonId: string;
    trackData: unknown;
}

// Assemble the ISOFORM-only track config genomefeatures expects. Mirrors
// the shape agr_ui builds in genomeFeatureWrapper.jsx for displayType
// 'ISOFORM'. PAVI shows a single gene, so the display region and the gene
// bounds are the gene's own genome location.
export function buildIsoformTrackConfig(
    p: BuildIsoformConfigParams
): IsoformTrackConfig {
    return {
        region: p.region,
        genome: p.apolloName,
        transcriptTypes: TRANSCRIPT_TYPES,
        htpVariant: '',
        tracks: [
            {
                type: 'ISOFORM',
                trackData: p.trackData,
                geneBounds: { start: p.region.start, end: p.region.end },
                geneSymbol: p.geneSymbol,
                geneId: p.geneId,
                speciesTaxonId: p.speciesTaxonId,
            },
        ],
    };
}
