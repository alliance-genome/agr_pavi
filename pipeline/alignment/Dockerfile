FROM biocontainers/clustalo:v1.2.4-2-deb_cv1
USER root

#Fix buster-backports repository errors (no packages of it used)
RUN rm /etc/apt/sources.list.d/backports.list
#Install AWS CLI required for nextflow AWS batch execution
RUN apt update && \
    apt install -y curl procps unzip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

CMD [ "clustalo", "--help" ]
