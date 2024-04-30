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
