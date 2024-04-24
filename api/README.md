This subdirectory contains the API component of PAVI.

The API is built using the [fastAPI](https://fastapi.tiangolo.com/) framework.

# Local invocation and testing instructions
To build the docker image:
```bash
make docker-image
```

To build a clean docker image (without using caching, for troubleshooting potential caching issues):
```bash
make clean docker-image
```

Then to run the container locally:
```bash
make run-server-dev
```
While this is running, the API should be available at http://localhost:8080/.
