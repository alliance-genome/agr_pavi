FROM python:3.12-slim-bullseye

WORKDIR /usr/src/app

RUN apt update && apt install -y build-essential zlib1g-dev libbz2-dev xz-utils \
                                     bash curl unzip # Nextflow requirements

#Install AWS CLI required for nextflow AWS batch execution
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

COPY Makefile pyproject.toml requirements.txt ./
RUN make install-deps

COPY src/ ./
RUN chmod a+x main.py
ENV PATH=/usr/src/app/.venv/bin:$PATH:/usr/src/app

CMD [ "main.py", "--help" ]
