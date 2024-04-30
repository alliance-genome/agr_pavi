RELEASE=23.10.1
AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.PHONY: build-workflow-local-deps run-workflow-local registry-docker-login

registry-docker-login:
ifneq ($(shell echo ${REG} | egrep "ecr\..+\.amazonaws\.com"),)
	@$(eval DOCKER_LOGIN_CMD=docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli)
ifneq (${AWS_PROFILE},)
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} --profile ${AWS_PROFILE})
endif
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} ecr get-login-password --region=${AWS_DEFAULT_REGION} | docker login -u AWS --password-stdin https://${REG})
	${DOCKER_LOGIN_CMD}
endif

nextflow.sh:
	curl -L https://github.com/nextflow-io/nextflow/releases/download/v${RELEASE}/nextflow-${RELEASE}-all -o nextflow.sh
	chmod u+x nextflow.sh

build-workflow-local-deps:
	make -C ../seq_retrieval/ container-image
	make -C ../alignment/ container-image

run-integration-test: nextflow
	./nextflow.sh run -profile test protein-msa.nf
	@diff -qs pipeline-results/alignment-output.aln tests/resources/integration-test-results.aln
