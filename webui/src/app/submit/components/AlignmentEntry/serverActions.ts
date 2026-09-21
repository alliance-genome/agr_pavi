'use server';

import { GeneInfo, AlleleInfo, GeneSuggestion, VariantConsequence, VariantInfo } from "./types";
import { fetchUntilDistinct } from "@/app/helper_fns";

// Alliance API symbol/displayName fields may carry HTML markup (e.g. <sup>
// for superscript allele suffixes); strip it for plain-text display.
const stripHtml = (s?: string): string => (s ?? '').replace(/<[^>]+>/g, '')

// Adapt the new Alliance gene-summary response shape (everything nested
// under `.gene`, taxon/species split) to the flat GeneInfo shape that
// the rest of the WebUI was written against. Keeps downstream
// consumers (useTranscriptSelection, getSingleGenomeLocation, gene
// display names) working without a wider refactor.
//
// New shape -> old fields:
//   gene.primaryExternalId                                    -> id
//   gene.geneSymbol.displayText                               -> symbol
//   gene.taxon.species  (+ taxon.curie as taxonId)            -> species
//   gene.taxon.species.abbreviation                           -> species.shortName
//   gene.geneGenomicLocationAssociations[].{start,end,strand,
//     geneGenomicLocationAssociationObject.name}              -> genomeLocations[]
//                                                                with .chromosome from .name
function adaptGeneResponse(body: any): GeneInfo | undefined {
    if (!body) return undefined;
    // Backwards compatibility: if the API ever returns the old flat
    // shape again, pass it through unchanged.
    if (body.id && body.symbol && body.species) {
        return body as GeneInfo;
    }
    const g = body.gene;
    if (!g) return undefined;

    const taxonSpecies = g.taxon?.species ?? {};
    const species = {
        ...taxonSpecies,
        // Compatibility shims so older callers that read .shortName or
        // .taxonId off `species` continue to work.
        shortName: taxonSpecies.abbreviation,
        taxonId: g.taxon?.curie,
        name: g.taxon?.name,
    };

    const genomeLocations = (g.geneGenomicLocationAssociations ?? []).map((loc: any) => ({
        start: loc.start,
        end: loc.end,
        strand: loc.strand,
        chromosome: loc.geneGenomicLocationAssociationObject?.name,
        assembly: loc.geneGenomicLocationAssociationObject?.taxon?.species?.assembly_curie,
        ...loc,
    }));

    return {
        id: g.primaryExternalId,
        symbol: g.geneSymbol?.displayText ?? g.primaryExternalId,
        species,
        genomeLocations,
    };
}

export async function fetchGeneInfo (geneId: string): Promise<GeneInfo|undefined> {

    console.log(`New gene info request received.`)

    const jobResponse = fetch(`https://www.alliancegenome.org/api/gene/${geneId}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        }
    })
    .then((response: Response) => {
        if ( 500 <= response.status && response.status <= 599 ){
            // No point in attempting to process the body, as no body is expected.
            throw new Error('Server error received.', {cause: 'server error'})
        }

        return Promise.all([Promise.resolve(response), response.json()]);
    })
    .then(([response, body]) => {
        if (response.ok) {
            console.log(`Gene info for gene ${geneId} received successfully.`)
            return adaptGeneResponse(body);
        } else {
            const errMsg = 'Failure response received from gene API.'
            console.error(errMsg)
            if( 400 <= response.status && response.status <= 499 ){
                throw new Error(errMsg, {cause: 'user error'})
            }
            else{
                console.log('Non user-error response received:', response)
                throw new Error(errMsg, {cause: 'unkown'})
            }

        }
    })
    .catch((e: Error) => {
        console.error('Error caught while requesting gene info:', e)
        return undefined;
    });

    return jobResponse
}

export async function fetchGeneSuggestionsAutocomplete (query: string): Promise<GeneSuggestion[]> {

    console.log(`New gene suggestion search request received.`)

    // The Alliance v9 search reshape:
    //   - /api/search_autocomplete now returns {} for any query.
    //   - /api/search?category=gene&... also returns total=0.
    //   - The working endpoint is /api/search with category=gene_search_result.
    //   - Result records dropped primaryKey/name_key in favor of curie/nameKey.
    const endpointUrl = `https://www.alliancegenome.org/api/search`
    const jobResponse = fetch(`${endpointUrl}?category=gene_search_result&q=${encodeURIComponent(query)}&limit=20`, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        }
    })
    .then((response: Response) => {
        if ( 500 <= response.status && response.status <= 599 ){
            // No point in attempting to process the body, as no body is expected.
            throw new Error('Server error received.', {cause: 'server error'})
        }

        return Promise.all([Promise.resolve(response), response.json()]);
    })
    .then(([response, body]) => {
        if (response.ok) {
            const results = (body?.['results'] ?? []) as unknown[]
            console.log(`Gene suggestions for query '${query}' received: ${results.length} hits`)
            return results as Array<Record<string, unknown>>;
        } else {
            const errMsg = 'Failure response received from gene autocomplete API.'
            console.error(errMsg)
            if( 400 <= response.status && response.status <= 499 ){
                throw new Error(errMsg, {cause: 'user error'})
            }
            else{
                console.log('Non user-error response received:', response)
                throw new Error(errMsg, {cause: 'unkown'})
            }

        }
    })
    .catch((e: Error) => {
        console.error('Error caught while requesting gene autocomplete:', e)
        throw e;
    });

    const suggestions: GeneSuggestion[] = (await jobResponse)
        .map((row): GeneSuggestion | undefined => {
            const id = (row['curie'] ?? row['id'] ?? row['primaryKey']) as string | undefined
            const displayName = (row['nameKey'] ?? row['name_key'] ?? row['name'] ?? row['symbol']) as string | undefined
            if (!id || !displayName) return undefined
            return { id, displayName }
        })
        .filter((s): s is GeneSuggestion => s !== undefined)

    return suggestions
}

