mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=
EXTRA_PIP_COMPILE_ARGS ?=

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.PHONY: check-% clean install-% run-% update-% _vars-% _write-lock-file

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
	cd ../ && \
	docker build ${ADDITIONAL_BUILD_ARGS} -f api/Dockerfile -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile registry-docker-login

run-container-dev:
	export API_PIPELINE_IMAGE_TAG=main && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.api

stop-container-dev:
	export API_PIPELINE_IMAGE_TAG=main && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.api

nextflow.sh:
	make -f ../pipeline/workflow/Makefile nextflow.sh

protein-msa.nf:
	ln -s ../pipeline/workflow/protein-msa.nf protein-msa.nf

nextflow.config:
	ln -s ../pipeline/workflow/nextflow.config nextflow.config

run-server-dev: install-deps nextflow.sh protein-msa.nf nextflow.config
	@export API_RESULTS_PATH_PREFIX="`pwd`/" && \
	 export API_EXECUTION_ENV="local" && \
	 fastapi dev src/main.py

.venv/:
	python3.12 -m venv .venv/

.venv-build/:
	python3.12 -m venv .venv-build/
	.venv-build/bin/pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps: .venv/ requirements.txt
	.venv/bin/pip install -r requirements.txt

install-test-deps: .venv/ tests/requirements.txt
	.venv/bin/pip install -r tests/requirements.txt

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

run-tests: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov --cov-fail-under=80

run-tests-dev: .venv/ install-test-deps nextflow.sh protein-msa.nf nextflow.config
	.venv/bin/python -m pytest --cov --cov-fail-under=80 --cov-report html -v

run-integration-test-container: .venv/ install-test-deps
	export API_PIPELINE_IMAGE_TAG=${TAG_NAME} && \
	  docker compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.api
	sleep 30 # Allow container some startup time before attempting to connect
	export EXTERNAL_API_BASE_URL="http://localhost:8080" && \
	  .venv/bin/python -m pytest tests/b_integration \
	  || (echo "Container logs:" && docker logs agr.pavi.dev-local.api.server && exit 1)
	docker compose -f docker-compose-dev.yml --env-file dev.env down

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_write-lock-file: .venv-build/
	.venv-build/bin/pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
