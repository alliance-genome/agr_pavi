# KANBAN-830: Optimise Reference Genome File Download and Storage

## Status
Backlog

## Summary
Optimize PAVI pipeline performance by caching reference genome FASTA files instead of downloading them for every job/task.

## Problem

Current behavior:
- Reference genome FASTA files downloaded **ad hoc for every PAVI job**
- Each Nextflow `sequence_retrieval` task downloads the same file independently
- Multiple parallel tasks = multiple redundant downloads

Impact:
- **Longer runtime**: Download time adds to job duration
- **Higher cost**: Compute resources idle during downloads
- **Bandwidth waste**: Same files downloaded repeatedly
- **S3 egress costs**: Repeated downloads from S3

### Example Scenario

Job with 5 genes from same species:
```
Task 1: Download GRCm39.fna.gz (2.8 GB) → Process
Task 2: Download GRCm39.fna.gz (2.8 GB) → Process  # Redundant
Task 3: Download GRCm39.fna.gz (2.8 GB) → Process  # Redundant
Task 4: Download GRCm39.fna.gz (2.8 GB) → Process  # Redundant
Task 5: Download GRCm39.fna.gz (2.8 GB) → Process  # Redundant
```

Total: 14 GB downloaded when only 2.8 GB needed.

## Reference Genome Files

Files are hosted on S3: `s3://agrjbrowse/fasta/`

| Species | File | Approximate Size |
|---------|------|------------------|
| Human | GCF_000001405.40_GRCh38.p14_genomic.fna.gz | ~1 GB |
| Mouse | GCF_000001635.27_GRCm39_genomic.fna.gz | ~0.9 GB |
| Rat | GCF_015227675.2_mRatBN7.2_genomic.fna.gz | ~0.9 GB |
| Zebrafish | GCF_000002035.6_GRCz11_genomic.fna.gz | ~0.5 GB |
| Fly | GCF_000001215.4_Release_6_plus_ISO1_MT_genomic.fna.gz | ~50 MB |
| Worm | GCF_000002985.6_WBcel235_genomic.fna.gz | ~30 MB |
| Yeast | GCF_000146045.2_R64_genomic.fna.gz | ~4 MB |

## Solution Options

### Option A: Amazon EFS (Elastic File System)

**Architecture:**
```
┌─────────────┐
│   EFS       │ ← Pre-populated with reference genomes
│ /genomes/   │
└──────┬──────┘
       │ NFS mount
       ▼
┌─────────────┐
│ ECS Tasks   │ → Read directly from mounted volume
│ (Nextflow)  │
└─────────────┘
```

**Pros:**
- Persistent storage across jobs
- Shared access for all tasks
- No download time for cached files
- Pay only for storage used

**Cons:**
- Monthly storage cost (~$0.30/GB/month)
- Setup complexity
- Need to manage file updates

**Implementation:**
1. Create EFS filesystem in VPC
2. Pre-populate with reference genomes
3. Mount EFS in ECS task definitions
4. Update seq_retrieval to read from local path

### Option B: Nextflow Shared Cache Directory

**Architecture:**
```
Nextflow workDir/
  └── cache/
      └── genomes/
          ├── GRCm39.fna.gz
          └── GRCh38.fna.gz
```

**Pros:**
- Built-in Nextflow feature
- No additional AWS services
- Automatic within single job

**Cons:**
- Cache not shared across jobs
- Still downloads once per job
- Cache on ephemeral storage

**Implementation:**
```groovy
// protein-msa.nf
process sequence_retrieval {
    storeDir "${params.cacheDir}/genomes"

    input:
    val fasta_url

    output:
    path "*.fna.gz"

    script:
    """
    wget -nc ${fasta_url}
    """
}
```

### Option C: S3 with Local Caching (FSx for Lustre)

**Architecture:**
```
┌─────────────┐     ┌─────────────┐
│ S3 Bucket   │────▶│ FSx Lustre  │
│ (source)    │     │ (cache)     │
└─────────────┘     └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ ECS Tasks   │
                    └─────────────┘
```

