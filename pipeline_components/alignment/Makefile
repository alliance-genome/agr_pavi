mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../../common_make

CONTAINER_NAME=agr_pavi/pipeline_alignment
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

.PHONY: clean container-image push-% run-%

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@:

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

run-unit-tests:
	@rm --interactive=never tests/resources/unit-test-output.aln || true
	docker run -v `pwd`/tests/resources/:/mnt/pavi/ --rm ${CONTAINER_NAME} \
	 clustalo -i /mnt/pavi/input-seqs.fa --outfmt=clustal --resno -o /mnt/pavi/unit-test-output.aln
	@diff -qs tests/resources/unit-test-output.aln tests/resources/clustal-output.aln
