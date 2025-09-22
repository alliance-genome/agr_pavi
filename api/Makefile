mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../common_make

CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
API_PIPELINE_IMAGE_TAG?=main
ADDITIONAL_BUILD_ARGS=

AWS_PROFILE ?= default

API_BASE_URL ?= http://localhost:8080

.PHONY: check-% clean install-% run-% update-%

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@rm -rf .venv/ .venv-build/
	@rm -f nextflow.sh
	@rm -f protein-msa.nf
	@rm -f nextflow.config
	@rm -rf seq_regions*.json
	@rm -rf pipeline-results*
	@rm -rf .nextflow*
	@rm -rf work/

container-image:
	export AWS_PROFILE=${AWS_PROFILE} && \
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} \
	  --secret id=AWS_PROFILE --secret id=AWS_SHARED_CREDENTIALS_FILE,src=${HOME}/.aws/credentials \
	  --secret id=AWS_CONFIG_FILE,src=${HOME}/.aws/config \
	  .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

run-container-dev:
	$(eval API_NEXTFLOW_OUT_DIR?=s3://agr-pavi-pipeline-nextflow/${API_PIPELINE_IMAGE_TAG}/)
	export API_PIPELINE_IMAGE_TAG=${API_PIPELINE_IMAGE_TAG} && \
	export API_NEXTFLOW_OUT_DIR=${API_NEXTFLOW_OUT_DIR} && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env up --pull never -d agr.pavi.dev-local.api

stop-container-dev:
	export API_PIPELINE_IMAGE_TAG=${API_PIPELINE_IMAGE_TAG} && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.api

nextflow.sh:
	make -f ./pipeline_workflow/Makefile nextflow.sh

protein-msa.nf:
	ln -s ./pipeline_workflow/protein-msa.nf protein-msa.nf

nextflow.config:
	ln -s ./pipeline_workflow/nextflow.config nextflow.config

run-server-dev: .venv/ install-deps nextflow.sh protein-msa.nf nextflow.config
	@export API_RESULTS_PATH_PREFIX="`pwd`/" && \
	 export API_EXECUTION_ENV="local" && \
	 .venv/bin/fastapi dev src/main.py

update-deps-lock: update-python-deps-lock

update-test-deps-lock: update-python-test-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps: install-python-deps

install-test-deps: install-python-test-deps

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

run-tests: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov

run-tests-dev: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov --cov-report html -v

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest -v tests/a_unit/

run-integration-test-container: .venv/ install-test-deps
	$(MAKE) --no-print-directory run-container-dev
	sleep 30 # Allow container some startup time before attempting to connect
	export EXTERNAL_API_BASE_URL="${API_BASE_URL}" && \
	  .venv/bin/python -m pytest tests/b_integration \
	  || (echo "\n\n\nContainer logs:" && docker logs agr.pavi.dev-local.api.server 2>&1 && exit 1)
	$(MAKE) --no-print-directory stop-container-dev
