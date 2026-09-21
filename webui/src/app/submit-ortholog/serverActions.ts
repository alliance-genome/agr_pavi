'use server';

import { fetchAllPages } from "@/app/helper_fns";

export interface OrthologInfo {
    geneId: string;
    symbol: string;
    species: string;
    taxonId: string;
}

export interface OrthologResult {
    sourceGene: OrthologInfo;
    orthologs: OrthologInfo[];
}

// Alliance model organism taxon IDs for filtering
const AGR_SPECIES_TAXONS = new Set([
    'NCBITaxon:9606',   // Homo sapiens
    'NCBITaxon:10090',  // Mus musculus
    'NCBITaxon:10116',  // Rattus norvegicus
    'NCBITaxon:7955',   // Danio rerio
    'NCBITaxon:7227',   // Drosophila melanogaster
    'NCBITaxon:6239',   // Caenorhabditis elegans
    'NCBITaxon:559292', // Saccharomyces cerevisiae
    'NCBITaxon:8364',   // Xenopus tropicalis
]);

export async function fetchOrthologs(geneId: string): Promise<OrthologResult> {
    const endpointUrl = `https://www.alliancegenome.org/api/gene/${geneId}/orthologs`;
    const queryParams = new URLSearchParams({
        'filter.stringency': 'stringent',
    });

    const results = await fetchAllPages({
        url: endpointUrl,
        urlSearchParams: queryParams,
        maxResults: 100,
    });

    let sourceGene: OrthologInfo | null = null;
    const seen = new Set<string>();
    const orthologs: OrthologInfo[] = [];

    for (const entry of results) {
        const orthoData = entry.geneToGeneOrthologyGenerated;
        if (!orthoData) continue;

        // Extract source gene from first entry
        if (!sourceGene && orthoData.subjectGene) {
            const sg = orthoData.subjectGene;
            sourceGene = {
                geneId: sg.primaryExternalId || '',
                symbol: sg.geneSymbol?.displayText || '',
                species: sg.taxon?.name || '',
                taxonId: sg.taxon?.curie || '',
            };
        }

        // Extract ortholog
        const og = orthoData.objectGene;
        if (!og || !og.primaryExternalId) continue;
        if (seen.has(og.primaryExternalId)) continue;
        seen.add(og.primaryExternalId);

        orthologs.push({
            geneId: og.primaryExternalId,
            symbol: og.geneSymbol?.displayText || og.primaryExternalId,
            species: og.taxon?.name || '',
            taxonId: og.taxon?.curie || '',
        });
    }

    // Sort: AGR species first, then alphabetically by species
    orthologs.sort((a, b) => {
        const aIsAgr = AGR_SPECIES_TAXONS.has(a.taxonId);
        const bIsAgr = AGR_SPECIES_TAXONS.has(b.taxonId);
        if (aIsAgr && !bIsAgr) return -1;
        if (!aIsAgr && bIsAgr) return 1;
        return a.species.localeCompare(b.species);
    });

    return {
        sourceGene: sourceGene || { geneId, symbol: geneId, species: '', taxonId: '' },
        orthologs,
    };
}