export async function fetchAlleles (geneId: string, requiredAlleleIds: string[] = []): Promise<AlleleInfo[]> {
    console.log(`Fetching alleles for gene: ${geneId}`)
    if (requiredAlleleIds.length > 0) {
        console.log(`  requiring ${requiredAlleleIds.length} allele(s) regardless of distinct cap: ${requiredAlleleIds.join(', ')}`)
    }

    const endpointUrl = `https://www.alliancegenome.org/api/gene/${geneId}/allele-variant-detail`

    try {
        // Retrieve all alleleCategory filter values
        const categoriesResponse = await fetch(`${endpointUrl}?filter.alleleCategory=findCategories`, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            },
        });

        if (!categoriesResponse.ok) {
            console.warn(`Allele API returned ${categoriesResponse.status} for gene ${geneId}`)
            return [];
        }

        const categoriesBody = await categoriesResponse.json();

        // Check if we got valid data
        if (!categoriesBody['supplementalData']?.['distinctFieldValues']?.['filter.alleleCategory']) {
            console.warn(`No allele categories found for gene ${geneId}`)
            return [];
        }

        const alleleCategories = Array.from(categoriesBody['supplementalData']['distinctFieldValues']['filter.alleleCategory']);
        console.log(`Allele category query filters received: ${JSON.stringify(alleleCategories)}`)

        // Remove the "allele" option from alleleCategories (we want alleles WITH variants)
        const searchAlleleCategories = alleleCategories.filter(category => category !== 'allele')

        if (searchAlleleCategories.length === 0) {
            console.log(`No alleles with variants found for gene ${geneId}`)
            return [];
        }

        const queryParams = new URLSearchParams()
        queryParams.append('filter.alleleCategory', searchAlleleCategories.join('|'))

        // Alliance returns 1 row per (allele, variant, consequence) triple.
        // Page until we hit MAX_DISTINCT_ALLELES distinct allele.id, with a
        // hard row ceiling to bound payload on extreme cases (e.g. TP53 with
        // 100k+ rows for thousands of distinct alleles).
        const MAX_DISTINCT_ALLELES = 100;
        const MAX_ROWS = 3000;
        console.log(`Fetching allele info for gene ${geneId} (max ${MAX_DISTINCT_ALLELES} distinct alleles, ${MAX_ROWS} rows)`)

        // Adapter for the new Alliance allele-variant-detail response shape.
        // Field map vs the prior shape:
        //   result.allele.id                          -> result.allele.curie
        //   result.allele.symbol                      -> result.symbol            (top-level on the row)
        //   result.allele.hasDisease / hasPhenotype   -> result.hasDisease / hasPhenotype (top-level)
        //   result.variant.id                         -> no direct id; we use allele.curie as the variant key,
        //                                                since each row is one allele/variant pair for filter.alleleCategory=variant
        //   result.variant.displayName                -> result.symbol  or  variant.curatedVariantGenomicLocations[0].hgvs
        //   result.consequence.transcript.id          -> result.consequence.variantTranscript.curie
        //   result.consequence.transcript.name        -> result.consequence.variantTranscript.name
        //   result.consequence.molecularConsequences  -> result.consequence.vepConsequences
        //   result.consequence.impact                 -> result.consequence.vepImpact
        //   result.consequence.siftPrediction         -> removed at this level (use top-level supplementalData filter values)
        //   result.consequence.polyphenPrediction     -> removed at this level
        //   result.consequence.proteinStartPosition   -> removed at this level

        // Named alleles (filter.alleleCategory='allele with one variant')
        // use `primaryExternalId` (e.g. MGI:6157439); variant rows
        // (filter.alleleCategory='variant') use `curie` (e.g. rs146579778).
        // Check both so the example dataset's MGI:* allele IDs can be
        // matched and pre-selected after example load.
        const extractAlleleKey = (row: any): string | undefined =>
            row?.allele?.id
            ?? row?.allele?.primaryExternalId
            ?? row?.allele?.curie

        const results = await fetchUntilDistinct({
            url: endpointUrl,
            urlSearchParams: queryParams,
            keyExtractor: extractAlleleKey,
            maxDistinct: MAX_DISTINCT_ALLELES,
            maxRows: MAX_ROWS,
            requiredKeys: requiredAlleleIds,
        });
        console.log(`Allele info for gene ${geneId} received successfully (${results.length} rows)`)
        if (requiredAlleleIds.length > 0) {
            // Surface any catalog/example IDs the paginated fetch failed to
            // surface, so a silent dropout (the bug this whole requiredKeys
            // path was added to fix) shows up immediately on the next run.
            const seen = new Set(results.map(extractAlleleKey).filter(Boolean) as string[])
            const missing = requiredAlleleIds.filter(id => !seen.has(id))
            if (missing.length > 0) {
                console.warn(`  ${missing.length}/${requiredAlleleIds.length} required allele(s) NOT found: ${missing.join(', ')}`)
            }
        }

        const allelesMap = new Map<string, AlleleInfo>()

        const parseConsequence = (raw: any): VariantConsequence | undefined => {
            if (!raw) return undefined
            // Old shape had `raw.transcript.{id,name}`; new shape has `raw.variantTranscript.{curie,name}`.
            const tx = raw['variantTranscript'] ?? raw['transcript']
            const txId = tx?.['curie'] ?? tx?.['id']
            const txName = tx?.['name']
            // New shape: vepConsequences is an array of objects
            //   { name: 'missense_variant', descendantCount, severityOrder }
            // Old shape: molecularConsequences is an array of plain strings.
            // Normalize to string[] either way so downstream filter UI
            // (MultiSelect options, badge labels) can render them.
            const rawConsequences = Array.isArray(raw['vepConsequences'])
                ? raw['vepConsequences']
                : (Array.isArray(raw['molecularConsequences']) ? raw['molecularConsequences'] : [])
            const consequences: string[] = rawConsequences
                .map((c: unknown) => (typeof c === 'string' ? c : (c as { name?: string })?.name))
                .filter((c): c is string => Boolean(c))
            // vepImpact is also an object { name: 'MODERATE' } in the new shape.
            const rawImpact = raw['vepImpact'] ?? raw['impact']
            const impact = typeof rawImpact === 'string' ? rawImpact : rawImpact?.name
            const proteinPosRaw = raw['proteinStartPosition']
            const proteinPos = proteinPosRaw !== undefined && proteinPosRaw !== null
                ? Number(proteinPosRaw)
                : undefined
            // SIFT and PolyPhen predictions also moved from plain strings
            // to { name } objects in the new Alliance shape.
            const flatten = (v: unknown): string | undefined =>
                typeof v === 'string' ? v : (v as { name?: string })?.name
            return {
                transcriptId: txId,
                transcriptName: txName,
                molecularConsequences: consequences,
                impact,
                proteinStartPosition: Number.isFinite(proteinPos) ? proteinPos as number : undefined,
                sift: flatten(raw['siftPrediction']) as VariantConsequence['sift'],
                polyphen: flatten(raw['polyphenPrediction']) as VariantConsequence['polyphen'],
            }
        }

        const extractVariantDisplayName = (result: any): string =>
            result['variant']?.['displayName']
            ?? result['symbol']
            ?? result['variant']?.['curatedVariantGenomicLocations']?.[0]?.['hgvs']
            ?? extractAlleleKey(result)
            ?? 'variant'

        results.forEach((result: any) => {
            if (result['variant'] === undefined) {
                console.error('Error: allele with undefined variant:', result)
                return;
            }
            const alleleId = extractAlleleKey(result)
            if (!alleleId) {
                console.warn('Allele row without identifier, skipping:', result)
                return
            }
            // Pipeline /api/variant/{id} now only accepts HGVS strings
            // (e.g. "NC_000082.7:g.90017759C>T"). MGI:*, rs*, and other
            // CURIEs return 400. Prefer HGVS so the seq_retrieval stage
            // can actually fetch the variant; fall back to whatever id
            // surrogate is available so dedup still works.
            const hgvs = result['variant']?.['curatedVariantGenomicLocations']?.[0]?.['hgvs']
            const variantId = hgvs
                ?? result['symbol']  // variant rows put HGVS at top-level result.symbol
                ?? result['variant']?.['id']
                ?? result['variant']?.['curie']
                ?? alleleId
            const consequence = parseConsequence(result['consequence'])

            // Named alleles carry their symbol under allele.alleleSymbol.{formatText,displayText}.
            // Variant rows put the genomic-location symbol at the top-level result.symbol.
            // Fall back through both shapes plus the legacy allele.symbol path.
            const alleleSymbol = result['allele']?.['symbol']
                ?? result['allele']?.['alleleSymbol']?.['displayText']
                ?? result['allele']?.['alleleSymbol']?.['formatText']
                ?? result['symbol']

            let allele = allelesMap.get(alleleId)
            if (allele === undefined) {
                allele = {
                    id: alleleId,
                    displayName: stripHtml(alleleSymbol) || alleleId,
                    variants: new Map(),
                    hasDisease: Boolean(result['allele']?.['hasDisease'] ?? result['hasDisease']),
                    hasPhenotype: Boolean(result['allele']?.['hasPhenotype'] ?? result['hasPhenotype']),
                    source: 'gene',
                }
                allelesMap.set(alleleId, allele)
            }

            let variant = allele.variants.get(variantId)
            if (variant === undefined) {
                variant = {
                    id: variantId,
                    displayName: extractVariantDisplayName(result),
                    consequences: [],
                }
                allele.variants.set(variantId, variant)
            }
            if (consequence) {
                variant.consequences.push(consequence)
            }
        })

        return Array.from(allelesMap.values());
    } catch (error) {
        console.error(`Error fetching alleles for gene ${geneId}:`, error)
        return [];
    }
}

