mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

NEXTFLOW_VERSION=24.10.0
TAG_NAME?=main

.PHONY: build-% clean registry-docker-login run-%

clean:
	@rm -f nextflow.sh
	@rm -rf pipeline-results/
	@rm -rf .nextflow*
	@rm -rf work/

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile registry-docker-login

nextflow.sh:
	curl -L https://github.com/nextflow-io/nextflow/releases/download/v${NEXTFLOW_VERSION}/nextflow-${NEXTFLOW_VERSION}-all -o nextflow.sh
	chmod u+x nextflow.sh

build-workflow-local-deps:
	make -C ../seq_retrieval/ container-image
	make -C ../alignment/ container-image

run-integration-test-local: nextflow.sh
	./nextflow.sh run -profile test,local protein-msa.nf
	@diff -qs pipeline-results/alignment-output.aln ../../tests/resources/integration-test-results.aln

run-integration-test-aws: nextflow.sh
	@$(eval PUBLISH_DIR='pipeline-results_${TAG_NAME}')
	./nextflow.sh run -profile test,aws protein-msa.nf --image_tag ${TAG_NAME} --publish_dir ${PUBLISH_DIR}
	aws s3 cp s3://agr-pavi-pipeline-nextflow/main/results/${PUBLISH_DIR}/alignment-output.aln alignment-output.aln
	@diff -qs alignment-output.aln ../../tests/resources/integration-test-results.aln
