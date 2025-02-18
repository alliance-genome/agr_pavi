mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

NEXTFLOW_VERSION=24.10.4
TAG_NAME?=main

.PHONY: build-% clean registry-docker-login run-%

clean:
	@rm -f nextflow.sh || true
	@rm -rf results/ || true
	@rm -rf pipeline-results/ || true
	@rm -rf .nextflow* || true
	@rm -rf work/ || true

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile registry-docker-login

nextflow.sh:
	curl --fail -L https://github.com/nextflow-io/nextflow/releases/download/v${NEXTFLOW_VERSION}/nextflow-${NEXTFLOW_VERSION}-dist -o nextflow.sh
	chmod u+x nextflow.sh

build-workflow-local-deps:
	make -C ../seq_retrieval/ container-image
	make -C ../alignment/ container-image

run-integration-test-local: nextflow.sh
	./nextflow.sh run -profile test,local protein-msa.nf
	@diff -qs pipeline-results/alignment-output.aln ../../tests/resources/submit-workflow-success-output.aln

run-integration-test-aws: nextflow.sh
	@$(eval NEXTFLOW_OUT_DIR=s3://agr-pavi-pipeline-nextflow/${TAG_NAME}/)
	@$(eval NEXTFLOW_RESULTS_DIR='${NEXTFLOW_OUT_DIR}results/')
	@$(eval NEXTFLOW_WORK_DIR='${NEXTFLOW_OUT_DIR}work/')
	@$(eval PUBLISH_DIR='pipeline-results_${TAG_NAME}')
	./nextflow.sh run -profile test,aws -work-dir ${NEXTFLOW_WORK_DIR} protein-msa.nf --image_tag ${TAG_NAME} \
	 --publish_dir_prefix ${NEXTFLOW_RESULTS_DIR} --publish_dir ${PUBLISH_DIR}
	aws s3 cp ${NEXTFLOW_RESULTS_DIR}${PUBLISH_DIR}/alignment-output.aln alignment-output.aln
	@diff -qs alignment-output.aln ../../tests/resources/submit-workflow-success-output.aln
