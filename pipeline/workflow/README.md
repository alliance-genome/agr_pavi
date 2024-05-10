This subdirectory contains all code that defines the workflows,
which tie all pipeline components together into a fully functional and scalable pipeline
comprising of all data retrieval and computation required for each PAVI alignment.
To that goal, NextFlow is used as workflow manager and Domain Specific Language.

To download nextflow:
```bash
make nextflow
```

To run the protein MSA workflow locally:
 1. Build all required components locally:
    ```bash
    make build-workflow-local-deps
    ```
 2. Run the pipeline with approriate input arguments as seen in below example:
    ```bash
    # Input json can either be provided directly as using --input_seq_regions_str
    ./nextflow.sh run protein-msa.nf --input_seq_regions_str '[
    {"name": "C54H2.5.1", "seq_id": "X", "seq_strand": "-",
    "seq_regions": ["5780644..5780722", "5780278..5780585", "5779920..5780231", "5778875..5779453"],
    "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000002985.6_WBcel235_genomic.fna.gz"},
    {"name": "ERV29-S288C", "seq_id": "chrVII", "seq_strand": "-", "seq_regions": ["1061590..1060658"],
    "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000146045.2_R64_genomic.fna.gz"}
    ]'
    # Or can be written to a file and the file passed using --input_seq_regions_file
    ./nextflow.sh run protein-msa.nf --input_seq_regions_file tests/integration/test_seq_regions.json
    ```

To run any workflow in the AGR AWS, ensure you are authenticatable to the AGR AWS
and use the `aws` profile (can be used in addition to other profiles):
```bash
./nextflow.sh run -profile aws protein-msa.nf ...
```
