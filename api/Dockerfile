# Note: building this image requires Valid AWS credentials to be defined and mounted as secrets
FROM ubuntu:24.04 AS base-image

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt upgrade -y


FROM base-image AS install-python
RUN apt install -y bash curl git build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget llvm libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev

# Install python through pyenv
RUN curl -fsSL https://pyenv.run | bash
ENV HOME="/root"
ENV PYENV_ROOT="${HOME}/.pyenv"
ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

ENV PYTHON_VERSION=3.12
RUN pyenv install ${PYTHON_VERSION}
RUN pyenv global ${PYTHON_VERSION}

WORKDIR /root/
COPY requirements.txt ./
RUN python -m venv .venv/
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt


FROM base-image AS application-deps-collection

WORKDIR /usr/src/app

RUN apt install -y make curl

COPY src/ ./

# Nextflow runtime requirements, executable and configs
COPY pipeline_workflow/Makefile workflow_makefile
RUN make -f workflow_makefile nextflow.sh
COPY pipeline_workflow/nextflow.config nextflow.config
COPY pipeline_workflow/protein-msa.nf protein-msa.nf


FROM base-image AS application-image

COPY --from=install-python /root/.pyenv /root/.pyenv
ENV HOME="/root"
ENV PYENV_ROOT="${HOME}/.pyenv"
ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

WORKDIR /usr/src/app
COPY --from=application-deps-collection /usr/src/app ./

COPY --from=install-python /root/.venv /usr/src/app/.venv
ENV PATH="/usr/src/app/.venv/bin:${PATH}"

# Nextflow runtime requirements
RUN apt install -y default-jre

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
ENV NXF_SYNTAX_PARSER=v2

# Start the API server application
CMD [ "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8080"]