// Parse a predictedVariantConsequences[] entry from the /api/variant shape
// (differs from allele-variant-detail: no siftPrediction/polyphenPrediction here).
function parsePredictedConsequence(raw: any): VariantConsequence {
    const tx = raw?.['variantTranscript']
    const consequences: string[] = Array.isArray(raw?.['vepConsequences'])
        ? raw['vepConsequences'].map((c: any) => c?.name).filter(Boolean)
        : []
    const proteinPos = raw?.['calculatedProteinStart']
    return {
        transcriptId: tx?.['curie'] ?? tx?.['name'],
        transcriptName: tx?.['name'],
        molecularConsequences: consequences,
        impact: raw?.['vepImpact']?.['name'],
        proteinStartPosition: (proteinPos !== undefined && proteinPos !== null && Number.isFinite(Number(proteinPos)))
            ? Number(proteinPos) : undefined,
        sift: undefined,
        polyphen: undefined,
    }
}

export async function lookupVariantByHgvs(geneId: string, hgvs: string): Promise<AlleleInfo | null> {
    try {
        const url = `https://www.alliancegenome.org/api/variant/${encodeURIComponent(hgvs)}`
        const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
        if (!response.ok) return null
        const body = await response.json()

        const geneIds: string[] = Array.isArray(body?.['geneIds']) ? body['geneIds'] : []
        if (!geneIds.includes(geneId)) return null

        const loc = body?.['variantList']?.[0]?.['curatedVariantGenomicLocations']?.[0]
        if (!loc) return null
        const resolvedHgvs: string = loc['hgvs'] ?? hgvs

        const consequences = Array.isArray(loc['predictedVariantConsequences'])
            ? loc['predictedVariantConsequences'].map(parsePredictedConsequence)
            : []

        const alleleId: string = body?.['allele']?.['primaryExternalId'] ?? resolvedHgvs
        const displayName = stripHtml(body?.['symbol']) || resolvedHgvs

        const variants = new Map<string, VariantInfo>()
        variants.set(resolvedHgvs, { id: resolvedHgvs, displayName: resolvedHgvs, consequences })

        return {
            id: alleleId,
            displayName,
            variants,
            hasDisease: Boolean(body?.['hasDisease']),
            hasPhenotype: Boolean(body?.['hasPhenotype']),
            source: 'lookup',
        }
    } catch (error) {
        console.error(`Error looking up variant ${hgvs} for gene ${geneId}:`, error)
        return null
    }
}

