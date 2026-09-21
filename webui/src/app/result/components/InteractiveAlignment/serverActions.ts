'use server';

import { fetchAllPages } from "@/app/helper_fns";
import type { VariantAnnotationMap } from "./types";

/**
 * Fetch disease/phenotype annotation flags for all variants associated with a gene.
 * Queries Alliance gene/alleles endpoint and builds a lookup table keyed by variant ID.
 */
export async function fetchVariantAnnotations(geneId: string): Promise<VariantAnnotationMap> {
    const annotations: VariantAnnotationMap = {};

    try {
        const endpointUrl = `https://www.alliancegenome.org/api/gene/${geneId}/alleles`;
        const queryParams = new URLSearchParams({
            'filter.hasVariants': 'true',
        });

        const MAX_RESULTS = 500;
        const results = await fetchAllPages({
            url: endpointUrl,
            urlSearchParams: queryParams,
            maxResults: MAX_RESULTS
        });

        for (const allele of results) {
            const alleleId = allele.id || '';
            const alleleSymbol = allele.symbol || allele.symbolText || alleleId;
            const hasDisease = allele.hasDisease === true;
            const hasPhenotype = allele.hasPhenotype === true;

            // Each allele has a variants[] array with variant objects
            const variants = allele.variants || [];
            for (const variant of variants) {
                const variantId = variant.id || variant.displayName;
                if (variantId) {
                    annotations[variantId] = {
                        alleleId,
                        alleleSymbol,
                        hasDisease,
                        hasPhenotype,
                    };
                }
            }
        }
    } catch (e) {
        console.error(`Error fetching variant annotations for gene ${geneId}:`, e);
    }

    return annotations;
}