**Pros:**
- High performance
- Auto-syncs with S3
- Good for large files

**Cons:**
- Higher cost than EFS
- More complex setup
- Overkill for this use case

### Option D: Pre-download in Job Initialization

**Architecture:**
```
Job Start
    │
    ▼
┌─────────────────────────────┐
│ Download all needed genomes │  ← Single download step
│ to shared volume            │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Run sequence_retrieval      │  ← Use local files
│ tasks in parallel           │
└─────────────────────────────┘
```

**Pros:**
- Simple to implement
- No additional infrastructure
- Download once per job

**Cons:**
- Still downloads per job (not across jobs)
- Sequential download step

**Implementation:**
```groovy
// Add preprocessing step
process download_genomes {
    output:
    path "genomes/*"

    script:
    """
    mkdir -p genomes
    for url in ${unique_genome_urls}; do
        wget -P genomes/ \$url
    done
    """
}

// Use downloaded files
process sequence_retrieval {
    input:
    path genomes

    script:
    """
    seq_retrieval.py --fasta_file genomes/${genome_file} ...
    """
}
```

## Recommendation

**Option A (EFS)** for production because:
1. Eliminates redundant downloads across ALL jobs
2. Predictable costs (~$3/month for 10 GB of genomes)
3. Simple to update when new assemblies released
4. Scales to any number of concurrent jobs

### Estimated Savings

| Metric | Current | With EFS |
|--------|---------|----------|
| Download per job | ~3 GB avg | 0 |
| Time per download | ~30-60s | 0 |
| Monthly data transfer | ~90 GB (30 jobs) | ~3 GB (updates only) |

## Implementation Plan

### Phase 1: Create EFS Infrastructure
```python
# CDK code for EFS
from aws_cdk import aws_efs as efs

genome_fs = efs.FileSystem(
    self, "GenomeStorage",
    vpc=vpc,
    lifecycle_policy=efs.LifecyclePolicy.AFTER_30_DAYS,  # Move to IA
    performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
    throughput_mode=efs.ThroughputMode.BURSTING,
)
```

### Phase 2: Populate EFS
```bash
# One-time setup script
#!/bin/bash
GENOMES=(
    "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000001635.27_GRCm39_genomic.fna.gz"
    "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000001405.40_GRCh38.p14_genomic.fna.gz"
    # ... all species
)

for url in "${GENOMES[@]}"; do
    filename=$(basename $url)
    wget -O /mnt/efs/genomes/$filename $url
done
```

### Phase 3: Update ECS Task Definition
```python
# Mount EFS in task
task.add_volume(
    name="genomes",
    efs_volume_configuration=ecs.EfsVolumeConfiguration(
        file_system_id=genome_fs.file_system_id,
        root_directory="/genomes"
    )
)

container.add_mount_points(
    ecs.MountPoint(
        container_path="/genomes",
        source_volume="genomes",
        read_only=True
    )
)
```

### Phase 4: Update seq_retrieval.py
```python
def get_genome_path(fasta_url: str) -> str:
    """Check local cache before downloading."""
    filename = os.path.basename(fasta_url)
    local_path = f"/genomes/{filename}"

    if os.path.exists(local_path):
        return local_path
    else:
        # Fallback to download (shouldn't happen in prod)
        return download_file(fasta_url)
```

## Files to Modify

1. `shared_aws/aws_infra/` - Add EFS resource
2. `pipeline_components/seq_retrieval/aws_infra/` - Mount EFS
3. `pipeline_components/seq_retrieval/src/seq_retrieval.py` - Use local files
4. `api/aws_infra/` - If API needs access to genome list

## Testing

1. Deploy EFS to dev environment
2. Populate with test genome files
3. Run job and verify local file usage
4. Compare job duration before/after
5. Monitor EFS performance metrics

## Related

- KANBAN-831 (likely related optimization)
- Nextflow pipeline configuration
- AWS CDK infrastructure
