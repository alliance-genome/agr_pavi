FROM biocontainers/clustalo:v1.2.4-2-deb_cv1
USER root

#Fix apt-upate erros caused by missing "Buster-backports" apt keys
RUN (apt update || true) && apt install -y gnupg && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 0E98404D386FA1D9 && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 6ED0E7B82643E131
#Install AWS CLI required for nextflow AWS batch execution
RUN apt update && \
    apt install -y curl unzip
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws/

CMD [ "clustalo", "--help" ]
