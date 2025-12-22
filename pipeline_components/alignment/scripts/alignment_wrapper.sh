#!/bin/bash
# alignment_wrapper.sh - Wrapper script for Step Functions alignment job
#
# Downloads FASTA files from S3 work directory, runs alignment, uploads results to S3.
#
# Usage: alignment_wrapper.sh --s3-work-prefix <s3-uri> --s3-results-prefix <s3-uri> [--aligner <clustalo|mafft>]

set -e  # Exit on error

# Parse command line arguments
S3_WORK_PREFIX=""
S3_RESULTS_PREFIX=""
ALIGNER="clustalo"  # Default aligner

while [[ $# -gt 0 ]]; do
    case $1 in
        --s3-work-prefix)
            S3_WORK_PREFIX="$2"
            shift 2
            ;;
        --s3-results-prefix)
            S3_RESULTS_PREFIX="$2"
            shift 2
            ;;
        --aligner)
            ALIGNER="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$S3_WORK_PREFIX" ]; then
    echo "Error: --s3-work-prefix is required"
    exit 1
fi

if [ -z "$S3_RESULTS_PREFIX" ]; then
    echo "Error: --s3-results-prefix is required"
    exit 1
fi

# Create working directories
WORK_DIR="/tmp/alignment_work"
mkdir -p "$WORK_DIR/input"
mkdir -p "$WORK_DIR/output"

echo "Downloading FASTA files from $S3_WORK_PREFIX..."

# Download all FASTA files from S3 work directory
aws s3 cp "$S3_WORK_PREFIX" "$WORK_DIR/input/" --recursive --exclude "*" --include "*.fa"

# Check if we have any FASTA files
FASTA_COUNT=$(find "$WORK_DIR/input" -name "*.fa" | wc -l)
if [ "$FASTA_COUNT" -eq 0 ]; then
    echo "Error: No FASTA files found in $S3_WORK_PREFIX"
    exit 1
fi

echo "Found $FASTA_COUNT FASTA files"

# Combine all FASTA files into a single input file
COMBINED_INPUT="$WORK_DIR/combined_input.fa"
cat "$WORK_DIR/input/"*.fa > "$COMBINED_INPUT"

# Count sequences in combined file
SEQ_COUNT=$(grep -c "^>" "$COMBINED_INPUT" || true)
echo "Combined input has $SEQ_COUNT sequences"

# Output files
ALIGNMENT_OUTPUT="$WORK_DIR/output/alignment.aln"

# Run alignment
echo "Running alignment with $ALIGNER..."

if [ "$ALIGNER" = "mafft" ]; then
    # MAFFT with L-INS-i for accuracy (best for small-medium datasets)
    mafft --localpair --maxiterate 1000 --clustalout "$COMBINED_INPUT" > "$ALIGNMENT_OUTPUT"
else
    # Clustal Omega (default)
    clustalo -i "$COMBINED_INPUT" -o "$ALIGNMENT_OUTPUT" --outfmt=clu --threads=2 --force
fi

echo "Alignment complete"

# Upload alignment result to S3
echo "Uploading results to $S3_RESULTS_PREFIX..."
aws s3 cp "$ALIGNMENT_OUTPUT" "${S3_RESULTS_PREFIX%/}/alignment.aln"

echo "Alignment job complete"
