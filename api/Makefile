CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: check-% clean install-% pip-tools run-% update-% _vars-% _write-lock-file

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

run-container-dev:
	export API_PIPELINE_IMAGE_TAG=main && \
	  docker-compose -f docker-compose-dev.yml --env-file dev.env up agr.pavi.dev-local.api

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

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source .venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-deps: requirements.txt
	pip install -r requirements.txt

install-test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	flake8 ./

run-tests: install-test-deps nextflow.sh protein-msa.nf nextflow.config
	python -m pytest --cov --cov-fail-under=80

run-tests-dev: install-test-deps nextflow.sh protein-msa.nf nextflow.config
	python -m pytest --cov --cov-fail-under=80 --cov-report html -v

run-integration-test-container: install-test-deps
	export API_PIPELINE_IMAGE_TAG=${TAG_NAME} && \
	  docker-compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.api
	sleep 30 # Allow container some startup time before attempting to connect
	export EXTERNAL_API_BASE_URL="http://localhost:8080" && \
	  python -m pytest tests/b_integration \
	  || (echo "Container logs:" && docker logs agr.pavi.dev-local.api.server && exit 1)
	docker-compose -f docker-compose-dev.yml down

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
