CONTAINER_NAME=agr_pavi/pipeline_alignment
ADDITIONAL_BUILD_ARGS=

.PHONY: clean

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@:

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .
