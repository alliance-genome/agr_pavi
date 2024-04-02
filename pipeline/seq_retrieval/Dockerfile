FROM python:3.12-alpine

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache build-base zlib-dev bzip2-dev xz-dev \
                                     bash # Nextflow requirement

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./
RUN chmod a+x main.py
ENV PATH=$PATH:/usr/src/app

CMD [ "main.py", "--help" ]
