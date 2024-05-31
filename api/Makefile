CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

.PHONY: check-venv-active pip-tools

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

run-api-server-dev: python-dependencies nextflow.sh protein-msa.nf nextflow.config
	@export API_RESULTS_PATH_PREFIX="`pwd`/" && \
	 export API_EXECUTION_ENV="local" && \
	 uvicorn --app-dir src/ --reload main:app

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
	pip-compile --generate-hashes --no-strip-extras -o requirements.txt

tests/requirements.txt:
	pip-compile --generate-hashes --no-strip-extras --extra=test -o tests/requirements.txt

python-dependencies-lock-update:
	pip-compile --generate-hashes --no-strip-extras --upgrade -o requirements.txt

python-test-dependencies-lock-update:
	pip-compile --generate-hashes --no-strip-extras --extra=test --upgrade -o tests/requirements.txt

python-dependencies: requirements.txt
	pip install -r requirements.txt

python-test-dependencies: tests/requirements.txt
	pip install -r tests/requirements.txt

run-python-type-check: python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config ./

run-python-style-check: python-test-dependencies
	flake8 ./

run-tests: python-test-dependencies nextflow.sh protein-msa.nf nextflow.config
	python -m pytest --cov --cov-fail-under=80

run-tests-dev: python-test-dependencies nextflow.sh protein-msa.nf nextflow.config
	python -m pytest --cov --cov-fail-under=80 --cov-report html

run-integration-test-container: python-test-dependencies
	export API_PIPELINE_IMAGE_TAG=${TAG_NAME} && \
	  docker-compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.api
	sleep 30 # Allow container some startup time before attempting to connect
	export EXTERNAL_API_BASE_URL="http://localhost:8080" && \
	  python -m pytest tests/integration \
	  || (echo "Container logs:" && docker logs agr.pavi.dev-local.api.server && exit 1)
	docker-compose -f docker-compose-dev.yml down