export async function searchVariants(
    geneId: string, geneSymbol: string, speciesName: string, query: string, limit = 15
): Promise<AlleleInfo[]> {
    try {
        const params = new URLSearchParams({
            category: 'variant_search_result',
            q: query,
            limit: String(Math.max(1, limit) * 3), // over-fetch; we filter by gene then trim
        })
        if (speciesName) params.append('species', speciesName)
        const url = `https://www.alliancegenome.org/api/search?${params.toString()}`
        const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
        if (!response.ok) return []
        const body = await response.json()
        const results: any[] = Array.isArray(body?.['results']) ? body['results'] : []

        const symbolLc = geneSymbol.toLowerCase()
        const speciesLc = speciesName.toLowerCase()
        const matchesGene = (r: any): boolean =>
            (!speciesName || r?.['species']?.toLowerCase?.() === speciesLc) &&
            Array.isArray(r?.['genes']) &&
            r['genes'].some((g: string) => typeof g === 'string' &&
                g.toLowerCase().split(' ')[0] === symbolLc)

        const seen = new Set<string>()
        const alleles: AlleleInfo[] = []
        for (const r of results) {
            const hgvs = r?.['name']
            if (!hgvs || typeof hgvs !== 'string' || seen.has(hgvs)) continue
            if (!matchesGene(r)) continue
            seen.add(hgvs)
            const variants = new Map<string, VariantInfo>()
            variants.set(hgvs, { id: hgvs, displayName: hgvs, consequences: [] })
            alleles.push({
                id: hgvs, displayName: hgvs, variants,
                hasDisease: false, hasPhenotype: false, source: 'search',
            })
            if (alleles.length >= limit) break
        }
        return alleles
    } catch (error) {
        console.error(`Error searching variants for gene ${geneId} (q="${query}"):`, error)
        return []
    }
}

