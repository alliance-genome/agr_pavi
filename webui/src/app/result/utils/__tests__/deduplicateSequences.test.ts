/**
 * Tests for deduplicateSequences utility
 * @see KANBAN-727
 */

import { describe, expect, it } from '@jest/globals';
import {
    extractBaseName,
    isReferenceSequence,
    deduplicateSequences
} from '../deduplicateSequences';
import { SeqInfoDict } from '../../components/InteractiveAlignment/types';

describe('extractBaseName', () => {
    it('removes numeric prefix from sequence name', () => {
        expect(extractBaseName('000_Trp53_NM_011640.3')).toBe('Trp53_NM_011640.3');
        expect(extractBaseName('001_Trp53_NM_011640.3')).toBe('Trp53_NM_011640.3');
        expect(extractBaseName('123_Gene_Transcript')).toBe('Gene_Transcript');
    });

    it('handles names without numeric prefix', () => {
        expect(extractBaseName('Trp53_NM_011640.3')).toBe('Trp53_NM_011640.3');
        expect(extractBaseName('Gene_Transcript')).toBe('Gene_Transcript');
    });

    it('handles variant sequence names', () => {
        expect(extractBaseName('000_Trp53_NM_011640.3_alt1')).toBe('Trp53_NM_011640.3_alt1');
        expect(extractBaseName('001_Trp53_NM_011640.3_MyAllele')).toBe('Trp53_NM_011640.3_MyAllele');
    });
});

describe('isReferenceSequence', () => {
    const mockSeqInfoDict: SeqInfoDict = {
        '000_Trp53_NM_011640.3': {}, // Reference - no embedded_variants
        '000_Trp53_NM_011640.3_alt1': {
            embedded_variants: [{
                alignment_start_pos: 10,
                alignment_end_pos: 10,
                seq_start_pos: 10,
                seq_end_pos: 10,
                seq_length: 1,
                variant_id: 'var1',
                genomic_seq_id: 'chr1',
                genomic_start_pos: 100,
                genomic_end_pos: 100,
                genomic_ref_seq: 'A',
                genomic_alt_seq: 'G',
                seq_substitution_type: 'substitution'
            }]
        },
        '001_Trp53_NM_011640.3': {}, // Duplicate reference
        '001_Trp53_NM_011640.3_alt1': {
            embedded_variants: [{
                alignment_start_pos: 20,
                alignment_end_pos: 20,
                seq_start_pos: 20,
                seq_end_pos: 20,
                seq_length: 1,
                variant_id: 'var2',
                genomic_seq_id: 'chr1',
                genomic_start_pos: 200,
                genomic_end_pos: 200,
                genomic_ref_seq: 'C',
                genomic_alt_seq: 'T',
                seq_substitution_type: 'substitution'
            }]
        }
    };

    it('identifies reference sequences using seqInfoDict', () => {
        expect(isReferenceSequence('000_Trp53_NM_011640.3', mockSeqInfoDict)).toBe(true);
        expect(isReferenceSequence('001_Trp53_NM_011640.3', mockSeqInfoDict)).toBe(true);
    });

    it('identifies variant sequences using seqInfoDict', () => {
        expect(isReferenceSequence('000_Trp53_NM_011640.3_alt1', mockSeqInfoDict)).toBe(false);
        expect(isReferenceSequence('001_Trp53_NM_011640.3_alt1', mockSeqInfoDict)).toBe(false);
    });

    it('falls back to naming heuristics when seqInfoDict unavailable', () => {
        // _alt suffix indicates variant
        expect(isReferenceSequence('000_Trp53_NM_011640.3_alt1')).toBe(false);
        expect(isReferenceSequence('000_Trp53_NM_011640.3_alt2')).toBe(false);
    });
});

