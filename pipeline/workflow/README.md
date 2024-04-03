To tie all backend steps together into a single pipeline, NextFlow is used as workflow manager.

To download nextflow:
```bash
make nextflow
```

To run the protein MSA workflow locally:
 * Build all required components locally:
    ```bash
    make build-workflow-local-deps
    ```
 * Run the pipeline with approriate input arguments as seen in below example:
    ```bash
    ./nextflow run protein-msa.nf --input_seq_regions '[
    {"name": "C54H2.5.1", "seq_id": "X", "seq_strand": "-",
    "seq_regions": "[\"5780644..5780722\", \"5780278..5780585\", \"5779920..5780231\", \"5778875..5779453\"]",
    "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000002985.6_WBcel235_genomic.fna.gz"},
    {"name": "ERV29-S288C", "seq_id": "chrVII", "seq_strand": "-", "seq_regions": "[\"1061590..1060658\"]",
    "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000146045.2_R64_genomic.fna.gz"}
    ]'
    ```
