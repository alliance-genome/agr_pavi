CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@:

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

run-container-dev:
	docker-compose --env-file dev.env up agr.pavi.api

run-server-dev:
	@cd src/ && \
	 uvicorn main:app --reload
