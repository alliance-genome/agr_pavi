mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
API_PIPELINE_IMAGE_TAG?=main
ADDITIONAL_BUILD_ARGS=
EXTRA_PIP_COMPILE_ARGS ?=

AWS_PROFILE ?= default

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

API_BASE_URL ?= http://localhost:8080

.PHONY: check-% clean install-% run-% update-%

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@rm -f nextflow.sh
	@rm -f protein-msa.nf
	@rm -f nextflow.config
	@rm -rf seq_regions*.json
	@rm -rf pipeline-results*
	@rm -rf .nextflow*
	@rm -rf work/

container-image:
	cd ../ && export AWS_PROFILE=${AWS_PROFILE} && \
	docker build ${ADDITIONAL_BUILD_ARGS} -f api/Dockerfile -t ${CONTAINER_NAME} \
	  --secret id=AWS_PROFILE --secret id=AWS_SHARED_CREDENTIALS_FILE,src=${HOME}/.aws/credentials \
	  --secret id=AWS_CONFIG_FILE,src=${HOME}/.aws/config \
	  .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile registry-docker-login

run-container-dev:
	$(eval API_NEXTFLOW_OUT_DIR?=s3://agr-pavi-pipeline-nextflow/${API_PIPELINE_IMAGE_TAG}/)
	export API_PIPELINE_IMAGE_TAG=${API_PIPELINE_IMAGE_TAG} && \
	export API_NEXTFLOW_OUT_DIR=${API_NEXTFLOW_OUT_DIR} && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env up --pull never -d agr.pavi.dev-local.api

stop-container-dev:
	export API_PIPELINE_IMAGE_TAG=${API_PIPELINE_IMAGE_TAG} && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.api

nextflow.sh:
	make -f ../api/pipeline_workflow/Makefile nextflow.sh

protein-msa.nf:
	ln -s ../api/pipeline_workflow/protein-msa.nf protein-msa.nf

nextflow.config:
	ln -s ../api/pipeline_workflow/nextflow.config nextflow.config

run-server-dev: install-deps nextflow.sh protein-msa.nf nextflow.config
	@export API_RESULTS_PATH_PREFIX="`pwd`/" && \
	 export API_EXECUTION_ENV="local" && \
	 .venv/bin/fastapi dev src/main.py

.venv/:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) .venv/

requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) requirements.txt

tests/requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) tests/requirements.txt

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) update-python-deps-lock

update-test-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) update-python-test-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) install-python-deps

install-test-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) install-python-test-deps

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

run-tests: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov

run-tests-dev: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov --cov-report html -v

run-integration-test-container: .venv/ install-test-deps
	$(MAKE) --no-print-directory run-container-dev
	sleep 30 # Allow container some startup time before attempting to connect
	export EXTERNAL_API_BASE_URL="${API_BASE_URL}" && \
	  .venv/bin/python -m pytest tests/b_integration \
	  || (echo "\n\n\nContainer logs:" && docker logs agr.pavi.dev-local.api.server 2>&1 && exit 1)
	$(MAKE) --no-print-directory stop-container-dev
