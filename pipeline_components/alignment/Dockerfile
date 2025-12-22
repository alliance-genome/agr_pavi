FROM ubuntu:24.04

# Install alignment tools: Clustal Omega and MAFFT
# - clustalo: Original aligner (Clustal Omega 1.2.4)
# - mafft: More accurate aligner (Nuin et al. 2006, validated by subsequent benchmarks)
RUN apt update && apt upgrade -y && apt install -y clustalo mafft

# Install AWS CLI required for nextflow AWS batch execution and Step Functions S3 I/O
RUN apt update && \
    apt install -y curl procps unzip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

# Copy alignment wrapper script for Step Functions pipeline
COPY scripts/alignment_wrapper.sh /usr/local/bin/alignment_wrapper.sh
RUN chmod +x /usr/local/bin/alignment_wrapper.sh

CMD [ "clustalo", "--help" ]
