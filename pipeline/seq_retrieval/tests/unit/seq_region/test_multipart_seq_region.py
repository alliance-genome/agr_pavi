"""
Unit testing for MultiPartSeqRegion class and related functions
"""

from Bio.Data import CodonTable

from seq_region import SeqRegion, MultiPartSeqRegion
from seq_region.multipart_seq_region import find_orfs


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


def test_multipart_seq_region_class():

    ## Test Class initiation
    # WBGene00000149 Transcript:C54H2.5.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5780644, end=5780722, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_1_SEQ = 'CTCTTGGAAAATGAACCAGTTCCGGGCTCCAGGTGGTCAGAACGAAATGCTGGCGAAAGCAGAAGACGCCGCTGAAGAT'

    # WBGene00000149 Transcript:C54H2.5.1 Exon 2
    exon_2: SeqRegion = SeqRegion(seq_id='X', start=5780278, end=5780585, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_2_SEQ = 'TTCTTCCGCAAAACAAGGACCTACCTACCCCACATTGCTCGCCTCTGCCTCGTCTCCACATTCCTTGAAGATGGAATCCGTATGTACTTCCAATGGGATGATCAAAAACAGTTCATGCAAGAGTCTTGGTCTTGCGGTTGGTTCATCGCAACTTTGTTCGTCATCTACAACTTCTTCGGACAGTTCATCCCGGTTTTAATGATCATGCTCCGCAAGAAGGTGTTGGTCGCATGTGGAATTCTTGCCAGCATTGTCATTCTCCAAACCATCGCTTACCATATTCTCTGGGACTTGAAGTTCTTGGCCAG'

    # WBGene00000149 Transcript:C54H2.5.1 Exon 3
    exon_3: SeqRegion = SeqRegion(seq_id='X', start=5779920, end=5780231, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_3_SEQ = 'aaacattgCCGTTGGTGGAGGACTTTTGCTCCTTCTTGCCGAGACACAGGAAGAGAAGGCTTCCCTGTTCGCCGGAGTTCCAACAATGGGAGACTCGAACAAGCCAAAATCGTACATGCTTCTTGCCGGACGTGTTCTTCTTATCTTCATGTTCATGTCTTTGATGCATTTTGAGATGTCCTTCATGCAAGTTTTGGAGATTGTTGTTGGATTTGCTCTCATCACTCTCGTCTCAATTGGTTACAAGACAAAGCTTTCCGCGATTGTTCTTGTCATCTGGCTCTTCGGACTTAACCTTTGGCTTAATGCTTG'

    # WBGene00004788 Transcript:C54H2.5.1 Exon 4
    exon_4: SeqRegion = SeqRegion(seq_id='X', start=5778875, end=5779453, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_4_SEQ = 'gtggACCATTCCTTCCGACCGCTTCTACAGAGACTTCATGAAGTACGATTTCTTCCAAACCATGTCCGTCATTGGAGGACTTCTCCTTGTCATTGCCTACGGACCAGGAGGAGTGTCAGTCGATGACTACAAGAAAAGATGGTAGATACCCCATTAACACCAGTACTTATACGCATTTCTATGTCAAATCATTGCATTACACTCACTCACCCCGATAAATTTACCTGGATTGTTTATATAATTTATGAAtctgtttcgattttttcgatatttcctTTAATCAATATATTTAGAGTAGAACGTTTTCCCTCGGTTTCCCATCCAATGCTTCTTGTCGTAATGTTACAACTTCATATCTatttccttttatttttttttgtcattttcttcCTTTCCCTAAAACTTCATGGACTATATGGGTTGTTTTCCAATGAAACTCTCCCTACAAACTTCTATTTTTCTCACACGAATCACAACTAAAACAGTCATTTTTCCACCACTTTCCTTTACTTTCTAATCGGCCTATCCCAATTTTCTTCTGGTAGTTTTGTTCCCGTAaagaataaacatttttctgtc'

    seq_region_list = [exon_1, exon_2, exon_3, exon_4]

    for seq_region in seq_region_list:
        seq_region.fetch_seq()

    multipart_seq_region = MultiPartSeqRegion(seq_region_list)

    ## Test fetch_seq method
    multipart_seq_region.fetch_seq()

    chained_seq: str = multipart_seq_region.get_sequence()

    assert isinstance(chained_seq, str)
    assert chained_seq == EXON_1_SEQ + EXON_2_SEQ + EXON_3_SEQ + EXON_4_SEQ

    ## Test translate method
    protein_seq = multipart_seq_region.translate()

    # Assert successful translation
    assert isinstance(protein_seq, str)
    assert protein_seq == 'MNQFRAPGGQNEMLAKAEDAAEDFFRKTRTYLPHIARLCLVSTFLEDGIRMYFQWDDQKQFMQESWSCGWFIATLFVIYNFFGQFIPVLMIMLRKKVLVACGILASIVILQTIAYHILWDLKFLARNIAVGGGLLLLLAETQEEKASLFAGVPTMGDSNKPKSYMLLAGRVLLIFMFMSLMHFEMSFMQVLEIVVGFALITLVSIGYKTKLSAIVLVIWLFGLNLWLNAWWTIPSDRFYRDFMKYDFFQTMSVIGGLLLVIAYGPGGVSVDDYKKRW'


def test_incomplete_multipart_seq_region():

    # Test translation of incomplete ORF
    # WBGene00000149 Transcript:C54H2.5.1 5' UTR
    five_p_utr: SeqRegion = SeqRegion(seq_id='X', start=5780713, end=5780722, strand='-',
                                      fasta_file_url=FASTA_FILE_URL)
    UTR_SEQ = 'CTCTTGGAAA'

    five_p_utr.fetch_seq()

    incomplete_multipart_seq_region = MultiPartSeqRegion([five_p_utr])
    incomplete_multipart_seq_region.fetch_seq()

    chained_utr_seq: str = incomplete_multipart_seq_region.get_sequence()

    assert isinstance(chained_utr_seq, str)
    assert chained_utr_seq == UTR_SEQ

    incomplete_translation = incomplete_multipart_seq_region.translate()

    # Assert failed translation
    assert incomplete_translation is None

def test_orf_detection():

    # Test detection of ORF in softmasked sequence
    # Y48G1C.9b cds
    DNA_SEQUENCE = 'ATGATCTCGAAAAAGCACGTGGAATCGATGCACGCGTTGCCGGACCCtaaagaaactgaaatttga'

    codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]

    # Find the best open reading frame
    orfs = find_orfs(DNA_SEQUENCE, codon_table, return_type='longest')

    assert isinstance(orfs, list)
    assert len(orfs) == 1

    orf = orfs.pop()
    assert 'seq_start' in orf.keys() and 'seq_end' in orf.keys()

    assert orf['seq_start'] == 1
    assert orf['seq_end'] == 66
