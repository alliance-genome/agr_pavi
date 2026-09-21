export const TEMPLATE_FILENAME = 'pavi-bulk-genes-template.csv';

// A ready-to-edit template: the canonical header plus two ortholog rows
// (mouse + rat Sod1). Transcript is left blank so PAVI auto-picks the
// canonical one; the mouse row shows the optional `variants` column with
// two allele IDs. Both rows resolve cleanly so the file is a working
// starting point, not just a format illustration.
export function buildTemplateCsv(): string {
    return [
        'species,gene_symbol,transcript,variants',
        'Mus musculus,Sod1,,MGI:6157439;MGI:6157441',
        'Rattus norvegicus,Sod1,,',
    ].join('\n');
}
