export const TEMPLATE_FILENAME = 'pavi-bulk-genes-template.csv';

// A ready-to-edit template that demonstrates both resolution modes:
//
// 1. The direct `gene_id` column (HGNC/MGI/RGD/etc.): fastest, no ambiguity.
// 2. The classic `species` + `gene_symbol` pair: used when gene_id is blank.
//
// `transcript` left blank → PAVI auto-picks the canonical one; the first row
// shows the optional `variants` column with two allele IDs. Rows resolve
// cleanly so the file is a working starting point, not just a format demo.
export function buildTemplateCsv(): string {
    return [
        'gene_id,species,gene_symbol,transcript,variants',
        'MGI:98351,Mus musculus,Sod1,,MGI:6157439;MGI:6157441',
        ',Rattus norvegicus,Sod1,,',
    ].join('\n');
}
