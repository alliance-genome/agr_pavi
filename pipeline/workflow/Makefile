mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

TAG_NAME?=main

NEXTFLOW_VERSION=25.04.6
NF_TEST_PARAMS=--input_seq_regions_file '../../tests/resources/submit-workflow-success-API-payload.json'

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
	export NXF_SYNTAX_PARSER=v2 && \
	./nextflow.sh run -profile local protein-msa.nf ${NF_TEST_PARAMS}
	@diff -qs pipeline-results/alignment-output.aln ../../tests/resources/submit-workflow-success-output.aln

run-integration-test-aws: nextflow.sh
	@$(eval NEXTFLOW_OUT_DIR=s3://agr-pavi-pipeline-nextflow/${TAG_NAME}/)
	@$(eval NEXTFLOW_RESULTS_DIR='${NEXTFLOW_OUT_DIR}results/')
	@$(eval NEXTFLOW_WORK_DIR='${NEXTFLOW_OUT_DIR}work/')
	@$(eval PUBLISH_DIR='pipeline-results_${TAG_NAME}')
	export NXF_SYNTAX_PARSER=v2 && \
	./nextflow.sh run -profile aws -work-dir ${NEXTFLOW_WORK_DIR} protein-msa.nf ${NF_TEST_PARAMS} --image_tag ${TAG_NAME} \
	 --publish_dir_prefix ${NEXTFLOW_RESULTS_DIR} --publish_dir ${PUBLISH_DIR}
	aws s3 cp ${NEXTFLOW_RESULTS_DIR}${PUBLISH_DIR}/alignment-output.aln alignment-output.aln
	@diff -qs alignment-output.aln ../../tests/resources/submit-workflow-success-output.aln
