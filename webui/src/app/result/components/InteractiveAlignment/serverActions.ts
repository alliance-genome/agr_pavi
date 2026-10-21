'use server';

import { fetchAllPages } from "@/app/helper_fns";
import { fetchAllianceJson } from "@/utils/allianceCache";
import type { VariantAnnotationMap } from "./types";

export interface VariantFunctionalPrediction {
    /** VEP impact bucket for the most-severe consequence (HIGH/MODERATE/LOW/MODIFIER). */
    vepImpact: string | null;
    /** SIFT numeric score (0..1); lower = more deleterious. Null if unknown. */
    siftScore: number | null;
    /** SIFT bucket name (e.g. "deleterious", "tolerated"). */
    siftPrediction: string | null;
    /** PolyPhen numeric score (0..1); higher = more damaging. Null if unknown. */
    polyphenScore: number | null;
    /** PolyPhen bucket name (e.g. "probably_damaging"). */
    polyphenPrediction: string | null;
    /** Most severe consequence name (e.g. "missense_variant"). */
    consequence: string | null;
}

/**
 * Pull SIFT + PolyPhen + VEP impact for a single variant from Alliance.
 *
 * Picks the `mostSevereConsequence` block from the first
 * curatedVariantGenomicLocations entry — that's Alliance's canonical
 * per-variant summary of its worst-case protein effect. Null fields when
 * a species' pipeline didn't produce that prediction (common for
 * non-coding or non-mammalian variants).
 *
 * Cached through fetchAllianceJson so a /result page loading N variants
 * does one upstream call per unique variant_id.
 */
export async function fetchVariantPrediction(variantId: string): Promise<VariantFunctionalPrediction | null> {
    const id = variantId.trim();
    if (!id) return null;
    const url = `https://www.alliancegenome.org/api/variant/${encodeURIComponent(id)}`;
    let body: any;
    try {
        body = await fetchAllianceJson<any>(url, 'variant');
    } catch {
        return null;
    }
    const locs = body?.variantList?.[0]?.curatedVariantGenomicLocations;
    if (!Array.isArray(locs) || locs.length === 0) return null;
    const msc = locs[0]?.mostSevereConsequence;
    if (!msc) return null;
    const asStr = (v: any): string | null =>
        typeof v === 'string' ? v : (v?.name ?? null);
    const asNum = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
        vepImpact: asStr(msc.vepImpact),
        siftScore: asNum(msc.siftScore),
        siftPrediction: asStr(msc.siftPrediction),
        polyphenScore: asNum(msc.polyphenScore),
        polyphenPrediction: asStr(msc.polyphenPrediction),
        consequence: asStr(msc.vepConsequences?.[0]),
    };
}

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
