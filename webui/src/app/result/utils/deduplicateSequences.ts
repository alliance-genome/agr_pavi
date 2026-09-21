/**
 * Utility functions for deduplicating alignment sequences.
 *
 * When the same transcript is submitted multiple times with different alleles
 * (enabled by KANBAN-816), the alignment result contains duplicate reference
 * sequences. This utility removes duplicates while preserving all variant sequences.
 *
 * Sequence naming convention:
 * - Reference: `{index}_{geneSymbol}_{transcriptName}` (e.g., `000_Trp53_NM_011640.3`)
 * - Variant: `{index}_{geneSymbol}_{transcriptName}_{suffix}` (e.g., `000_Trp53_NM_011640.3_alt1`)
 *
 * @see KANBAN-727
 */

import { parse } from 'clustal-js';
import { SeqInfoDict } from '../components/InteractiveAlignment/types';

/**
 * Parsed sequence from Clustal alignment
 */
interface ParsedSequence {
    id: string;
    seq: string;
}

/**
 * Result of deduplication operation
 */
export interface DeduplicationResult {
    /** Deduplicated alignment string in Clustal format */
    alignmentResult: string;
    /** Deduplicated sequence info dictionary */
    seqInfoDict: SeqInfoDict;
    /** Number of duplicate references removed */
    duplicatesRemoved: number;
}

/**
 * Extracts the base sequence name by removing the numeric prefix.
 * Example: "000_Trp53_NM_011640.3" → "Trp53_NM_011640.3"
 */
export function extractBaseName(sequenceName: string): string {
    return sequenceName.replace(/^\d+_/, '');
}

/**
 * Determines if a sequence is a reference (not a variant).
 * Variant sequences have a suffix after the transcript name (e.g., _alt1, _AlleleName).
 *
 * We identify references by checking if they have embedded_variants in seqInfoDict.
 * If a sequence has no embedded_variants, it's a reference.
 * If seqInfoDict is not available, we fall back to name-based heuristics.
 */
export function isReferenceSequence(
    sequenceName: string,
    seqInfoDict?: SeqInfoDict
): boolean {
    // If we have seqInfoDict, use it for accurate determination
    if (seqInfoDict && sequenceName in seqInfoDict) {
        const seqInfo = seqInfoDict[sequenceName];
        // Reference sequences don't have embedded variants
        return !seqInfo.embedded_variants || seqInfo.embedded_variants.length === 0;
    }

    // Fallback: Use naming convention heuristics
    // Variant sequences typically have suffixes like _alt1, _alt2, or allele names
    const baseName = extractBaseName(sequenceName);

    // Check for common variant suffixes
    // Pattern: base name followed by _alt{N} or other allele identifier
    const variantSuffixPattern = /_alt\d+$/i;
    if (variantSuffixPattern.test(baseName)) {
        return false;
    }

    // Additional heuristic: if the name has 4+ underscore-separated parts
    // after removing the index, it's likely a variant
    // Reference: Gene_Transcript (2 parts)
    // Variant: Gene_Transcript_AlleleSuffix (3+ parts)
    const parts = baseName.split('_');
    // A typical reference has format: GeneSymbol_TranscriptID
    // Allow for gene symbols with underscores by checking for transcript ID patterns
    const hasTranscriptPattern = parts.some(part =>
        /^(NM_|ENSMUST|ENSMUSG|ENST|ENSG|WBGene|FBgn|FBtr|ZDB-|SGD:|RGD:)/i.test(part) ||
        /^\d{6,}$/.test(part) // Just a long number (like part of ENSEMBL ID)
    );

    // If we can identify transcript pattern, anything after it is likely variant suffix
    if (hasTranscriptPattern) {
        // Find the transcript part
        const transcriptPartIndex = parts.findIndex(part =>
            /^(NM_|ENSMUST|ENSMUSG|ENST|ENSG|WBGene|FBgn|FBtr|ZDB-|SGD:|RGD:)/i.test(part)
        );
        if (transcriptPartIndex >= 0) {
            // Check if there are parts after the transcript
            // Some transcript IDs span multiple parts (e.g., NM_011640.3)
            // So we need to be careful here
            // For now, assume transcript is the last part for references
            return transcriptPartIndex === parts.length - 1 ||
                   // Or the next part is just a version number
                   (transcriptPartIndex === parts.length - 2 && /^\d+$/.test(parts[parts.length - 1]));
        }
    }

    // Default: assume it's a reference if we can't determine otherwise
    return true;
}

/**
 * Deduplicates reference sequences from alignment data.
 *
 * @param alignmentResult - Raw Clustal alignment string
 * @param seqInfoDict - Sequence info dictionary from API
 * @returns Deduplicated alignment data
 */
export function deduplicateSequences(
    alignmentResult: string,
    seqInfoDict: SeqInfoDict
): DeduplicationResult {
    if (!alignmentResult) {
        return {
            alignmentResult: '',
            seqInfoDict: {},
            duplicatesRemoved: 0
        };
    }

    // Parse the alignment
    const parsed = parse(alignmentResult);
    const sequences: ParsedSequence[] = parsed.alns || [];

    if (sequences.length === 0) {
        return {
            alignmentResult,
            seqInfoDict,
            duplicatesRemoved: 0
        };
    }

    // Track seen reference base names
    const seenReferenceBaseNames = new Set<string>();
    const deduplicatedSequences: ParsedSequence[] = [];
    const deduplicatedSeqInfoDict: SeqInfoDict = {};
    let duplicatesRemoved = 0;

    for (const seq of sequences) {
        const isRef = isReferenceSequence(seq.id, seqInfoDict);

        if (isRef) {
            const baseName = extractBaseName(seq.id);

            if (seenReferenceBaseNames.has(baseName)) {
                // Skip duplicate reference
                duplicatesRemoved++;
                continue;
            }

            seenReferenceBaseNames.add(baseName);
        }

        // Keep this sequence
        deduplicatedSequences.push(seq);

        // Copy seq info if it exists
        if (seq.id in seqInfoDict) {
            deduplicatedSeqInfoDict[seq.id] = seqInfoDict[seq.id];
        }
    }

    // Rebuild Clustal format alignment string
    const rebuiltAlignment = rebuildClustalString(deduplicatedSequences);

    return {
        alignmentResult: rebuiltAlignment,
        seqInfoDict: deduplicatedSeqInfoDict,
        duplicatesRemoved
    };
}

/**
 * Rebuilds a Clustal-format alignment string from parsed sequences.
 */
function rebuildClustalString(sequences: ParsedSequence[]): string {
    if (sequences.length === 0) return '';

    const lines: string[] = ['CLUSTAL O(1.2.4) multiple sequence alignment', ''];

    // Calculate max name length for formatting
    const maxNameLen = Math.max(...sequences.map(s => s.id.length), 10);
    const blockSize = 60;

    // Get the sequence length (all should be same length after alignment)
    const seqLength = sequences[0]?.seq.length || 0;

    // Output in blocks of 60 characters
    for (let blockStart = 0; blockStart < seqLength; blockStart += blockSize) {
        for (const seq of sequences) {
            const seqBlock = seq.seq.slice(blockStart, blockStart + blockSize);
            const paddedName = seq.id.padEnd(maxNameLen + 6);
            lines.push(`${paddedName}${seqBlock}`);
        }
        lines.push(''); // Blank line between blocks
    }

    return lines.join('\n');
}
