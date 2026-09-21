import { SimpleFeatureSerialized } from './types';
type TargetGeneFeature = SimpleFeatureSerialized & {
    alias?: string | string[];
    curie?: string;
    gene_id?: string;
};
export declare function featureMatchesTargetGene(feature: TargetGeneFeature, geneSymbol?: string, geneId?: string): boolean;
export declare function filterTrackDataForTargetGene(data: SimpleFeatureSerialized[], geneSymbol?: string, geneId?: string): SimpleFeatureSerialized[];
export {};
