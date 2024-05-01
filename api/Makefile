CONTAINER_NAME=agr_pavi/api
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@:

container-image:
	cd ../ && \
	docker build ${ADDITIONAL_BUILD_ARGS} -f api/Dockerfile -t ${CONTAINER_NAME} .

run-container-dev:
	docker-compose --env-file dev.env up agr.pavi.dev.api

src/nextflow.sh:
	ln -s ../../pipeline/workflow/nextflow.sh src/nextflow.sh

src/protein-msa.nf:
	ln -s ../../pipeline/workflow/protein-msa.nf src/protein-msa.nf

src/nextflow.config:
	ln -s ../../pipeline/workflow/nextflow.config src/nextflow.config

run-api-server-dev: src/nextflow.sh src/protein-msa.nf src/nextflow.config
	@cd src/ && \
	 uvicorn main:app --reload

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

python-dependencies:
	pip install -r requirements.txt

python-test-dependencies:
	pip install -r tests/requirements.txt

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config .

run-python-style-check: python-dependencies python-test-dependencies
	flake8 ./
