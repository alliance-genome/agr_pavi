# Note: Building this container requires the repository root directory as build context directory (../)
# as files from other components (workflow) must be included in the API container image
FROM python:3.12-slim-bullseye

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
EXPOSE  8080

# Default environment variables
ENV API_RESULTS_PATH_PREFIX="s3://agr-pavi-pipeline-nextflow/main/results/"
ENV API_EXECUTION_ENV="aws"

# Start the API server application
CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
