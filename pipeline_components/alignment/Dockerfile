FROM ubuntu:24.04

RUN apt update && apt upgrade -y && apt install -y clustalo

#Install AWS CLI required for nextflow AWS batch execution
RUN apt update && \
    apt install -y curl procps unzip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

CMD [ "clustalo", "--help" ]
