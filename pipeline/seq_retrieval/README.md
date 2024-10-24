# PAVI Sequence retrieval
This subdirectory contains all code and configs for the PAVI sequence retrieval component.

## Content table
 * [Development](#development)
 * [Building](#building)
 * [Usage](#usage)

## Development
The seq-retrieval code is written in python, so follows the [general dependency management](/README.md#dependency-management) and [python](/README.md#python-components) PAVI coding guidelines.

## Building
To build a clean docker image (for production usage and troubleshooting):
```bash
make clean docker-image
```

## Usage
This PAVI component is intented to be called as a container.
To call the container after building:
```bash
docker run agr_pavi/pipeline_seq_retrieval main.py
```
