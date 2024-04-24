FROM python:3.12-slim-bullseye

WORKDIR /usr/src/app

RUN apt update && apt upgrade

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./

# Expose necessary ports
EXPOSE  8080

# Start the API server application
CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
