FROM python:3.12-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache build-base zlib-dev bzip2-dev xz-dev

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./

ENTRYPOINT [ "python", "main.py"]
CMD [ "--help" ]
