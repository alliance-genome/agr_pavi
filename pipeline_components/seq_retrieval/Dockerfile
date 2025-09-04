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

WORKDIR /usr/src/app/
COPY requirements.txt ./
RUN python -m venv .venv/
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt


FROM base-image AS application-image

COPY --from=install-python /root/.pyenv /root/.pyenv
ENV HOME="/root"
ENV PYENV_ROOT="${HOME}/.pyenv"
ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

WORKDIR /usr/src/app

# Nextflow requirements
RUN apt install -y bash curl procps unzip

#Install AWS CLI required for nextflow AWS batch execution
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

COPY --from=install-python /usr/src/app/.venv /usr/src/app/.venv

COPY src/ ./
RUN chmod a+x seq_retrieval.py
RUN chmod a+x seq_info_align.py
ENV PATH=/usr/src/app/.venv/bin:$PATH:/usr/src/app

CMD [ "seq_retrieval.py", "--help" ]
