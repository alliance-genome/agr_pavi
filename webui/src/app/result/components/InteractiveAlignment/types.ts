export interface SeqInfoDict {
    [key:string]: SeqInfo
}

export interface SeqInfo {
    embedded_variants?: EmbeddedVariant[],
    error?: string
}

export interface EmbeddedVariant {
    alignment_start_pos: number,
    alignment_end_pos: number,
    seq_start_pos: number,
    seq_end_pos: number,
    seq_length: number,
    variant_id: string,
    genomic_seq_id: string,
    genomic_start_pos: number,
    genomic_end_pos: number,
    genomic_ref_seq: string,
    genomic_alt_seq: string,
    seq_substitution_type: string
}
