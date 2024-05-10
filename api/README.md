This subdirectory contains the API component of PAVI.

The API is built using the [fastAPI](https://fastapi.tiangolo.com/) framework.

# Development
During active code development, run the API server through the following command:
```bash
make run-api-server-dev
```
This will run an API server which automatically reloades when code changes are saved, and make the API available at http://localhost:8000/.

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
make run-container-dev
```
While this is running, the API should be available at http://localhost:8080/.
