RELEASE=23.10.1

.PHONY: build-workflow-local-deps run-workflow-local

nextflow:
	curl -L https://github.com/nextflow-io/nextflow/releases/download/v${RELEASE}/nextflow-${RELEASE}-all -o nextflow
	chmod u+x nextflow

build-workflow-local-deps:
	make -C ../seq_retrieval/ container-image
	make -C ../alignment/ container-image

run-integration-test: nextflow
	./nextflow run -profile test protein-msa.nf
	@diff -qs pipeline-results/alignment-output.aln tests/resources/integration-test-results.aln
