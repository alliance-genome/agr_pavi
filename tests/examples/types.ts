// Shared types for the example catalog (`tests/examples/catalog.json`).
// Consumed by the WebUI ExampleDataLoader and by the pavi-cli runner via
// catalog.json (the CLI parses JSON directly; the WebUI imports this
// module which re-exports the typed payload).

export type ExampleCategory = 'basic' | 'cross-species' | 'advanced'

export interface CatalogGene {
    readonly geneId: string
    readonly geneName: string
    readonly species: string
    readonly alleleIds?: readonly string[]
    /**
     * UniProt accession for the canonical protein isoform of this gene,
     * used by `pavi-cli verify-sequences` as an external truth check
     * against the pipeline's translated protein output. Optional — leave
     * unset for genes without a clear canonical (e.g. paralogs where the
     * UniProt mapping is ambiguous).
     */
    readonly uniprotAccession?: string
}

export interface CatalogExpectations {
    /** Minimum number of aligned sequences in `aligned_seq_info.json`. */
    readonly minSequenceCount: number
    /**
     * Minimum pairwise identity (%) for the most-similar sequence pair in
     * the alignment. Tolerant — Alliance data drift may shift exact
     * numbers, so we only assert the *most similar* pair clears a
     * biologically sane floor.
     */
    readonly minMaxPairwiseIdentityPct: number
    /**
     * Minimum total `embedded_variants` across the alignment. Examples
     * without `alleleIds` set this to 0; examples that pre-select
     * MOD-curated alleles assert >= number expected to survive
     * coding/UTR filtering on the result page.
     */
    readonly minEmbeddedVariantsTotal: number
    /**
     * Each entry must appear in at least one variant's
     * `molecular_consequences` list. Empty when the example does not
     * pre-select alleles.
     */
    readonly expectedConsequenceCategories: readonly string[]
}

export interface CatalogExample {
    readonly id: string
    readonly name: string
    readonly category: ExampleCategory
    readonly description: string
    readonly genes: readonly CatalogGene[]
    readonly expectations: CatalogExpectations
}

export interface ExampleCatalog {
    readonly version: number
    readonly examples: readonly CatalogExample[]
}
