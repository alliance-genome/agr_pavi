# Note: Building this container requires the repository root directory as build context directory (../)
# as files from other components (workflow) must be included in the API container image
FROM python:3.12-slim-bookworm

WORKDIR /usr/src/app

RUN apt update && apt upgrade -y
RUN apt install -y make curl

COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY api/src/ ./

# Nextflow requirements, executable and configs
RUN apt install -y default-jre
COPY pipeline/workflow/Makefile workflow_makefile
RUN make -f workflow_makefile nextflow.sh
COPY pipeline/workflow/nextflow.config nextflow.config
COPY pipeline/workflow/protein-msa.nf protein-msa.nf

# Expose necessary ports
EXPOSE 8080

# Default environment variables
ENV API_NEXTFLOW_OUT_DIR="s3://agr-pavi-pipeline-nextflow/main/"
ENV API_EXECUTION_ENV="aws"
ENV API_PIPELINE_IMAGE_TAG="main"

# Run the nextflow pipeline once to pre-download and install all required plugins
RUN --mount=type=secret,id=AWS_PROFILE,env=AWS_PROFILE \
    --mount=type=secret,id=AWS_SHARED_CREDENTIALS_FILE \
    --mount=type=secret,id=AWS_CONFIG_FILE \
    AWS_SHARED_CREDENTIALS_FILE=/run/secrets/AWS_SHARED_CREDENTIALS_FILE \
    AWS_CONFIG_FILE=/run/secrets/AWS_CONFIG_FILE \
    ./nextflow.sh run -work-dir ${API_NEXTFLOW_OUT_DIR}work -profile ${API_EXECUTION_ENV} -name 'deps-download' protein-msa.nf --help

# Set Nextflow to offline mode
ENV NXF_OFFLINE='true'

# Start the API server application
CMD [ "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8080"]