// Best-effort lookup of an allele by its NAME (e.g. C. elegans "n1046"),
// scoped to the current gene. The Alliance allele_search_result index carries
// the allele symbol AND its genomic HGVS strings directly (`variants: [...]`),
// so a name query resolves straight to a pipeline-ready HGVS — no chaining.
// This is the path that lets a user type "n1046" and have the variant appear;
// the variant_search_result index used by searchVariants does not match
// allele names.
export async function searchAllelesByName(
    geneId: string, geneSymbol: string, speciesName: string, query: string, limit = 15
): Promise<AlleleInfo[]> {
    try {
        const params = new URLSearchParams({
            category: 'allele_search_result',
            q: query,
            limit: String(Math.max(1, limit) * 3), // over-fetch; filter by gene then trim
        })
        if (speciesName) params.append('species', speciesName)
        const url = `https://www.alliancegenome.org/api/search?${params.toString()}`
        const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
        if (!response.ok) return []
        const body = await response.json()
        const results: any[] = Array.isArray(body?.['results']) ? body['results'] : []

        const symbolLc = geneSymbol.toLowerCase()
        const speciesLc = speciesName.toLowerCase()
        const matchesGene = (r: any): boolean =>
            (!speciesName || r?.['species']?.toLowerCase?.() === speciesLc) &&
            Array.isArray(r?.['genes']) &&
            r['genes'].some((g: string) => typeof g === 'string' &&
                g.toLowerCase().split(' ')[0] === symbolLc)

        // Only genomic HGVS (e.g. NC_...:g.123A>T) is usable by the pipeline.
        const isGenomicHgvs = (v: unknown): v is string =>
            typeof v === 'string' && /:g\.\d/.test(v)

        const seen = new Set<string>()
        const alleles: AlleleInfo[] = []
        for (const r of results) {
            if (!matchesGene(r)) continue
            const hgvsList: string[] = (Array.isArray(r?.['variants']) ? r['variants'] : []).filter(isGenomicHgvs)
            if (hgvsList.length === 0) continue
            const alleleId: string = r?.['id'] ?? r?.['primaryKey'] ?? (stripHtml(r?.['symbol']) || hgvsList[0])
            if (seen.has(alleleId)) continue
            seen.add(alleleId)
            const displayName = stripHtml(r?.['symbol'] ?? r?.['name']) || alleleId
            const variants = new Map<string, VariantInfo>()
            for (const hgvs of hgvsList) {
                if (!variants.has(hgvs)) variants.set(hgvs, { id: hgvs, displayName: hgvs, consequences: [] })
            }
            alleles.push({
                id: alleleId, displayName, variants,
                hasDisease: false, hasPhenotype: false, source: 'search',
            })
            if (alleles.length >= limit) break
        }
        return alleles
    } catch (error) {
        console.error(`Error searching alleles by name for gene ${geneId} (q="${query}"):`, error)
        return []
    }
}