describe('deduplicateSequences', () => {
    // Mock Clustal alignment with duplicate references
    const mockAlignmentWithDuplicates = `CLUSTAL O(1.2.4) multiple sequence alignment

000_Trp53_NM_011640.3       MKTAYILDSKSRFQSVLG
000_Trp53_NM_011640.3_alt1  MKTAYILDSKSRFQSVLG
001_Trp53_NM_011640.3       MKTAYILDSKSRFQSVLG
001_Trp53_NM_011640.3_alt1  MKTAYILDSKSRFQSVLG
002_Trp53_NM_011640.3       MKTAYILDSKSRFQSVLG
002_Trp53_NM_011640.3_alt1  MKTAYILDSKSRFQSVLG
`;

    const mockSeqInfoDict: SeqInfoDict = {
        '000_Trp53_NM_011640.3': {},
        '000_Trp53_NM_011640.3_alt1': {
            embedded_variants: [{
                alignment_start_pos: 5,
                alignment_end_pos: 5,
                seq_start_pos: 5,
                seq_end_pos: 5,
                seq_length: 1,
                variant_id: 'varA',
                genomic_seq_id: 'chr11',
                genomic_start_pos: 100,
                genomic_end_pos: 100,
                genomic_ref_seq: 'T',
                genomic_alt_seq: 'A',
                seq_substitution_type: 'substitution'
            }]
        },
        '001_Trp53_NM_011640.3': {},
        '001_Trp53_NM_011640.3_alt1': {
            embedded_variants: [{
                alignment_start_pos: 10,
                alignment_end_pos: 10,
                seq_start_pos: 10,
                seq_end_pos: 10,
                seq_length: 1,
                variant_id: 'varB',
                genomic_seq_id: 'chr11',
                genomic_start_pos: 200,
                genomic_end_pos: 200,
                genomic_ref_seq: 'G',
                genomic_alt_seq: 'C',
                seq_substitution_type: 'substitution'
            }]
        },
        '002_Trp53_NM_011640.3': {},
        '002_Trp53_NM_011640.3_alt1': {
            embedded_variants: [{
                alignment_start_pos: 15,
                alignment_end_pos: 15,
                seq_start_pos: 15,
                seq_end_pos: 15,
                seq_length: 1,
                variant_id: 'varC',
                genomic_seq_id: 'chr11',
                genomic_start_pos: 300,
                genomic_end_pos: 300,
                genomic_ref_seq: 'A',
                genomic_alt_seq: 'T',
                seq_substitution_type: 'substitution'
            }]
        }
    };

    it('removes duplicate reference sequences', () => {
        const result = deduplicateSequences(mockAlignmentWithDuplicates, mockSeqInfoDict);

        expect(result.duplicatesRemoved).toBe(2); // 001 and 002 references removed
    });

    it('keeps all variant sequences', () => {
        const result = deduplicateSequences(mockAlignmentWithDuplicates, mockSeqInfoDict);

        // Should contain all 3 variant sequences
        expect(result.alignmentResult).toContain('000_Trp53_NM_011640.3_alt1');
        expect(result.alignmentResult).toContain('001_Trp53_NM_011640.3_alt1');
        expect(result.alignmentResult).toContain('002_Trp53_NM_011640.3_alt1');
    });

    it('keeps only one reference per unique transcript', () => {
        const result = deduplicateSequences(mockAlignmentWithDuplicates, mockSeqInfoDict);

        // Count occurrences of base reference name (without _alt suffix)
        const refMatches = result.alignmentResult.match(/\d{3}_Trp53_NM_011640\.3\s/g);
        expect(refMatches?.length).toBe(1); // Only one reference
    });

    it('deduplicates seqInfoDict correctly', () => {
        const result = deduplicateSequences(mockAlignmentWithDuplicates, mockSeqInfoDict);

        // Should have 4 entries: 1 reference + 3 variants
        const keys = Object.keys(result.seqInfoDict);
        expect(keys.length).toBe(4);

        // Should have the first reference
        expect('000_Trp53_NM_011640.3' in result.seqInfoDict).toBe(true);

        // Should NOT have duplicate references
        expect('001_Trp53_NM_011640.3' in result.seqInfoDict).toBe(false);
        expect('002_Trp53_NM_011640.3' in result.seqInfoDict).toBe(false);

        // Should have all variants
        expect('000_Trp53_NM_011640.3_alt1' in result.seqInfoDict).toBe(true);
        expect('001_Trp53_NM_011640.3_alt1' in result.seqInfoDict).toBe(true);
        expect('002_Trp53_NM_011640.3_alt1' in result.seqInfoDict).toBe(true);
    });

    it('handles empty alignment', () => {
        const result = deduplicateSequences('', {});

        expect(result.alignmentResult).toBe('');
        expect(result.seqInfoDict).toEqual({});
        expect(result.duplicatesRemoved).toBe(0);
    });

    it('handles alignment with no duplicates', () => {
        const noDuplicatesAlignment = `CLUSTAL O(1.2.4) multiple sequence alignment

000_GeneA_NM_001.1          MKTAYILDSKSRFQSVLG
001_GeneB_NM_002.1          MKTAYILDSKSRFQSVLG
002_GeneC_NM_003.1          MKTAYILDSKSRFQSVLG
`;
        const noDupSeqInfo: SeqInfoDict = {
            '000_GeneA_NM_001.1': {},
            '001_GeneB_NM_002.1': {},
            '002_GeneC_NM_003.1': {}
        };

        const result = deduplicateSequences(noDuplicatesAlignment, noDupSeqInfo);

        expect(result.duplicatesRemoved).toBe(0);
        expect(Object.keys(result.seqInfoDict).length).toBe(3);
    });

    it('handles multiple genes with duplicates', () => {
        const multiGeneAlignment = `CLUSTAL O(1.2.4) multiple sequence alignment

000_Trp53_NM_011640.3       MKTAYILDSKSRFQSVLG
000_Trp53_NM_011640.3_alt1  MKTAYILDSKSRFQSVLG
001_Trp53_NM_011640.3       MKTAYILDSKSRFQSVLG
001_Trp53_NM_011640.3_alt1  MKTAYILDSKSRFQSVLG
002_Brca1_NM_009764.3       MKTAYILDSKSRFQSVLG
002_Brca1_NM_009764.3_alt1  MKTAYILDSKSRFQSVLG
003_Brca1_NM_009764.3       MKTAYILDSKSRFQSVLG
003_Brca1_NM_009764.3_alt1  MKTAYILDSKSRFQSVLG
`;
        const dummyVariant = {
            alignment_start_pos: 5,
            alignment_end_pos: 5,
            seq_start_pos: 5,
            seq_end_pos: 5,
            seq_length: 1,
            variant_id: 'dummy',
            genomic_seq_id: 'chr1',
            genomic_start_pos: 100,
            genomic_end_pos: 100,
            genomic_ref_seq: 'A',
            genomic_alt_seq: 'G',
            seq_substitution_type: 'substitution' as const
        };
        const multiGeneSeqInfo: SeqInfoDict = {
            '000_Trp53_NM_011640.3': {},
            '000_Trp53_NM_011640.3_alt1': { embedded_variants: [dummyVariant] },
            '001_Trp53_NM_011640.3': {},
            '001_Trp53_NM_011640.3_alt1': { embedded_variants: [dummyVariant] },
            '002_Brca1_NM_009764.3': {},
            '002_Brca1_NM_009764.3_alt1': { embedded_variants: [dummyVariant] },
            '003_Brca1_NM_009764.3': {},
            '003_Brca1_NM_009764.3_alt1': { embedded_variants: [dummyVariant] }
        };

        const result = deduplicateSequences(multiGeneAlignment, multiGeneSeqInfo);

        // Should remove 1 duplicate Trp53 ref + 1 duplicate Brca1 ref = 2
        expect(result.duplicatesRemoved).toBe(2);

        // Should have 6 sequences: 2 refs + 4 variants
        expect(Object.keys(result.seqInfoDict).length).toBe(6);
    });
});
